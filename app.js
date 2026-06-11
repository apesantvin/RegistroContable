/* ==========================================================================
   Registro Contable - Application Core (Vanilla JS)
   ========================================================================== */

// App State
const state = {
    supabaseApiUrl: localStorage.getItem('contable_supabase_api_url') || '',
    supabaseKey: localStorage.getItem('contable_supabase_key') || '',
    get apiUrl() {
        return this.supabaseApiUrl;
    },
    selectedYear: new Date().getFullYear(),
    dashboardRange: 'year', // 'month' | '3months' | '6months' | 'year'
    currentPage: 1,
    itemsPerPage: 20,
    filteredMovimientos: [], // cache for pagination
    isDemoMode: false,
    isLocalMode: false,
    categorias: [],
    subcategorias: [],
    presupuestos: [],
    movimientos: [],
    charts: {
        ingresosGastos: null,
        balanceNeto: null,
        categorias: null,
        subcategorias: null,
        presupuestoVsReal: null,
        topCategorias: null,
        ahorro: null,
        comparativa: null,
        gastoMensual: null
    },
    index: null,
    editingMovimientoId: null
};

// DOM Elements
const DOM = {
    appInterface: document.getElementById('app-interface'),
    
    // Landing Buttons
    btnLandingLocal: document.getElementById('btn-landing-local'),
    btnLandingDemo: document.getElementById('btn-landing-demo'),
    btnLandingConnect: document.getElementById('btn-landing-connect'),
    btnHeroStart: document.getElementById('btn-hero-start'),
    btnHeroLocal: document.getElementById('btn-hero-local'),
    btnHeroDemo: document.getElementById('btn-hero-demo'),
    inputLocalFile: document.getElementById('input-local-file'),
    
    // App Navigation
    sidebar: document.getElementById('app-sidebar'),
    btnMenuToggle: document.getElementById('btn-menu-toggle'),
    btnCloseSidebar: document.getElementById('btn-close-sidebar'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    themeIcon: document.querySelector('.theme-icon'),
    themeText: document.querySelector('.theme-text'),
    btnExitApp: document.getElementById('nav-exit-app'),
    
    demoModeBadge: document.getElementById('demo-mode-badge'),
    apiStatus: document.getElementById('api-status'),
    apiStatusText: document.querySelector('#api-status .status-text'),
    yearSelect: document.getElementById('global-year-select'),
    loadingSpinner: document.getElementById('loading-spinner'),
    barTitle: document.getElementById('bar-title'),
    btnDownloadLocal: document.getElementById('btn-download-local'),
    btnManualSync: document.getElementById('btn-manual-sync'),
    
    // Screens
    screens: document.querySelectorAll('.app-screen'),
    navItems: document.querySelectorAll('.nav-item'),
    
    // Dashboard Values
    valSaldoDisponible: document.getElementById('val-saldo-disponible'),
    valIngresos: document.getElementById('val-ingresos'),
    valGastos: document.getElementById('val-gastos'),
    valAhorro: document.getElementById('val-ahorro'),
    
    // Dashboard range filter buttons
    rangeBtns: document.querySelectorAll('.range-btn'),
    
    // Movements screen
    filterSearch: document.getElementById('filter-search'),
    btnToggleFilters: document.getElementById('btn-toggle-filters'),
    advancedFilters: document.getElementById('advanced-filters'),
    filterType: document.getElementById('filter-type'),
    filterCategory: document.getElementById('filter-category'),
    filterSubcategory: document.getElementById('filter-subcategory'),
    filterMonth: document.getElementById('filter-month'),
    btnClearFilters: document.getElementById('btn-clear-filters'),
    listMovimientosBody: document.getElementById('list-movimientos-body'),
    tableEmpty: document.getElementById('table-empty'),
    paginationControls: document.getElementById('pagination-controls'),
    paginationPages: document.getElementById('pagination-pages'),
    btnPagePrev: document.getElementById('btn-page-prev'),
    btnPageNext: document.getElementById('btn-page-next'),
    paginationInfo: document.getElementById('pagination-info'),
    paginationCountText: document.getElementById('pagination-count-text'),
    
    // Transaction screen
    formMovimiento: document.getElementById('form-movimiento'),
    editIndicator: document.getElementById('edit-movimiento-indicator'),
    editIdBadge: document.getElementById('edit-movimiento-id-badge'),
    btnCancelEdit: document.getElementById('btn-cancel-edit-movimiento'),
    btnSubmitMovimiento: document.getElementById('btn-submit-movimiento'),
    inTipo: document.getElementById('in-tipo'),
    inImporte: document.getElementById('in-importe'),
    inConcepto: document.getElementById('in-concepto'),
    inFecha: document.getElementById('in-fecha'),
    inFechaReferencia: document.getElementById('in-fecha-referencia'),
    inCategoria: document.getElementById('in-categoria'),
    inSubcategoria: document.getElementById('in-subcategoria'),
    inCatOrigen: document.getElementById('in-categoria-origen'),
    inCatDestino: document.getElementById('in-categoria-destino'),
    formTabBtns: document.querySelectorAll('.form-tab-btn'),
    condGastoIngreso: document.querySelectorAll('.cond-gasto-ingreso'),
    condGasto: document.querySelectorAll('.cond-gasto'),
    condTransferencia: document.querySelectorAll('.cond-transferencia'),
    
    // Config screen
    formApiUrl: document.getElementById('form-api-url'),
    inApiUrl: document.getElementById('in-api-url'),
    lblApiUrl: document.getElementById('lbl-api-url'),
    groupSupabaseKey: document.getElementById('group-supabase-key'),
    inSupabaseKey: document.getElementById('in-supabase-key'),
    btnTestApi: document.getElementById('btn-test-api'),
    
    cardConfigLocal: document.getElementById('card-config-local'),
    btnConfigDownloadLocal: document.getElementById('btn-config-download-local'),
    btnConfigLoadLocal: document.getElementById('btn-config-load-local'),
    
    formPresupuesto: document.getElementById('form-presupuesto'),
    inPresupuestoCat: document.getElementById('in-presupuesto-cat'),
    inPresupuestoInicio: document.getElementById('in-presupuesto-inicio'),
    inPresupuestoFin: document.getElementById('in-presupuesto-fin'),
    inPresupuestoImporte: document.getElementById('in-presupuesto-importe'),
    
    formCrearCategoria: document.getElementById('form-crear-categoria'),
    inNewCatNombre: document.getElementById('in-new-cat-nombre'),
    inNewCatIcono: document.getElementById('in-new-cat-icono'),
    
    formCrearSubcategoria: document.getElementById('form-crear-subcategoria'),
    inNewSubParent: document.getElementById('in-new-sub-parent'),
    inNewSubNombre: document.getElementById('in-new-sub-nombre'),
    inNewSubIcono: document.getElementById('in-new-sub-icono'),
    
    containerCategoriasGestion: document.getElementById('container-categorias-gestion'),
    containerPresupuestosGestion: document.getElementById('container-presupuestos-gestion'),
    
    btnTransferirTodosSobrantes: document.getElementById('btn-transferir-todos-sobrantes'),
    automationMonthSelect: document.getElementById('automation-month-select'),
    containerSobrantesGestion: document.getElementById('container-sobrantes-gestion'),
    chartPresupuestoMonthSelect: document.getElementById('chart-presupuesto-month-select'),
    chartPresupuestoSummary: document.getElementById('chart-presupuesto-summary'),
    
    // Modals
    modalApiSetup: document.getElementById('api-modal-setup'),
    formModalApi: document.getElementById('form-modal-api'),
    inModalApiUrl: document.getElementById('in-modal-api-url'),
    lblModalApiUrl: document.getElementById('lbl-modal-api-url'),
    groupModalSupabaseKey: document.getElementById('group-modal-supabase-key'),
    inModalSupabaseKey: document.getElementById('in-modal-supabase-key'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    btnModalLoadLocal: document.getElementById('btn-modal-load-local'),
    btnModalNewLocal: document.getElementById('btn-modal-new-local')
};

// Months translation list
const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/* ==========================================================================
   Initialization & Setup
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initYearSelector();
    initRouting();
    initFormHandlers();
    initMobileSidebar();
    initLandingActions();
    initDashboardRangeFilter();
    initPaginationControls();
    initConfigTabs();
    checkLocalCache();
    startBackgroundSync();
});

// Theme Toggle Handler
function initTheme() {
    const isDark = localStorage.getItem('theme') !== 'light';
    if (isDark) {
        document.body.classList.add('dark-mode');
        DOM.themeIcon.textContent = '☀️';
        DOM.themeText.textContent = 'Modo Claro';
    } else {
        document.body.classList.remove('dark-mode');
        DOM.themeIcon.textContent = '🌙';
        DOM.themeText.textContent = 'Modo Oscuro';
    }
    
    DOM.btnThemeToggle.addEventListener('click', () => {
        const dark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
        DOM.themeIcon.textContent = dark ? '☀️' : '🌙';
        DOM.themeText.textContent = dark ? 'Modo Claro' : 'Modo Oscuro';
        recreateCharts();
    });
}

// Year dropdown setup
function initYearSelector() {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    
    DOM.yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    DOM.yearSelect.value = state.selectedYear;
    
    // Set default selected month for budget form to current date
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    DOM.inPresupuestoInicio.value = currentMonthStr;
    DOM.inPresupuestoFin.value = '';
    
    // Set default month select value for budget chart to current month
    if (DOM.chartPresupuestoMonthSelect) {
        DOM.chartPresupuestoMonthSelect.value = (today.getMonth() + 1).toString();
        DOM.chartPresupuestoMonthSelect.addEventListener('change', () => {
            recreateCharts();
        });
    }

    DOM.yearSelect.addEventListener('change', (e) => {
        state.selectedYear = parseInt(e.target.value);
        updateDashboardMetrics();
        recreateCharts();
        applyMovementsFilters();
    });
}

// Configuration Tabs Switcher Setup
function initConfigTabs() {
    const tabButtons = document.querySelectorAll('.config-nav-btn');
    const tabPanels = document.querySelectorAll('.config-section-panel');
    
    // Set default month for automations
    if (DOM.automationMonthSelect) {
        DOM.automationMonthSelect.value = (new Date().getMonth() + 1).toString();
        DOM.automationMonthSelect.addEventListener('change', () => {
            renderConfigManagement();
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Toggle active classes on nav buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle active panels
            tabPanels.forEach(p => {
                if (p.id === targetTab) {
                    p.classList.add('active');
                } else {
                    p.classList.remove('active');
                }
            });
        });
    });
}

// Dashboard range filter
function initDashboardRangeFilter() {
    DOM.rangeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.rangeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.dashboardRange = btn.getAttribute('data-range');
            recreateCharts();
        });
    });
}

// Pagination controls
function initPaginationControls() {
    DOM.btnPagePrev.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderMovementsPage();
        }
    });
    DOM.btnPageNext.addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredMovimientos.length / state.itemsPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            renderMovementsPage();
        }
    });
}

// Mobile sidebar toggles
function initMobileSidebar() {
    DOM.btnMenuToggle.addEventListener('click', () => DOM.sidebar.classList.add('mobile-open'));
    DOM.btnCloseSidebar.addEventListener('click', () => DOM.sidebar.classList.remove('mobile-open'));
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (DOM.sidebar.classList.contains('mobile-open') &&
            !DOM.sidebar.contains(e.target) &&
            !DOM.btnMenuToggle.contains(e.target)) {
            DOM.sidebar.classList.remove('mobile-open');
        }
    });
}

/* ==========================================================================
   Dashboard Range Helpers
   ========================================================================== */
function getDashboardDateRange() {
    const now = new Date();
    const year = state.selectedYear;
    let startDate, endDate;

    if (state.dashboardRange === 'year') {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
    } else if (state.dashboardRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (state.dashboardRange === '3months') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (state.dashboardRange === '6months') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
}


// Get months array for the current range
function getRangeMonths() {
    const { startDate, endDate } = getDashboardDateRange();
    const months = [];
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cur <= endDate) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
        cur.setMonth(cur.getMonth() + 1);
    }
    return months;
}

/* ==========================================================================
   Landing View Triggers
   ========================================================================== */
function initLandingActions() {
    const triggerDemo = () => {
        state.isDemoMode = true;
        state.isLocalMode = false;
        localStorage.setItem('contable_is_local_mode', 'false');
        loadDemoData();
        showAppInterface();
        updateLocalModeUI();
        DOM.demoModeBadge.classList.remove('hidden');
        DOM.apiStatus.className = 'api-status-badge connected';
        DOM.apiStatusText.textContent = 'Modo Demo';
        showToast('Iniciado en Modo Demostración. Explora las pestañas.', 'info');
    };

    DOM.btnLandingDemo.addEventListener('click', triggerDemo);
    DOM.btnHeroDemo.addEventListener('click', triggerDemo);

    const triggerConnect = () => {
        state.isDemoMode = false;
        DOM.demoModeBadge.classList.add('hidden');
        
        if (state.apiUrl) {
            DOM.inApiUrl.value = state.apiUrl;
            state.isLocalMode = false;
            localStorage.setItem('contable_is_local_mode', 'false');
            showAppInterface();
            updateLocalModeUI();
            syncData();
        } else {
            DOM.modalApiSetup.classList.remove('hidden');
        }
    };

    DOM.btnLandingConnect.addEventListener('click', triggerConnect);
    DOM.btnHeroStart.addEventListener('click', triggerConnect);
    
    DOM.btnModalCancel.addEventListener('click', () => {
        DOM.modalApiSetup.classList.add('hidden');
    });

    const triggerSelectLocalFile = () => {
        DOM.inputLocalFile.click();
    };
    
    DOM.btnLandingLocal.addEventListener('click', triggerSelectLocalFile);
    DOM.btnHeroLocal.addEventListener('click', triggerSelectLocalFile);
    DOM.btnModalLoadLocal.addEventListener('click', triggerSelectLocalFile);
    DOM.btnConfigLoadLocal.addEventListener('click', triggerSelectLocalFile);
    
    DOM.inputLocalFile.addEventListener('change', (e) => {
        handleLocalFileSelected(e.target.files[0]);
    });
    
    DOM.btnModalNewLocal.addEventListener('click', createNewLocalDB);
    
    DOM.btnDownloadLocal.addEventListener('click', downloadLocalDB);
    DOM.btnConfigDownloadLocal.addEventListener('click', downloadLocalDB);
    
    DOM.btnManualSync.addEventListener('click', () => {
        showToast('Sincronizando datos...', 'info');
        syncData();
    });

    DOM.btnExitApp.addEventListener('click', (e) => {
        e.preventDefault();
        hideAppInterface();
    });
}

function showAppInterface() {
    document.body.classList.remove('landing-active');
    DOM.appInterface.classList.remove('hidden');
    window.location.hash = '#dashboard';
    handleRoute();
}

function hideAppInterface() {
    document.body.classList.add('landing-active');
    DOM.appInterface.classList.add('hidden');
    window.location.hash = '';
}

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

    // If navigating away from transaction screen, reset edit mode silently
    if (hash !== '#nueva-transaccion' && state.editingMovimientoId) {
        cancelEditMovimiento(false);
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

    if (hash === '#dashboard') {
        recreateCharts();
    } else if (hash === '#movimientos') {
        applyMovementsFilters();
    } else if (hash === '#nueva-transaccion') {
        if (!state.editingMovimientoId) {
            const todayStr = new Date().toISOString().split('T')[0];
            DOM.inFecha.value = todayStr;
            DOM.inFechaReferencia.value = todayStr.substring(0, 7);
        }
    } else if (hash === '#configuracion') {
        renderConfigManagement();
    }
}

/* ==========================================================================
   Supabase REST Client
   ========================================================================== */
async function apiRequest(action, method = 'GET', data = null, isBackground = false) {
    if (state.isDemoMode) {
        return handleDemoWriteAction(action, data);
    }

    if (state.isLocalMode) {
        return handleLocalWriteAction(action, data);
    }

    if (!state.apiUrl || !state.supabaseKey) {
        if (!isBackground) showToast('Debes configurar la URL y la Anon Key de Supabase.', 'error');
        return null;
    }

    if (!isBackground) setLoading(true);
    try {
        let url = state.apiUrl;
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        
        let options = {
            mode: 'cors',
            headers: {
                'apikey': state.supabaseKey,
                'Authorization': `Bearer ${state.supabaseKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (method === 'GET') {
            options.method = 'GET';
            if (action === 'todo') {
                // LLamada a la función RPC obtener_todo() en Supabase
                options.method = 'POST';
                url += '/rest/v1/rpc/obtener_todo';
            } else {
                url += `/rest/v1/${action}?select=*`;
                if (action === 'movimientos') {
                    url += '&order=id.asc';
                }
            }
        } else {
            const actionName = action;
            
            if (actionName === 'movimiento') {
                options.method = 'POST';
                url += '/rest/v1/movimientos';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: data.tipo,
                    categoriaId: data.categoriaId ? Number(data.categoriaId) : null,
                    subcategoriaId: data.subcategoriaId ? Number(data.subcategoriaId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'transferencia') {
                options.method = 'POST';
                url += '/rest/v1/movimientos';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: 'TRANSFERENCIA',
                    categoriaOrigenId: data.categoriaOrigenId ? Number(data.categoriaOrigenId) : null,
                    categoriaDestinoId: data.categoriaDestinoId ? Number(data.categoriaDestinoId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'editar_movimiento') {
                options.method = 'PATCH';
                url += `/rest/v1/movimientos?id=eq.${data.id}`;
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: data.tipo,
                    categoriaId: data.categoriaId ? Number(data.categoriaId) : null,
                    subcategoriaId: data.subcategoriaId ? Number(data.subcategoriaId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'editar_transferencia') {
                options.method = 'PATCH';
                url += `/rest/v1/movimientos?id=eq.${data.id}`;
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: 'TRANSFERENCIA',
                    categoriaOrigenId: data.categoriaOrigenId ? Number(data.categoriaOrigenId) : null,
                    categoriaDestinoId: data.categoriaDestinoId ? Number(data.categoriaDestinoId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'eliminar_movimiento') {
                options.method = 'DELETE';
                url += `/rest/v1/movimientos?id=eq.${data.id}`;
            } else if (actionName === 'presupuesto') {
                options.method = 'POST';
                url += '/rest/v1/presupuestos';
                let version = data.version;
                if (version === undefined || isNaN(Number(version))) {
                    const versions = state.presupuestos.filter(pr => pr.categoriaId === Number(data.categoriaId) && pr.fecha_inicio === data.fecha_inicio && pr.fecha_fin === data.fecha_fin);
                    const maxVer = versions.length > 0 ? Math.max(...versions.map(v => v.version || 1)) : 0;
                    version = maxVer + 1;
                }
                options.body = JSON.stringify({
                    categoriaId: Number(data.categoriaId),
                    fecha_inicio: data.fecha_inicio,
                    fecha_fin: data.fecha_fin || null,
                    presupuesto: Number(data.presupuesto),
                    version: Number(version),
                    fecha_version: data.fecha_version || new Date().toISOString(),
                    activa: data.activa !== undefined ? (data.activa === true || data.activa === 'true') : true
                });
            } else if (actionName === 'editar_presupuesto_periodo') {
                options.method = 'PATCH';
                url += `/rest/v1/presupuestos?id=eq.${data.id}`;
                const bodyObj = {};
                if (data.fecha_inicio !== undefined) bodyObj.fecha_inicio = data.fecha_inicio;
                if (data.fecha_fin !== undefined) bodyObj.fecha_fin = data.fecha_fin;
                if (data.presupuesto !== undefined) bodyObj.presupuesto = Number(data.presupuesto);
                if (data.activa !== undefined) bodyObj.activa = (data.activa === true || data.activa === 'true');
                options.body = JSON.stringify(bodyObj);
            } else if (actionName === 'editar_categoria') {
                options.method = 'PATCH';
                url += `/rest/v1/categorias?id=eq.${data.id}`;
                const bodyObj = {};
                if (data.nombre !== undefined) bodyObj.nombre = data.nombre;
                if (data.icono !== undefined) bodyObj.icono = data.icono;
                if (data.activa !== undefined) bodyObj.activa = (data.activa === true || data.activa === 'true');
                options.body = JSON.stringify(bodyObj);
            } else if (actionName === 'editar_subcategoria') {
                options.method = 'PATCH';
                url += `/rest/v1/subcategorias?id=eq.${data.id}`;
                const bodyObj = {};
                if (data.categoriaId !== undefined) bodyObj.categoriaId = Number(data.categoriaId);
                if (data.nombre !== undefined) bodyObj.nombre = data.nombre;
                if (data.icono !== undefined) bodyObj.icono = data.icono;
                if (data.activa !== undefined) bodyObj.activa = (data.activa === true || data.activa === 'true');
                options.body = JSON.stringify(bodyObj);
            } else if (actionName === 'categoria') {
                options.method = 'POST';
                url += '/rest/v1/categorias';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    nombre: data.nombre,
                    icono: data.icono,
                    activa: true
                });
            } else if (actionName === 'subcategoria') {
                options.method = 'POST';
                url += '/rest/v1/subcategorias';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    categoriaId: Number(data.categoriaId),
                    nombre: data.nombre,
                    icono: data.icono,
                    activa: true
                });
            } else {
                throw new Error(`Acción POST no implementada para Supabase: ${actionName}`);
            }
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.message || `Error del servidor Supabase (${response.status})`);
        }

        if (response.status === 204) {
            return { success: true };
        }

        const json = await response.json();
        
        if (method === 'POST' && (action === 'movimiento' || action === 'transferencia' || action === 'categoria' || action === 'subcategoria')) {
            if (Array.isArray(json) && json.length > 0) {
                return { success: true, id: json[0].id };
            }
        }
        
        return json;
    } catch (error) {
        console.error('Supabase API Error:', error);
        if (!isBackground) showToast('Error de conexión con Supabase: ' + error.message, 'error');
        return null;
    } finally {
        if (!isBackground) setLoading(false);
    }
}

async function syncData(isBackground = false) {
    if (state.isDemoMode) return;
    
    if (state.isLocalMode) {
        populateSelectors();
        updateDashboardMetrics();
        recreateCharts();
        applyMovementsFilters();
        if (window.location.hash === '#configuracion') {
            renderConfigManagement();
        }
        saveLocalCache();
        return;
    }

    if (!state.apiUrl) return;
    
    if (!isBackground) {
        setLoading(true);
        DOM.apiStatus.className = 'api-status-badge disconnected';
        DOM.apiStatusText.textContent = 'Sincronizando...';
    }
    
    try {
        const allData = await apiRequest('todo', 'GET', null, isBackground);
        
        if (allData && allData.categorias && allData.subcategorias && allData.presupuestos && allData.movimientos) {
            const catsData = allData.categorias;
            const subcatsData = allData.subcategorias;
            const presData = allData.presupuestos;
            const movsData = allData.movimientos;
            
            const currentDataStr = JSON.stringify({
                categorias: state.categorias,
                subcategorias: state.subcategorias,
                presupuestos: state.presupuestos,
                movimientos: state.movimientos
            });
            const newDataStr = JSON.stringify({
                categorias: catsData,
                subcategorias: subcatsData,
                presupuestos: presData,
                movimientos: movsData
            });
            
            const hasChanges = currentDataStr !== newDataStr;
            
            state.categorias = catsData;
            state.subcategorias = subcatsData;
            state.presupuestos = presData;
            state.movimientos = movsData;
            
            // Recalculate index values in-memory silently
            rebuildIndex();
            
            // Guardar en la caché de API
            localStorage.setItem('contable_api_cache', newDataStr);
            
            // Only update DOM components if NOT running in background OR if there are actual changes
            if (!isBackground || hasChanges) {
                DOM.apiStatus.className = 'api-status-badge connected';
                DOM.apiStatusText.textContent = 'Sincronizado';
                
                populateSelectors();
                updateDashboardMetrics();
                recreateCharts();
                applyMovementsFilters();
                if (window.location.hash === '#configuracion') {
                    renderConfigManagement();
                }
                
                if (isBackground && hasChanges) {
                    showToast('Datos actualizados desde la nube', 'info');
                }
            } else {
                DOM.apiStatus.className = 'api-status-badge connected';
                DOM.apiStatusText.textContent = 'Sincronizado';
            }
        } else {
            if (!isBackground) {
                DOM.apiStatus.className = 'api-status-badge disconnected';
                DOM.apiStatusText.textContent = 'Error de Sinc.';
            }
        }
    } catch (err) {
        if (!isBackground) {
            DOM.apiStatus.className = 'api-status-badge disconnected';
            DOM.apiStatusText.textContent = 'Desconectado';
        }
    } finally {
        if (!isBackground) {
            setLoading(false);
        }
    }
}

/* ==========================================================================
   Form Selection Populators
   ========================================================================== */
function populateSelectors() {
    // Guardar todos los filtros y valores de formulario previos
    const prevFilterSearch = DOM.filterSearch.value;
    const prevFilterType = DOM.filterType.value;
    const prevFilterCategory = DOM.filterCategory.value;
    const prevFilterSubcategory = DOM.filterSubcategory.value;
    const prevFilterMonth = DOM.filterMonth.value;

    const prevInCategoria = DOM.inCategoria.value;
    const prevInSubcategoria = DOM.inSubcategoria.value;
    const prevInCatOrigen = DOM.inCatOrigen.value;
    const prevInCatDestino = DOM.inCatDestino.value;
    const prevInNewSubParent = DOM.inNewSubParent.value;
    const prevInPresupuestoCat = DOM.inPresupuestoCat.value;

    const activeCats = state.categorias.filter(c => c.activa);
    
    const catOptions = activeCats.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    DOM.inCategoria.innerHTML = catOptions;
    DOM.inCatOrigen.innerHTML = catOptions;
    DOM.inCatDestino.innerHTML = catOptions;
    
    if (activeCats.length > 1) {
        DOM.inCatDestino.selectedIndex = 1;
    }

    const filteredParents = activeCats.filter(c => c.id !== 9);
    DOM.inNewSubParent.innerHTML = filteredParents.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');

    DOM.inPresupuestoCat.innerHTML = catOptions;

    const filterCatOptions = '<option value="Todas">Todas</option>' + activeCats.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    DOM.filterCategory.innerHTML = filterCatOptions;
    
    // Restaurar todos los filtros estáticos y valores del formulario
    DOM.filterSearch.value = prevFilterSearch;
    DOM.filterType.value = prevFilterType;
    DOM.filterMonth.value = prevFilterMonth;
    
    if (prevInCategoria) DOM.inCategoria.value = prevInCategoria;
    if (prevInCatOrigen) DOM.inCatOrigen.value = prevInCatOrigen;
    if (prevInCatDestino) DOM.inCatDestino.value = prevInCatDestino;
    if (prevInNewSubParent) DOM.inNewSubParent.value = prevInNewSubParent;
    if (prevInPresupuestoCat) DOM.inPresupuestoCat.value = prevInPresupuestoCat;
    
    if (prevFilterCategory) DOM.filterCategory.value = prevFilterCategory;

    // Poblar y restablecer las opciones y selecciones de subcategorías
    updateSubcategoryOptions();
    if (prevInSubcategoria) {
        DOM.inSubcategoria.value = prevInSubcategoria;
    }
    
    updateFilterSubcategoryOptions();
    if (prevFilterSubcategory) {
        DOM.filterSubcategory.value = prevFilterSubcategory;
    }
}

function updateSubcategoryOptions() {
    const parentId = parseInt(DOM.inCategoria.value);
    const subs = state.subcategorias.filter(sc => sc.categoriaId === parentId && sc.activa);
    
    if (subs.length > 0) {
        DOM.inSubcategoria.innerHTML = '<option value="">(Sin subcategoría)</option>' + subs.map(sc => `<option value="${sc.id}">${sc.icono} ${sc.nombre}</option>`).join('');
        DOM.inSubcategoria.disabled = false;
    } else {
        DOM.inSubcategoria.innerHTML = '<option value="">(No hay subcategorías)</option>';
        DOM.inSubcategoria.disabled = true;
    }
}

function updateFilterSubcategoryOptions() {
    const selectedCat = DOM.filterCategory.value;
    let subs = [];
    
    if (selectedCat === 'Todas') {
        subs = state.subcategorias.filter(sc => sc.activa);
    } else {
        const catId = parseInt(selectedCat);
        subs = state.subcategorias.filter(sc => sc.categoriaId === catId && sc.activa);
    }
    
    DOM.filterSubcategory.innerHTML = '<option value="Todas">Todas</option>' + subs.map(sc => `<option value="${sc.id}">${sc.icono} ${sc.nombre}</option>`).join('');
}

DOM.inCategoria.addEventListener('change', updateSubcategoryOptions);
DOM.filterCategory.addEventListener('change', updateFilterSubcategoryOptions);

/* ==========================================================================
   Data Caching, Indexing & Background Sync
   ========================================================================== */
function normalizeDateString(dateStr) {
    if (!dateStr) return '';
    
    // If it's a simple YYYY-MM-DD, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        // Format to local YYYY-MM-DD
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    } catch (e) {
        return dateStr;
    }
}

function rebuildIndex() {
    // Normalize all dates in-place to avoid timezone offsets shifting them back a day
    state.movimientos.forEach(m => {
        if (m.fecha) m.fecha = normalizeDateString(m.fecha);
    });

    state.index = {
        allTime: {
            totalNeto: 0,
            totalAhorro: 0
        },
        byYear: {}
    };

    const initYear = (y) => {
        if (!state.index.byYear[y]) {
            state.index.byYear[y] = {
                totalIngresos: 0,
                totalGastos: 0,
                byMonth: {},
                byCategoryExpenses: {},
                bySubcategoryExpenses: {}
            };
            for (let m = 1; m <= 12; m++) {
                state.index.byYear[y].byMonth[m] = {
                    ingresos: 0,
                    gastos: 0,
                    ahorroDelta: 0,
                    byCategoryExpenses: {},
                    bySubcategoryExpenses: {}
                };
            }
        }
    };

    state.movimientos.forEach(m => {
        try {
            const val = parseFloat(m.importe) || 0;
            const refDate = m.fecha_referencia || m.fecha;
            const parts = refDate.split('-');
            const yMov = parseInt(parts[0]);
            const mMov = parseInt(parts[1]);

            if (isNaN(yMov) || isNaN(mMov) || mMov < 1 || mMov > 12) return;

            initYear(yMov);

            const yearData = state.index.byYear[yMov];
            const monthData = yearData.byMonth[mMov];

            if (m.tipo === 'INGRESO') {
                state.index.allTime.totalNeto += val;
                yearData.totalIngresos += val;
                monthData.ingresos += val;
            } else if (m.tipo === 'GASTO') {
                state.index.allTime.totalNeto -= val;
                yearData.totalGastos += val;
                monthData.gastos += val;

                const catId = parseInt(m.categoriaId);
                const subId = m.subcategoriaId ? parseInt(m.subcategoriaId) : null;

                if (!isNaN(catId)) {
                    yearData.byCategoryExpenses[catId] = (yearData.byCategoryExpenses[catId] || 0) + val;
                    monthData.byCategoryExpenses[catId] = (monthData.byCategoryExpenses[catId] || 0) + val;
                }
                if (subId && !isNaN(subId)) {
                    yearData.bySubcategoryExpenses[subId] = (yearData.bySubcategoryExpenses[subId] || 0) + val;
                    monthData.bySubcategoryExpenses[subId] = (monthData.bySubcategoryExpenses[subId] || 0) + val;
                }
            }

            // Ahorro delta
            let ahorroDelta = 0;
            if (m.tipo === 'INGRESO' && parseInt(m.categoriaId) === 9) {
                ahorroDelta += val;
            } else if (m.tipo === 'GASTO' && parseInt(m.categoriaId) === 9) {
                ahorroDelta -= val;
            } else if (m.tipo === 'TRANSFERENCIA') {
                if (parseInt(m.categoriaOrigenId) === 9) ahorroDelta -= val;
                if (parseInt(m.categoriaDestinoId) === 9) ahorroDelta += val;
            }

            if (ahorroDelta !== 0) {
                state.index.allTime.totalAhorro += ahorroDelta;
                monthData.ahorroDelta += ahorroDelta;
            }
        } catch (e) {
            console.error('Error indexing movement', m, e);
        }
    });

    // Precompute cumulative savings per year and month
    const sortedYears = Object.keys(state.index.byYear).map(Number).sort((a, b) => a - b);
    let runningAhorro = 0;
    sortedYears.forEach(y => {
        state.index.byYear[y].ahorroAcumulado = new Array(12).fill(0);
        for (let m = 1; m <= 12; m++) {
            runningAhorro += state.index.byYear[y].byMonth[m].ahorroDelta;
            state.index.byYear[y].ahorroAcumulado[m - 1] = runningAhorro;
        }
    });
}

function getAhorroAcumuladoForYear(year) {
    if (state.index.byYear[year] && state.index.byYear[year].ahorroAcumulado) {
        return state.index.byYear[year].ahorroAcumulado;
    }
    const priorYears = Object.keys(state.index.byYear)
        .map(Number)
        .filter(y => y < year)
        .sort((a, b) => b - a);
    
    let baseVal = 0;
    if (priorYears.length > 0) {
        const lastYear = priorYears[0];
        if (state.index.byYear[lastYear].ahorroAcumulado) {
            baseVal = state.index.byYear[lastYear].ahorroAcumulado[11];
        }
    }
    return new Array(12).fill(baseVal);
}

function getEffectiveBudget(categoriaId, mes, año) {
    const targetStart = `${año}-${String(mes).padStart(2, '0')}-01`;
    const lastDayOfM = new Date(año, mes, 0, 23, 59, 59, 999);
    const now = new Date();

    // Find all budget records for this category
    const catBudgets = state.presupuestos.filter(p => p.categoriaId === categoriaId);
    if (catBudgets.length === 0) return null;

    // Filter versions based on timeframe (frozen for past months)
    let versions = catBudgets;
    if (now > lastDayOfM) {
        // Option B: For past months, only consider versions created on or before the end of that month
        const preEndVersions = catBudgets.filter(p => {
            const dateVer = p.fecha_version ? new Date(p.fecha_version) : new Date(0);
            return dateVer <= lastDayOfM;
        });
        // If there are versions created during/before the month, use them. Otherwise fallback to all.
        if (preEndVersions.length > 0) {
            versions = preEndVersions;
        }
    }

    // Group the versions by their period key: `${fecha_inicio}_${fecha_fin || 'indefinido'}`
    const periodsMap = {};
    versions.forEach(p => {
        const key = `${p.fecha_inicio}_${p.fecha_fin || 'indefinido'}`;
        if (!periodsMap[key]) periodsMap[key] = [];
        periodsMap[key].push(p);
    });

    const candidates = [];
    Object.keys(periodsMap).forEach(key => {
        const periodVersions = periodsMap[key];
        // Find latest version for this period
        const latest = periodVersions.reduce((latest, current) => 
            (!latest || (current.version || 1) > (latest.version || 1)) ? current : latest, null
        );
        // If the latest version is active, and it covers the target month, add to candidates
        if (latest && (latest.activa === true || latest.activa === 'true' || latest.activa === 1)) {
            if (latest.fecha_inicio <= targetStart && (!latest.fecha_fin || targetStart <= latest.fecha_fin)) {
                candidates.push(latest);
            }
        }
    });

    if (candidates.length === 0) return null;

    // If there are multiple candidate periods covering the target month,
    // sort them to pick the most specific/recent one.
    // 1. Sort by fecha_inicio descending (most recent period starts first)
    // 2. Sort by fecha_version descending
    candidates.sort((a, b) => {
        if (a.fecha_inicio !== b.fecha_inicio) {
            return b.fecha_inicio.localeCompare(a.fecha_inicio);
        }
        const dateA = a.fecha_version ? new Date(a.fecha_version).getTime() : 0;
        const dateB = b.fecha_version ? new Date(b.fecha_version).getTime() : 0;
        return dateB - dateA;
    });

    return candidates[0];
}

let syncIntervalId = null;

function startBackgroundSync() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
    }
    syncIntervalId = setInterval(() => {
        if (!state.isDemoMode && !state.isLocalMode && state.apiUrl) {
            console.log('Background syncing data...');
            syncData(true);
        }
    }, 60000); // Sync every 60 seconds
}

/* ==========================================================================
   Dashboard Metrics Computations
   ========================================================================== */
function updateDashboardMetrics() {
    rebuildIndex(); // Always rebuild the cached index first

    const year = state.selectedYear;
    const yearData = state.index.byYear[year];
    
    const totalIngresos = yearData ? yearData.totalIngresos : 0;
    const totalGastos = yearData ? yearData.totalGastos : 0;
    const totalAhorro = state.index.allTime.totalAhorro;
    const totalNeto = state.index.allTime.totalNeto;

    DOM.valSaldoDisponible.textContent = formatCurrency(totalNeto);
    DOM.valIngresos.textContent = formatCurrency(totalIngresos);
    DOM.valGastos.textContent = formatCurrency(totalGastos);
    DOM.valAhorro.textContent = formatCurrency(totalAhorro);
}

/* ==========================================================================
   Chart.js Integrations
   ========================================================================== */
function getChartTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        isDark,
        text: isDark ? '#94a3b8' : '#64748b',
        grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        border: isDark ? '#0f1524' : '#ffffff'
    };
}

function recreateCharts() {
    if (window.location.hash !== '' && window.location.hash !== '#dashboard') return;
    if (DOM.appInterface.classList.contains('hidden')) return;
    
    if (!state.index) {
        rebuildIndex();
    }
    
    Object.keys(state.charts).forEach(key => {
        if (state.charts[key]) {
            state.charts[key].destroy();
            state.charts[key] = null;
        }
    });

    const year = state.selectedYear;
    const theme = getChartTheme();
    const rangeMonths = getRangeMonths();

    buildChartIngresosGastos(rangeMonths, theme);
    buildChartBalanceNeto(rangeMonths, theme);
    buildChartCategorias(year, theme);
    buildChartSubcategorias(year, theme);
    buildChartPresupuestoVsReal(year, theme);
    buildChartTopCategorias(theme);
    buildChartAhorro(year, theme);
    buildChartComparativa(theme);
    buildChartGastoMensual(year, theme);
}

// 1. Ingresos vs Gastos
function buildChartIngresosGastos(rangeMonths, theme) {
    const labels = rangeMonths.map(m => `${MESES_ABR[m.month - 1]} ${m.year !== state.selectedYear ? m.year : ''}`);
    const ingresos = rangeMonths.map(({ year, month }) => {
        return state.index.byYear[year]?.byMonth[month]?.ingresos || 0;
    });
    const gastos = rangeMonths.map(({ year, month }) => {
        return state.index.byYear[year]?.byMonth[month]?.gastos || 0;
    });

    const ctx = document.getElementById('chart-ingresos-gastos').getContext('2d');
    state.charts.ingresosGastos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Ingresos (€)',
                    data: ingresos,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    hoverBackgroundColor: '#10b981',
                    borderRadius: 5
                },
                {
                    label: 'Gastos (€)',
                    data: gastos,
                    backgroundColor: 'rgba(239, 68, 68, 0.75)',
                    hoverBackgroundColor: '#ef4444',
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: theme.text, boxWidth: 12 } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: { grid: { color: theme.grid }, ticks: { color: theme.text } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const datasetIndex = element.datasetIndex; // 0 = Ingreso, 1 = Gasto
                    
                    const selectedMonthObj = rangeMonths[dataIndex];
                    if (selectedMonthObj) {
                        const { year, month } = selectedMonthObj;
                        
                        if (state.selectedYear !== year) {
                            DOM.yearSelect.value = year.toString();
                            DOM.yearSelect.dispatchEvent(new Event('change'));
                        }
                        
                        DOM.filterMonth.value = month.toString();
                        DOM.filterType.value = datasetIndex === 0 ? 'INGRESO' : 'GASTO';
                        DOM.filterCategory.value = 'Todas';
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = 'Todas';
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 2. Balance Neto Mensual
function buildChartBalanceNeto(rangeMonths, theme) {
    const labels = rangeMonths.map(m => `${MESES_ABR[m.month - 1]} ${m.year !== state.selectedYear ? m.year : ''}`);
    const balances = rangeMonths.map(({ year, month }) => {
        const monthData = state.index.byYear[year]?.byMonth[month];
        return monthData ? (monthData.ingresos - monthData.gastos) : 0;
    });

    const barColors = balances.map(b => b >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)');

    const ctx = document.getElementById('chart-balance-neto').getContext('2d');
    state.charts.balanceNeto = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Balance Neto (€)',
                data: balances,
                backgroundColor: barColors,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: {
                    grid: { color: theme.grid },
                    ticks: { color: theme.text },
                    afterDataLimits: (scale) => {
                        const max = Math.max(Math.abs(scale.max), Math.abs(scale.min));
                        scale.max = max * 1.1;
                        scale.min = -max * 1.1;
                    }
                }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    
                    const selectedMonthObj = rangeMonths[dataIndex];
                    if (selectedMonthObj) {
                        const { year, month } = selectedMonthObj;
                        
                        if (state.selectedYear !== year) {
                            DOM.yearSelect.value = year.toString();
                            DOM.yearSelect.dispatchEvent(new Event('change'));
                        }
                        
                        DOM.filterMonth.value = month.toString();
                        DOM.filterType.value = 'Todos';
                        DOM.filterCategory.value = 'Todas';
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = 'Todas';
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 3. Doughnut - Categorias
function buildChartCategorias(year, theme) {
    const catExpenses = state.index.byYear[year]?.byCategoryExpenses || {};
    const catColors = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

    const catLabels = [], catData = [], catIds = [];
    Object.keys(catExpenses).forEach(id => {
        const cat = state.categorias.find(c => c.id === parseInt(id));
        catLabels.push(cat ? `${cat.icono} ${cat.nombre}` : `Cat ${id}`);
        catData.push(catExpenses[id]);
        catIds.push(parseInt(id));
    });

    const ctx = document.getElementById('chart-categorias').getContext('2d');
    state.charts.categorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: catLabels.length ? catLabels : ['Sin datos'],
            datasets: [{
                data: catData.length ? catData : [1],
                backgroundColor: catData.length ? catColors : ['#475569'],
                borderWidth: theme.isDark ? 2 : 1,
                borderColor: theme.border
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: theme.text, boxWidth: 12, padding: 12 } }
            },
            cutout: '60%',
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0 && catIds.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const categoryId = catIds[dataIndex];
                    
                    DOM.filterCategory.value = categoryId.toString();
                    updateFilterSubcategoryOptions();
                    DOM.filterSubcategory.value = 'Todas';
                    DOM.filterType.value = 'GASTO';
                    DOM.filterMonth.value = 'Todos';
                    
                    window.location.hash = '#movimientos';
                }
            }
        }
    });
}

// 4. Doughnut - Subcategorias
function buildChartSubcategorias(year, theme) {
    const subExpenses = state.index.byYear[year]?.bySubcategoryExpenses || {};
    const subColors = ['#f43f5e', '#a855f7', '#06b6d4', '#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'];

    const subLabels = [], subData = [], subIds = [];
    Object.keys(subExpenses).forEach(id => {
        const sub = state.subcategorias.find(sc => sc.id === parseInt(id));
        subLabels.push(sub ? `${sub.icono} ${sub.nombre}` : `Sub ${id}`);
        subData.push(subExpenses[id]);
        subIds.push(parseInt(id));
    });

    const ctx = document.getElementById('chart-subcategorias').getContext('2d');
    state.charts.subcategorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: subLabels.length ? subLabels : ['Sin datos'],
            datasets: [{
                data: subData.length ? subData : [1],
                backgroundColor: subData.length ? subColors : ['#475569'],
                borderWidth: theme.isDark ? 2 : 1,
                borderColor: theme.border
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: theme.text, boxWidth: 12, padding: 12 } }
            },
            cutout: '60%',
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0 && subIds.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const subId = subIds[dataIndex];
                    
                    const sub = state.subcategorias.find(sc => sc.id === subId);
                    if (sub) {
                        DOM.filterCategory.value = sub.categoriaId.toString();
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = subId.toString();
                        DOM.filterType.value = 'GASTO';
                        DOM.filterMonth.value = 'Todos';
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 5. Presupuesto vs Real
function buildChartPresupuestoVsReal(year, theme) {
    const monthSelect = document.getElementById('chart-presupuesto-month-select');
    const targetMonth = monthSelect ? parseInt(monthSelect.value) : (new Date().getMonth() + 1);
    const activeCats = state.categorias.filter(c => c.activa && c.id !== 9);
    
    const labels = activeCats.map(c => `${c.icono} ${c.nombre}`);
    const presupuestado = activeCats.map(c => {
        const p = getEffectiveBudget(c.id, targetMonth, year);
        return p ? parseFloat(p.presupuesto) : 0;
    });
    const gastado = activeCats.map(c => {
        return state.index.byYear[year]?.byMonth[targetMonth]?.byCategoryExpenses[c.id] || 0;
    });

    // Update Summary Element
    const summaryEl = document.getElementById('chart-presupuesto-summary');
    if (summaryEl) {
        const totalPresupuesto = presupuestado.reduce((a, b) => a + b, 0);
        const totalGasto = gastado.reduce((a, b) => a + b, 0);
        const diferencia = totalPresupuesto - totalGasto;
        
        let diffHtml = '';
        if (diferencia >= 0) {
            diffHtml = `<span style="color: var(--success); font-weight: 700;">💰 Sobrante: +${formatCurrency(diferencia)}</span>`;
        } else {
            diffHtml = `<span style="color: var(--danger); font-weight: 700;">⚠️ Faltante: ${formatCurrency(diferencia)}</span>`;
        }

        summaryEl.innerHTML = `
            <div><strong>Presupuestado Total:</strong> ${formatCurrency(totalPresupuesto)}</div>
            <div><strong>Gastado Total:</strong> ${formatCurrency(totalGasto)}</div>
            <div>${diffHtml}</div>
        `;
    }

    const ctx = document.getElementById('chart-presupuesto-vs-real').getContext('2d');
    state.charts.presupuestoVsReal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Presupuestado (€)',
                    data: presupuestado,
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    hoverBackgroundColor: '#6366f1',
                    borderRadius: 4
                },
                {
                    label: 'Gastado (€)',
                    data: gastado,
                    backgroundColor: gastado.map((g, i) => g > presupuestado[i] ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)'),
                    hoverBackgroundColor: '#10b981',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: theme.text, boxWidth: 12 } },
                tooltip: {
                    callbacks: {
                        afterBody: (items) => {
                            const idx = items[0].dataIndex;
                            const diff = presupuestado[idx] - gastado[idx];
                            return diff >= 0 ? `Restante: ${formatCurrency(diff)}` : `Excedido: ${formatCurrency(-diff)}`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: { grid: { color: theme.grid }, ticks: { color: theme.text } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const cat = activeCats[dataIndex];
                    if (cat) {
                        DOM.filterCategory.value = cat.id.toString();
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = 'Todas';
                        DOM.filterType.value = 'GASTO';
                        DOM.filterMonth.value = targetMonth.toString();
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 6. Top Categorias de Gasto
function buildChartTopCategorias(theme) {
    const catExpenses = {};
    const rangeMonths = getRangeMonths();

    // Aggregate category expenses over the range months from the precomputed index
    rangeMonths.forEach(({ year, month }) => {
        const monthCats = state.index.byYear[year]?.byMonth[month]?.byCategoryExpenses;
        if (monthCats) {
            Object.entries(monthCats).forEach(([catId, val]) => {
                catExpenses[catId] = (catExpenses[catId] || 0) + val;
            });
        }
    });

    const sorted = Object.entries(catExpenses)
        .map(([id, val]) => {
            const cat = state.categorias.find(c => c.id === parseInt(id));
            return { id: parseInt(id), label: cat ? `${cat.icono} ${cat.nombre}` : `Cat ${id}`, val };
        })
        .sort((a, b) => b.val - a.val)
        .slice(0, 7);

    const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6'];

    const ctx = document.getElementById('chart-top-categorias').getContext('2d');
    state.charts.topCategorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s.label),
            datasets: [{
                label: 'Gasto (€)',
                data: sorted.map(s => s.val),
                backgroundColor: palette.slice(0, sorted.length),
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: theme.grid }, ticks: { color: theme.text } },
                y: { grid: { display: false }, ticks: { color: theme.text } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const catObj = sorted[dataIndex];
                    if (catObj) {
                        DOM.filterCategory.value = catObj.id.toString();
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = 'Todas';
                        DOM.filterType.value = 'GASTO';
                        DOM.filterMonth.value = 'Todos';
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 7. Ahorro Acumulado
function buildChartAhorro(year, theme) {
    const monthlyAhorro = getAhorroAcumuladoForYear(year);

    const ctx = document.getElementById('chart-ahorro').getContext('2d');
    state.charts.ahorro = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MESES_ABR,
            datasets: [{
                label: 'Ahorro Acumulado (€)',
                data: monthlyAhorro,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: theme.grid }, ticks: { color: theme.text } },
                y: { grid: { color: theme.grid }, ticks: { color: theme.text } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const month = dataIndex + 1;
                    
                    DOM.filterMonth.value = month.toString();
                    DOM.filterType.value = 'Todos';
                    DOM.filterCategory.value = '9'; // Categoria Ahorro
                    updateFilterSubcategoryOptions();
                    DOM.filterSubcategory.value = 'Todas';
                    
                    window.location.hash = '#movimientos';
                }
            }
        }
    });
}

// 8. Comparativa Interanual
function buildChartComparativa(theme) {
    const year = state.selectedYear;
    const prevYear = year - 1;
    const palette = { current: '#6366f1', prev: '#f59e0b' };

    const monthlyGastosCur = new Array(12).fill(0);
    const monthlyGastosPrev = new Array(12).fill(0);

    for (let m = 1; m <= 12; m++) {
        monthlyGastosCur[m - 1] = state.index.byYear[year]?.byMonth[m]?.gastos || 0;
        monthlyGastosPrev[m - 1] = state.index.byYear[prevYear]?.byMonth[m]?.gastos || 0;
    }

    const ctx = document.getElementById('chart-comparativa').getContext('2d');
    state.charts.comparativa = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MESES_ABR,
            datasets: [
                {
                    label: `Gastos ${year}`,
                    data: monthlyGastosCur,
                    borderColor: palette.current,
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: palette.current
                },
                {
                    label: `Gastos ${prevYear}`,
                    data: monthlyGastosPrev,
                    borderColor: palette.prev,
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 3,
                    borderDash: [5, 5],
                    pointBackgroundColor: palette.prev
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: theme.text, boxWidth: 12 } }
            },
            scales: {
                x: { grid: { color: theme.grid }, ticks: { color: theme.text } },
                y: { grid: { color: theme.grid }, ticks: { color: theme.text } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const datasetIndex = element.datasetIndex; // 0 = Actual, 1 = Anterior
                    
                    const clickedYear = datasetIndex === 0 ? year : prevYear;
                    const month = dataIndex + 1;
                    
                    if (state.selectedYear !== clickedYear) {
                        DOM.yearSelect.value = clickedYear.toString();
                        DOM.yearSelect.dispatchEvent(new Event('change'));
                    }
                    
                    DOM.filterMonth.value = month.toString();
                    DOM.filterType.value = 'GASTO';
                    DOM.filterCategory.value = 'Todas';
                    updateFilterSubcategoryOptions();
                    DOM.filterSubcategory.value = 'Todas';
                    
                    window.location.hash = '#movimientos';
                }
            }
        }
    });
}

// 9. Historial de Gasto Mensual
function buildChartGastoMensual(year, theme) {
    const monthlyGastos = new Array(12).fill(0);
    for (let m = 1; m <= 12; m++) {
        monthlyGastos[m - 1] = state.index.byYear[year]?.byMonth[m]?.gastos || 0;
    }

    const ctx = document.getElementById('chart-gasto-mensual').getContext('2d');
    state.charts.gastoMensual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MESES_ABR,
            datasets: [{
                label: 'Gasto Mensual (€)',
                data: monthlyGastos,
                backgroundColor: 'rgba(239, 68, 68, 0.75)',
                hoverBackgroundColor: '#ef4444',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: { grid: { color: theme.grid }, ticks: { color: theme.text } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const month = dataIndex + 1;
                    
                    DOM.filterMonth.value = month.toString();
                    DOM.filterType.value = 'GASTO';
                    DOM.filterCategory.value = 'Todas';
                    updateFilterSubcategoryOptions();
                    DOM.filterSubcategory.value = 'Todas';
                    
                    window.location.hash = '#movimientos';
                }
            }
        }
    });
}

/* ==========================================================================
   Movements Listing, Filtering & Pagination
   ========================================================================== */
function applyMovementsFilters() {
    if (window.location.hash !== '#movimientos') return;

    const query = DOM.filterSearch.value.toLowerCase().trim();
    const typeFilter = DOM.filterType.value;
    const catFilter = DOM.filterCategory.value;
    const subFilter = DOM.filterSubcategory.value;
    const monthFilter = DOM.filterMonth.value;
    const year = state.selectedYear;

    let filtered = state.movimientos.filter(m => {
        try {
            const parts = m.fecha.split('-');
            const yMov = parseInt(parts[0]);
            const mMov = parseInt(parts[1]);

            if (query && (!m.concepto || !m.concepto.toLowerCase().includes(query))) return false;
            if (yMov !== year) return false;
            if (typeFilter !== 'Todos' && m.tipo !== typeFilter) return false;
            if (catFilter !== 'Todas') {
                const catId = parseInt(catFilter);
                if (m.tipo === 'TRANSFERENCIA') {
                    if (m.categoriaOrigenId !== catId && m.categoriaDestinoId !== catId) return false;
                } else {
                    if (m.categoriaId !== catId) return false;
                }
            }
            if (subFilter !== 'Todas') {
                const subId = parseInt(subFilter);
                if (m.subcategoriaId !== subId) return false;
            }
            if (monthFilter !== 'Todos') {
                const mes = parseInt(monthFilter);
                if (mMov !== mes) return false;
            }
            return true;
        } catch (e) { return false; }
    });

    filtered.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    
    // Store filtered list and reset to page 1
    state.filteredMovimientos = filtered;
    state.currentPage = 1;
    renderMovementsPage();
}

function renderMovementsPage() {
    const total = state.filteredMovimientos.length;
    const totalPages = Math.ceil(total / state.itemsPerPage);
    const start = (state.currentPage - 1) * state.itemsPerPage;
    const end = Math.min(start + state.itemsPerPage, total);
    const pageMovs = state.filteredMovimientos.slice(start, end);

    // Update count text
    if (total > 0) {
        DOM.paginationCountText.textContent = `Mostrando ${start + 1}–${end} de ${total} movimientos`;
        DOM.paginationInfo.classList.remove('hidden');
    } else {
        DOM.paginationInfo.classList.add('hidden');
    }

    renderMovementsTable(pageMovs);
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    if (totalPages <= 1) {
        DOM.paginationControls.classList.add('hidden');
        return;
    }
    DOM.paginationControls.classList.remove('hidden');

    DOM.btnPagePrev.disabled = state.currentPage === 1;
    DOM.btnPageNext.disabled = state.currentPage === totalPages;

    // Generate page number buttons (max 5 visible + ellipsis)
    let pages = [];
    if (totalPages <= 7) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        pages = [1];
        if (state.currentPage > 3) pages.push('...');
        for (let i = Math.max(2, state.currentPage - 1); i <= Math.min(totalPages - 1, state.currentPage + 1); i++) {
            pages.push(i);
        }
        if (state.currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    DOM.paginationPages.innerHTML = pages.map(p => {
        if (p === '...') return '<span class="pagination-ellipsis">…</span>';
        const active = p === state.currentPage ? 'active' : '';
        return `<button class="pagination-num ${active}" data-page="${p}">${p}</button>`;
    }).join('');

    DOM.paginationPages.querySelectorAll('.pagination-num').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentPage = parseInt(btn.getAttribute('data-page'));
            renderMovementsPage();
        });
    });
}

function renderMovementsTable(movs) {
    if (movs.length === 0 && state.filteredMovimientos.length === 0) {
        DOM.listMovimientosBody.innerHTML = '';
        DOM.tableEmpty.classList.remove('hidden');
        return;
    }
    DOM.tableEmpty.classList.add('hidden');

    DOM.listMovimientosBody.innerHTML = movs.map(m => {
        let typeBadge = '';
        let amountClass = '';
        let amountText = '';
        let categoryText = '';
        let subcatText = '';

        const cat = state.categorias.find(c => c.id === m.categoriaId);
        const sub = state.subcategorias.find(sc => sc.id === m.subcategoriaId);

        if (m.tipo === 'GASTO') {
            typeBadge = '<span class="val-badge gasto">Gasto</span>';
            amountClass = 'val-importe gasto';
            amountText = `- ${parseFloat(m.importe).toFixed(2)} €`;
            categoryText = cat ? `${cat.icono} ${cat.nombre}` : '';
            subcatText = sub ? `${sub.icono} ${sub.nombre}` : '';
        } else if (m.tipo === 'INGRESO') {
            typeBadge = '<span class="val-badge ingreso">Ingreso</span>';
            amountClass = 'val-importe ingreso';
            amountText = `+ ${parseFloat(m.importe).toFixed(2)} €`;
            categoryText = cat ? `${cat.icono} ${cat.nombre}` : '';
            subcatText = '';
        } else if (m.tipo === 'TRANSFERENCIA') {
            typeBadge = '<span class="val-badge transfer">Transf.</span>';
            amountClass = 'val-importe transfer';
            amountText = `${parseFloat(m.importe).toFixed(2)} €`;
            const catO = state.categorias.find(c => c.id === m.categoriaOrigenId);
            const catD = state.categorias.find(c => c.id === m.categoriaDestinoId);
            categoryText = `${catO ? catO.icono : '❓'} ➔ ${catD ? catD.icono : '❓'}`;
            subcatText = 'Transferencia';
        }

        const catSubcatCombined = [categoryText, subcatText].filter(Boolean).join(' / ');

        return `
            <tr class="mov-row">
                <td data-label="Fecha">${formatDate(m.fecha)}</td>
                <td data-label="Tipo">${typeBadge}</td>
                <td data-label="Categoría">
                    <span class="desktop-cat">${categoryText}</span>
                    <span class="mobile-catsubcat">${catSubcatCombined}</span>
                </td>
                <td data-label="Subcategoría">${subcatText}</td>
                <td data-label="Concepto">${m.concepto}</td>
                <td data-label="Importe" class="${amountClass} text-right">${amountText}</td>
                <td data-label="Acciones" class="text-center">
                    <div class="actions-cell">
                        <button class="btn-action-edit" data-id="${m.id}" title="Editar">✏️</button>
                        <button class="btn-action-delete" data-id="${m.id}" title="Eliminar">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Bind event listeners to new row action buttons
    DOM.listMovimientosBody.querySelectorAll('.btn-action-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            startEditMovimiento(id);
        });
    });

    DOM.listMovimientosBody.querySelectorAll('.btn-action-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            deleteMovimiento(id);
        });
    });
}

