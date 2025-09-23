import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// Variáveis de escopo do módulo
let listingScreen, formScreen, addPropostaBtn, backBtn, refreshBtn,
    filterInput, tableBody, propostaForm, leadSelector, unidadeSelector,
    calendarContainer;
    
let isEditing = false;
let currentPropostaId = null;
let debounceTimer;

/**
 * Renderiza e abre o modal do calendário.
 * @param {HTMLElement} inputElement - O campo de input de data que receberá o valor.
 */
function openCalendar(inputElement) {
    if (!calendarContainer) return;

    const today = new Date();
    
    const render = (year, month) => {
        calendarContainer.innerHTML = '';
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
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

        for (let day = 1; day <= lastDay.getDate(); day++) {
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
            <td>
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

function switchToForm(isEditMode = false) {
    if(propostaForm) propostaForm.reset();
    isEditing = isEditMode;
    currentPropostaId = null;

    const formTitle = document.getElementById('proposta-form-title');
    if (formTitle) formTitle.innerHTML = `<i class="fas fa-plus"></i> Nova Proposta`;

    leadSelector.disabled = isEditMode;
    unidadeSelector.disabled = isEditMode;
    
    if (!isEditMode) {
        unidadeSelector.innerHTML = '<option value="">Selecione um lead primeiro</option>';
    }

    listingScreen.classList.add('d-none');
    formScreen.classList.remove('d-none');
}

function switchToListing() {
    formScreen.classList.add('d-none');
    listingScreen.classList.remove('d-none');
}

async function handleEditClick(proposta) {
    switchToForm(true);
    const formTitle = document.getElementById('proposta-form-title');
    formTitle.innerHTML = `<i class="fas fa-edit"></i> Editando Proposta #${proposta.NProposta}`;
    currentPropostaId = proposta.NProposta;
    
    try {
        const fullProposta = await api.getPropostaById(proposta.NProposta);
        
        propostaForm.querySelector('[name="AgenteDeVenda"]').value = fullProposta.AgenteDeVenda || '';
        propostaForm.querySelector('[name="StatusNegociacao"]').value = fullProposta.StatusNegociacao || '';
        propostaForm.querySelector('[name="DataDeEnvio"]').value = helpers.formatDate(fullProposta.DataDeEnvio);
        propostaForm.querySelector('[name="DataValidade"]').value = helpers.formatDate(fullProposta.DataValidade);
        propostaForm.querySelector('[name="DataStatusNegociacao"]').value = helpers.formatDate(fullProposta.DataStatusNegociacao);
        
        leadSelector.innerHTML = `<option selected>${fullProposta.RazaoSocialLead}</option>`;
        
        // Busca a unidade para mostrar o nome correto
        const ucResponse = await api.getUnidadesByLead(fullProposta.Cpf_CnpjLead);
        const ucData = ucResponse.find(uc => uc.NumeroDaUcLead === fullProposta.NumeroDaUcLead);
        unidadeSelector.innerHTML = `<option selected>${ucData ? ucData.NomeDaUnidade : fullProposta.NumeroDaUcLead}</option>`;

    } catch (error) {
        ui.showAlert(`Erro ao carregar dados da proposta: ${error.message}`, 'error');
        switchToListing();
    }
}

async function handleDeleteClick(proposta) {
    if (confirm(`Tem certeza que deseja excluir a proposta Nº ${proposta.NProposta}?`)) {
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
    calendarContainer = document.getElementById('calendar-container');

    if(addPropostaBtn) addPropostaBtn.addEventListener('click', () => switchToForm(false));
    if(backBtn) backBtn.addEventListener('click', switchToListing);
    if(refreshBtn) refreshBtn.addEventListener('click', loadPropostas);
    if(propostaForm) propostaForm.addEventListener('submit', handleFormSubmit);
    if(leadSelector) leadSelector.addEventListener('change', (e) => loadUnidadesIntoSelector(e.target.value));

    if(filterInput) {
        filterInput.addEventListener('keyup', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadPropostas, 400);
        });
    }

    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.addEventListener('click', (e) => {
            const dateInput = e.target.closest('.datepicker-input');
            if (dateInput) {
                openCalendar(dateInput);
            }
        });
    }

    loadPropostas();
    loadLeadsIntoSelector();
}

