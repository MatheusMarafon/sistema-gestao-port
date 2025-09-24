import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// --- Mapeamento de todas as variáveis do DOM ---
let leadSelector, unidadeSelector, calcularBtn, btnIcon, btnText, dadosAutomaticos,
    infoTarifa, infoDemanda, infoImpostos, infoMercado, resultadoContainer,
    resultadoDescricao, labelCustoTotal, resultadoCustoAnual, resultadoCustoMensal,
    resultadoConsumoAnual, resultadoDemandaMedia, toggleDetalhesBtn,
    tabelaDetalhadaContainer, tabelaDetalhadaTbody, tipoSimulacaoRadios,
    leadInputsContainer, dataInicioInput, dataFimInput, periodoRapidoBtns,
    historicoContainer, historicoChartCanvas, calendarContainer;

let historicoChartInstance = null;

// --- Funções de Renderização e Carregamento ---

function renderHistoryChart(historicoData) {
    if (historicoChartInstance) historicoChartInstance.destroy();
    if (!historicoChartCanvas) return;

    const ctx = historicoChartCanvas.getContext('2d');
    const dadosOrdenados = historicoData.sort((a, b) => String(a.IDMes).localeCompare(String(b.IDMes))).slice(-13);
    const labels = dadosOrdenados.map(h => h.IDMes);
    const consumoData = dadosOrdenados.map(h => (parseFloat(h.kWhProjPonta) || 0) + (parseFloat(h.kWhProjForaPonta) || 0));
    
    historicoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Consumo (kWh)',
                data: consumoData,
                borderColor: '#059BE2',
                backgroundColor: 'rgba(5, 155, 226, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function displaySimulationResults(resultados) {
    const leadTxt = leadSelector.options[leadSelector.selectedIndex].text;
    const unidadeTxt = unidadeSelector.options[unidadeSelector.selectedIndex].text;
    const duracao = Math.round(resultados.totais.duracao_meses);

    if (labelCustoTotal) labelCustoTotal.textContent = `Custo Total em ${duracao} Meses`;
    if (resultadoDescricao) resultadoDescricao.textContent = `Análise para: ${leadTxt} | Unidade: ${unidadeTxt}`;
    if (resultadoCustoAnual) resultadoCustoAnual.textContent = helpers.formatCurrency(resultados.totais.custo_total_periodo);
    if (resultadoCustoMensal) resultadoCustoMensal.textContent = helpers.formatCurrency(resultados.totais.custo_medio_mensal);
    if (resultadoConsumoAnual) resultadoConsumoAnual.textContent = `${helpers.formatNumber(resultados.totais.consumo_total_periodo)} kWh`;
    if (resultadoDemandaMedia) resultadoDemandaMedia.textContent = `${helpers.formatNumber(resultados.totais.demanda_media)} kW`;
    
    if (tabelaDetalhadaTbody) {
        tabelaDetalhadaTbody.innerHTML = '';
        resultados.detalhes_mensais.forEach(mes => {
            const row = tabelaDetalhadaTbody.insertRow();
            row.innerHTML = `
                <td>${mes.mes}</td>
                <td class="text-end">${helpers.formatNumber(mes.consumo_total_kwh)}</td>
                <td class="text-end">${helpers.formatNumber(mes.demanda_total_kw)}</td>
                <td class="text-end">${helpers.formatCurrency(mes.custo_consumo)}</td>
                <td class="text-end">${helpers.formatCurrency(mes.custo_demanda)}</td>
                <td class="text-end">${helpers.formatCurrency(mes.custo_impostos)}</td>
                <td class="text-end fw-bold">${helpers.formatCurrency(mes.custo_total_mes)}</td>
            `;
        });
    }

    if (resultadoContainer) resultadoContainer.classList.remove('d-none');
}