function startEditMovimiento(id) {
    const m = state.movimientos.find(mov => mov.id == id);
    if (!m) return;

    state.editingMovimientoId = id;

    // Show indicator and Cancel button
    DOM.editIndicator.classList.remove('hidden');
    DOM.editIdBadge.textContent = `#${id}`;
    DOM.btnCancelEdit.classList.remove('hidden');
    DOM.btnSubmitMovimiento.textContent = 'Guardar Cambios';

    // Switch tab active state and form type
    DOM.inTipo.value = m.tipo;
    DOM.formTabBtns.forEach(btn => {
        if (btn.getAttribute('data-type') === m.tipo) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Populate common fields
    DOM.inImporte.value = m.importe;
    DOM.inConcepto.value = m.concepto;
    DOM.inFecha.value = normalizeDateString(m.fecha);
    const refDate = m.fecha_referencia || m.fecha;
    DOM.inFechaReferencia.value = refDate ? refDate.substring(0, 7) : '';

    // Show/hide fields based on type and populate category/subcategory
    if (m.tipo === 'GASTO') {
        DOM.condGastoIngreso.forEach(el => el.classList.remove('hidden'));
        DOM.condGasto.forEach(el => el.classList.remove('hidden'));
        DOM.condTransferencia.forEach(el => el.classList.add('hidden'));

        DOM.inCategoria.value = m.categoriaId;
        updateSubcategoryOptions();
        DOM.inSubcategoria.value = m.subcategoriaId || '';
    } else if (m.tipo === 'INGRESO') {
        DOM.condGastoIngreso.forEach(el => el.classList.remove('hidden'));
        DOM.condGasto.forEach(el => el.classList.add('hidden'));
        DOM.condTransferencia.forEach(el => el.classList.add('hidden'));

        DOM.inCategoria.value = m.categoriaId;
    } else if (m.tipo === 'TRANSFERENCIA') {
        DOM.condGastoIngreso.forEach(el => el.classList.add('hidden'));
        DOM.condGasto.forEach(el => el.classList.add('hidden'));
        DOM.condTransferencia.forEach(el => el.classList.remove('hidden'));

        DOM.inCatOrigen.value = m.categoriaOrigenId;
        DOM.inCatDestino.value = m.categoriaDestinoId;
    }

    // Redirect to form screen
    window.location.hash = '#nueva-transaccion';
}

function cancelEditMovimiento(shouldRedirect = true) {
    state.editingMovimientoId = null;
    
    // Reset indicators and buttons
    DOM.editIndicator.classList.add('hidden');
    DOM.btnCancelEdit.classList.add('hidden');
    DOM.btnSubmitMovimiento.textContent = 'Registrar Transacción';
    
    DOM.formMovimiento.reset();
    const todayStr = new Date().toISOString().split('T')[0];
    DOM.inFecha.value = todayStr;
    DOM.inFechaReferencia.value = todayStr.substring(0, 7);
    
    // Set type back to default GASTO
    DOM.inTipo.value = 'GASTO';
    DOM.formTabBtns.forEach(b => {
        if (b.getAttribute('data-type') === 'GASTO') b.classList.add('active');
        else b.classList.remove('active');
    });
    DOM.condGastoIngreso.forEach(el => el.classList.remove('hidden'));
    DOM.condGasto.forEach(el => el.classList.remove('hidden'));
    DOM.condTransferencia.forEach(el => el.classList.add('hidden'));

    if (shouldRedirect) {
        window.location.hash = '#movimientos';
    }
}

async function deleteMovimiento(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la transacción #${id}?`)) return;
    
    const res = await apiRequest('eliminar_movimiento', 'POST', { id });
    if (res && res.success) {
        showToast('Transacción eliminada con éxito', 'success');
        if (!state.isDemoMode && !state.isLocalMode) {
            await syncData();
        } else {
            updateDashboardMetrics();
            recreateCharts();
            applyMovementsFilters();
        }
    }
}

DOM.filterSearch.addEventListener('input', applyMovementsFilters);
DOM.filterType.addEventListener('change', applyMovementsFilters);
DOM.filterCategory.addEventListener('change', applyMovementsFilters);
DOM.filterSubcategory.addEventListener('change', applyMovementsFilters);
DOM.filterMonth.addEventListener('change', applyMovementsFilters);

DOM.btnClearFilters.addEventListener('click', () => {
    DOM.filterSearch.value = '';
    DOM.filterType.value = 'Todos';
    DOM.filterCategory.value = 'Todas';
    updateFilterSubcategoryOptions();
    DOM.filterSubcategory.value = 'Todas';
    DOM.filterMonth.value = 'Todos';
    applyMovementsFilters();
});

DOM.btnToggleFilters.addEventListener('click', () => {
    DOM.advancedFilters.classList.toggle('collapsed');
});

/* ==========================================================================
   Form Handling & API POST Submission
   ========================================================================== */
function initFormHandlers() {
    DOM.formTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            DOM.formTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.getAttribute('data-type');
            DOM.inTipo.value = type;
            
            if (type === 'GASTO') {
                DOM.condGastoIngreso.forEach(el => el.classList.remove('hidden'));
                DOM.condGasto.forEach(el => el.classList.remove('hidden'));
                DOM.condTransferencia.forEach(el => el.classList.add('hidden'));
            } else if (type === 'INGRESO') {
                DOM.condGastoIngreso.forEach(el => el.classList.remove('hidden'));
                DOM.condGasto.forEach(el => el.classList.add('hidden'));
                DOM.condTransferencia.forEach(el => el.classList.add('hidden'));
            } else if (type === 'TRANSFERENCIA') {
                DOM.condGastoIngreso.forEach(el => el.classList.add('hidden'));
                DOM.condGasto.forEach(el => el.classList.add('hidden'));
                DOM.condTransferencia.forEach(el => el.classList.remove('hidden'));
            }
        });
    });

    DOM.btnCancelEdit.addEventListener('click', () => cancelEditMovimiento(true));

    DOM.inFecha.addEventListener('change', () => {
        if (DOM.inFecha.value) {
            DOM.inFechaReferencia.value = DOM.inFecha.value.substring(0, 7);
        }
    });

    DOM.formMovimiento.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tipo = DOM.inTipo.value;
        const importe = parseFloat(DOM.inImporte.value);
        const concepto = DOM.inConcepto.value.trim();
        const fecha = DOM.inFecha.value;
        const refMonthVal = DOM.inFechaReferencia.value;
        const fecha_referencia = refMonthVal ? `${refMonthVal}-01` : `${fecha.substring(0, 7)}-01`;

        if (isNaN(importe) || importe <= 0) {
            showToast('Por favor introduce un importe válido', 'error');
            return;
        }

        let payload = { tipo, importe, concepto, fecha, fecha_referencia };
        let action = 'movimiento';

        if (state.editingMovimientoId) {
            payload.id = state.editingMovimientoId;
            action = 'editar_movimiento';
        }

        if (tipo === 'GASTO') {
            payload.categoriaId = parseInt(DOM.inCategoria.value);
            payload.subcategoriaId = DOM.inSubcategoria.value ? parseInt(DOM.inSubcategoria.value) : '';
        } else if (tipo === 'INGRESO') {
            payload.categoriaId = parseInt(DOM.inCategoria.value);
        } else if (tipo === 'TRANSFERENCIA') {
            if (state.editingMovimientoId) {
                action = 'editar_transferencia';
            } else {
                action = 'transferencia';
            }
            payload.categoriaOrigenId = parseInt(DOM.inCatOrigen.value);
            payload.categoriaDestinoId = parseInt(DOM.inCatDestino.value);
            if (payload.categoriaOrigenId === payload.categoriaDestinoId) {
                showToast('La categoría origen y destino no pueden ser iguales', 'error');
                return;
            }
        }

        const res = await apiRequest(action, 'POST', payload);
        if (res && res.success) {
            showToast(state.editingMovimientoId ? 'Transacción modificada con éxito' : 'Transacción registrada con éxito', 'success');
            
            const wasEditing = !!state.editingMovimientoId;
            cancelEditMovimiento(wasEditing);
            
            if (!state.isDemoMode && !state.isLocalMode) {
                await syncData();
            } else {
                updateDashboardMetrics();
                recreateCharts();
                applyMovementsFilters();
            }
        }
    });

    DOM.formApiUrl.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = DOM.inApiUrl.value.trim();
        const key = DOM.inSupabaseKey.value.trim();
        
        if (url && key) {
            localStorage.setItem('contable_supabase_api_url', url);
            localStorage.setItem('contable_supabase_key', key);
            state.supabaseApiUrl = url;
            state.supabaseKey = key;
            state.isDemoMode = false;
            state.isLocalMode = false;
            localStorage.setItem('contable_is_local_mode', 'false');
            
            DOM.demoModeBadge.classList.add('hidden');
            updateLocalModeUI();
            updateApiUIFromState();
            
            showToast('Configuración de la API guardada. Conectando...', 'success');
            syncData();
        }
    });

    DOM.btnTestApi.addEventListener('click', async () => {
        const url = DOM.inApiUrl.value.trim();
        const key = DOM.inSupabaseKey.value.trim();
        
        if (!url) {
            showToast('Introduce una URL antes de probar', 'error');
            return;
        }
        if (!key) {
            showToast('Introduce la Anon Key antes de probar', 'error');
            return;
        }

        const oldSupabaseUrl = state.supabaseApiUrl;
        const oldKey = state.supabaseKey;
        
        state.supabaseApiUrl = url;
        state.supabaseKey = key;
        
        const test = await apiRequest('categorias', 'GET');
        if (test) {
            showToast('Conexión probada con éxito!', 'success');
        } else {
            showToast('Error al probar conexión. Verifica tus credenciales', 'error');
            state.supabaseApiUrl = oldSupabaseUrl;
            state.supabaseKey = oldKey;
        }
    });

    DOM.formModalApi.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = DOM.inModalApiUrl.value.trim();
        const key = DOM.inModalSupabaseKey.value.trim();
        
        if (url && key) {
            localStorage.setItem('contable_supabase_api_url', url);
            localStorage.setItem('contable_supabase_key', key);
            state.supabaseApiUrl = url;
            state.supabaseKey = key;
            state.isDemoMode = false;
            state.isLocalMode = false;
            localStorage.setItem('contable_is_local_mode', 'false');
            
            updateApiUIFromState();
            
            DOM.modalApiSetup.classList.add('hidden');
            showAppInterface();
            updateLocalModeUI();
            showToast('Conectado con éxito', 'success');
            syncData();
        }
    });

    DOM.formPresupuesto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const startVal = DOM.inPresupuestoInicio.value;
        const endVal = DOM.inPresupuestoFin.value;

        if (!startVal) {
            showToast('El mes de inicio es obligatorio', 'error');
            return;
        }

        const fecha_inicio = `${startVal}-01`;
        let fecha_fin = null;
        if (endVal) {
            const parts = endVal.split('-');
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const lastDay = new Date(y, m, 0).getDate();
            fecha_fin = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }

        const payload = {
            categoriaId: parseInt(DOM.inPresupuestoCat.value),
            fecha_inicio,
            fecha_fin,
            presupuesto: parseFloat(DOM.inPresupuestoImporte.value)
        };

        if (isNaN(payload.presupuesto) || payload.presupuesto < 0) {
            showToast('Presupuesto no válido', 'error');
            return;
        }

        const res = await apiRequest('presupuesto', 'POST', payload);
        if (res && res.success) {
            showToast('Presupuesto guardado correctamente', 'success');
            DOM.inPresupuestoImporte.value = '';
            if (!state.isDemoMode) {
                await syncData();
            }
        }
    });

    DOM.formCrearCategoria.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nombre: DOM.inNewCatNombre.value.trim(),
            icono: DOM.inNewCatIcono.value.trim()
        };
        const res = await apiRequest('categoria', 'POST', payload);
        if (res && res.success) {
            showToast('Categoría creada con éxito', 'success');
            DOM.inNewCatNombre.value = '';
            DOM.inNewCatIcono.value = '';
            if (!state.isDemoMode && !state.isLocalMode) {
                await syncData();
            } else {
                populateSelectors();
                renderConfigManagement();
            }
        }
    });

    DOM.formCrearSubcategoria.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            categoriaId: parseInt(DOM.inNewSubParent.value),
            nombre: DOM.inNewSubNombre.value.trim(),
            icono: DOM.inNewSubIcono.value.trim()
        };
        const res = await apiRequest('subcategoria', 'POST', payload);
        if (res && res.success) {
            showToast('Subcategoría creada con éxito', 'success');
            DOM.inNewSubNombre.value = '';
            DOM.inNewSubIcono.value = '';
            if (!state.isDemoMode && !state.isLocalMode) {
                await syncData();
            } else {
                populateSelectors();
                renderConfigManagement();
            }
        }
    });

    if (DOM.btnTransferirTodosSobrantes) {
        DOM.btnTransferirTodosSobrantes.addEventListener('click', async () => {
            const month = parseInt(DOM.automationMonthSelect.value);
            const year = state.selectedYear;
            
            const activeCats = state.categorias.filter(c => c.activa && c.id !== 9);
            if (activeCats.length === 0) {
                showToast('No hay categorías activas', 'error');
                return;
            }

            // Calculate which categories have positive surplus
            const categoriesToTransfer = [];
            let totalSurplus = 0;

            activeCats.forEach(cat => {
                const budgetObj = getEffectiveBudget(cat.id, month, year);
                const budgetVal = budgetObj ? parseFloat(budgetObj.presupuesto) : 0.0;
                const expenseVal = state.index.byYear[year]?.byMonth[month]?.byCategoryExpenses[cat.id] || 0.0;
                
                // Calculate already transferred
                const transferredVal = state.movimientos.reduce((sum, m) => {
                    if (m.tipo === 'TRANSFERENCIA' && parseInt(m.categoriaOrigenId) === cat.id && parseInt(m.categoriaDestinoId) === 9) {
                        const refDate = m.fecha_referencia || m.fecha;
                        const parts = refDate.split('-');
                        const yMov = parseInt(parts[0]);
                        const mMov = parseInt(parts[1]);
                        if (yMov === year && mMov === month) {
                            return sum + (parseFloat(m.importe) || 0);
                        }
                    }
                    return sum;
                }, 0);

                const surplus = budgetVal - expenseVal - transferredVal;
                if (surplus > 0.01) { // avoid floating point issues near 0
                    categoriesToTransfer.push({ cat, surplus });
                    totalSurplus += surplus;
                }
            });

            if (categoriesToTransfer.length === 0) {
                showToast('No se encontraron saldos sobrantes positivos para transferir en este período.', 'warning');
                return;
            }

            if (!confirm(`¿Estás seguro de que deseas transferir los saldos sobrantes de ${categoriesToTransfer.length} categorías (Total: ${formatCurrency(totalSurplus)}) del mes de ${MESES_ABR[month-1]} ${year} al Ahorro?`)) return;

            setLoading(true);
            let transfersCreated = 0;

            for (const item of categoriesToTransfer) {
                const res = await apiRequest('transferencia', 'POST', {
                    categoriaOrigenId: item.cat.id,
                    categoriaDestinoId: 9,
                    importe: item.surplus,
                    concepto: `Transferencia sobrante ${item.cat.nombre} (${MESES_ABR[month-1]} ${year})`,
                    fecha: new Date().toISOString().split('T')[0],
                    fecha_referencia: `${year}-${String(month).padStart(2, '0')}-01`
                });
                if (res && res.success) transfersCreated++;
            }

            setLoading(false);
            if (transfersCreated > 0) {
                showToast(`Automatización finalizada: ${transfersCreated} transferencias creadas.`, 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    await syncData();
                } else {
                    updateDashboardMetrics();
                    recreateCharts();
                    renderConfigManagement();
                }
            } else {
                showToast('No se pudieron crear las transferencias.', 'error');
            }
        });
    }
}

