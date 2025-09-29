import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// --- Variáveis de escopo do módulo ---
let listingScreen, formScreen, addPropostaBtn, backBtn, refreshBtn,
    filterInput, tableBody, propostaForm, leadSelector, unidadeSelector,
    clearPropostaBtn;
    
let isEditing = false;
let currentPropostaId = null;
let debounceTimer;

// --- Funções de Renderização e Carregamento ---

async function loadPropostas() {
    if(!tableBody) return;
    try {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Carregando propostas...</td></tr>';
        const propostas = await api.getPropostas(filterInput.value);
        renderPropostasTable(propostas);
    } catch (error) {
        ui.showAlert(`Erro ao carregar propostas: ${error.message}`, 'error');
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Falha ao carregar dados.</td></tr>';
    }
}

function renderPropostasTable(propostas) {
    tableBody.innerHTML = '';
    if (!propostas || propostas.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhuma proposta encontrada.</td></tr>';
        return;
    }
    propostas.forEach(p => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${p.NProposta || ''}</td>
            <td>${p.AgenteDeVenda || ''}</td>
            <td>${p.StatusNegociacao || ''}</td>
            <td>${helpers.formatDate(p.DataStatusNegociacao)}</td>
            <td>${p.RazaoSocialLead || ''}</td>
            <td>${p.NomeContato || ''}</td>
            <td>${p.Usuario || ''}</td>
            <td class="actions-cell">
                <button type="button" class="btn btn-sm btn-warning btn-edit" title="Editar Proposta"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn btn-sm btn-danger btn-delete" title="Excluir Proposta"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        row.querySelector('.btn-edit').addEventListener('click', () => handleEditClick(p));
        row.querySelector('.btn-delete').addEventListener('click', () => handleDeleteClick(p));
    });
}

