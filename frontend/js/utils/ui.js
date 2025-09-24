/**
 * @file Módulo de UI
 * @description Centraliza funções de manipulação da interface do utilizador (modais, toasts, etc.).
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
 * Exibe uma notificação "toast" elegante do Bootstrap.
 * Substitui o alert() padrão.
 * @param {string} message A mensagem a ser exibida.
 * @param {'success'|'error'|'info'} type O tipo de notificação, que define a cor e o ícone.
 */
export function showAlert(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Container de toast não encontrado!');
        alert(message); 
        return;
    }

    const iconMap = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const classMap = { success: 'bg-success text-white', error: 'bg-danger text-white', info: 'bg-info text-dark' };
    const icon = iconMap[type] || 'fa-bell';
    const toastClass = classMap[type] || 'bg-secondary text-white';

    const toastEl = document.createElement('div');
    toastEl.className = `toast ${toastClass}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
        <div class="toast-header ${toastClass}" style="border-bottom: 0;">
            <i class="fas ${icon} me-2"></i>
            <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    toastContainer.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    toast.show();
}

/**
 * Exibe um modal de confirmação e espera a resposta do utilizador.
 * @param {string} message - A pergunta a ser exibida no corpo do modal.
 * @returns {Promise<boolean>} - Retorna uma promessa que resolve para 'true' se o utilizador confirmar, e 'false' caso contrário.
 */
export function showConfirm(message) {
    return new Promise((resolve) => {
        const confirmModalEl = document.getElementById('confirm-modal');
        const bodyText = document.getElementById('confirm-modal-body-text');
        const okBtn = document.getElementById('confirm-modal-ok-btn');

        // Fallback para o confirm nativo se os elementos do modal não forem encontrados
        if (!confirmModalEl || !bodyText || !okBtn) {
            resolve(confirm(message));
            return;
        }

        bodyText.textContent = message;
        const modal = bootstrap.Modal.getOrCreateInstance(confirmModalEl);
        
        let userConfirmation = false;

        const onConfirm = () => {
            userConfirmation = true;
            modal.hide();
        };

        // Usa .cloneNode para remover listeners antigos e evitar múltiplos cliques
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        newOkBtn.addEventListener('click', onConfirm);

        // O evento 'hidden.bs.modal' só é disparado DEPOIS que a animação de fecho termina
        confirmModalEl.addEventListener('hidden.bs.modal', () => {
            // Remove o listener para limpar a memória
            newOkBtn.removeEventListener('click', onConfirm);
            // Agora que tudo está fechado, resolve a promessa com a decisão do utilizador
            resolve(userConfirmation);
        }, { once: true }); // O listener só executa uma vez

        modal.show();
    });
}

