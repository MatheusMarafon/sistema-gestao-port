import * as api from '../api/api.js';
import * as ui from '../utils/ui.js';
import * as helpers from '../utils/helpers.js';

// Variáveis de escopo do módulo
let listingScreen, formScreen, leadSelector, unidadeSelector, anoSelector,
    tableBody, manageBtn, backBtn, historicoForm, formSubtitle, formTableBody;

let currentLeadId = null;
let currentUnidade = { id: null, dados: null };
let currentAno = new Date().getFullYear();

/** Carrega os leads da API e preenche o seletor de leads. */
async function loadLeadsIntoSelector() {
    if (!leadSelector) return;
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

/** Carrega as unidades de um lead específico no seletor de unidades. */
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

/** Renderiza a tabela de histórico de consumo. */
function renderHistoricoTable(historicos) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (!historicos || historicos.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Nenhum histórico encontrado para ${currentAno}.</td></tr>`;
        return;
    }
    historicos.forEach(h => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${helpers.formatToNomeMes(h.IDMes)}</td>
            <td>${helpers.formatNumber(h.DemandaCP)}</td>
            <td>${helpers.formatNumber(h.DemandaCFP)}</td>
            <td>${helpers.formatNumber(h.DemandaCG)}</td>
            <td>${helpers.formatNumber(h.kWhProjPonta)}</td>
            <td>${helpers.formatNumber(h.kWhProjForaPonta)}</td>
            <td>${helpers.formatDate(h.DataRegistroHistorico)}</td>
        `;
    });
}