async function loadLeadsIntoSelector() {
    if (!leadSelector) return;
    try {
        const leads = await api.getLeads();
        leadSelector.innerHTML = '<option value="">Selecione...</option>';
        leads.forEach(lead => {
            const option = new Option(`${lead.RazaoSocialLead} (${helpers.formatCpfCnpj(lead.Cpf_CnpjLead)})`, lead.Cpf_CnpjLead);
            leadSelector.add(option);
        });
    } catch (error) {
        ui.showAlert('Erro ao carregar leads.', 'error');
    }
}

async function loadUnidadesIntoSelector(leadId) {
    if (!unidadeSelector) return;
    unidadeSelector.disabled = true;
    unidadeSelector.innerHTML = '<option value="">Carregando...</option>';
    if (!leadId) {
        unidadeSelector.innerHTML = '<option value="">Selecione um lead</option>';
        return;
    }
    try {
        const unidades = await api.getUnidadesByLead(leadId);
        unidadeSelector.innerHTML = '<option value="">Selecione...</option>';
        unidades.forEach(unidade => {
            const option = new Option(`${unidade.NumeroDaUcLead} - ${unidade.NomeDaUnidade || 'Sem Nome'}`, unidade.NumeroDaUcLead);
            unidadeSelector.add(option);
        });
        unidadeSelector.disabled = false;
    } catch (error) {
        ui.showAlert('Erro ao carregar unidades.', 'error');
    }
}

