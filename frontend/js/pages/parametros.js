import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// Variáveis de escopo do módulo
let formGerais, saveAllParamsBtn;
let tablePrecosTbody, tableCustosTbody, tableIpcaTbody, tableTarifaTbody, tableDadosGeracaoTbody, tableCurvaGeracaoTbody;
let ipcaModal, ipcaForm, precoMwhModal, precoMwhForm, custosMesModal, custosMesForm, ajusteTarifaModal, ajusteTarifaForm, dadosGeracaoModal, dadosGeracaoForm, curvaGeracaoModal, curvaGeracaoForm;
let distribuidoraSelect;

// --- Funções de Renderização e Carregamento ---

function populateFormGerais(data) {
    if (!data || !formGerais) return;
    Object.keys(data).forEach(key => {
        const input = formGerais.querySelector(`[name="${key}"]`);
        if (input) input.value = data[key] || '';
    });
}

function renderTable(tbody, data, renderRowFunc) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        const colspan = tbody.closest('table')?.querySelector('thead tr')?.cells.length || 1;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">Nenhum dado encontrado.</td></tr>`;
        return;
    }
    data.forEach(item => renderRowFunc(tbody, item));
}

function renderPrecosRow(tbody, item) {
    const row = tbody.insertRow();
    row.innerHTML = `
        <td>${item.Ano || ''}</td>
        <td>${item.Fonte || ''}</td>
        <td>${helpers.formatNumber(item.PrecoRS_MWh)}</td>
        <td>${item.Corrigir || ''}</td>
        <td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="preco-mwh">Editar</button></td>
    `;
}

function renderCustosRow(tbody, item) {
    const row = tbody.insertRow();
    row.dataset.mesRefOriginal = (typeof item.MesRef === 'string') ? item.MesRef.split('T')[0] : '';
    row.innerHTML = `
        <td>${item.MesRef ? new Date(item.MesRef).toLocaleDateString('pt-BR', {month: '2-digit', year: 'numeric', timeZone: 'UTC'}) : ''}</td>
        <td>${helpers.formatNumber(item.LiqMCPACL)}</td>
        <td>${helpers.formatNumber(item.LiqMCPAPE)}</td>
        <td>${helpers.formatNumber(item.LiqEnerReserva)}</td>
        <td>${helpers.formatNumber(item.LiqRCAP)}</td>
        <td>${helpers.formatNumber(item.SpreadVenda)}</td>
        <td>${helpers.formatNumber(item.ModelagemMes)}</td>
        <td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="custos-mes">Editar</button></td>
    `;
}

function renderIpcaRow(tbody, item) {
    const row = tbody.insertRow();
    row.innerHTML = `
        <td>${item.Ano}</td>
        <td>${helpers.formatNumber(item.PctIPCA)}</td>
        <td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="ipca">Editar</button></td>
    `;
}

// --- Funções de Manipulação de Modais ---

function openIpcaEditModal(row, mode = 'edit') {
    ipcaForm.reset();
    ipcaForm.dataset.mode = mode;
    const anoInput = ipcaForm.querySelector('#ipca-ano');
    
    if (mode === 'edit') {
        const ano = row.cells[0].textContent;
        const pct = row.cells[1].textContent;
        ipcaForm.querySelector('#ipca-modal-title').innerHTML = '<i class="fas fa-edit"></i> Editar Ajuste IPCA';
        ipcaForm.querySelector('#ipca-ano-original').value = ano;
        anoInput.value = ano;
        anoInput.disabled = true;
        ipcaForm.querySelector('#ipca-percentual').value = pct.replace(/\./g, '').replace(',', '.');
    } else {
        ipcaForm.querySelector('#ipca-modal-title').innerHTML = '<i class="fas fa-plus"></i> Adicionar Ajuste IPCA';
        anoInput.disabled = false;
    }
    ui.showModal('ipca-modal');
}

function openPrecoMwhEditModal(row) {
    const ano = row.cells[0].textContent;
    const fonte = row.cells[1].textContent;
    const preco = row.cells[2].textContent;
    const corrigir = row.cells[3].textContent;

    precoMwhForm.querySelector('#preco-mwh-ano-original').value = ano;
    precoMwhForm.querySelector('#preco-mwh-fonte-original').value = fonte;
    precoMwhForm.querySelector('#preco-mwh-ano').value = ano;
    precoMwhForm.querySelector('#preco-mwh-fonte').value = fonte;
    precoMwhForm.querySelector('#preco-mwh-preco').value = preco.replace(/\./g, '').replace(',', '.');
    precoMwhForm.querySelector('#preco-mwh-corrigir').value = corrigir;
    
    ui.showModal('preco-mwh-modal');
}