/** Carrega os dados do histórico da API e chama a função de renderização. */
async function loadHistoricoTable() {
    if (!tableBody) return;
    if (!currentUnidade.id || !currentAno || String(currentAno).length !== 4) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Selecione uma unidade e um ano válido.</td></tr>`;
        return;
    }
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Carregando histórico...</td></tr>';
    try {
        const historicos = await api.getHistoricoPorAno(currentUnidade.id, currentAno);
        renderHistoricoTable(historicos);
    } catch (error) {
        ui.showAlert(`Erro ao carregar histórico: ${error.message}`, 'error');
    }
}

/** Preenche o formulário de edição em lote com os dados do histórico do ano. */
async function populateHistoricoForm() {
    if (!formTableBody) return;
    formTableBody.innerHTML = '<tr><td colspan="17" class="text-center">Carregando...</td></tr>';
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const campos = ["DemandaCP", "DemandaCFP", "DemandaCG", "kWProjPonta", "kWProjForaPonta", "kWhProjPonta", "kWhProjForaPonta", "kWhProjHRes", "kWhProjPontaG", "kWhProjForaPontaG", "kWProjG", "kWhProjDieselP", "kWhCompensadoP", "kWhCompensadoFP", "kWhCompensadoHr", "kWGeracaoProjetada"];

    try {
        const historicos = await api.getHistoricoPorAno(currentUnidade.id, currentAno);
        const historicoMap = new Map(historicos.map(h => [new Date(h.IDMes).getUTCMonth(), h]));
        
        formTableBody.innerHTML = '';
        for (let i = 0; i < 12; i++) {
            const mesData = historicoMap.get(i) || {};
            const row = formTableBody.insertRow();
            let rowHTML = `<td>${meses[i]}</td>`;
            campos.forEach(campo => {
                const valor = mesData[campo] != null ? String(mesData[campo]).replace('.', ',') : '';
                rowHTML += `<td><input type="text" name="historico[${i}][${campo}]" value="${valor}" placeholder="0,00" class="form-control form-control-sm"></td>`;
            });
            row.innerHTML = rowHTML;
        }
    } catch (error) {
        ui.showAlert(`Erro ao buscar histórico para edição: ${error.message}`, 'error');
    }
}

/** Manipula o envio do formulário de histórico. */
async function handleHistoricoSubmit(event) {
    event.preventDefault();
    const dadosHistorico = [];
    const rows = formTableBody.querySelectorAll('tr');

    rows.forEach((row, index) => {
        const mes = index + 1;
        const mesData = { IDMes: `${currentAno}-${String(mes).padStart(2, '0')}` };
        let hasData = false;
        row.querySelectorAll('input').forEach(input => {
            const nameMatch = input.name.match(/\[(.*?)\]/g);
            if (nameMatch && nameMatch.length > 1) {
                const name = nameMatch[1].replace(/\[|\]/g, '');
                if (input.value) {
                    mesData[name] = input.value;
                    hasData = true;
                }
            }
        });
        if (hasData) {
            dadosHistorico.push(mesData);
        }
    });

    try {
        const result = await api.saveHistoricoBatch(currentUnidade.id, currentAno, dadosHistorico);
        ui.showAlert(result.sucesso, 'success');
        switchToListing();
        await loadHistoricoTable();
    } catch (error) {
        ui.showAlert(`Erro ao salvar histórico: ${error.message}`, 'error');
    }
}

/** Alterna para a tela de listagem. */
function switchToListing() {
    if (formScreen) formScreen.classList.add('d-none');
    if (listingScreen) listingScreen.classList.remove('d-none');
}

/** Alterna para a tela de formulário. */
function switchToForm() {
    if (listingScreen) listingScreen.classList.add('d-none');
    if (formScreen) formScreen.classList.remove('d-none');
}

/** Função de inicialização do módulo. */
export function init() {
    listingScreen = document.getElementById('historico-listing-screen');
    formScreen = document.getElementById('historico-form-screen');
    leadSelector = document.getElementById('historico-lead-selector');
    unidadeSelector = document.getElementById('historico-unidade-selector');
    anoSelector = document.getElementById('historico-ano-selector');
    tableBody = document.querySelector('#historico-table tbody');
    manageBtn = document.getElementById('manage-historico-btn');
    backBtn = document.getElementById('historico-back-btn');
    historicoForm = document.getElementById('historico-form');
    formSubtitle = document.getElementById('historico-subtitle');
    formTableBody = document.querySelector('#historico-input-table tbody');

    if (!listingScreen || !formScreen) {
        console.error("Telas principais da página de Histórico não encontradas.");
        return;
    }

    if(anoSelector) anoSelector.value = currentAno;

    if(leadSelector) {
        leadSelector.addEventListener('change', async (e) => {
            currentLeadId = e.target.value;
            if(tableBody) tableBody.innerHTML = '';
            if(manageBtn) manageBtn.disabled = true;
            if(unidadeSelector) unidadeSelector.disabled = true;
            if(anoSelector) anoSelector.disabled = true;
            await loadUnidadesIntoSelector(currentLeadId);
        });
    }

    if(unidadeSelector) {
        unidadeSelector.addEventListener('change', async (e) => {
            const ucId = e.target.value;
            if(manageBtn) manageBtn.disabled = !ucId;
            if(anoSelector) anoSelector.disabled = !ucId;
            if (ucId) {
                currentUnidade.id = ucId;
                try {
                    currentUnidade.dados = await api.getUnidadeById(ucId);
                    await loadHistoricoTable();
                } catch (error) {
                    ui.showAlert(`Erro ao buscar dados da unidade: ${error.message}`, 'error');
                }
            }
        });
    }
    
    if(anoSelector) {
        anoSelector.addEventListener('change', (e) => {
            currentAno = e.target.value;
            loadHistoricoTable();
        });
    }

    if(manageBtn) {
        manageBtn.addEventListener('click', async () => {
            if(formSubtitle) formSubtitle.textContent = `Editando histórico para a UC ${currentUnidade.id} do ano de ${currentAno}.`;
            await populateHistoricoForm();
            switchToForm();
        });
    }

    if(backBtn) backBtn.addEventListener('click', switchToListing);
    if(historicoForm) historicoForm.addEventListener('submit', handleHistoricoSubmit);

    loadLeadsIntoSelector();
}

