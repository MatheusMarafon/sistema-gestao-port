/**
 * @file Módulo de API
 * @description Centraliza todas as requisições (fetch) para o backend.
 * Exporta funções reutilizáveis para cada endpoint da aplicação.
 */

// A URL base da sua API. Se o endereço do backend mudar, altere apenas aqui.
const BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Função genérica para realizar requisições à API.
 * Centraliza o tratamento de erros e a conversão para JSON.
 * @param {string} endpoint - O caminho do recurso (ex: 'leads', 'unidades/123/historico').
 * @param {object} [options={}] - As opções da requisição (method, headers, body).
 * @returns {Promise<any>} - A resposta da API em formato JSON.
 */
async function request(endpoint, options = {}) {
    try {
        const response = await fetch(`${BASE_URL}/${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            // Se a API retornar um erro no corpo da resposta, usa essa mensagem.
            throw new Error(data.erro || `Erro HTTP: ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error(`Erro na requisição para ${endpoint}:`, error);
        // Lança o erro para que a função que chamou possa tratá-lo (ex: exibir um alerta).
        throw error;
    }
}

// --- LEADS ---
export const getLeads = (filtro = '') => request(`leads?filtro=${encodeURIComponent(filtro)}`);
export const getLeadById = (leadId) => request(`leads/${encodeURIComponent(leadId)}`);
export const saveLead = (leadData) => request('leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData)
});
export const updateLead = (leadId, leadData) => request(`leads/${encodeURIComponent(leadId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData)
});
export const saveVendedorContato = (leadId, data) => request(`leads/${encodeURIComponent(leadId)}/vendedor-contato`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// --- UNIDADES ---
export const getUnidadesByLead = (leadId) => request(`leads/${encodeURIComponent(leadId)}/unidades`);
export const getUnidadeById = (ucId) => request(`unidade/${encodeURIComponent(ucId)}`);
export const saveUnidade = (leadId, unidadeData) => request(`leads/${encodeURIComponent(leadId)}/unidades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unidadeData)
});
export const updateUnidade = (ucId, unidadeData) => request(`unidades/${encodeURIComponent(ucId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unidadeData)
});
export const deleteUnidade = (ucId, leadId) => request(`unidades/${encodeURIComponent(ucId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Cpf_CnpjLead: leadId })
});

// --- HISTÓRICO ---
export const getHistoricoCompleto = (ucId) => request(`unidades/${ucId}/historico`);
export const getHistoricoPorAno = (ucId, ano) => request(`unidades/${ucId}/historico/${ano}`);
export const saveHistoricoBatch = (ucId, ano, dados) => request(`unidades/${ucId}/historico/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ano, dados })
});

// --- PROPOSTAS ---
export const getPropostas = (filtro = '') => request(`propostas?filtro=${encodeURIComponent(filtro)}`);
export const saveProposta = (propostaData) => request('propostas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(propostaData)
});
// --- Funções Novas Adicionadas Abaixo ---
export const getPropostaById = (nProposta) => request(`propostas/${nProposta}`);
export const updateProposta = (nProposta, data) => request(`propostas/${nProposta}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const deleteProposta = (nProposta) => request(`propostas/${nProposta}`, {
    method: 'DELETE'
});

// --- SIMULAÇÃO E DASHBOARD ---
export const calcularSimulacao = (params) => request('simulacao/calcular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
});
export const getDashboardData = (params) => request('dashboard_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
});

// --- PARÂMETROS ---
export const getParametros = () => request('parametros');
export const getAjusteIpca = () => request('parametros/ajuste-ipca');
export const getDistribuidoras = () => request('parametros/distribuidoras');
export const getAjusteTarifa = (cnpj) => request(`parametros/ajuste-tarifa/${encodeURIComponent(cnpj)}`);
export const getDadosGeracao = () => request('parametros/geracao');
export const saveSimulacaoParams = (params) => request('parametros/simulacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
});
export const saveAjusteIpca = (data) => request('parametros/ajuste-ipca', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const updateAjusteIpca = (ano, data) => request(`parametros/ajuste-ipca/${ano}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const updatePrecoMwh = (ano, fonte, data) => request(`parametros/preco-mwh/${ano}/${encodeURIComponent(fonte)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const updateCustosMes = (mesRef, data) => request(`parametros/custos-mes/${mesRef}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const updateAjusteTarifa = (cnpj, ano, data) => request(`parametros/ajuste-tarifa/${encodeURIComponent(cnpj)}/${ano}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const updateDadosGeracao = (fonte, local, data) => request(`parametros/dados-geracao/${encodeURIComponent(fonte)}/${encodeURIComponent(local)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
export const updateCurvaGeracao = (idmes, fonte, local, data) => request(`parametros/curva-geracao/${idmes}/${encodeURIComponent(fonte)}/${encodeURIComponent(local)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// --- LOCALIDADES (SERVIÇOS EXTERNOS E INTERNOS) ---
export const getEstados = () => request('localidades/estados');
export const getCidades = (uf) => request(`localidades/cidades/${uf}`);
export const buscarViaCep = async (cep) => {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${String(cep).replace(/\D/g, '')}/json/`);
        if (!response.ok) throw new Error('Falha na busca do CEP.');
        const data = await response.json();
        if (data.erro) return null;
        return data;
    } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        return null;
    }
};
