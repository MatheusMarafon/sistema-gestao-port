import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// --- Mapeamento de todas as variáveis do DOM ---
let formGerais, saveAllParamsBtn;
let tablePrecosTbody, tableCustosTbody, tableIpcaTbody, tableTarifaTbody, tableDadosGeracaoTbody, tableCurvaGeracaoTbody;
let ipcaModal, ipcaForm, precoMwhModal, precoMwhForm, custosMesModal, custosMesForm, ajusteTarifaModal, ajusteTarifaForm;
let distribuidoraSelect;
let dadosGeracaoModal, dadosGeracaoForm, curvaGeracaoModal, curvaGeracaoForm;

// --- Funções de Renderização de Tabelas ---

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
    row.innerHTML = `<td>${item.Ano || ''}</td><td>${item.Fonte || ''}</td><td>${helpers.formatNumber(item.PrecoRS_MWh)}</td><td>${item.Corrigir || ''}</td><td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="preco-mwh">Editar</button></td>`;
}

function renderCustosRow(tbody, item) {
    const row = tbody.insertRow();
    row.dataset.mesRefOriginal = (typeof item.MesRef === 'string') ? item.MesRef.split('T')[0] : '';
    row.innerHTML = `<td>${item.MesRef ? new Date(item.MesRef).toLocaleDateString('pt-BR', {month: '2-digit', year: 'numeric', timeZone: 'UTC'}) : ''}</td><td>${helpers.formatNumber(item.LiqMCPACL)}</td><td>${helpers.formatNumber(item.LiqMCPAPE)}</td><td>${helpers.formatNumber(item.LiqEnerReserva)}</td><td>${helpers.formatNumber(item.LiqRCAP)}</td><td>${helpers.formatNumber(item.SpreadVenda)}</td><td>${helpers.formatNumber(item.ModelagemMes)}</td><td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="custos-mes">Editar</button></td>`;
}

function renderIpcaRow(tbody, item) {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${item.Ano}</td><td>${helpers.formatNumber(item.PctIPCA)}</td><td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="ipca">Editar</button></td>`;
}

function renderTarifaRow(tbody, item) {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${item.Ano}</td><td>${helpers.formatNumber(item.PctTusdkWP)}</td><td>${helpers.formatNumber(item.PctTusdkWFP)}</td><td>${helpers.formatNumber(item.PctTusdMWhP)}</td><td>${helpers.formatNumber(item.PctTusdMWhFP)}</td><td>${helpers.formatNumber(item.PctTEMWhP)}</td><td>${helpers.formatNumber(item.PctTEMWhFP)}</td><td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="ajuste-tarifa">Editar</button></td>`;
}