/* ==========================================================================
   Demo Mode Mock Data Setup
   ========================================================================== */
function loadDemoData() {
    state.categorias = [
        { id: 1, nombre: "Agua", icono: "💧", activa: true },
        { id: 2, nombre: "Basuras", icono: "🗑️", activa: true },
        { id: 3, nombre: "Internet", icono: "🛜", activa: true },
        { id: 4, nombre: "Gas", icono: "💨", activa: true },
        { id: 5, nombre: "Luz", icono: "💡", activa: true },
        { id: 6, nombre: "Compra", icono: "🛒", activa: true },
        { id: 7, nombre: "Restaurantes", icono: "🍽️", activa: true },
        { id: 8, nombre: "Otras Compras", icono: "🛍️", activa: true },
        { id: 9, nombre: "Ahorro", icono: "💰", activa: true }
    ];

    state.subcategorias = [
        { id: 1, categoriaId: 6, nombre: "Compra Comida", icono: "🛒", activa: true },
        { id: 2, categoriaId: 6, nombre: "Compra Cocina", icono: "🍳", activa: true },
        { id: 3, categoriaId: 6, nombre: "Compra Limpieza", icono: "🧹", activa: true },
        { id: 4, categoriaId: 6, nombre: "Compra Baño", icono: "🛁", activa: true },
        { id: 5, categoriaId: 6, nombre: "Compra Medicina", icono: "💊", activa: true },
        { id: 6, categoriaId: 8, nombre: "Electrodomésticos", icono: "📺", activa: true },
        { id: 7, categoriaId: 8, nombre: "Bricolaje", icono: "🪛", activa: true },
        { id: 8, categoriaId: 8, nombre: "Evento", icono: "🥳", activa: true },
        { id: 9, categoriaId: 8, nombre: "Ocio", icono: "🎉", activa: true },
        { id: 10, categoriaId: 8, nombre: "Otro", icono: "💵", activa: true }
    ];

    const currentYear = state.selectedYear;
    state.presupuestos = [
        { id: 101, categoriaId: 1, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 35, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 102, categoriaId: 2, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 15, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 103, categoriaId: 3, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 40, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 104, categoriaId: 4, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 50, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 105, categoriaId: 5, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 75, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 106, categoriaId: 6, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 250, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 107, categoriaId: 7, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 100, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 108, categoriaId: 8, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 80, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true }
    ];

    state.movimientos = [];
    let mId = 1;
    const prevYear = currentYear - 1;

    // Previous year data for comparative chart
    for (let mes = 1; mes <= 12; mes++) {
        const mm = mes < 10 ? `0${mes}` : mes;
        state.movimientos.push(
            { id: mId++, fecha: `${prevYear}-${mm}-01`, tipo: "INGRESO", categoriaId: 9, subcategoriaId: "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: "Nomina Mensual", importe: 1750 },
            { id: mId++, fecha: `${prevYear}-${mm}-05`, tipo: "GASTO", categoriaId: 5, subcategoriaId: "", concepto: "Recibo Luz", importe: 68 },
            { id: mId++, fecha: `${prevYear}-${mm}-08`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Supermercado", importe: 70 },
            { id: mId++, fecha: `${prevYear}-${mm}-15`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Restaurante", importe: 40 }
        );
    }

    // Current year data
    for (let mes = 1; mes <= 12; mes++) {
        const mm = mes < 10 ? `0${mes}` : mes;
        state.movimientos.push(
            { id: mId++, fecha: `${currentYear}-${mm}-01`, tipo: "INGRESO", categoriaId: 9, subcategoriaId: "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: "Nomina Mensual Trabajo", importe: 1850 },
            { id: mId++, fecha: `${currentYear}-${mm}-05`, tipo: "GASTO", categoriaId: 5, subcategoriaId: "", concepto: "Recibo de la Luz", importe: 62.45 },
            { id: mId++, fecha: `${currentYear}-${mm}-06`, tipo: "GASTO", categoriaId: 1, subcategoriaId: "", concepto: "Consumo de Agua", importe: 24.10 },
            { id: mId++, fecha: `${currentYear}-${mm}-10`, tipo: "GASTO", categoriaId: 3, subcategoriaId: "", concepto: "Fibra + Movil", importe: 38.90 },
            { id: mId++, fecha: `${currentYear}-${mm}-04`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Supermercado Semanal", importe: 64.20 },
            { id: mId++, fecha: `${currentYear}-${mm}-12`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Compra semanal", importe: 58.30 },
            { id: mId++, fecha: `${currentYear}-${mm}-18`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 2, concepto: "Sarten antiadherente", importe: 24.99 },
            { id: mId++, fecha: `${currentYear}-${mm}-20`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 3, concepto: "Detergente y suavizante", importe: 12.80 },
            { id: mId++, fecha: `${currentYear}-${mm}-07`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Cena fin de semana", importe: 35.50 },
            { id: mId++, fecha: `${currentYear}-${mm}-22`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Almuerzo oficina", importe: 12.50 },
            { id: mId++, fecha: `${currentYear}-${mm}-${mes % 2 === 0 ? '15' : '25'}`, tipo: "GASTO", categoriaId: 8, subcategoriaId: mes % 2 === 0 ? 9 : 7, concepto: mes % 2 === 0 ? "Cine + Palomitas" : "Herramientas", importe: mes % 2 === 0 ? 18 : 34.50 },
            { id: mId++, fecha: `${currentYear}-${mm}-28`, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: 6, categoriaDestinoId: 9, concepto: "Sobrante mensual ahorro", importe: 50 }
        );
    }

    populateSelectors();
    updateDashboardMetrics();
    recreateCharts();
    applyMovementsFilters();
}

function handleDemoWriteAction(action, data) {
    if (action === 'movimiento') {
        const id = state.movimientos.length + 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe });
        return { success: true, id, message: "Movimiento insertado (Demo)" };
    } else if (action === 'transferencia') {
        const id = state.movimientos.length + 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe });
        return { success: true, id, message: "Transferencia insertada (Demo)" };
    } else if (action === 'editar_movimiento') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe };
            return { success: true, message: "Movimiento editado (Demo)" };
        }
        return { success: false, error: 'Movimiento no encontrado' };
    } else if (action === 'editar_transferencia') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe };
            return { success: true, message: "Transferencia editada (Demo)" };
        }
        return { success: false, error: 'Transferencia no encontrada' };
    } else if (action === 'eliminar_movimiento') {
        state.movimientos = state.movimientos.filter(m => m.id != data.id);
        return { success: true, message: "Movimiento eliminado (Demo)" };
    } else if (action === 'presupuesto') {
        const versions = state.presupuestos.filter(pr => pr.categoriaId === data.categoriaId && pr.fecha_inicio === data.fecha_inicio && pr.fecha_fin === data.fecha_fin);
        const maxVer = versions.length > 0 ? Math.max(...versions.map(v => v.version || 1)) : 0;
        const nextVer = maxVer + 1;
        const id = state.presupuestos.length > 0 ? Math.max(...state.presupuestos.map(pr => pr.id)) + 1 : 1;
        state.presupuestos.push({ 
            id, 
            categoriaId: data.categoriaId, 
            fecha_inicio: data.fecha_inicio, 
            fecha_fin: data.fecha_fin || null, 
            presupuesto: data.presupuesto,
            version: nextVer,
            fecha_version: new Date().toISOString(),
            activa: data.activa !== undefined ? (data.activa === true || data.activa === 'true') : true
        });
        return { success: true, message: "Presupuesto guardado (Demo)" };
    } else if (action === 'editar_presupuesto_periodo') {
        const idx = state.presupuestos.findIndex(p => p.id == data.id);
        if (idx !== -1) {
            if (data.fecha_inicio !== undefined) state.presupuestos[idx].fecha_inicio = data.fecha_inicio;
            if (data.fecha_fin !== undefined) state.presupuestos[idx].fecha_fin = data.fecha_fin;
            if (data.presupuesto !== undefined) state.presupuestos[idx].presupuesto = data.presupuesto;
            if (data.activa !== undefined) state.presupuestos[idx].activa = (data.activa === true || data.activa === 'true');
            return { success: true, message: "Presupuesto editado (Demo)" };
        }
        return { success: false, error: 'Presupuesto no encontrado' };
    } else if (action === 'editar_categoria') {
        const idx = state.categorias.findIndex(c => c.id == data.id);
        if (idx !== -1) {
            if (data.nombre !== undefined) state.categorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.categorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.categorias[idx].activa = (data.activa === true || data.activa === 'true');
            return { success: true, message: "Categoria editada (Demo)" };
        }
        return { success: false, error: 'Categoria no encontrada' };
    } else if (action === 'editar_subcategoria') {
        const idx = state.subcategorias.findIndex(s => s.id == data.id);
        if (idx !== -1) {
            if (data.categoriaId !== undefined) state.subcategorias[idx].categoriaId = Number(data.categoriaId);
            if (data.nombre !== undefined) state.subcategorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.subcategorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.subcategorias[idx].activa = (data.activa === true || data.activa === 'true');
            return { success: true, message: "Subcategoria editada (Demo)" };
        }
        return { success: false, error: 'Subcategoria no encontrada' };
    } else if (action === 'categoria') {
        const id = state.categorias.length + 1;
        state.categorias.push({ id, nombre: data.nombre, icono: data.icono, activa: true });
        return { success: true, id, message: "Categoria creada (Demo)" };
    } else if (action === 'subcategoria') {
        const id = state.subcategorias.length + 1;
        state.subcategorias.push({ id, categoriaId: data.categoriaId, nombre: data.nombre, icono: data.icono, activa: true });
        return { success: true, id, message: "Subcategoria creada (Demo)" };
    }
    return { success: false, error: 'Accion demo no contemplada' };
}

