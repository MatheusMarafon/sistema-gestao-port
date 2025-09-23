import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// Variáveis de escopo do módulo
let reportLeadName, reportUnitName, resultadoCustoAtual, resultadoCustoSimulado,
    resultadoEconomiaReais, resultadoEconomiaPercentual, detalhesTbody,
    totalAtual, totalSimulado, totalEconomia, ctxDashboard;

let dashboardChartInstance = null;

/** Renderiza o cabeçalho do dashboard com informações do lead e unidade. */
function renderHeader(leadInfo, unitInfo) {
    if (reportLeadName) reportLeadName.textContent = leadInfo || '[Não informado]';
    if (reportUnitName) reportUnitName.textContent = unitInfo || '[Não informado]';
}

/** Preenche os cards de resultado principais. */
function renderResultCards(data) {
    if (resultadoCustoAtual) resultadoCustoAtual.textContent = helpers.formatCurrency(data.custo_atual);
    if (resultadoCustoSimulado) resultadoCustoSimulado.textContent = helpers.formatCurrency(data.custo_simulado);
    if (resultadoEconomiaReais) resultadoEconomiaReais.textContent = helpers.formatCurrency(data.economia_reais);
    if (resultadoEconomiaPercentual) resultadoEconomiaPercentual.textContent = `(${helpers.formatNumber(data.economia_percentual)}%)`;
}

/** Renderiza a tabela com o detalhamento mensal da simulação. */
function renderDetailsTable(detalhes) {
    if (!detalhesTbody) return;
    detalhesTbody.innerHTML = '';
    if (!detalhes || detalhes.length === 0) return;

    detalhes.forEach(item => {
        const row = detalhesTbody.insertRow();
        row.innerHTML = `
            <td>${item.mes}</td>
            <td class="text-end">${helpers.formatCurrency(item.custoAtual)}</td>
            <td class="text-end">${helpers.formatCurrency(item.custoSimulado)}</td>
            <td class="text-end table-success">${helpers.formatCurrency(item.economia)}</td>
        `;
    });

    const totalAtualValor = detalhes.reduce((acc, item) => acc + item.custoAtual, 0);
    const totalSimuladoValor = detalhes.reduce((acc, item) => acc + item.custoSimulado, 0);
    const totalEconomiaValor = detalhes.reduce((acc, item) => acc + item.economia, 0);
    
    if (totalAtual) totalAtual.textContent = helpers.formatCurrency(totalAtualValor);
    if (totalSimulado) totalSimulado.textContent = helpers.formatCurrency(totalSimuladoValor);
    if (totalEconomia) totalEconomia.textContent = helpers.formatCurrency(totalEconomiaValor);
}

/** Renderiza o gráfico de barras comparativo. */
function renderChart(detalhes) {
    if (dashboardChartInstance) dashboardChartInstance.destroy();
    if (!ctxDashboard || !detalhes || detalhes.length === 0) return;

    const labels = detalhes.map(d => d.mes);
    const dadosAtuais = detalhes.map(d => d.custoAtual);
    const dadosSimulados = detalhes.map(d => d.custoSimulado);

    dashboardChartInstance = new Chart(ctxDashboard, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Custo Atual (R$)', data: dadosAtuais, backgroundColor: 'rgba(108, 117, 125, 0.7)' },
                { label: 'Custo Simulado (R$)', data: dadosSimulados, backgroundColor: 'rgba(40, 167, 69, 0.7)' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: value => helpers.formatCurrency(value) } } },
            plugins: { tooltip: { callbacks: { label: context => `${context.dataset.label}: ${helpers.formatCurrency(context.parsed.y)}` } } }
        }
    });
}

/** Busca todos os dados necessários para popular o dashboard. */
async function loadDashboardData(params) {
    try {
        const data = await api.getDashboardData(params);
        
        const leadResponse = await api.getLeadById(params.lead_id);
        const unidadeResponse = await api.getUnidadeById(params.uc_id);

        const leadInfo = `${leadResponse.RazaoSocialLead} (${helpers.formatCpfCnpj(leadResponse.Cpf_CnpjLead)})`;
        const unitInfo = `${unidadeResponse.NumeroDaUcLead} - ${unidadeResponse.NomeDaUnidade}`;

        renderHeader(leadInfo, unitInfo);
        renderResultCards(data);
        renderDetailsTable(data.detalhes_mensais);
        renderChart(data.detalhes_mensais);
    } catch (error) {
        ui.showAlert(`Erro ao carregar dados do dashboard: ${error.message}`, 'error');
        if (detalhesTbody) detalhesTbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${error.message}</td></tr>`;
    }
}

/** Função de inicialização do módulo. */
export function init() {
    reportLeadName = document.getElementById('report-lead-name');
    reportUnitName = document.getElementById('report-unit-name');
    resultadoCustoAtual = document.getElementById('resultado-custo-atual');
    resultadoCustoSimulado = document.getElementById('resultado-custo-simulado');
    resultadoEconomiaReais = document.getElementById('resultado-economia-reais');
    resultadoEconomiaPercentual = document.getElementById('resultado-economia-percentual');
    detalhesTbody = document.getElementById('detalhes-tbody');
    totalAtual = document.getElementById('total-atual');
    totalSimulado = document.getElementById('total-simulado');
    totalEconomia = document.getElementById('total-economia');
    
    const canvas = document.getElementById('simulador-grafico-economia');
    if (canvas) {
        ctxDashboard = canvas.getContext('2d');
    }

    // Busca os parâmetros da última simulação salva na sessão do navegador
    const storedParams = sessionStorage.getItem('simulacaoParams');

    if (storedParams) {
        const params = JSON.parse(storedParams);
        loadDashboardData(params);
    } else {
        if (detalhesTbody) detalhesTbody.innerHTML = `<tr><td colspan="4" class="text-center">Nenhum dado de simulação encontrado. Por favor, execute uma nova simulação na página <strong>Simulação</strong>.</td></tr>`;
    }
}