function renderDadosGeracaoRow(tbody, item) {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${item.Fonte || ''}</td><td>${item.Local || ''}</td><td>${item.VolumeMWhAno || ''}</td><td>${helpers.formatNumber(item.PrecoRS_MWh)}</td><td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="dados-geracao">Editar</button></td>`;
}

function renderCurvaGeracaoRow(tbody, item) {
    const row = tbody.insertRow();
    row.dataset.idmesOriginal = item.IdMes;
    const idMesFormatado = String(item.IdMes).replace(/(\d{4})(\d{2})/, '$1-$2');
    row.innerHTML = `<td>${idMesFormatado}</td><td>${item.Fonte || ''}</td><td>${item.Local || ''}</td><td>${helpers.formatNumber(item.PctSazonalizacaoMes)}</td><td><button type="button" class="btn btn-sm btn-warning btn-edit" data-type="curva-geracao">Editar</button></td>`;
}

function populateFormGerais(data) {
    if (!data || !formGerais) return;
    Object.keys(data).forEach(key => {
        const input = formGerais.querySelector(`[name="${key}"]`);
        if (input) input.value = data[key] || '';
    });
}

// --- Funções de Manipulação de Modais ---

function openIpcaEditModal(row, mode = 'edit') {
    if (!ipcaForm) return;
    ipcaForm.reset();
    ipcaForm.dataset.mode = mode;
    const anoInput = ipcaForm.querySelector('#ipca-ano');
    const title = ipcaForm.querySelector('#ipca-modal-title');
    
    if (mode === 'edit') {
        const ano = row.cells[0].textContent;
        const pct = row.cells[1].textContent;
        if(title) title.innerHTML = '<i class="fas fa-edit"></i> Editar Ajuste IPCA';
        ipcaForm.querySelector('#ipca-ano-original').value = ano;
        anoInput.value = ano;
        anoInput.disabled = true;
        ipcaForm.querySelector('#ipca-percentual').value = pct.replace(/\./g, '').replace(',', '.');
    } else {
        if(title) title.innerHTML = '<i class="fas fa-plus"></i> Adicionar Ajuste IPCA';
        anoInput.disabled = false;
    }
    ui.showModal('ipca-modal');
}

function openPrecoMwhEditModal(row) {
    if (!precoMwhForm) return;
    const [ano, fonte, preco, corrigir] = Array.from(row.cells).map(cell => cell.textContent);
    precoMwhForm.querySelector('#preco-mwh-ano-original').value = ano;
    precoMwhForm.querySelector('#preco-mwh-fonte-original').value = fonte;
    precoMwhForm.querySelector('#preco-mwh-ano').value = ano;
    precoMwhForm.querySelector('#preco-mwh-fonte').value = fonte;
    precoMwhForm.querySelector('#preco-mwh-preco').value = preco.replace(/\./g, '').replace(',', '.');
    precoMwhForm.querySelector('#preco-mwh-corrigir').value = corrigir;
    ui.showModal('preco-mwh-modal');
}

function openCustosMesEditModal(row) {
    if (!custosMesForm) return;
    custosMesForm.reset();
    custosMesForm.querySelector('#custos-mes-ref-original').value = row.dataset.mesRefOriginal;
    const cells = row.cells;
    custosMesForm.querySelector('#custos-mes-ref').value = cells[0].textContent;
    custosMesForm.querySelector('[name="LiqMCPACL"]').value = cells[1].textContent.replace(/\./g, '').replace(',', '.');
    custosMesForm.querySelector('[name="LiqMCPAPE"]').value = cells[2].textContent.replace(/\./g, '').replace(',', '.');
    custosMesForm.querySelector('[name="LiqEnerReserva"]').value = cells[3].textContent.replace(/\./g, '').replace(',', '.');
    custosMesForm.querySelector('[name="LiqRCAP"]').value = cells[4].textContent.replace(/\./g, '').replace(',', '.');
    custosMesForm.querySelector('[name="SpreadVenda"]').value = cells[5].textContent.replace(/\./g, '').replace(',', '.');
    custosMesForm.querySelector('[name="ModelagemMes"]').value = cells[6].textContent.replace(/\./g, '').replace(',', '.');
    ui.showModal('custos-mes-modal');
}

function openAjusteTarifaEditModal(row) {
    if (!ajusteTarifaForm || !distribuidoraSelect) return;
    const cnpj = distribuidoraSelect.value;
    const [ano, ...pcts] = Array.from(row.cells).map(cell => cell.textContent);
    
    ajusteTarifaForm.querySelector('#ajuste-tarifa-cnpj-original').value = cnpj;
    ajusteTarifaForm.querySelector('#ajuste-tarifa-ano-original').value = ano;
    ajusteTarifaForm.querySelector('[name="CnpjDistribuidora"]').value = cnpj;
    ajusteTarifaForm.querySelector('[name="Ano"]').value = ano;
    const names = ["PctTusdkWP", "PctTusdkWFP", "PctTusdMWhP", "PctTusdMWhFP", "PctTEMWhP", "PctTEMWhFP"];
    pcts.slice(0, -1).forEach((pct, index) => {
        ajusteTarifaForm.querySelector(`[name="${names[index]}"]`).value = pct.replace(/\./g, '').replace(',', '.');
    });
    
    ui.showModal('ajuste-tarifa-modal');
}

// --- Handlers de Submissão de Formulários ---

async function handleIpcaSubmit(event) {
    event.preventDefault();
    const formData = new FormData(ipcaForm);
    const data = Object.fromEntries(formData.entries());
    const mode = ipcaForm.dataset.mode;

    try {
        const result = (mode === 'edit')
            ? await api.updateAjusteIpca(data.AnoOriginal, data)
            : await api.saveAjusteIpca(data);
        ui.showAlert(result.sucesso, 'success');
        ui.hideModal('ipca-modal');
        await loadAjustesTabData();
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
        ui.showAlert(result.sucesso, 'success');
        ui.hideModal('preco-mwh-modal');
        await loadInitialParams();
    } catch(error) {
        ui.showAlert(`Erro ao salvar Preço MWh: ${error.message}`, 'error');
    }
}

async function handleCustosMesSubmit(event) {
    event.preventDefault();
    const formData = new FormData(custosMesForm);
    const data = Object.fromEntries(formData.entries());
    const mesRefOriginal = custosMesForm.querySelector('#custos-mes-ref-original').value;
    try {
        const result = await api.updateCustosMes(mesRefOriginal, data);
        ui.showAlert(result.sucesso, 'success');
        ui.hideModal('custos-mes-modal');
        await loadInitialParams();
    } catch (error) {
        ui.showAlert(`Erro ao salvar Custos Base: ${error.message}`, 'error');
    }
}

async function handleAjusteTarifaSubmit(event) {
    event.preventDefault();
    const formData = new FormData(ajusteTarifaForm);
    const data = Object.fromEntries(formData.entries());
    const cnpjOriginal = ajusteTarifaForm.querySelector('#ajuste-tarifa-cnpj-original').value;
    const anoOriginal = ajusteTarifaForm.querySelector('#ajuste-tarifa-ano-original').value;

    try {
        const result = await api.updateAjusteTarifa(cnpjOriginal, anoOriginal, data);
        ui.showAlert(result.sucesso, 'success');
        ui.hideModal('ajuste-tarifa-modal');
        await loadAjusteTarifaTable(cnpjOriginal);
    } catch (error) {
        ui.showAlert(`Erro ao salvar Ajuste de Tarifa: ${error.message}`, 'error');
    }
}

function openDadosGeracaoEditModal(row) {
    if (!dadosGeracaoForm) return;
    const [fonte, local, volume, preco] = Array.from(row.cells).map(cell => cell.textContent);
    dadosGeracaoForm.querySelector('#dados-geracao-fonte-original').value = fonte;
    dadosGeracaoForm.querySelector('#dados-geracao-local-original').value = local;
    dadosGeracaoForm.querySelector('[name="Fonte"]').value = fonte;
    dadosGeracaoForm.querySelector('[name="Local"]').value = local;
    dadosGeracaoForm.querySelector('[name="VolumeMWhAno"]').value = volume.replace(/\./g, '').replace(',', '.');
    dadosGeracaoForm.querySelector('[name="PrecoRS_MWh"]').value = preco.replace(/\./g, '').replace(',', '.');
    ui.showModal('dados-geracao-modal');
}

function openCurvaGeracaoEditModal(row) {
    if (!curvaGeracaoForm) return;
    const [idMes, fonte, local, pct] = Array.from(row.cells).map(cell => cell.textContent);
    curvaGeracaoForm.querySelector('#curva-geracao-idmes-original').value = row.dataset.idmesOriginal;
    curvaGeracaoForm.querySelector('#curva-geracao-fonte-original').value = fonte;
    curvaGeracaoForm.querySelector('#curva-geracao-local-original').value = local;
    curvaGeracaoForm.querySelector('[name="IdMes"]').value = idMes;
    curvaGeracaoForm.querySelector('[name="Fonte"]').value = fonte;
    curvaGeracaoForm.querySelector('[name="Local"]').value = local;
    curvaGeracaoForm.querySelector('[name="PctSazonalizacaoMes"]').value = pct.replace(/\./g, '').replace(',', '.');
    ui.showModal('curva-geracao-modal');
}

async function handleDadosGeracaoSubmit(event) {
    event.preventDefault();
    const formData = new FormData(dadosGeracaoForm);
    const data = Object.fromEntries(formData.entries());
    const fonteOriginal = dadosGeracaoForm.querySelector('#dados-geracao-fonte-original').value;
    const localOriginal = dadosGeracaoForm.querySelector('#dados-geracao-local-original').value;
    try {
        const result = await api.updateDadosGeracao(fonteOriginal, localOriginal, data);
        ui.showAlert(result.sucesso, 'success');
        ui.hideModal('dados-geracao-modal');
        await loadGeracaoTabData();
    } catch (error) {
        ui.showAlert(`Erro ao salvar Dados de Geração: ${error.message}`, 'error');
    }
}

async function handleCurvaGeracaoSubmit(event) {
    event.preventDefault();
    const formData = new FormData(curvaGeracaoForm);
    const data = Object.fromEntries(formData.entries());
    const idmesOriginal = curvaGeracaoForm.querySelector('#curva-geracao-idmes-original').value;
    const fonteOriginal = curvaGeracaoForm.querySelector('#curva-geracao-fonte-original').value;
    const localOriginal = curvaGeracaoForm.querySelector('#curva-geracao-local-original').value;
    try {
        const result = await api.updateCurvaGeracao(idmesOriginal, fonteOriginal, localOriginal, data);
        ui.showAlert(result.sucesso, 'success');
        ui.hideModal('curva-geracao-modal');
        await loadGeracaoTabData();
    } catch (error) {
        ui.showAlert(`Erro ao salvar Curva de Geração: ${error.message}`, 'error');
    }
}

async function handleSaveGeneralParams(event) {
    event.preventDefault();
    if (!formGerais) return;

    const formData = new FormData(formGerais);
    const data = Object.fromEntries(formData.entries());

    try {
        const result = await api.saveGeneralParams(data);
        ui.showAlert(result.sucesso, 'success');
    } catch (error) {
        ui.showAlert(`Erro ao salvar parâmetros gerais: ${error.message}`, 'error');
    }
}
// --- Funções de Carregamento de Dados ---

async function loadInitialParams() {
    try {
        const params = await api.getParametros();
        renderTable(tablePrecosTbody, params.precos_ano, renderPrecosRow);
        renderTable(tableCustosTbody, params.custos_mes, renderCustosRow);
        if(formGerais) {
            populateFormGerais(params.simulacao_geral);
        }
    } catch (error) {
        console.error("ERRO GRAVE em loadInitialParams:", error);
        ui.showAlert(`Erro ao carregar parâmetros iniciais: ${error.message}`, 'error');
    }
}

async function loadAjusteTarifaTable(cnpj) {
    if (!cnpj) {
        renderTable(tableTarifaTbody, [], renderTarifaRow);
        return;
    }
    try {
        const tarifaData = await api.getAjusteTarifa(cnpj);
        renderTable(tableTarifaTbody, tarifaData, renderTarifaRow);
    } catch(error) {
        ui.showAlert(`Erro ao carregar tarifas: ${error.message}`, 'error');
    }
}

async function loadAjustesTabData() {
    try {
        const [ipcaData, distribuidorasData] = await Promise.all([
            api.getAjusteIpca(),
            api.getDistribuidoras()
        ]);
        renderTable(tableIpcaTbody, ipcaData, renderIpcaRow);
        if (distribuidoraSelect) {
            distribuidoraSelect.innerHTML = '<option value="">Selecione uma distribuidora...</option>';
            distribuidorasData.forEach(cnpj => {
                distribuidoraSelect.add(new Option(cnpj, cnpj));
            });
        }
    } catch (error) {
        ui.showAlert(`Erro ao carregar dados de ajustes: ${error.message}`, 'error');
    }
}

async function loadGeracaoTabData() {
    try {
        const geracaoData = await api.getDadosGeracao();
        renderTable(tableDadosGeracaoTbody, geracaoData.dados_geracao, renderDadosGeracaoRow);
        renderTable(tableCurvaGeracaoTbody, geracaoData.curva_geracao, renderCurvaGeracaoRow);
    } catch (error) {
        ui.showAlert(`Erro ao carregar dados de geração: ${error.message}`, 'error');
    }
}

// --- Função Principal de Inicialização ---

export function init() {
    // Mapeamento de elementos
    formGerais = document.getElementById('form-param-gerais');
    tablePrecosTbody = document.querySelector('#table-precos-ano tbody');
    tableCustosTbody = document.querySelector('#table-custos-mes tbody');
    tableIpcaTbody = document.querySelector('#table-ajuste-ipca tbody');
    tableTarifaTbody = document.querySelector('#table-ajuste-tarifa tbody');
    tableDadosGeracaoTbody = document.querySelector('#table-dados-geracao tbody');
    tableCurvaGeracaoTbody = document.querySelector('#table-curva-geracao tbody');
    dadosGeracaoModal = document.getElementById('dados-geracao-modal');
    dadosGeracaoForm = document.getElementById('dados-geracao-form');
    curvaGeracaoModal = document.getElementById('curva-geracao-modal');
    curvaGeracaoForm = document.getElementById('curva-geracao-form');
    distribuidoraSelect = document.getElementById('ajuste-tarifa-distribuidora-select');
    saveAllParamsBtn = document.getElementById('save-all-params');
    
    ipcaModal = document.getElementById('ipca-modal');
    ipcaForm = document.getElementById('ipca-form');
    precoMwhModal = document.getElementById('preco-mwh-modal');
    precoMwhForm = document.getElementById('preco-mwh-form');
    custosMesModal = document.getElementById('custos-mes-modal');
    custosMesForm = document.getElementById('custos-mes-form');
    ajusteTarifaModal = document.getElementById('ajuste-tarifa-modal');
    ajusteTarifaForm = document.getElementById('ajuste-tarifa-form');
    
    // Mapear aqui os modais/forms de Geração

    // Listeners para os forms
    if(ipcaForm) ipcaForm.addEventListener('submit', handleIpcaSubmit);
    if(precoMwhForm) precoMwhForm.addEventListener('submit', handlePrecoMwhSubmit);
    if(custosMesForm) custosMesForm.addEventListener('submit', handleCustosMesSubmit);
    if(ajusteTarifaForm) ajusteTarifaForm.addEventListener('submit', handleAjusteTarifaSubmit);
    if(dadosGeracaoForm) dadosGeracaoForm.addEventListener('submit', handleDadosGeracaoSubmit);
    if(curvaGeracaoForm) curvaGeracaoForm.addEventListener('submit', handleCurvaGeracaoSubmit);
    if(saveAllParamsBtn) {saveAllParamsBtn.addEventListener('click', handleSaveGeneralParams);}

    
    // Listener de delegação de eventos
    const mainContainer = document.getElementById('app');
    if(mainContainer) {
        mainContainer.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            if (button.classList.contains('btn-edit')) {
                const type = button.dataset.type;
                const row = button.closest('tr');
                if (type === 'ipca') openIpcaEditModal(row, 'edit');
                if (type === 'preco-mwh') openPrecoMwhEditModal(row);
                if (type === 'custos-mes') openCustosMesEditModal(row);
                if (type === 'ajuste-tarifa') openAjusteTarifaEditModal(row);
                if (type === 'dados-geracao') openDadosGeracaoEditModal(row);
                if (type === 'curva-geracao') openCurvaGeracaoEditModal(row);
            }
            if (button.id === 'add-ipca-btn') {
                openIpcaEditModal(null, 'add');
            }
        });
    }
    
    if(distribuidoraSelect) {
        distribuidoraSelect.addEventListener('change', (e) => loadAjusteTarifaTable(e.target.value));
    }
    
    // Listeners para carregar dados das abas
    const ajustesTab = document.querySelector('button[data-bs-target="#ajustes-tab"]');
    if(ajustesTab) {
        ajustesTab.addEventListener('show.bs.tab', async () => {
            if (ajustesTab.dataset.loaded) return;
            await loadAjustesTabData();
            ajustesTab.dataset.loaded = 'true';
        });
    }

    const geracaoTab = document.querySelector('button[data-bs-target="#geracao-tab"]');
    if(geracaoTab) {
        geracaoTab.addEventListener('show.bs.tab', async () => {
            if (geracaoTab.dataset.loaded) return;
            await loadGeracaoTabData();
            geracaoTab.dataset.loaded = 'true';
        });
    }
    
    loadInitialParams();
}

