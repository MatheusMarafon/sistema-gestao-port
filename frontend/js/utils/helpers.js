/**
 * @file Módulo de Helpers
 * @description Contém funções puras e reutilizáveis para formatação de dados.
 */

export const formatCurrency = (value) => {
    if (typeof value !== 'number') value = parseFloat(value) || 0;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(String(value).replace(',', '.'));
    if (isNaN(num)) return value;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
};

/**
 * @param {string} dateString - A string no formato 'ano-mes'.
 * @returns {string} - A data formatada como 'mes-ano'.
 */
export function formatToMesAno(dateString) {
    if (!dateString || !dateString.includes('-')) return dateString;
    const [ano, mes] = dateString.split('-');
    return `${mes}-${ano}`;
}

/**
 * @param {string} dateString - A string no formato 'ano-mes'.
 * @returns {string} - O nome do mês (ex: "Setembro").
 */
export function formatToNomeMes(dateString) {
    if (!dateString || !dateString.includes('-')) return dateString;
    const [ano, mes] = dateString.split('-');
    // Adiciona '-01' para criar uma data válida que o `toLocaleString` possa interpretar
    const date = new Date(`${ano}-${mes}-01T12:00:00Z`);
    if (isNaN(date.getTime())) return dateString;
    // Pega o nome do mês em português
    const nomeMes = date.toLocaleString('pt-BR', { month: 'long' });
    return nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
}


export const formatCpfCnpj = (value) => {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return value;
};

export const formatCep = (value) => {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 8) return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
    return value;
};
