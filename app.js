/* ==========================================================================
   Registro Contable - Entry Point & SPA Router
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initYearSelector();
    initRouting();
    initFormHandlers();
    initMobileSidebar();
    initLandingActions();
    initChartFiltersListeners();
    initPaginationControls();
    initConfigTabs();
    checkLocalCache();
    initVisibilityHandler();
});

/* ==========================================================================
   SPA Routing
   ========================================================================== */
function initRouting() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => {
            DOM.sidebar.classList.remove('mobile-open');
        });
    });
}

function handleRoute() {
    const hash = window.location.hash || '#dashboard';
    
    if (document.body.classList.contains('landing-active')) {
        return;
    }

    // If navigating away from movements screen, reset edit mode silently and close modal
    if (hash !== '#movimientos') {
        if (state.editingMovimientoId) {
            cancelEditMovimiento(false);
        }
        if (DOM.modalTransaction) DOM.modalTransaction.classList.add('hidden');
    }
    
    DOM.screens.forEach(screen => {
        if (`#${screen.id.replace('screen-', '')}` === hash) {
            screen.classList.add('active');
        } else {
            screen.classList.remove('active');
        }
    });
    
    DOM.navItems.forEach(item => {
        if (item.getAttribute('href') === hash) {
            item.classList.add('active');
            DOM.barTitle.textContent = item.querySelector('span').textContent;
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle add inline button next to title
    if (hash === '#movimientos') {
        if (DOM.btnAddMovimientoTrigger) DOM.btnAddMovimientoTrigger.classList.remove('hidden');
    } else {
        if (DOM.btnAddMovimientoTrigger) DOM.btnAddMovimientoTrigger.classList.add('hidden');
    }

    if (!state.isDemoMode && !state.isLocalMode && state.apiUrl) {
        syncScreenData(hash);
    } else {
        if (hash === '#dashboard') {
            recreateCharts();
        } else if (hash === '#movimientos') {
            applyMovementsFilters();
        } else if (hash === '#configuracion') {
            renderConfigManagement();
        }
    }
}