async function loadLeadsIntoSelector() {
    if(!leadSelector) return;
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

async function loadUnidadesIntoSelector(leadId) {
    if(!unidadeSelector) return;
    unidadeSelector.disabled = true;
    unidadeSelector.innerHTML = '<option value="">Carregando...</option>';
    if (!leadId) {
        unidadeSelector.innerHTML = '<option value="">Selecione um lead</option>';
        return;
    }
    try {
        const unidades = await api.getUnidadesByLead(leadId);
        unidadeSelector.innerHTML = '<option value="">Selecione uma Unidade...</option>';
        unidades.forEach(unidade => {
            const option = new Option(`${unidade.NumeroDaUcLead} - ${unidade.NomeDaUnidade || 'Sem Nome'}`, unidade.NumeroDaUcLead);
            unidadeSelector.add(option);
        });
        unidadeSelector.disabled = false;
    } catch (error) {
        ui.showAlert('Erro ao carregar unidades.', 'error');
    }
}

// --- Funções de Controlo de Ecrã e Formulário ---

function resetPropostaForm() {
    if(propostaForm) propostaForm.reset();
    if(unidadeSelector) {
        unidadeSelector.innerHTML = '<option value="">Selecione um lead primeiro</option>';
        unidadeSelector.disabled = true;
    }
    if(leadSelector) leadSelector.selectedIndex = 0;
}

function switchToForm(isEditMode = false) {
    resetPropostaForm();
    isEditing = isEditMode;
    currentPropostaId = null;

    const formTitle = document.getElementById('proposta-form-title');
    if (formTitle) formTitle.innerHTML = `<i class="fas fa-plus"></i> Nova Proposta`;

    if(leadSelector) leadSelector.disabled = isEditMode;
    
    listingScreen.classList.add('d-none');
    formScreen.classList.remove('d-none');
}

function switchToListing() {
    formScreen.classList.add('d-none');
    listingScreen.classList.remove('d-none');
}

// --- Handlers de Ações (Editar, Excluir, Submeter) ---

async function handleEditClick(proposta) {
    switchToForm(true);
    const formTitle = document.getElementById('proposta-form-title');
    if(formTitle) formTitle.innerHTML = `<i class="fas fa-edit"></i> Editando Proposta #${proposta.NProposta}`;
    currentPropostaId = proposta.NProposta;
    
    try {
        const fullProposta = await api.getPropostaById(proposta.NProposta);
        
        propostaForm.querySelector('[name="AgenteDeVenda"]').value = fullProposta.AgenteDeVenda || '';
        propostaForm.querySelector('[name="StatusNegociacao"]').value = fullProposta.StatusNegociacao || '';
        propostaForm.querySelector('[name="DataDeEnvio"]').value = helpers.formatDate(fullProposta.DataDeEnvio);
        propostaForm.querySelector('[name="DataValidade"]').value = helpers.formatDate(fullProposta.DataValidade);
        propostaForm.querySelector('[name="DataStatusNegociacao"]').value = helpers.formatDate(fullProposta.DataStatusNegociacao);
        
        leadSelector.innerHTML = `<option selected>${fullProposta.RazaoSocialLead}</option>`;
        
        const ucResponse = await api.getUnidadesByLead(fullProposta.Cpf_CnpjLead);
        const ucData = ucResponse.find(uc => uc.NumeroDaUcLead === fullProposta.NumeroDaUcLead);
        unidadeSelector.innerHTML = `<option selected>${ucData ? ucData.NomeDaUnidade : fullProposta.NumeroDaUcLead}</option>`;

    } catch (error) {
        ui.showAlert(`Erro ao carregar dados da proposta: ${error.message}`, 'error');
        switchToListing();
    }
}

async function handleDeleteClick(proposta) {
    const confirmed = await ui.showConfirm(`Tem certeza que deseja excluir a proposta Nº ${proposta.NProposta}?`); 
    
    if (confirmed) {
        try {
            const result = await api.deleteProposta(proposta.NProposta);
            ui.showAlert(result.sucesso, 'success');
            await loadPropostas();
        } catch (error) {
            ui.showAlert(`Erro ao excluir proposta: ${error.message}`, 'error');
        }
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(propostaForm);
    const propostaData = Object.fromEntries(formData.entries());

    try {
        let result;
        if (isEditing) {
            result = await api.updateProposta(currentPropostaId, propostaData);
        } else {
            if (!propostaData.Cpf_CnpjLead || !propostaData.NumeroDaUcLead) {
                return ui.showAlert('Lead e Unidade são obrigatórios para uma nova proposta!', 'error');
            }
            result = await api.saveProposta(propostaData);
        }
        ui.showAlert(result.sucesso, 'success');
        switchToListing();
        await loadPropostas();
    } catch (error) {
        ui.showAlert(`Erro ao salvar proposta: ${error.message}`, 'error');
    }
}

// --- Função de Inicialização ---

export function init() {
    listingScreen = document.getElementById('proposta-listing-screen');
    formScreen = document.getElementById('proposta-form-screen');
    addPropostaBtn = document.getElementById('add-proposta-btn');
    backBtn = document.getElementById('proposta-back-btn');
    refreshBtn = document.getElementById('refresh-propostas-btn');
    filterInput = document.getElementById('filter-propostas');
    tableBody = document.querySelector('#propostas-table tbody');
    propostaForm = document.getElementById('proposta-form');
    leadSelector = document.getElementById('proposta-lead-selector');
    unidadeSelector = document.getElementById('proposta-unidade-selector');
    clearPropostaBtn = document.getElementById('clear-proposta-button');

    if(addPropostaBtn) addPropostaBtn.addEventListener('click', () => switchToForm(false));
    if(backBtn) backBtn.addEventListener('click', switchToListing);
    if(refreshBtn) refreshBtn.addEventListener('click', loadPropostas);
    if(propostaForm) propostaForm.addEventListener('submit', handleFormSubmit);
    if(clearPropostaBtn) clearPropostaBtn.addEventListener('click', resetPropostaForm);
    if(leadSelector) leadSelector.addEventListener('change', (e) => loadUnidadesIntoSelector(e.target.value));

    if(filterInput) {
        filterInput.addEventListener('keyup', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadPropostas, 400);
        });
    }

    document.body.addEventListener('click', (e) => {
        const dateInput = e.target.closest('.datepicker-input');
        if (dateInput) {
            ui.openCalendar(dateInput);
        }
    });

    loadPropostas();
    loadLeadsIntoSelector();
}

