import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// Variáveis de escopo do módulo
let leadSelector, unidadesTableBody, historicoTableBody, addUnidadeBtn,
    unidadesListingScreen, unidadesFormScreen, unidadesBackBtn, unidadeForm,
    unidadesSubtitle, unidadesFormTitle, clearUnidadeButton,
    ufUnidadeSelect, cidadeUnidadeSelect, cepUnidadeInput;

let currentLead = { id: null, razaoSocial: null };
let currentUnidade = { id: null, dados: null };
let isEditing = false;

async function loadLeadsIntoSelector() {
    try {
        const leads = await api.getLeads();
        leadSelector.innerHTML = '<option value="">Selecione um Lead...</option>';
        leads.forEach(lead => {
            const option = new Option(`${lead.RazaoSocialLead} (${helpers.formatCpfCnpj(lead.Cpf_CnpjLead)})`, lead.Cpf_CnpjLead);
            leadSelector.add(option);
        });
    } catch (error) {
        ui.showAlert('Erro ao carregar leads no seletor.', 'error');
    }
}

function renderUnidadesTable(unidades) {
    unidadesTableBody.innerHTML = '';
    if (!unidades || unidades.length === 0) {
        unidadesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhuma unidade cadastrada para este lead.</td></tr>';
        return;
    }

    unidades.forEach(unidade => {
        const row = unidadesTableBody.insertRow();
        row.style.cursor = 'pointer';
        row.dataset.unidadeId = unidade.NumeroDaUcLead;
        row.innerHTML = `
            <td>${unidade.NumeroDaUcLead}</td>
            <td>${unidade.NomeDaUnidade || ''}</td>
            <td>${helpers.formatCpfCnpj(unidade.CnpjDaUnidadeConsumidora)}</td>
            <td>${unidade.Logradouro || ''}</td>
            <td>${unidade.Cidade || ''}</td>
            <td>${unidade.Uf || ''}</td>
            <td>${unidade.MercadoAtual || ''}</td>
            <td class="actions-cell">
                <button type="button" class="btn btn-sm btn-warning btn-edit" title="Editar Unidade"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn btn-sm btn-danger btn-delete" title="Excluir Unidade"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        row.querySelector('.btn-edit').addEventListener('click', (e) => { e.stopPropagation(); handleEditUnidadeClick(unidade); });
        row.querySelector('.btn-delete').addEventListener('click', (e) => { e.stopPropagation(); handleDeleteUnidadeClick(unidade); });
        row.addEventListener('click', () => handleUnidadeSelection(unidade, row));
    });
}

async function loadUnidadesForLead(leadId) {
    unidadesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Carregando unidades...</td></tr>';
    historicoTableBody.innerHTML = '';
    currentUnidade = { id: null, dados: null };

    try {
        const unidades = await api.getUnidadesByLead(leadId);
        renderUnidadesTable(unidades);
        if (unidades.length > 0) {
            unidadesTableBody.querySelector('tr').click();
        }
    } catch (error) {
        ui.showAlert(`Erro ao carregar unidades: ${error.message}`, 'error');
    }
}

async function loadHistoryPreview(ucId) {
    historicoTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Carregando histórico...</td></tr>';
    try {
        const historicos = await api.getHistoricoCompleto(ucId);
        historicoTableBody.innerHTML = '';
        if (historicos.length === 0) {
            historicoTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum histórico encontrado.</td></tr>';
            return;
        }
        historicos.slice(0, 12).forEach(h => {
            const row = historicoTableBody.insertRow();
            row.innerHTML = `
                <td class="table-info">${helpers.formatToMesAno(h.IDMes)}</td>
                <td>${helpers.formatNumber(h.DemandaCP)}</td>
                <td>${helpers.formatNumber(h.DemandaCFP)}</td>
                <td>${helpers.formatNumber(h.DemandaCG)}</td>
                <td>${helpers.formatNumber(h.kWhProjPonta)}</td>
                <td>${helpers.formatNumber(h.kWhProjForaPonta)}</td>
                <td>${helpers.formatDate(h.DataRegistroHistorico)}</td>
            `;
        });
    } catch (error) {
        ui.showAlert(`Erro ao carregar histórico: ${error.message}`, 'error');
    }
}

function handleUnidadeSelection(unidade, rowElement) {
    currentUnidade = { id: unidade.NumeroDaUcLead, dados: unidade };
    Array.from(unidadesTableBody.querySelectorAll('tr.table-active')).forEach(row => row.classList.remove('table-active'));
    rowElement.classList.add('table-active');
    loadHistoryPreview(unidade.NumeroDaUcLead);
}

function switchToUnidadeForm() {
    unidadesListingScreen.classList.add('d-none');
    unidadesFormScreen.classList.remove('d-none');
}

function switchToListing() {
    unidadesFormScreen.classList.add('d-none');
    unidadesListingScreen.classList.remove('d-none');
}

function resetUnidadeForm() {
    if (unidadeForm) unidadeForm.reset();
    isEditing = false;
    const ucInput = unidadeForm.querySelector('[name="NumeroDaUcLead"]');
    if (ucInput) ucInput.disabled = false;
    if (unidadesFormTitle) unidadesFormTitle.innerHTML = '<i class="fas fa-plug"></i> Nova Unidade Consumidora';
    if (cidadeUnidadeSelect) {
        cidadeUnidadeSelect.innerHTML = '<option value="">Selecione um estado</option>';
        cidadeUnidadeSelect.disabled = true;
    }
}

async function loadStatesForUnidade() {
    if (!ufUnidadeSelect) return;
    try {
        const estados = await api.getEstados();
        ufUnidadeSelect.innerHTML = '<option value="">Selecione...</option>';
        estados.forEach(uf => ufUnidadeSelect.add(new Option(uf, uf)));
    } catch (error) {
        ui.showAlert('Erro ao carregar estados.', 'error');
    }
}

async function loadCitiesForUnidade(uf, cityCodeToSelect = null) {
    if (!cidadeUnidadeSelect) return;
    if (!uf) {
        cidadeUnidadeSelect.innerHTML = '<option value="">Selecione um estado</option>';
        cidadeUnidadeSelect.disabled = true;
        return;
    }
    cidadeUnidadeSelect.disabled = false;
    cidadeUnidadeSelect.innerHTML = '<option value="">Carregando...</option>';
    try {
        const cidades = await api.getCidades(uf);
        cidadeUnidadeSelect.innerHTML = '<option value="">Selecione...</option>';
        cidades.forEach(cidade => cidadeUnidadeSelect.add(new Option(cidade.Cidade, cidade.Codigo)));
        if (cityCodeToSelect) {
            cidadeUnidadeSelect.value = cityCodeToSelect;
        }
    } catch (error) {
        ui.showAlert('Erro ao carregar cidades.', 'error');
    }
}

async function handleCepBlurForUnidade(event) {
    const cep = event.target.value;
    if (String(cep).replace(/\D/g, '').length !== 8) return;
    const data = await api.buscarViaCep(cep);
    if (data && unidadeForm) {
        unidadeForm.querySelector('[name="Logradouro"]').value = data.logradouro || '';
        unidadeForm.querySelector('[name="Bairro"]').value = data.bairro || '';
        if (ufUnidadeSelect) ufUnidadeSelect.value = data.uf;
        await loadCitiesForUnidade(data.uf, data.ibge);
    }
}

function handleAddUnidadeClick() {
    if (!currentLead.id) {
        return ui.showAlert('Por favor, selecione um lead antes de adicionar uma unidade.', 'error');
    }
    resetUnidadeForm();
    isEditing = false;
    unidadesSubtitle.innerText = `Nova Unidade para o lead: ${currentLead.razaoSocial}`;
    switchToUnidadeForm();
}

async function handleEditUnidadeClick(unidade) {
    resetUnidadeForm();
    isEditing = true;
    unidadesSubtitle.innerText = `Editando Unidade ${unidade.NumeroDaUcLead} do lead: ${currentLead.razaoSocial}`;
    
    try {
        const unidadeData = await api.getUnidadeById(unidade.NumeroDaUcLead);
        for (const key in unidadeData) {
            const input = unidadeForm.querySelector(`[name="${key}"]`);
            if (input) {
                if (key === 'Uf') {
                    input.value = unidadeData[key];
                    await loadCitiesForUnidade(unidadeData.Uf, unidadeData.Cidade);
                } else if (key === 'PossuiUsina') {
                    const radioValue = unidadeData[key] ? 'sim' : 'nao';
                    unidadeForm.querySelector(`input[name="possui_usina"][value="${radioValue}"]`).checked = true;
                } else {
                    input.value = unidadeData[key] || '';
                }
            }
        }
        
        document.getElementById('unidade-id-original').value = unidade.NumeroDaUcLead;
        unidadeForm.querySelector('[name="NumeroDaUcLead"]').disabled = true;
        unidadesFormTitle.innerHTML = '<i class="fas fa-edit"></i> Editando Unidade Consumidora';
        switchToUnidadeForm();
    } catch(error) {
        ui.showAlert(`Erro ao carregar dados da unidade: ${error.message}`, 'error');
    }
}

async function handleUnidadeFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(unidadeForm);
    const unidadeData = Object.fromEntries(formData.entries());
    
    const possuiUsinaRadio = unidadeForm.querySelector('input[name="possui_usina"]:checked');
    unidadeData.PossuiUsina = possuiUsinaRadio ? possuiUsinaRadio.value === 'sim' : false;
    
    if (isEditing) {
        const ucIdOriginal = document.getElementById('unidade-id-original').value;
        unidadeData.NumeroDaUcLead = ucIdOriginal; 
        unidadeData.Cpf_CnpjLead = currentLead.id; 
    }
    
    if (!unidadeData.NumeroDaUcLead) {
        return ui.showAlert('O Nº da UC é obrigatório.', 'error');
    }

    try {
        const result = isEditing
            ? await api.updateUnidade(unidadeData.NumeroDaUcLead, unidadeData)
            : await api.saveUnidade(currentLead.id, unidadeData);
        
        ui.showAlert(result.sucesso, 'success');
        switchToListing();
        await loadUnidadesForLead(currentLead.id);
    } catch (error) {
        ui.showAlert(`Erro ao salvar unidade: ${error.message}`, 'error');
    }
}

async function handleDeleteUnidadeClick(unidade) {
    const confirmed = await ui.showConfirm(`Tem certeza que deseja excluir a unidade ${unidade.NumeroDaUcLead}?`);
    if (confirmed) {
        try {
            const result = await api.deleteUnidade(unidade.NumeroDaUcLead, currentLead.id);
            ui.showAlert(result.sucesso, 'success');
            await loadUnidadesForLead(currentLead.id);
        } catch (error) {
            ui.showAlert(`Erro ao excluir unidade: ${error.message}`, 'error');
        }
    }
}

export function init() {
    leadSelector = document.getElementById('lead-selector');
    unidadesTableBody = document.querySelector('#unidades-table tbody');
    historicoTableBody = document.querySelector('#unidade-historico-table tbody');
    addUnidadeBtn = document.getElementById('add-unidade-btn');
    unidadesListingScreen = document.getElementById('unidades-listing-screen');
    unidadesFormScreen = document.getElementById('unidades-form-screen');
    unidadesBackBtn = document.getElementById('unidades-back-btn');
    unidadeForm = document.getElementById('unidade-form');
    unidadesSubtitle = document.getElementById('unidades-subtitle');
    unidadesFormTitle = document.getElementById('unidades-form-title');
    clearUnidadeButton = document.getElementById('clear-unidade-button');
    ufUnidadeSelect = unidadeForm ? unidadeForm.querySelector('.uf-unidade-select') : null;
    cidadeUnidadeSelect = unidadeForm ? unidadeForm.querySelector('.cidade-unidade-select') : null;
    cepUnidadeInput = unidadeForm ? unidadeForm.querySelector('[name="Cep"]') : null;

    if (leadSelector) {
        leadSelector.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            currentLead = {
                id: e.target.value,
                razaoSocial: selectedOption.text.split(' (')[0]
            };
            if (currentLead.id) {
                loadUnidadesForLead(currentLead.id);
            } else {
                if(unidadesTableBody) unidadesTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Selecione um lead acima.</td></tr>';
                if(historicoTableBody) historicoTableBody.innerHTML = '';
            }
        });
    }

    if(addUnidadeBtn) addUnidadeBtn.addEventListener('click', handleAddUnidadeClick);
    if(unidadesBackBtn) unidadesBackBtn.addEventListener('click', switchToListing);
    if(unidadeForm) unidadeForm.addEventListener('submit', handleUnidadeFormSubmit);
    if(clearUnidadeButton) clearUnidadeButton.addEventListener('click', resetUnidadeForm);
    if(ufUnidadeSelect) ufUnidadeSelect.addEventListener('change', () => loadCitiesForUnidade(ufUnidadeSelect.value));
    if(cepUnidadeInput) cepUnidadeInput.addEventListener('blur', handleCepBlurForUnidade);
    
    loadLeadsIntoSelector();
    if(unidadeForm) loadStatesForUnidade();
}