/* ==========================================================================
   UI Helpers & Utility Methods
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
    if (!dateStr) return '-';
    try {
        const normalized = normalizeDateString(dateStr);
        const parts = normalized.split('-');
        const y = parts[0];
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        return `${d} ${MESES_ABR[m]} ${y}`;
    } catch (e) { return dateStr; }
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        
        const style = document.createElement('style');
        style.innerHTML = `
            .toast-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                z-index: 9999;
                max-width: calc(100vw - 48px);
            }
            .toast {
                min-width: 260px;
                max-width: 360px;
                padding: 14px 20px;
                border-radius: 10px;
                color: #ffffff;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 10px 25px rgba(0,0,0,0.25);
                display: flex;
                align-items: center;
                gap: 12px;
                animation: toast-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                transition: all 0.3s ease;
                word-break: break-word;
            }
            .toast.success { background-color: #10b981; }
            .toast.error { background-color: #ef4444; }
            .toast.warning { background-color: #f59e0b; }
            .toast.info { background-color: #3b82f6; }
            @keyframes toast-in {
                from { transform: translateY(20px) scale(0.9); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
            }
            @media (max-width: 480px) {
                .toast-container { bottom: 16px; right: 16px; left: 16px; }
                .toast { min-width: unset; width: 100%; }
            }
        `;
        document.head.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'scale(0.9)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* ==========================================================================
   Local Offline Mode Helper Functions
   ========================================================================== */
