const path = require('path');
const bankConfigs = require('./bankConfigs.json');
const GeradorDeDigitoPadrao = require('./gerador-de-digito-padrao');
const utils = require('../utils/utils');
const pad = utils.pad;

const CodigoDeBarrasBuilder = require('./codigo-de-barras-builder');


class BankConfigs {
    constructor(bankName) {
        this.bankName = bankName;
        this.bankConfigs = bankConfigs[bankName];
    }

    geraCodigoDeBarrasPara(boleto) {
        const beneficiario = boleto.getBeneficiario();
        const campoLivre = [];

        switch (this.bankName) {
            case 'Banco do Brasil':
                if (beneficiario.getNossoNumero().length == 11) {
                    campoLivre.push(beneficiario.getNossoNumero());
                    campoLivre.push(beneficiario.getAgenciaFormatada());
                    campoLivre.push(beneficiario.getCodigoBeneficiario());
                    campoLivre.push(beneficiario.getCarteira().substring(0, 2));
                }

                if (beneficiario.getNossoNumero().length == 17) {
                    campoLivre.push('000000');
                    campoLivre.push(beneficiario.getNossoNumero());
                    campoLivre.push(beneficiario.getCarteira().substring(0, 2));
                }

                return new CodigoDeBarrasBuilder(boleto).comCampoLivre(campoLivre);

            case 'Bradesco':
                campoLivre.push(beneficiario.getAgenciaFormatada());
                campoLivre.push(this.getCarteiraFormatado(beneficiario));
                campoLivre.push(this.getNossoNumeroFormatado(beneficiario));
                campoLivre.push(this.getCodigoFormatado(beneficiario));
                campoLivre.push('0');

                return new CodigoDeBarrasBuilder(boleto).comCampoLivre(campoLivre);
            case 'Caixa':
                var carteira = beneficiario.getCarteira(),
                    contaCorrente = pad(beneficiario.getCodigoBeneficiario(), 6, '0'),
                    nossoNumeroFormatado = this.getNossoNumeroFormatado(beneficiario)

                if (carteira == '14' || carteira == '24') {
                    // Carteira 24 é sem registro e carteira 14 é com registro
                    // O número 1 significa com registro e o número 2 sem registro

                    campoLivre.push(contaCorrente);
                    campoLivre.push(beneficiario.getDigitoCodigoBeneficiario());
                    campoLivre.push(nossoNumeroFormatado.substring(2, 5));
                    campoLivre.push(nossoNumeroFormatado.substring(0, 1));
                    campoLivre.push(nossoNumeroFormatado.substring(5, 8));
                    campoLivre.push(nossoNumeroFormatado.substring(1, 2));
                    campoLivre.push(nossoNumeroFormatado.substring(8));

                    var digito = GeradorDeDigitoPadrao.mod11(campoLivre.join(''), {
                        de: [0, 10, 11],
                        para: 0
                    });

                    campoLivre.push(digito);
                } else {
                    throw new Error('Carteira "', carteira, '" não implementada para o banco Caixa');
                }

                return new CodigoDeBarrasBuilder(boleto).comCampoLivre(campoLivre);
        }
    };

    getNumeroFormatadoComDigito() {
        return [
            this.bankConfigs.numero,
            this.bankConfigs.digito
        ].join('-');
    };

    getImagem() {
        return path.join(__dirname, this.bankConfigs.imagem)
    }

    getCarteiraTexto(beneficiario) {
        switch (this.bankName) {
            case 'Banco do Brasil':
            case 'Bradesco':
                return pad(beneficiario.getCarteira(), this.bankConfigs.carteiraPad, '0');
            case 'Caixa':
                return {
                    1: 'RG',
                    14: 'RG',
                    2: 'SR',
                    24: 'SR'
                }[beneficiario.getCarteira()];
        }
    }

    getCarteiraFormatado(beneficiario) {
        return pad(beneficiario.getCarteira(), this.bankConfigs.carteiraPad, '0');
    }

    getCodigoFormatado(beneficiario) {
        return pad(beneficiario.getCodigoBeneficiario(), this.bankConfigs.codigoFormatadoPad, '0');
    };

    getNossoNumeroFormatado(beneficiario) {
        switch (this.bankName) {
            case 'Banco do Brasil':
            case 'Bradesco':
                return pad(beneficiario.getNossoNumero(), this.bankConfigs.nossoNumeroFormatadoPad, '0');
            case 'Caixa':
                return [
                    pad(beneficiario.getCarteira(), 2, '0'),
                    pad(beneficiario.getNossoNumero(), 15, '0')
                ].join('');
        }
    }

    getNossoNumeroECodigoDocumento(boleto) {
        switch (this.bankName) {
            case 'Banco do Brasil':
                var beneficiario = boleto.getBeneficiario();

                return [
                    this.getNossoNumeroFormatado(beneficiario)
                ].join('-');

            case 'Bradesco':
                var beneficiario = boleto.getBeneficiario();

                return this.getCarteiraFormatado(beneficiario) + '/' + [
                    this.getNossoNumeroFormatado(beneficiario),
                    beneficiario.getDigitoNossoNumero()
                ].join('-');
            case 'Caixa':
                var beneficiario = boleto.getBeneficiario();

                return [
                    this.getNossoNumeroFormatado(beneficiario),
                    beneficiario.getDigitoNossoNumero()
                ].join('-');
        }
    };

    getAgenciaECodigoBeneficiario(boleto) {
        var beneficiario = boleto.getBeneficiario();
        var codigo = '';

        switch (this.bankName) {
            case 'Banco do Brasil':
            case 'Bradesco':
            case 'Caixa':
                codigo = this.getCodigoFormatado(beneficiario);
                var digitoCodigo = beneficiario.getDigitoCodigoBeneficiario();

                if (digitoCodigo) {
                    codigo += '-' + digitoCodigo;
                }
                break;
        }

        return beneficiario.getAgenciaFormatada() + '/' + codigo;
    };
}

module.exports = BankConfigs;