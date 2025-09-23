/**
 * @file Módulo de UI
 * @description Centraliza funções de manipulação da interface do usuário (modais, alertas, etc.).
 */

/**
 * Exibe um modal do Bootstrap pelo seu ID.
 * @param {string} modalId O ID do modal (ex: 'vendedor-modal')
 */
export function showModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }
}

/**
 * Esconde um modal do Bootstrap pelo seu ID.
 * @param {string} modalId O ID do modal
 */
export function hideModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide();
        }
    }
}

/**
 * Exibe uma notificação simples (pode ser melhorado com bibliotecas como Toastify).
 * @param {string} message A mensagem a ser exibida.
 * @param {'success'|'error'} type O tipo de notificação.
 */
export function showAlert(message, type = 'success') {
    // Por enquanto, usaremos o alert padrão.
    // Futuramente, isto pode ser trocado por um sistema de "toasts" do Bootstrap.
    alert(message);
    if (type === 'error') {
        console.error(`[ALERTA] ${message}`);
    }
}