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
    // Corrige o problema de fuso horário ao converter data UTC para local
    const date = new Date(isoString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
};

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