// --- Funções de Submissão de Formulários (Handlers) ---

async function handleIpcaSubmit(event) {
    event.preventDefault();
    const formData = new FormData(ipcaForm);
    const data = Object.fromEntries(formData.entries());
    const mode = ipcaForm.dataset.mode;

    try {
        const result = (mode === 'edit')
            ? await api.updateAjusteIpca(data.AnoOriginal, data)
            : await api.saveAjusteIpca(data);
        ui.showAlert(result.sucesso);
        ui.hideModal('ipca-modal');
        const ipcaData = await api.getAjusteIpca();
        renderTable(tableIpcaTbody, ipcaData, renderIpcaRow);
    } catch(error) {
        ui.showAlert(`Erro ao salvar IPCA: ${error.message}`, 'error');
    }
}

async function handlePrecoMwhSubmit(event) {
    event.preventDefault();
    const formData = new FormData(precoMwhForm);
    const data = Object.fromEntries(formData.entries());
    const anoOriginal = precoMwhForm.querySelector('#preco-mwh-ano-original').value;
    const fonteOriginal = precoMwhForm.querySelector('#preco-mwh-fonte-original').value;

    try {
        const result = await api.updatePrecoMwh(anoOriginal, fonteOriginal, data);
        ui.showAlert(result.sucesso);
        ui.hideModal('preco-mwh-modal');
        const params = await api.getParametros();
        renderTable(tablePrecosTbody, params.precos_ano, renderPrecosRow);
    } catch(error) {
        ui.showAlert(`Erro ao salvar Preço MWh: ${error.message}`, 'error');
    }
}

// --- Funções de Carregamento de Abas ---

async function loadInitialParams() {
    try {
        const params = await api.getParametros();
        populateFormGerais(params.simulacao_geral);
        renderTable(tablePrecosTbody, params.precos_ano, renderPrecosRow);
        renderTable(tableCustosTbody, params.custos_mes, renderCustosRow);
    } catch (error) {
        ui.showAlert(`Erro ao carregar parâmetros iniciais: ${error.message}`, 'error');
    }
}

async function loadAjustesTabData() {
    try {
        const ipcaData = await api.getAjusteIpca();
        renderTable(tableIpcaTbody, ipcaData, renderIpcaRow);
    } catch (error) {
        ui.showAlert(`Erro ao carregar dados de ajustes: ${error.message}`, 'error');
    }
}

// --- Função de Inicialização ---

export function init() {
    // Mapeamento dos elementos do DOM
    formGerais = document.getElementById('form-param-gerais');
    tablePrecosTbody = document.querySelector('#table-precos-ano tbody');
    tableCustosTbody = document.querySelector('#table-custos-mes tbody');
    tableIpcaTbody = document.querySelector('#table-ajuste-ipca tbody');
    
    ipcaModal = document.getElementById('ipca-modal');
    ipcaForm = document.getElementById('ipca-form');
    precoMwhModal = document.getElementById('preco-mwh-modal');
    precoMwhForm = document.getElementById('preco-mwh-form');

    // Listener para o botão "Adicionar Ajuste IPCA"
    const addIpcaBtn = document.getElementById('add-ipca-btn');
    if(addIpcaBtn) addIpcaBtn.addEventListener('click', () => openIpcaEditModal(null, 'add'));
    
    // Listeners para os formulários dos modais
    if(ipcaForm) ipcaForm.addEventListener('submit', handleIpcaSubmit);
    if(precoMwhForm) precoMwhForm.addEventListener('submit', handlePrecoMwhSubmit);
    
    // Listener de delegação de eventos para todos os botões "Editar"
    const mainContainer = document.getElementById('app');
    if(mainContainer) {
        mainContainer.addEventListener('click', (event) => {
            const editButton = event.target.closest('.btn-edit');
            if (!editButton) return;

            const type = editButton.dataset.type;
            const row = editButton.closest('tr');
            
            if (type === 'ipca') openIpcaEditModal(row, 'edit');
            if (type === 'preco-mwh') openPrecoMwhEditModal(row);
            // Adicionar casos para 'custos-mes', etc.
        });
    }
    
    // Listener para carregar dados das abas secundárias quando são abertas
    const ajustesTab = document.querySelector('button[data-bs-target="#ajustes-tab"]');
    if(ajustesTab) {
        ajustesTab.addEventListener('show.bs.tab', async () => {
            if (ajustesTab.dataset.loaded) return;
            await loadAjustesTabData();
            ajustesTab.dataset.loaded = 'true';
        });
    }
    
    // Carrega os dados da primeira aba ao iniciar
    loadInitialParams();
}