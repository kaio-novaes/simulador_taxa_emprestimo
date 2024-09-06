document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loanForm');
    const resultsContainer = document.getElementById('results');

    const TOLERANCIA = 1e-6;
    const MAX_ITERACOES = 100;

    // Função para formatar valores monetários
    const formatarMoeda = (valor) => {
        if (isNaN(valor)) return 'R$ 0,00';
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Função para formatar entrada monetária para exibição
    const aplicarMascaraMoeda = (valor) => {
        const valorNumerico = parseFloat(valor.replace(/\D/g, '')) / 100;
        return formatarMoeda(valorNumerico);
    };

    // Função para atualizar o valor do campo com a máscara aplicada
    const atualizarCampoComMascara = (event) => {
        const campo = event.target;
        const valorOriginal = campo.value.replace(/\D/g, '');
        campo.value = aplicarMascaraMoeda(valorOriginal);
    };

    // Função para extrair valor numérico de um campo com máscara
    const extrairValorNumerico = (valor) => {
        return parseFloat(valor.replace('R$ ', '').replace('.', '').replace(',', '.'));
    };

    // Função para calcular a quantidade de meses entre duas datas
    const calcularMesesEntreDatas = (dataInicio, dataFim) => {
        const anoInicio = dataInicio.getFullYear();
        const mesInicio = dataInicio.getMonth();
        const anoFim = dataFim.getFullYear();
        const mesFim = dataFim.getMonth();
        
        return (anoFim - anoInicio) * 12 + (mesFim - mesInicio) + 1;
    };

    // Função para calcular o saldo restante
    const calcularSaldoRestante = (valorEmprestado, valorParcela, parcelasPagas, taxaJurosMensal) => {
        if (taxaJurosMensal === 0) {
            return valorEmprestado - valorParcela * parcelasPagas;
        }
        const fatorDeAcumulacao = Math.pow(1 + taxaJurosMensal, parcelasPagas);
        return valorEmprestado * fatorDeAcumulacao - valorParcela * ((fatorDeAcumulacao - 1) / taxaJurosMensal);
    };

    // Função para calcular o valor presente das parcelas (Q0)
    const calcularQ0 = (j, valorParcela, numParcelas, valorEmprestado) => {
        if (j === 0) return valorParcela * numParcelas - valorEmprestado;
        return (((1 - Math.pow(1 + j, - numParcelas)) / j) * valorParcela) - valorEmprestado;
    };

    // Função para buscar a taxa de juros
    const buscarTaxaJuros = (valorParcela, numParcelas, valorEmprestado) => {
        let baixo = 0;
        let alto = 1;
        let taxaJuros;

        for (let i = 0; i < MAX_ITERACOES; i++) {
            taxaJuros = (baixo + alto) / 2;
            const q0 = calcularQ0(taxaJuros, valorParcela, numParcelas, valorEmprestado);
            if (Math.abs(q0) < TOLERANCIA) return taxaJuros;
            if (q0 > 0) baixo = taxaJuros;
            else alto = taxaJuros;
        }
        return null;
    };

    // Função para calcular a taxa de juros e o saldo restante
    const calcularTaxaJuros = (dataInicio, valorEmprestado, valorParcela, numParcelas) => {
        const hoje = new Date();
        const mesCompleto = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
        const mesesTotais = calcularMesesEntreDatas(dataInicio, mesCompleto);
        const parcelasPagas = Math.min(mesesTotais, numParcelas);

        if (valorParcela > valorEmprestado) {
            throw new Error('Não foi possível calcular a taxa de juros, pois o <strong>valor da parcela é superior ao valor total emprestado</strong>. Tente novamente.');
        }
    
        try {
            const taxaJurosMensal = buscarTaxaJuros(valorParcela, numParcelas, valorEmprestado);
            if (taxaJurosMensal === null) throw new Error('Não foi possível encontrar a taxa de juros.');
    
            const taxaJurosAnual = taxaJurosMensal * 12;
            const saldoRestante = calcularSaldoRestante(valorEmprestado, valorParcela, parcelasPagas, taxaJurosMensal);
    
            return {
                taxaJurosMensal: taxaJurosMensal * 100,
                taxaJurosAnual: taxaJurosAnual * 100,
                parcelasPagas,
                parcelasAPagar: Math.max(numParcelas - parcelasPagas, 0),
                saldoRestante: saldoRestante < 0 ? 0 : saldoRestante
            };
        } catch (e) {
            console.error(e.message);
            return null;
        }
    };

    // Função para aplicar máscara na entrada de datas
    const aplicarMascaraData = (event) => {
        const valor = event.target.value.replace(/\D/g, '');
        if (valor.length > 4) {
            event.target.value = `${valor.slice(0, 2)}/${valor.slice(2, 6)}`;
        } else if (valor.length > 2) {
            event.target.value = `${valor.slice(0, 2)}/${valor.slice(2)}`;
        }
    };

    // Função para validar entradas do formulário
    const validarFormulario = () => {
        const dataInicioStr = document.getElementById('dataInicio').value;
        const valorParcela = extrairValorNumerico(document.getElementById('valorParcela').value);
        const valorEmprestado = extrairValorNumerico(document.getElementById('valorEmprestado').value);
        const numParcelas = parseInt(document.getElementById('numParcelas').value, 10);

        if (!dataInicioStr || isNaN(valorParcela) || isNaN(valorEmprestado) || isNaN(numParcelas) || valorParcela <= 0 || valorEmprestado <= 0 || numParcelas <= 0) {
            return 'Nenhum resultado foi encontrado. Verifique os dados inseridos.';
        }

        const [mesInicio, anoInicio] = dataInicioStr.split('/').map(num => parseInt(num, 10));

        if (isNaN(mesInicio) || isNaN(anoInicio) || mesInicio < 1 || mesInicio > 12) {
            return 'Data inválida. Por favor, insira uma data no formato MM/AAAA.';
        }

        const dataInicio = new Date(anoInicio, mesInicio - 1);

        return { dataInicio, valorEmprestado, valorParcela, numParcelas };
    };

    // Adiciona o evento para aplicar a máscara de data
    form.addEventListener('input', (event) => {
        if (event.target.id === 'dataInicio') {
            aplicarMascaraData(event);
        } else if (event.target.id === 'valorParcela' || event.target.id === 'valorEmprestado') {
            atualizarCampoComMascara(event);
        }
    });

    // Adiciona o evento para o envio do formulário
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const resultadoValidacao = validarFormulario();
        if (typeof resultadoValidacao === 'string') {
            resultsContainer.innerHTML = `<div class="result-item">${resultadoValidacao}</div>`;
            return;
        }

        const { dataInicio, valorEmprestado, valorParcela, numParcelas } = resultadoValidacao;
        try {
            const resultado = calcularTaxaJuros(dataInicio, valorEmprestado, valorParcela, numParcelas);

            if (resultado) {
                resultsContainer.innerHTML = `
                    <div class="result-item">Parcelas pagas até o momento: <strong>${resultado.parcelasPagas}</strong></div>
                    <div class="result-item">Parcelas restantes a pagar: <strong>${resultado.parcelasAPagar}</strong></div>
                    <div class="result-item">Taxa de juros atual:
                        <strong>${resultado.taxaJurosMensal.toFixed(2)}%</strong> a.m,
                        <strong>${resultado.taxaJurosAnual.toFixed(2)}%</strong> a.a
                    </div>
                    <div class="result-item">Saldo restante: <strong>${formatarMoeda(resultado.saldoRestante)}</strong></div>
                `;
            } else {
                resultsContainer.innerHTML = '<div class="result-item">Não foi possível calcular a taxa de juros. Tente novamente.</div>';
            }
        } catch (e) {
            resultsContainer.innerHTML = `<div class="result-item">${e.message}</div>`;
        }
    });

    // Adiciona o evento para o botão de limpar
    document.getElementById('clearButton').addEventListener('click', () => {
        form.reset();
        resultsContainer.innerHTML = '';
    });
});