function updateApiUIFromState() {
    if (DOM.inApiUrl) DOM.inApiUrl.value = state.supabaseApiUrl;
    if (DOM.inModalApiUrl) DOM.inModalApiUrl.value = state.supabaseApiUrl;
    if (DOM.inSupabaseKey) DOM.inSupabaseKey.value = state.supabaseKey;
    if (DOM.inModalSupabaseKey) DOM.inModalSupabaseKey.value = state.supabaseKey;
}

function checkLocalCache() {
    const wasLocal = localStorage.getItem('contable_is_local_mode') === 'true';
    if (wasLocal) {
        const cached = localStorage.getItem('contable_local_db');
        if (cached) {
            try {
                const data = JSON.parse(cached);
                if (validateLocalJSON(data)) {
                    state.isLocalMode = true;
                    state.isDemoMode = false;
                    state.categorias = data.categorias;
                    state.subcategorias = data.subcategorias || [];
                    state.presupuestos = data.presupuestos || [];
                    state.movimientos = data.movimientos || [];
                    
                    showAppInterface();
                    updateLocalModeUI();
                    populateSelectors();
                    updateDashboardMetrics();
                    recreateCharts();
                    applyMovementsFilters();
                    showToast('Base de datos local cargada desde la cache del navegador', 'success');
                }
            } catch (e) {
                console.error('Error loading cached local DB', e);
            }
        }
    } else if (state.apiUrl) {
        state.isLocalMode = false;
        state.isDemoMode = false;
        
        // Rellenar los inputs y configurar labels según el estado cargado
        updateApiUIFromState();
        
        const cachedApi = localStorage.getItem('contable_api_cache');
        if (cachedApi) {
            try {
                const data = JSON.parse(cachedApi);
                if (validateLocalJSON(data)) {
                    state.categorias = data.categorias;
                    state.subcategorias = data.subcategorias || [];
                    state.presupuestos = data.presupuestos || [];
                    state.movimientos = data.movimientos || [];
                    
                    rebuildIndex();
                    showAppInterface();
                    updateLocalModeUI();
                    populateSelectors();
                    updateDashboardMetrics();
                    recreateCharts();
                    applyMovementsFilters();
                    
                    DOM.apiStatus.className = 'api-status-badge connected';
                    DOM.apiStatusText.textContent = 'Sincronizado (Caché)';
                    
                    // Sincronizar de fondo los datos actualizados
                    syncData(true);
                    return;
                }
            } catch (e) {
                console.error('Error loading cached API data', e);
            }
        }
        
        showAppInterface();
        updateLocalModeUI();
        syncData();
    }
}



