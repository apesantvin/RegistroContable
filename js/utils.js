/* ==========================================================================
   Registro Contable - UI Helpers & Utility Methods
   ========================================================================== */

function setLoading(active) {
    if (active) {
        DOM.loadingSpinner.classList.add('active');
    } else {
        DOM.loadingSpinner.classList.remove('active');
    }
}

function formatCurrency(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function showToast(message, type = 'info') {
    // Suppress repeated toasts if they happen within 1 second with same message
    if (window.lastToastMessage === message && Date.now() - (window.lastToastTime || 0) < 1000) {
        return;
    }
    window.lastToastMessage = message;
    window.lastToastTime = Date.now();

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Fade in
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        // Wait for CSS transition
        if (toast) {
            setTimeout(() => toast.remove(), 250);
        }
    }, 2200); // Shorter duration to feel snappier and quieter
}
