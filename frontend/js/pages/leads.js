import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// --- Variáveis de escopo do módulo ---
let listingScreen, formScreen, addLeadBtn, backBtn, refreshBtn, filterInput,
    tableBody, leadForm, formTitle, cpfCnpjInput, cepInput, ufSelect, cidadeSelect,
    clearLeadBtn;

let isEditing = false;
let currentLeadId = null;
let debounceTimer;

// --- Funções de Renderização ---

function renderLeadsTable(leads) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (!leads || leads.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum lead encontrado.</td></tr>';
        return;
    }
    leads.forEach(lead => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${helpers.formatCpfCnpj(lead.Cpf_CnpjLead)}</td>
            <td>${lead.RazaoSocialLead || ''}</td>
            <td>${lead.NomeFantasia || ''}</td>
            <td>${lead.Vendedor || ''}</td>
            <td>${lead.Contato || ''}</td>
            <td>${helpers.formatDate(lead.DataResgistroLead)}</td>
            <td>${lead.UsuriaEditorRegistro || ''}</td>
            <td class="actions-cell">
                <button type="button" class="btn btn-sm btn-info btn-vendedor" title="Vendedor/Contato"><i class="fas fa-user-tie"></i></button>
                <button type="button" class="btn btn-sm btn-warning btn-edit" title="Editar Lead"><i class="fas fa-edit"></i></button>
            </td>
        `;
        row.querySelector('.btn-vendedor').addEventListener('click', (e) => { e.stopPropagation(); handleVendedorClick(lead); });
        row.querySelector('.btn-edit').addEventListener('click', (e) => { e.stopPropagation(); handleEditClick(lead.Cpf_CnpjLead); });
    });
}

// --- Funções de Lógica e Carregamento de Dados ---

async function loadLeads() {
    try {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Carregando...</td></tr>';
        const filterValue = filterInput ? filterInput.value : '';
        const leads = await api.getLeads(filterValue);
        renderLeadsTable(leads);
    } catch (error) {
        ui.showAlert(`Erro ao carregar leads: ${error.message}`, 'error');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Falha ao carregar dados.</td></tr>';
    }
}

async function loadStates() {
    if (!ufSelect) return;
    try {
        const estados = await api.getEstados();
        ufSelect.innerHTML = '<option value="">Selecione...</option>';
        estados.forEach(uf => ufSelect.add(new Option(uf, uf)));
    } catch (error) {
        ui.showAlert('Erro ao carregar estados.', 'error');
    }
}

async function loadCities(uf, cityCodeToSelect = null) {
    if (!cidadeSelect) return;
    if (!uf) {
        cidadeSelect.innerHTML = '<option value="">Selecione um estado</option>';
        cidadeSelect.disabled = true;
        return;
    }
    cidadeSelect.disabled = false;
    cidadeSelect.innerHTML = '<option value="">Carregando...</option>';
    try {
        const cidades = await api.getCidades(uf);
        cidadeSelect.innerHTML = '<option value="">Selecione...</option>';
        cidades.forEach(cidade => cidadeSelect.add(new Option(cidade.Cidade, cidade.Codigo)));
        if (cityCodeToSelect) {
            cidadeSelect.value = cityCodeToSelect;
        }
    } catch (error) {
        ui.showAlert('Erro ao carregar cidades.', 'error');
    }
}

async function handleCepBlur(event) {
    const cep = event.target.value;
    if (String(cep).replace(/\D/g, '').length !== 8) return;
    try {
        const data = await api.buscarViaCep(cep);
        if (data && leadForm) {
            leadForm.querySelector('[name="Logradouro"]').value = data.logradouro || '';
            leadForm.querySelector('[name="Bairro"]').value = data.bairro || '';
            if (ufSelect) ufSelect.value = data.uf;
            await loadCities(data.uf, data.ibge);
        }
    } catch (error) {
        ui.showAlert('Erro ao buscar informações do CEP.', 'error');
    }
}

function switchToForm() {
    listingScreen.classList.add('d-none');
    formScreen.classList.remove('d-none');
}

function switchToList() {
    formScreen.classList.add('d-none');
    listingScreen.classList.remove('d-none');
}

function resetForm() {
    if (leadForm) leadForm.reset();
    isEditing = false;
    currentLeadId = null;
    if (cpfCnpjInput) cpfCnpjInput.disabled = false;
    if (formTitle) formTitle.innerHTML = '<i class="fas fa-user-plus"></i> Cadastro de Leads';
    if (cidadeSelect) {
        cidadeSelect.innerHTML = '<option value="">Selecione um estado</option>';
        cidadeSelect.disabled = true;
    }
}

async function handleEditClick(leadId) {
    resetForm();
    isEditing = true;
    currentLeadId = leadId;
    if (formTitle) formTitle.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
    switchToForm();
    try {
        const leadData = await api.getLeadById(leadId);
        if (leadForm) {
            for (const key in leadData) {
                const input = leadForm.querySelector(`[name="${key}"]`);
                if (input) {
                    if (key === 'Uf') {
                        input.value = leadData[key];
                        await loadCities(leadData.Uf, leadData.Cidade);
                    } else if (key === 'DataResgistroLead') {
                        input.value = helpers.formatDate(leadData[key]);
                    } else if (key === 'Cep') {
                        input.value = helpers.formatCep(leadData[key] || '');
                    } else {
                        input.value = leadData[key] || '';
                    }
                }
            }
        }
        if (cpfCnpjInput) cpfCnpjInput.disabled = true;
        if (formTitle) formTitle.innerHTML = '<i class="fas fa-edit"></i> Editando Lead';
    } catch (error) {
        ui.showAlert(`Erro ao carregar lead para edição: ${error.message}`, 'error');
        switchToList();
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(leadForm);
    const leadData = Object.fromEntries(formData.entries());

    if (isEditing) {
        leadData.Cpf_CnpjLead = currentLeadId;
    }

    if (!leadData.Cpf_CnpjLead || !leadData.RazaoSocialLead) {
        return ui.showAlert('CPF/CNPJ e Razão Social são obrigatórios.', 'error');
    }

    try {
        const result = isEditing
            ? await api.updateLead(currentLeadId, leadData)
            : await api.saveLead(leadData);
        
        ui.showAlert(result.sucesso, 'success');
        resetForm();
        switchToList();
        await loadLeads();
    } catch (error) {
        ui.showAlert(`Erro ao salvar lead: ${error.message}`, 'error');
    }
}

function handleVendedorClick(lead) {
    const vendedorContatoForm = document.getElementById('vendedor-contato-form');
    if (!vendedorContatoForm) {
        return console.error("ERRO: Formulário do modal 'vendedor-contato-form' não foi encontrado no DOM!");
    }
    
    currentLeadId = lead.Cpf_CnpjLead;
    vendedorContatoForm.reset();
    
    vendedorContatoForm.querySelector('[name="Vendedor"]').value = lead.Vendedor || '';
    vendedorContatoForm.querySelector('[name="DataEnvio"]').value = helpers.formatDate(lead.DataEnvio);
    vendedorContatoForm.querySelector('[name="DataValidade"]').value = helpers.formatDate(lead.DataValidade);
    vendedorContatoForm.querySelector('[name="NomeContato"]').value = lead.Contato || '';
    vendedorContatoForm.querySelector('[name="Email"]').value = lead.Email || '';
    vendedorContatoForm.querySelector('[name="Telefone"]').value = lead.Telefone || '';
    
    ui.showModal('vendedor-modal');
}

async function handleVendedorSubmit(event) {
    event.preventDefault();
    const vendedorContatoForm = document.getElementById('vendedor-contato-form');
    if (!currentLeadId || !vendedorContatoForm) return;

    const formData = new FormData(vendedorContatoForm);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const result = await api.saveVendedorContato(currentLeadId, data);
        ui.showAlert(result.sucesso, 'success');
        ui.hideModal('vendedor-modal');
        await loadLeads();
    } catch (error) {
        ui.showAlert(`Erro ao salvar informações do vendedor: ${error.message}`, 'error');
    }
}

export function init() {
    // Mapeia os elementos do DOM
    listingScreen = document.getElementById('cadastro-listing-screen');
    formScreen = document.getElementById('cadastro-form-screen');
    addLeadBtn = document.getElementById('add-lead-btn');
    backBtn = document.getElementById('cadastro-back-btn');
    refreshBtn = document.getElementById('refresh-leads-btn');
    filterInput = document.getElementById('filter-leads');
    tableBody = document.querySelector('#leads-table tbody');
    leadForm = document.getElementById('lead-form');
    formTitle = document.getElementById('cadastro-form-title');
    cpfCnpjInput = document.getElementById('cpf_cnpj');
    cepInput = document.getElementById('cep');
    ufSelect = document.getElementById('uf');
    cidadeSelect = document.getElementById('cidade');
    clearLeadBtn = document.getElementById('clear-lead-button');
    
    // Adiciona listener para o formulário do modal APENAS quando ele existir
    const vendedorContatoForm = document.getElementById('vendedor-contato-form');
    if (vendedorContatoForm) {
        vendedorContatoForm.addEventListener('submit', handleVendedorSubmit);
    }

    // Adiciona os outros listeners
    if (addLeadBtn) addLeadBtn.addEventListener('click', () => { resetForm(); switchToForm(); });
    if (backBtn) backBtn.addEventListener('click', switchToList);
    if (clearLeadBtn) clearLeadBtn.addEventListener('click', () => { isEditing ? switchToList() : resetForm(); });
    if (refreshBtn) refreshBtn.addEventListener('click', loadLeads);
    if (leadForm) leadForm.addEventListener('submit', handleFormSubmit);
    
    document.body.addEventListener('click', (e) => {
        const dateInput = e.target.closest('.datepicker-input');
        if (dateInput) {
            ui.openCalendar(dateInput);
        }
    });

    if (filterInput) {
        filterInput.addEventListener('keyup', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadLeads, 400);
        });
    }
    if (cepInput) cepInput.addEventListener('blur', handleCepBlur);
    if (cpfCnpjInput) cpfCnpjInput.addEventListener('blur', (e) => e.target.value = helpers.formatCpfCnpj(e.target.value));
    if (ufSelect) ufSelect.addEventListener('change', () => loadCities(ufSelect.value));
    
    // Inicia o carregamento dos dados da página
    loadLeads();
    loadStates();
}