function validateLocalJSON(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.categorias)) return false;
    if (!Array.isArray(data.subcategorias)) data.subcategorias = [];
    if (!Array.isArray(data.presupuestos)) data.presupuestos = [];
    if (!Array.isArray(data.movimientos)) data.movimientos = [];
    return true;
}

function handleLocalFileSelected(file) {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
        showToast('Por favor, selecciona un archivo .json valido', 'error');
        return;
    }
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
        setLoading(false);
        try {
            const data = JSON.parse(e.target.result);
            if (validateLocalJSON(data)) {
                state.isLocalMode = true;
                state.isDemoMode = false;
                localStorage.setItem('contable_is_local_mode', 'true');
                state.categorias = data.categorias;
                state.subcategorias = data.subcategorias || [];
                state.presupuestos = data.presupuestos || [];
                state.movimientos = data.movimientos || [];
                saveLocalCache();
                DOM.modalApiSetup.classList.add('hidden');
                showAppInterface();
                updateLocalModeUI();
                populateSelectors();
                updateDashboardMetrics();
                recreateCharts();
                applyMovementsFilters();
                showToast(`Base de datos '${file.name}' cargada correctamente`, 'success');
            } else {
                showToast('El archivo JSON no tiene una estructura compatible', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error al parsear el archivo JSON', 'error');
        }
    };
    reader.onerror = () => { setLoading(false); showToast('Error al leer el archivo', 'error'); };
    reader.readAsText(file);
}

