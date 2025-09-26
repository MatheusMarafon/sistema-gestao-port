/**
 * @file Módulo de UI
 * @description Centraliza funções de manipulação da interface do utilizador (modais, toasts, calendário, etc.).
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

        if (!confirmModalEl || !bodyText || !okBtn) {
            resolve(confirm(message)); // Fallback para o confirm nativo
            return;
        }

        bodyText.textContent = message;
        const modal = bootstrap.Modal.getOrCreateInstance(confirmModalEl);
        
        let userConfirmation = false;

        const onConfirm = () => {
            userConfirmation = true;
            modal.hide();
        };

        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        newOkBtn.addEventListener('click', onConfirm);

        confirmModalEl.addEventListener('hidden.bs.modal', () => {
            newOkBtn.removeEventListener('click', onConfirm);
            resolve(userConfirmation);
        }, { once: true });

        modal.show();
    });
}

/**
 * Renderiza e abre o modal do calendário para um campo de input específico.
 * @param {HTMLElement} inputElement - O campo de input que receberá a data.
 */
export function openCalendar(inputElement) {
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) {
        return console.error("Elemento #calendar-container não encontrado no DOM.");
    }

    const today = new Date();
    
    const render = (year, month) => {
        calendarContainer.innerHTML = '';
        const firstDay = new Date(year, month, 1);
        
        const monthHeader = document.createElement('div');
        monthHeader.className = 'd-flex justify-content-between align-items-center pb-2';
        monthHeader.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-secondary" id="prev-month">&lt;</button>
            <span class="fw-bold">${firstDay.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="next-month">&gt;</button>
        `;

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;';
        
        ['D','S','T','Q','Q','S','S'].forEach(dia => {
            grid.innerHTML += `<div class='text-center small text-muted fw-bold'>${dia}</div>`;
        });

        for (let i = 0; i < firstDay.getDay(); i++) grid.appendChild(document.createElement('div'));

        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const dayBtn = document.createElement('button');
            dayBtn.type = 'button';
            dayBtn.className = 'btn btn-sm btn-outline-secondary';
            dayBtn.textContent = day;
            if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
                dayBtn.classList.replace('btn-outline-secondary', 'btn-primary');
            }
            dayBtn.addEventListener('click', () => {
                inputElement.value = new Date(year, month, day).toLocaleDateString('pt-BR');
                hideModal('calendar-modal');
            });
            grid.appendChild(dayBtn);
        }
        
        calendarContainer.appendChild(monthHeader);
        calendarContainer.appendChild(grid);
        calendarContainer.querySelector('#prev-month').addEventListener('click', () => render(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1));
        calendarContainer.querySelector('#next-month').addEventListener('click', () => render(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1));
    };

    render(today.getFullYear(), today.getMonth());
    showModal('calendar-modal');
}