function openCalendar(inputElement) {
    const today = new Date();
    const render = (year, month) => {
        if (!calendarContainer) return;
        calendarContainer.innerHTML = '';
        const firstDay = new Date(year, month, 1);
        
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center p-2 bg-light border-bottom';
        header.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-secondary" id="prev-month">&lt;</button>
            <span class="fw-bold">${firstDay.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="next-month">&gt;</button>
        `;

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        grid.style.gap = '5px';
        grid.className = 'p-2';
        ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(dia => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'text-center small text-muted fw-bold';
            dayHeader.textContent = dia;
            grid.appendChild(dayHeader);
        });
        for (let i = 0; i < firstDay.getDay(); i++) grid.appendChild(document.createElement('div'));
        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const dayElement = document.createElement('button');
            dayElement.type = 'button';
            dayElement.className = 'btn btn-sm btn-outline-secondary';
            dayElement.textContent = day;
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayElement.classList.replace('btn-outline-secondary', 'btn-primary');
            }
            dayElement.addEventListener('click', () => {
                const selectedDate = new Date(year, month, day);
                inputElement.value = selectedDate.toLocaleDateString('pt-BR');
                ui.hideModal('calendar-modal');
            });
            grid.appendChild(dayElement);
        }
        
        calendarContainer.appendChild(header);
        calendarContainer.appendChild(grid);
        calendarContainer.querySelector('#prev-month').addEventListener('click', () => render(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1));
        calendarContainer.querySelector('#next-month').addEventListener('click', () => render(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1));
    };

    render(today.getFullYear(), today.getMonth());
    ui.showModal('calendar-modal');
}

// --- Handlers de Ações ---
async function handleCalculateClick() {
    // A lógica de cálculo será implementada no futuro
    ui.showAlert("A lógica de cálculo da simulação ainda está em desenvolvimento.", "info");
}

// --- Função Principal de Inicialização ---
export function init() {
    // Mapeamento de elementos
    leadSelector = document.getElementById('simulacao-lead-selector');
    unidadeSelector = document.getElementById('simulacao-unidade-selector');
    calcularBtn = document.getElementById('simulacao-calcular-btn');
    btnIcon = document.getElementById('simulacao-btn-icon');
    btnText = document.getElementById('simulacao-btn-text');
    dadosAutomaticos = document.getElementById('simulacao-dados-automaticos');
    infoTarifa = document.getElementById('simulacao-info-tarifa');
    infoDemanda = document.getElementById('simulacao-info-demanda');
    infoImpostos = document.getElementById('simulacao-info-impostos');
    infoMercado = document.getElementById('simulacao-info-mercado');
    resultadoContainer = document.getElementById('simulacao-resultado-container');
    resultadoDescricao = document.getElementById('simulacao-resultado-descricao');
    labelCustoTotal = document.getElementById('simulacao-label-custo-total');
    resultadoCustoAnual = document.getElementById('simulacao-resultado-custo-anual');
    resultadoCustoMensal = document.getElementById('simulacao-resultado-custo-mensal');
    resultadoConsumoAnual = document.getElementById('simulacao-resultado-consumo-anual');
    resultadoDemandaMedia = document.getElementById('simulacao-resultado-demanda-media');
    toggleDetalhesBtn = document.getElementById('simulacao-toggle-detalhes-btn');
    tabelaDetalhadaContainer = document.getElementById('simulacao-tabela-detalhada-container');
    tabelaDetalhadaTbody = document.getElementById('simulacao-tabela-detalhada-tbody');
    tipoSimulacaoRadios = document.querySelectorAll('input[name="tipo_simulacao"]');
    leadInputsContainer = document.getElementById('simulacao-lead-inputs');
    dataInicioInput = document.getElementById('simulacao-data-inicio');
    dataFimInput = document.getElementById('simulacao-data-fim');
    periodoRapidoBtns = document.querySelectorAll('.btn-periodo-rapido');
    historicoContainer = document.getElementById('simulacao-historico-container');
    historicoChartCanvas = document.getElementById('simulacao-historico-chart');
    calendarContainer = document.getElementById('calendar-container');
    
    // --- Event Listeners ---
    
    if(leadSelector) leadSelector.addEventListener('change', () => loadUnidadesIntoSelector(leadSelector.value));
    if(calcularBtn) calcularBtn.addEventListener('click', handleCalculateClick);

    if (periodoRapidoBtns) {
        periodoRapidoBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const meses = parseInt(btn.dataset.meses, 10);
                const hoje = new Date();
                const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
                const fim = new Date(inicio.getFullYear(), inicio.getMonth() + meses - 1, 1);
                const ultimoDiaDoMes = new Date(fim.getFullYear(), fim.getMonth() + 1, 0);
                
                if (dataInicioInput) dataInicioInput.value = inicio.toLocaleDateString('pt-BR');
                if (dataFimInput) dataFimInput.value = ultimoDiaDoMes.toLocaleDateString('pt-BR');
            });
        });
    }
    
    if(unidadeSelector) unidadeSelector.addEventListener('change', async () => {
        const ucId = unidadeSelector.value;
        if(historicoContainer) historicoContainer.classList.add('d-none');
        if(dadosAutomaticos) dadosAutomaticos.classList.add('d-none');
        if(calcularBtn) calcularBtn.disabled = true;

        if (ucId) {
            try {
                const unidade = await api.getUnidadeById(ucId);
                if(infoTarifa) infoTarifa.textContent = unidade.Tarifa || 'N/D';
                if(infoDemanda) infoDemanda.textContent = unidade.SubgrupoTarifario || 'N/D';
                if(infoImpostos) infoImpostos.textContent = `ICMS ${unidade.AliquotaICMS || 0}%`;
                if(infoMercado) infoMercado.textContent = unidade.MercadoAtual || 'N/D';
                if(dadosAutomaticos) dadosAutomaticos.classList.remove('d-none');
                if(calcularBtn) calcularBtn.disabled = false;
                
                const historico = await api.getHistoricoCompleto(ucId);
                if (historico && historico.length > 0) {
                    renderHistoryChart(historico);
                    if(historicoContainer) historicoContainer.classList.remove('d-none');
                }
            } catch(error) {
                ui.showAlert(`Erro ao carregar dados da unidade: ${error.message}`, 'error');
            }
        }
    });

    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.addEventListener('click', (e) => {
            const dateInput = e.target.closest('.datepicker-input');
            if (dateInput) {
                openCalendar(dateInput);
            }
        });
    }

    // Carregamento inicial
    loadLeadsIntoSelector();
}