function createNewLocalDB() {
    if (state.movimientos.length > 0 || state.categorias.length > 0) {
        if (!confirm('Esto sobrescribira los datos actuales en memoria. Continuar?')) return;
    }
    state.isLocalMode = true;
    state.isDemoMode = false;
    localStorage.setItem('contable_is_local_mode', 'true');
    loadDefaultLocalStructure();
    saveLocalCache();
    DOM.modalApiSetup.classList.add('hidden');
    showAppInterface();
    updateLocalModeUI();
    populateSelectors();
    updateDashboardMetrics();
    recreateCharts();
    applyMovementsFilters();
    showToast('Nueva base de datos local creada con categorias por defecto', 'success');
}

function loadDefaultLocalStructure() {
    state.categorias = [
        { id: 1, nombre: "Agua", icono: "💧", activa: true },
        { id: 2, nombre: "Basuras", icono: "🗑️", activa: true },
        { id: 3, nombre: "Internet", icono: "🛜", activa: true },
        { id: 4, nombre: "Gas", icono: "💨", activa: true },
        { id: 5, nombre: "Luz", icono: "💡", activa: true },
        { id: 6, nombre: "Compra", icono: "🛒", activa: true },
        { id: 7, nombre: "Restaurantes", icono: "🍽️", activa: true },
        { id: 8, nombre: "Otras Compras", icono: "🛍️", activa: true },
        { id: 9, nombre: "Ahorro", icono: "💰", activa: true }
    ];
    state.subcategorias = [
        { id: 1, categoriaId: 6, nombre: "Compra Comida", icono: "🛒", activa: true },
        { id: 2, categoriaId: 6, nombre: "Compra Cocina", icono: "🍳", activa: true },
        { id: 3, categoriaId: 6, nombre: "Compra Limpieza", icono: "🧹", activa: true },
        { id: 4, categoriaId: 6, nombre: "Compra Baño", icono: "🛁", activa: true },
        { id: 5, categoriaId: 6, nombre: "Compra Medicina", icono: "💊", activa: true },
        { id: 6, categoriaId: 8, nombre: "Electrodomesticos", icono: "📺", activa: true },
        { id: 7, categoriaId: 8, nombre: "Bricolaje", icono: "🪛", activa: true },
        { id: 8, categoriaId: 8, nombre: "Evento", icono: "🥳", activa: true },
        { id: 9, categoriaId: 8, nombre: "Ocio", icono: "🎉", activa: true },
        { id: 10, categoriaId: 8, nombre: "Otro", icono: "💵", activa: true }
    ];
    state.presupuestos = [];
    state.movimientos = [];
}

function saveLocalCache() {
    localStorage.setItem('contable_local_db', JSON.stringify({
        categorias: state.categorias,
        subcategorias: state.subcategorias,
        presupuestos: state.presupuestos,
        movimientos: state.movimientos
    }));
}

function updateLocalModeUI() {
    if (state.isLocalMode) {
        DOM.apiStatus.className = 'api-status-badge local-mode';
        DOM.apiStatusText.textContent = 'Archivo Local';
        DOM.btnDownloadLocal.classList.remove('hidden');
        DOM.cardConfigLocal.classList.remove('hidden');
    } else {
        DOM.btnDownloadLocal.classList.add('hidden');
        DOM.cardConfigLocal.classList.add('hidden');
        if (state.isDemoMode) {
            DOM.apiStatus.className = 'api-status-badge connected';
            DOM.apiStatusText.textContent = 'Modo Demo';
        } else if (state.apiUrl) {
            DOM.apiStatus.className = 'api-status-badge connected';
            DOM.apiStatusText.textContent = 'Sincronizado';
        } else {
            DOM.apiStatus.className = 'api-status-badge disconnected';
            DOM.apiStatusText.textContent = 'Desconectado';
        }
    }
}

function downloadLocalDB() {
    const dbData = {
        categorias: state.categorias,
        subcategorias: state.subcategorias,
        presupuestos: state.presupuestos,
        movimientos: state.movimientos
    };
    const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_contable_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada con exito', 'success');
}

