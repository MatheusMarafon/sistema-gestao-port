/**
 * @file Ponto de Entrada Principal (Orquestrador)
 * @description Carrega componentes compartilhados (navbar, modais, container de toasts) e inicia o módulo da página atual.
 */

// Importa os inicializadores de cada página
import { init as initLoginPage } from './pages/login.js';
import { init as initLeadsPage } from './pages/leads.js';
import { init as initUnidadesPage } from './pages/unidades.js';
import { init as initHistoricoPage } from './pages/historico.js';
import { init as initPropostasPage } from './pages/propostas.js';
import { init as initSimulacaoPage } from './pages/simulacao.js';
import { init as initDashboardPage } from './pages/dashboard.js';
import { init as initParametrosPage } from './pages/parametros.js';



/**
 * Cria dinamicamente o container onde as notificações (toasts) aparecerão.
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed top-0 end-0 p-3'; 
    container.style.zIndex = '9999';
    document.body.appendChild(container);
}

/**
 * Carrega um componente HTML de um arquivo e o injeta em um placeholder na página.
 * @param {string} componentPath - O caminho para o arquivo HTML do componente.
 * @param {string} placeholderId - O ID do elemento onde o HTML será injetado.
 */
async function loadComponent(componentPath, placeholderId) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
        console.error(`Placeholder '${placeholderId}' não encontrado.`);
        return;
    }
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`Falha ao buscar ${componentPath}`);
        placeholder.innerHTML = await response.text();
    } catch (error) {
        console.error(`Erro ao carregar o componente '${componentPath}':`, error);
    }
}

/**
 * Ativa o link de navegação correspondente à página atual.
 */
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop();
    if (!currentPage) return;
    const navLinks = document.querySelectorAll('#navbarNav .nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

/**
 * Função principal que roda quando o DOM está pronto.
 */
async function main() {
    // Cria o container de toasts primeiro
    createToastContainer();

    // Carrega os componentes compartilhados em paralelo
    await Promise.all([
        loadComponent('_navbar.html', 'navbar-placeholder'),
        loadComponent('_modals.html', 'modal-placeholder')
    ]);

    setActiveNavLink();

    // Inicia o script da página específica
    const pageId = document.body.id;
    switch (pageId) {
        case 'page-login': initLoginPage(); break;
        case 'page-leads': initLeadsPage(); break;
        case 'page-unidades': initUnidadesPage(); break;
        case 'page-historico': initHistoricoPage(); break;
        case 'page-propostas': initPropostasPage(); break;
        case 'page-simulacao': initSimulacaoPage(); break;
        case 'page-dashboard': initDashboardPage(); break;
        case 'page-parametros': initParametrosPage(); break;
        default: console.log('Nenhum script de página encontrado.');
    }
}

document.addEventListener('DOMContentLoaded', main);