async function renderConfigManagement() {
    if (!DOM.containerCategoriasGestion || !DOM.containerPresupuestosGestion) return;

    // 1. Render Categories & Subcategories
    let catsHtml = '<div class="mgmt-list">';
    state.categorias.forEach(cat => {
        const isActive = cat.activa === true || cat.activa === 'true' || cat.activa === 1;
        const subcategories = state.subcategorias.filter(sc => sc.categoriaId === cat.id);

        catsHtml += `
            <div class="mgmt-item" data-cat-id="${cat.id}">
                <div class="mgmt-row">
                    <div class="mgmt-info">
                        <span class="mgmt-emoji">${cat.icono || '📁'}</span>
                        <span class="mgmt-name">${cat.nombre}</span>
                    </div>
                    <div class="mgmt-actions">
                        <button class="mgmt-btn-edit btn-edit-cat" title="Editar Nombre/Emoji">✏️</button>
                        <span class="mgmt-badge ${isActive ? 'active' : 'inactive'} toggle-status-cat" title="Haga clic para alternar estado">
                            ${isActive ? 'Activa' : 'Inactiva'}
                        </span>
                    </div>
                </div>
        `;

        if (subcategories.length > 0) {
            catsHtml += '<div class="mgmt-sub-list">';
            subcategories.forEach(sub => {
                const subActive = sub.activa === true || sub.activa === 'true' || sub.activa === 1;
                catsHtml += `
                    <div class="mgmt-sub-row" data-sub-id="${sub.id}">
                        <div class="mgmt-sub-info">
                            <span class="mgmt-emoji">${sub.icono || '📄'}</span>
                            <span class="mgmt-name">${sub.nombre}</span>
                        </div>
                        <div class="mgmt-actions">
                            <button class="mgmt-btn-edit btn-edit-sub" title="Editar Nombre/Emoji">✏️</button>
                            <span class="mgmt-badge ${subActive ? 'active' : 'inactive'} toggle-status-sub" title="Haga clic para alternar estado">
                                ${subActive ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                    </div>
                `;
            });
            catsHtml += '</div>';
        } else {
            catsHtml += '<div class="mgmt-sub-list"><div class="card-description" style="margin: 0; padding-left: 8px; font-style: italic;">Sin subcategorías</div></div>';
        }

        catsHtml += `</div>`;
    });
    catsHtml += '</div>';
    DOM.containerCategoriasGestion.innerHTML = catsHtml;

    // 2. Render Budgets by Period
    const formatPeriod = (start, end) => {
        const formatMonth = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            const y = parts[0];
            const mIndex = parseInt(parts[1]) - 1;
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return `${monthNames[mIndex]} ${y}`;
        };
        const startStr = formatMonth(start);
        const endStr = end ? formatMonth(end) : 'Indefinido';
        return `${startStr} ➔ ${endStr}`;
    };

    const activeCats = state.categorias.filter(c => c.activa === true || c.activa === 'true' || c.activa === 1);
    
    let budgetsHtml = `<div class="mgmt-list">`;
    if (activeCats.length === 0) {
        budgetsHtml += `<div class="card-description" style="text-align: center;">No hay categorías principales activas.</div>`;
    } else {
        activeCats.forEach(cat => {
            const catBudgets = state.presupuestos.filter(p => p.categoriaId === cat.id);
            
            // Group by period key: `${fecha_inicio}_${fecha_fin || 'indefinido'}`
            const periodsMap = {};
            catBudgets.forEach(p => {
                const key = `${p.fecha_inicio}_${p.fecha_fin || 'indefinido'}`;
                if (!periodsMap[key]) periodsMap[key] = [];
                periodsMap[key].push(p);
            });

            const periodKeys = Object.keys(periodsMap).sort(); // Sort chronologically

            budgetsHtml += `
                <div class="budget-mgmt-item" data-cat-id="${cat.id}">
                    <div class="budget-mgmt-cat" style="font-weight: 700; margin-bottom: 8px;">
                        <span>${cat.icono || '📁'}</span>
                        <span>${cat.nombre}</span>
                    </div>
            `;

            if (periodKeys.length === 0) {
                budgetsHtml += `
                    <div class="card-description" style="margin: 0; padding-left: 8px; font-style: italic;">Sin presupuestos establecidos</div>
                `;
            } else {
                budgetsHtml += `<div class="mgmt-sub-list" style="margin-left: 0; padding-left: 0; border-left: none;">`;
                periodKeys.forEach(key => {
                    const versions = periodsMap[key];
                    // Sort versions descending
                    versions.sort((a, b) => (b.version || 1) - (a.version || 1));
                    const latest = versions[0];
                    const isLatestActive = latest.activa === true || latest.activa === 'true' || latest.activa === 1;

                    budgetsHtml += `
                        <div class="budget-mgmt-main mgmt-sub-row" data-budget-id="${latest.id}" data-period-key="${key}" style="border-bottom: 1px dashed var(--border-color); padding: 8px 0; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div class="budget-mgmt-cat" style="font-size: 13px; color: var(--text-secondary);">
                                <span>📅 ${formatPeriod(latest.fecha_inicio, latest.fecha_fin)}</span>
                            </div>
                            <div class="budget-mgmt-value-box">
                                <span class="budget-mgmt-amount ${isLatestActive ? '' : 'inactive'}" style="${isLatestActive ? '' : 'color: var(--text-muted); text-decoration: line-through;'}">
                                    ${formatCurrency(parseFloat(latest.presupuesto))}
                                </span>
                                <div class="mgmt-actions">
                                    <button class="budget-mgmt-btn-toggle btn-edit-budget" title="Editar este presupuesto">✏️ Editar</button>
                                    ${isLatestActive ? `
                                        <button class="budget-mgmt-btn-toggle btn-deactivate-budget" style="border-color: var(--danger); color: var(--danger);" title="Eliminar/Desactivar este presupuesto">🗑️ Quitar</button>
                                    ` : ''}
                                    ${versions.length > 1 ? `
                                        <button class="budget-mgmt-btn-toggle btn-toggle-versions" title="Mostrar historial de versiones">🕒 Versiones (${versions.length})</button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;

                    // Render version history block (collapsible) for this period
                    if (versions.length > 1) {
                        budgetsHtml += `
                            <div class="versions-history-box hidden" id="versions-history-${latest.id}" style="margin-left: 16px; margin-bottom: 12px; border-top: 1px solid var(--border-color); padding-top: 8px;">
                                <div class="version-title">Historial de Versiones del Período</div>
                        `;
                        versions.forEach(v => {
                            const isVActive = v.activa === true || v.activa === 'true' || v.activa === 1;
                            const dateFormatted = v.fecha_version ? new Date(v.fecha_version).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
                            const isThisEffective = v.id === latest.id;

                            budgetsHtml += `
                                <div class="version-item" style="${isThisEffective ? 'border-color: var(--primary); background: rgba(99, 102, 241, 0.05);' : ''}">
                                    <div>
                                        <span class="version-item-num">V${v.version || 1}</span>
                                        ${isThisEffective ? '<span class="version-item-badge active" style="margin-left: 6px; background: var(--primary-glow); color: var(--primary);">Actual</span>' : ''}
                                    </div>
                                    <div style="font-weight: 600;">${formatCurrency(parseFloat(v.presupuesto))}</div>
                                    <div class="version-item-date">${dateFormatted}</div>
                                    <span class="version-item-badge ${isVActive ? 'active' : 'inactive'}">
                                        ${isVActive ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                            `;
                        });
                        budgetsHtml += `</div>`;
                    }
                });
                budgetsHtml += `</div>`;
            }

            budgetsHtml += `</div>`;
        });
    }
    budgetsHtml += `</div>`;
    DOM.containerPresupuestosGestion.innerHTML = budgetsHtml;

    // 3. Render surplus categories for automations tab
    if (DOM.containerSobrantesGestion && DOM.automationMonthSelect) {
        const autoMonth = parseInt(DOM.automationMonthSelect.value);
        const autoYear = state.selectedYear;
        const activeCatsToEvaluate = state.categorias.filter(c => c.activa && c.id !== 9);

        let sobrantesHtml = '<div class="mgmt-list">';
        let hasPositiveSurplus = false;
        
        if (activeCatsToEvaluate.length === 0) {
            sobrantesHtml += '<div class="card-description" style="text-align: center;">No hay categorías activas para evaluar.</div>';
        } else {
            activeCatsToEvaluate.forEach(cat => {
                const budgetObj = getEffectiveBudget(cat.id, autoMonth, autoYear);
                const budgetVal = budgetObj ? parseFloat(budgetObj.presupuesto) : 0.0;
                const expenseVal = state.index.byYear[autoYear]?.byMonth[autoMonth]?.byCategoryExpenses[cat.id] || 0.0;
                
                // Calculate already transferred from this category to Ahorro (9) inside target month/year
                const transferredVal = state.movimientos.reduce((sum, m) => {
                    if (m.tipo === 'TRANSFERENCIA' && parseInt(m.categoriaOrigenId) === cat.id && parseInt(m.categoriaDestinoId) === 9) {
                        const refDate = m.fecha_referencia || m.fecha;
                        const parts = refDate.split('-');
                        const yMov = parseInt(parts[0]);
                        const mMov = parseInt(parts[1]);
                        if (yMov === autoYear && mMov === autoMonth) {
                            return sum + (parseFloat(m.importe) || 0);
                        }
                    }
                    return sum;
                }, 0);

                const surplus = budgetVal - expenseVal - transferredVal;
                const isPositive = surplus > 0.01;
                if (isPositive) hasPositiveSurplus = true;

                sobrantesHtml += `
                    <div class="automation-item" data-cat-id="${cat.id}">
                        <div class="automation-row">
                            <div class="mgmt-info">
                                <span class="mgmt-emoji">${cat.icono || '📁'}</span>
                                <span class="mgmt-name" style="font-weight: 600;">${cat.nombre}</span>
                            </div>
                            <div class="mgmt-actions" style="display: flex; align-items: center; gap: 12px;">
                                <span class="surplus-pill ${isPositive ? 'positive' : 'neutral'}">
                                    ${isPositive ? '+' : ''}${formatCurrency(surplus)}
                                </span>
                                ${isPositive ? `
                                    <button type="button" class="btn btn-secondary btn-sm btn-transfer-single" data-surplus="${surplus}" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer;">💸 Transferir</button>
                                ` : `
                                    <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Sin sobrante</span>
                                `}
                            </div>
                        </div>
                        <div class="automation-details">
                            <span>📋 Presupuesto: <strong>${formatCurrency(budgetVal)}</strong></span>
                            <span>📉 Gastado: <strong>${formatCurrency(expenseVal)}</strong></span>
                            ${transferredVal > 0 ? `<span>💰 Transferido: <strong>${formatCurrency(transferredVal)}</strong></span>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        sobrantesHtml += '</div>';
        DOM.containerSobrantesGestion.innerHTML = sobrantesHtml;

        // Toggle bulk button state
        const bulkBtn = DOM.btnTransferirTodosSobrantes;
        if (bulkBtn) {
            if (hasPositiveSurplus) {
                bulkBtn.removeAttribute('disabled');
                bulkBtn.style.opacity = '1';
                bulkBtn.style.cursor = 'pointer';
            } else {
                bulkBtn.setAttribute('disabled', 'true');
                bulkBtn.style.opacity = '0.5';
                bulkBtn.style.cursor = 'not-allowed';
            }
        }

        // Attach event listeners to single transfer buttons
        DOM.containerSobrantesGestion.querySelectorAll('.btn-transfer-single').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const item = e.target.closest('.automation-item');
                const catId = parseInt(item.getAttribute('data-cat-id'));
                const cat = state.categorias.find(c => c.id === catId);
                const surplusVal = parseFloat(e.target.getAttribute('data-surplus'));

                if (!cat) return;

                if (!confirm(`¿Estás seguro de que deseas transferir el saldo sobrante de ${formatCurrency(surplusVal)} de "${cat.nombre}" a la categoría de Ahorro?`)) {
                    return;
                }

                setLoading(true);
                const res = await apiRequest('transferencia', 'POST', {
                    categoriaOrigenId: catId,
                    categoriaDestinoId: 9,
                    importe: surplusVal,
                    concepto: `Transferencia sobrante ${cat.nombre} (${MESES_ABR[autoMonth-1]} ${autoYear})`,
                    fecha: new Date().toISOString().split('T')[0],
                    fecha_referencia: `${autoYear}-${String(autoMonth).padStart(2, '0')}-01`
                });

                setLoading(false);
                if (res && res.success) {
                    showToast(`Transferencia de ${formatCurrency(surplusVal)} realizada con éxito.`, 'success');
                    if (!state.isDemoMode && !state.isLocalMode) {
                        await syncData();
                    } else {
                        updateDashboardMetrics();
                        recreateCharts();
                        renderConfigManagement();
                    }
                } else {
                    showToast('Ocurrió un error al realizar la transferencia.', 'error');
                }
            });
        });
    }

    // Attach Event Listeners to Category management buttons
    DOM.containerCategoriasGestion.querySelectorAll('.btn-edit-cat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.mgmt-item');
            const catId = parseInt(item.getAttribute('data-cat-id'));
            const cat = state.categorias.find(c => c.id === catId);
            if (!cat) return;

            const newName = prompt('Editar nombre de la categoría:', cat.nombre);
            if (newName === null) return;
            const newIcon = prompt('Editar emoji (icono) de la categoría:', cat.icono);
            if (newIcon === null) return;

            const nameTrim = newName.trim();
            const iconTrim = newIcon.trim();
            if (!nameTrim || !iconTrim) {
                showToast('El nombre y el icono no pueden estar vacíos', 'error');
                return;
            }

            const res = await apiRequest('editar_categoria', 'PATCH', { id: catId, nombre: nameTrim, icono: iconTrim });
            if (res && res.success) {
                showToast('Categoría actualizada con éxito', 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    await syncData();
                } else {
                    populateSelectors();
                    renderConfigManagement();
                }
            }
        });
    });

    DOM.containerCategoriasGestion.querySelectorAll('.toggle-status-cat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.mgmt-item');
            const catId = parseInt(item.getAttribute('data-cat-id'));
            const cat = state.categorias.find(c => c.id === catId);
            if (!cat) return;

            const newStatus = !(cat.activa === true || cat.activa === 'true' || cat.activa === 1);
            
            // Confirm deactivation if they are disabling it
            if (!newStatus) {
                if (!confirm(`¿Estás seguro de que deseas desactivar la categoría "${cat.nombre}"? No aparecerá en los nuevos movimientos, pero se mantendrán los históricos.`)) {
                    return;
                }
            }

            const res = await apiRequest('editar_categoria', 'PATCH', { id: catId, activa: newStatus });
            if (res && res.success) {
                showToast(`Categoría ${newStatus ? 'activada' : 'desactivada'} con éxito`, 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    await syncData();
                } else {
                    populateSelectors();
                    renderConfigManagement();
                }
            }
        });
    });

    // Attach Event Listeners to Subcategory management buttons
    DOM.containerCategoriasGestion.querySelectorAll('.btn-edit-sub').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.mgmt-sub-row');
            const subId = parseInt(item.getAttribute('data-sub-id'));
            const sub = state.subcategorias.find(s => s.id === subId);
            if (!sub) return;

            const newName = prompt('Editar nombre de la subcategoría:', sub.nombre);
            if (newName === null) return;
            const newIcon = prompt('Editar emoji (icono) de la subcategoría:', sub.icono);
            if (newIcon === null) return;

            const nameTrim = newName.trim();
            const iconTrim = newIcon.trim();
            if (!nameTrim || !iconTrim) {
                showToast('El nombre y el icono no pueden estar vacíos', 'error');
                return;
            }

            const res = await apiRequest('editar_subcategoria', 'PATCH', { id: subId, nombre: nameTrim, icono: iconTrim });
            if (res && res.success) {
                showToast('Subcategoría actualizada con éxito', 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    await syncData();
                } else {
                    populateSelectors();
                    renderConfigManagement();
                }
            }
        });
    });

    DOM.containerCategoriasGestion.querySelectorAll('.toggle-status-sub').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.mgmt-sub-row');
            const subId = parseInt(item.getAttribute('data-sub-id'));
            const sub = state.subcategorias.find(s => s.id === subId);
            if (!sub) return;

            const newStatus = !(sub.activa === true || sub.activa === 'true' || sub.activa === 1);

            const res = await apiRequest('editar_subcategoria', 'PATCH', { id: subId, activa: newStatus });
            if (res && res.success) {
                showToast(`Subcategoría ${newStatus ? 'activada' : 'desactivada'} con éxito`, 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    await syncData();
                } else {
                    populateSelectors();
                    renderConfigManagement();
                }
            }
        });
    });

    // Attach Event Listeners to Budget management buttons
    DOM.containerPresupuestosGestion.querySelectorAll('.btn-edit-budget').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('.budget-mgmt-main');
            const catId = parseInt(row.closest('.budget-mgmt-item').getAttribute('data-cat-id'));
            const budgetId = parseInt(row.getAttribute('data-budget-id'));
            const budget = state.presupuestos.find(p => p.id === budgetId);
            if (!budget) return;
            
            // Auto populate form
            DOM.inPresupuestoCat.value = catId.toString();
            DOM.inPresupuestoInicio.value = budget.fecha_inicio.substring(0, 7);
            DOM.inPresupuestoFin.value = budget.fecha_fin ? budget.fecha_fin.substring(0, 7) : '';
            DOM.inPresupuestoImporte.value = parseFloat(budget.presupuesto).toFixed(2);

            // Scroll budget form into view and highlight it
            DOM.formPresupuesto.scrollIntoView({ behavior: 'smooth' });
            DOM.inPresupuestoImporte.focus();
            showToast('Modifique los valores en el formulario de arriba.', 'info');
        });
    });

    DOM.containerPresupuestosGestion.querySelectorAll('.btn-deactivate-budget').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('.budget-mgmt-main');
            const budgetId = parseInt(row.getAttribute('data-budget-id'));
            const budget = state.presupuestos.find(p => p.id === budgetId);
            if (!budget) return;

            const periodName = formatPeriod(budget.fecha_inicio, budget.fecha_fin);
            if (!confirm(`¿Estás seguro de que deseas desactivar el presupuesto para el período ${periodName}? Se creará una nueva versión inactiva.`)) {
                return;
            }

            // Get previous budget to see what the next version is
            const versions = state.presupuestos.filter(p => p.categoriaId === budget.categoriaId && p.fecha_inicio === budget.fecha_inicio && p.fecha_fin === budget.fecha_fin);
            const maxVer = versions.length > 0 ? Math.max(...versions.map(v => v.version || 1)) : 0;
            const nextVer = maxVer + 1;

            const payload = {
                categoriaId: budget.categoriaId,
                fecha_inicio: budget.fecha_inicio,
                fecha_fin: budget.fecha_fin,
                presupuesto: 0,
                version: nextVer,
                activa: false
            };

            const res = await apiRequest('presupuesto', 'POST', payload);
            if (res && res.success) {
                showToast('Presupuesto desactivado con éxito', 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    await syncData();
                } else {
                    renderConfigManagement();
                }
            }
        });
    });

    DOM.containerPresupuestosGestion.querySelectorAll('.btn-toggle-versions').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('.budget-mgmt-main');
            const budgetId = row.getAttribute('data-budget-id');
            const historyBox = document.getElementById(`versions-history-${budgetId}`);
            if (historyBox) {
                historyBox.classList.toggle('hidden');
            }
        });
    });
}

function handleLocalWriteAction(action, data) {
    if (action === 'movimiento') {
        const id = state.movimientos.length > 0 ? Math.max(...state.movimientos.map(m => m.id)) + 1 : 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe });
        saveLocalCache();
        return { success: true, id, message: "Movimiento guardado localmente" };
    } else if (action === 'transferencia') {
        const id = state.movimientos.length > 0 ? Math.max(...state.movimientos.map(m => m.id)) + 1 : 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe });
        saveLocalCache();
        return { success: true, id, message: "Transferencia guardada localmente" };
    } else if (action === 'editar_movimiento') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe };
            saveLocalCache();
            return { success: true, message: "Movimiento editado localmente" };
        }
        return { success: false, error: 'Movimiento no encontrado' };
    } else if (action === 'editar_transferencia') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe };
            saveLocalCache();
            return { success: true, message: "Transferencia editada localmente" };
        }
        return { success: false, error: 'Transferencia no encontrada' };
    } else if (action === 'eliminar_movimiento') {
        state.movimientos = state.movimientos.filter(m => m.id != data.id);
        saveLocalCache();
        return { success: true, message: "Movimiento eliminado localmente" };
    } else if (action === 'presupuesto') {
        const versions = state.presupuestos.filter(pr => pr.categoriaId === data.categoriaId && pr.fecha_inicio === data.fecha_inicio && pr.fecha_fin === data.fecha_fin);
        const maxVer = versions.length > 0 ? Math.max(...versions.map(v => v.version || 1)) : 0;
        const nextVer = maxVer + 1;
        const id = state.presupuestos.length > 0 ? Math.max(...state.presupuestos.map(pr => pr.id)) + 1 : 1;
        state.presupuestos.push({ 
            id, 
            categoriaId: data.categoriaId, 
            fecha_inicio: data.fecha_inicio, 
            fecha_fin: data.fecha_fin || null, 
            presupuesto: data.presupuesto,
            version: nextVer,
            fecha_version: new Date().toISOString(),
            activa: data.activa !== undefined ? (data.activa === true || data.activa === 'true') : true
        });
        saveLocalCache();
        return { success: true, message: "Presupuesto guardado localmente" };
    } else if (action === 'editar_presupuesto_periodo') {
        const idx = state.presupuestos.findIndex(p => p.id == data.id);
        if (idx !== -1) {
            if (data.fecha_inicio !== undefined) state.presupuestos[idx].fecha_inicio = data.fecha_inicio;
            if (data.fecha_fin !== undefined) state.presupuestos[idx].fecha_fin = data.fecha_fin;
            if (data.presupuesto !== undefined) state.presupuestos[idx].presupuesto = data.presupuesto;
            if (data.activa !== undefined) state.presupuestos[idx].activa = (data.activa === true || data.activa === 'true');
            saveLocalCache();
            return { success: true, message: "Presupuesto editado localmente" };
        }
        return { success: false, error: 'Presupuesto no encontrado' };
    } else if (action === 'editar_categoria') {
        const idx = state.categorias.findIndex(c => c.id == data.id);
        if (idx !== -1) {
            if (data.nombre !== undefined) state.categorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.categorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.categorias[idx].activa = (data.activa === true || data.activa === 'true');
            saveLocalCache();
            return { success: true, message: "Categoria editada localmente" };
        }
        return { success: false, error: 'Categoria no encontrada' };
    } else if (action === 'editar_subcategoria') {
        const idx = state.subcategorias.findIndex(s => s.id == data.id);
        if (idx !== -1) {
            if (data.categoriaId !== undefined) state.subcategorias[idx].categoriaId = Number(data.categoriaId);
            if (data.nombre !== undefined) state.subcategorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.subcategorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.subcategorias[idx].activa = (data.activa === true || data.activa === 'true');
            saveLocalCache();
            return { success: true, message: "Subcategoria editada localmente" };
        }
        return { success: false, error: 'Subcategoria no encontrada' };
    } else if (action === 'categoria') {
        const id = state.categorias.length > 0 ? Math.max(...state.categorias.map(c => c.id)) + 1 : 1;
        state.categorias.push({ id, nombre: data.nombre, icono: data.icono, activa: true });
        saveLocalCache();
        return { success: true, id, message: "Categoria creada localmente" };
    } else if (action === 'subcategoria') {
        const id = state.subcategorias.length > 0 ? Math.max(...state.subcategorias.map(s => s.id)) + 1 : 1;
        state.subcategorias.push({ id, categoriaId: data.categoriaId, nombre: data.nombre, icono: data.icono, activa: true });
        saveLocalCache();
        return { success: true, id, message: "Subcategoria creada localmente" };
    }
    return { success: false, error: 'Accion local no contemplada' };
}
