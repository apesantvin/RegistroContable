/* ==========================================================================
   Registro Contable - Application Core (Vanilla JS)
   ========================================================================== */

// App State
const state = {
    apiUrl: localStorage.getItem('contable_api_url') || '',
    selectedYear: new Date().getFullYear(),
    isDemoMode: false,
    categorias: [],
    subcategorias: [],
    presupuestos: [],
    movimientos: [],
    charts: {
        ahorro: null,
        gastoMensual: null,
        categorias: null,
        subcategorias: null
    }
};

// DOM Elements
const DOM = {
    landingPage: document.getElementById('landing-page'),
    appInterface: document.getElementById('app-interface'),
    
    // Landing Buttons
    btnLandingDemo: document.getElementById('btn-landing-demo'),
    btnLandingConnect: document.getElementById('btn-landing-connect'),
    btnHeroStart: document.getElementById('btn-hero-start'),
    btnHeroDemo: document.getElementById('btn-hero-demo'),
    
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
    
    // Screens
    screens: document.querySelectorAll('.app-screen'),
    navItems: document.querySelectorAll('.nav-item'),
    
    // Dashboard Values
    valSaldoDisponible: document.getElementById('val-saldo-disponible'),
    valIngresos: document.getElementById('val-ingresos'),
    valGastos: document.getElementById('val-gastos'),
    valAhorro: document.getElementById('val-ahorro'),
    
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
    
    // Transaction screen
    formMovimiento: document.getElementById('form-movimiento'),
    inTipo: document.getElementById('in-tipo'),
    inImporte: document.getElementById('in-importe'),
    inConcepto: document.getElementById('in-concepto'),
    inFecha: document.getElementById('in-fecha'),
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
    btnTestApi: document.getElementById('btn-test-api'),
    
    formPresupuesto: document.getElementById('form-presupuesto'),
    inPresupuestoCat: document.getElementById('in-presupuesto-cat'),
    inPresupuestoMes: document.getElementById('in-presupuesto-mes'),
    inPresupuestoAno: document.getElementById('in-presupuesto-ano'),
    inPresupuestoImporte: document.getElementById('in-presupuesto-importe'),
    
    formCrearCategoria: document.getElementById('form-crear-categoria'),
    inNewCatNombre: document.getElementById('in-new-cat-nombre'),
    inNewCatIcono: document.getElementById('in-new-cat-icono'),
    
    formCrearSubcategoria: document.getElementById('form-crear-subcategoria'),
    inNewSubParent: document.getElementById('in-new-sub-parent'),
    inNewSubNombre: document.getElementById('in-new-sub-nombre'),
    inNewSubIcono: document.getElementById('in-new-sub-icono'),
    
    btnTransferirSobrantes: document.getElementById('btn-transferir-sobrantes'),
    
    // Modals
    modalApiSetup: document.getElementById('api-modal-setup'),
    formModalApi: document.getElementById('form-modal-api'),
    inModalApiUrl: document.getElementById('in-modal-api-url'),
    btnModalCancel: document.getElementById('btn-modal-cancel')
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
        recreateCharts(); // redraw charts with theme-specific colors
    });
}

// Year dropdown setup (Current year, last year, next year)
function initYearSelector() {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    
    DOM.yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    DOM.yearSelect.value = state.selectedYear;
    
    // Config screen year inputs
    DOM.inPresupuestoAno.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    
    DOM.yearSelect.addEventListener('change', (e) => {
        state.selectedYear = parseInt(e.target.value);
        updateDashboardMetrics();
        recreateCharts();
        applyMovementsFilters();
    });
}

// Mobile sidebar toggles
function initMobileSidebar() {
    DOM.btnMenuToggle.addEventListener('click', () => DOM.sidebar.classList.add('mobile-open'));
    DOM.btnCloseSidebar.addEventListener('click', () => DOM.sidebar.classList.remove('mobile-open'));
}

/* ==========================================================================
   Landing View Triggers
   ========================================================================== */
function initLandingActions() {
    // Demo Triggers
    const triggerDemo = () => {
        state.isDemoMode = true;
        loadDemoData();
        showAppInterface();
        DOM.demoModeBadge.classList.remove('hidden');
        DOM.apiStatus.className = 'api-status-badge connected';
        DOM.apiStatusText.textContent = 'Modo Demo';
        showToast('Iniciado en Modo Demostración. Explora las pestañas.', 'info');
    };

    DOM.btnLandingDemo.addEventListener('click', triggerDemo);
    DOM.btnHeroDemo.addEventListener('click', triggerDemo);

    // Connect Sheets Triggers
    const triggerConnect = () => {
        state.isDemoMode = false;
        DOM.demoModeBadge.classList.add('hidden');
        
        if (state.apiUrl) {
            DOM.inApiUrl.value = state.apiUrl;
            showAppInterface();
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

    // Exit Application back to Landing page
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
    handleRoute(); // initial route
    
    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            DOM.sidebar.classList.remove('mobile-open'); // Close on mobile
        });
    });
}

function handleRoute() {
    const hash = window.location.hash || '#dashboard';
    
    if (document.body.classList.contains('landing-active')) {
        return; // ignore route changes if landing page is showing
    }
    
    // Toggle active screen
    DOM.screens.forEach(screen => {
        if (`#${screen.id.replace('screen-', '')}` === hash) {
            screen.classList.add('active');
        } else {
            screen.classList.remove('active');
        }
    });
    
    // Toggle active nav menu link
    DOM.navItems.forEach(item => {
        if (item.getAttribute('href') === hash) {
            item.classList.add('active');
            DOM.barTitle.textContent = item.querySelector('span').textContent;
        } else {
            item.classList.remove('active');
        }
    });

    // Run view specific initializers
    if (hash === '#dashboard') {
        recreateCharts();
    } else if (hash === '#movimientos') {
        applyMovementsFilters();
    } else if (hash === '#nueva-transaccion') {
        DOM.inFecha.value = new Date().toISOString().split('T')[0];
    }
}

/* ==========================================================================
   Google Apps Script REST Client
   ========================================================================== */
async function apiRequest(action, method = 'GET', data = null) {
    if (state.isDemoMode) {
        // Mock API responses for demo mode
        return handleDemoWriteAction(action, data);
    }

    if (!state.apiUrl) {
        showToast('Debes configurar la URL de la API.', 'error');
        return null;
    }

    setLoading(true);
    try {
        let url = state.apiUrl;
        let options = {
            mode: 'cors'
        };

        if (method === 'GET') {
            options.method = 'GET';
            url += (url.includes('?') ? '&' : '?') + 'action=' + encodeURIComponent(action);
        } else {
            options.method = 'POST';
            options.headers = {
                'Content-Type': 'text/plain;charset=utf-8',
            };
            options.body = JSON.stringify({ action: action, ...data });
        }

        const response = await fetch(url, options);
        const json = await response.json();
        
        if (json.success === false) {
            throw new Error(json.error || 'Error desconocido del servidor');
        }
        
        return json;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Error de conexión con la hoja de cálculo: ' + error.message, 'error');
        return null;
    } finally {
        setLoading(false);
    }
}

// Full sync from Google Sheets
async function syncData() {
    if (state.isDemoMode) return;
    if (!state.apiUrl) return;
    
    setLoading(true);
    DOM.apiStatus.className = 'api-status-badge disconnected';
    DOM.apiStatusText.textContent = 'Sincronizando...';
    
    try {
        const catsData = await apiRequest('categorias', 'GET');
        const subcatsData = await apiRequest('subcategorias', 'GET');
        const presData = await apiRequest('presupuestos', 'GET');
        const movsData = await apiRequest('movimientos', 'GET');
        
        if (catsData && subcatsData && presData && movsData) {
            state.categorias = catsData;
            state.subcategorias = subcatsData;
            state.presupuestos = presData;
            state.movimientos = movsData;
            
            DOM.apiStatus.className = 'api-status-badge connected';
            DOM.apiStatusText.textContent = 'Sincronizado';
            
            populateSelectors();
            updateDashboardMetrics();
            recreateCharts();
            applyMovementsFilters();
        } else {
            DOM.apiStatus.className = 'api-status-badge disconnected';
            DOM.apiStatusText.textContent = 'Error de Sinc.';
        }
    } catch (err) {
        DOM.apiStatus.className = 'api-status-badge disconnected';
        DOM.apiStatusText.textContent = 'Desconectado';
    } finally {
        setLoading(false);
    }
}

/* ==========================================================================
   Form Selection Populators
   ========================================================================== */
function populateSelectors() {
    const activeCats = state.categorias.filter(c => c.activa);
    
    const catOptions = activeCats.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    DOM.inCategoria.innerHTML = catOptions;
    
    // Transfer Origen & Destino
    DOM.inCatOrigen.innerHTML = catOptions;
    DOM.inCatDestino.innerHTML = catOptions;
    
    if (activeCats.length > 1) {
        DOM.inCatDestino.selectedIndex = 1;
    }

    // Config subcategories parent
    const filteredParents = activeCats.filter(c => c.id !== 9);
    DOM.inNewSubParent.innerHTML = filteredParents.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');

    // Config Budget Category
    DOM.inPresupuestoCat.innerHTML = catOptions;

    // Filters Category dropdown
    const filterCatOptions = '<option value="Todas">Todas</option>' + activeCats.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    DOM.filterCategory.innerHTML = filterCatOptions;
    
    updateSubcategoryOptions();
    updateFilterSubcategoryOptions();
}

// Dynamic subcategories for Transaction form
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

// Dynamic subcategories for Filters panel
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
   Dashboard Metrics Computations
   ========================================================================== */
function updateDashboardMetrics() {
    const year = state.selectedYear;
    
    let totalIngresos = 0;
    let totalGastos = 0;
    let totalAhorro = 0;

    state.movimientos.forEach(m => {
        try {
            const yMov = parseInt(m.fecha.split('-')[0]);
            const val = parseFloat(m.importe) || 0;
            
            if (m.tipo === 'INGRESO') {
                if (yMov === year) totalIngresos += val;
            } else if (m.tipo === 'GASTO') {
                if (yMov === year) totalGastos += val;
            }
            
            // Accumulated savings across all history
            if (m.tipo === 'INGRESO' && parseInt(m.categoriaId) === 9) {
                totalAhorro += val;
            } else if (m.tipo === 'GASTO' && parseInt(m.categoriaId) === 9) {
                totalAhorro -= val;
            } else if (m.tipo === 'TRANSFERENCIA') {
                if (parseInt(m.categoriaOrigenId) === 9) totalAhorro -= val;
                if (parseInt(m.categoriaDestinoId) === 9) totalAhorro += val;
            }
        } catch (e) {}
    });

    // Calculate total net balance (All-time Income - All-time Expenses)
    let totalNeto = 0;
    state.movimientos.forEach(m => {
        const val = parseFloat(m.importe) || 0;
        if (m.tipo === 'INGRESO') totalNeto += val;
        if (m.tipo === 'GASTO') totalNeto -= val;
    });

    DOM.valSaldoDisponible.textContent = formatCurrency(totalNeto);
    DOM.valIngresos.textContent = formatCurrency(totalIngresos);
    DOM.valGastos.textContent = formatCurrency(totalGastos);
    DOM.valAhorro.textContent = formatCurrency(totalAhorro);
}

/* ==========================================================================
   Chart.js Integrations
   ========================================================================== */
function recreateCharts() {
    if (window.location.hash !== '' && window.location.hash !== '#dashboard') return;
    if (DOM.appInterface.classList.contains('hidden')) return; // ignore if app is hidden
    
    // Destroy previous charts
    Object.keys(state.charts).forEach(key => {
        if (state.charts[key]) {
            state.charts[key].destroy();
            state.charts[key] = null;
        }
    });

    const year = state.selectedYear;
    const isDark = document.body.classList.contains('dark-mode');
    
    const textTheme = isDark ? '#94a3b8' : '#64748b';
    const gridTheme = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    const monthlyGastos = new Array(12).fill(0);
    const monthlyAhorro = new Array(12).fill(0);

    for (let mes = 1; mes <= 12; mes++) {
        let saldoAcumuladoAhorro = 0;
        state.movimientos.forEach(m => {
            try {
                const parts = m.fecha.split('-');
                const yMov = parseInt(parts[0]);
                const mMov = parseInt(parts[1]);
                const val = parseFloat(m.importe) || 0;

                if (m.tipo === 'GASTO' && yMov === year && mMov === mes) {
                    monthlyGastos[mes - 1] += val;
                }

                if (yMov < year || (yMov === year && mMov <= mes)) {
                    if (m.tipo === 'INGRESO' && parseInt(m.categoriaId) === 9) {
                        saldoAcumuladoAhorro += val;
                    } else if (m.tipo === 'GASTO' && parseInt(m.categoriaId) === 9) {
                        saldoAcumuladoAhorro -= val;
                    } else if (m.tipo === 'TRANSFERENCIA') {
                        if (parseInt(m.categoriaOrigenId) === 9) saldoAcumuladoAhorro -= val;
                        if (parseInt(m.categoriaDestinoId) === 9) saldoAcumuladoAhorro += val;
                    }
                }
            } catch (e) {}
        });
        monthlyAhorro[mes - 1] = saldoAcumuladoAhorro;
    }

    const catExpenses = {};
    const subExpenses = {};

    state.movimientos.forEach(m => {
        try {
            const yMov = parseInt(m.fecha.split('-')[0]);
            const val = parseFloat(m.importe) || 0;

            if (m.tipo === 'GASTO' && yMov === year) {
                const catId = m.categoriaId;
                catExpenses[catId] = (catExpenses[catId] || 0) + val;

                if (m.subcategoriaId) {
                    const subId = m.subcategoriaId;
                    subExpenses[subId] = (subExpenses[subId] || 0) + val;
                }
            }
        } catch (e) {}
    });

    const catLabels = [];
    const catData = [];
    const catColors = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

    Object.keys(catExpenses).forEach(id => {
        const cat = state.categorias.find(c => c.id === parseInt(id));
        catLabels.push(cat ? `${cat.icono} ${cat.nombre}` : `Cat ${id}`);
        catData.push(catExpenses[id]);
    });

    const subLabels = [];
    const subData = [];
    const subColors = ['#f43f5e', '#a855f7', '#06b6d4', '#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'];

    Object.keys(subExpenses).forEach(id => {
        const sub = state.subcategorias.find(sc => sc.id === parseInt(id));
        subLabels.push(sub ? `${sub.icono} ${sub.nombre}` : `Sub ${id}`);
        subData.push(subExpenses[id]);
    });

    // Ahorro Chart
    const ctxAhorro = document.getElementById('chart-ahorro').getContext('2d');
    state.charts.ahorro = new Chart(ctxAhorro, {
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
                x: { grid: { color: gridTheme }, ticks: { color: textTheme } },
                y: { grid: { color: gridTheme }, ticks: { color: textTheme } }
            }
        }
    });

    // Expenses Chart
    const ctxGastos = document.getElementById('chart-gasto-mensual').getContext('2d');
    state.charts.gastoMensual = new Chart(ctxGastos, {
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
                x: { grid: { display: false }, ticks: { color: textTheme } },
                y: { grid: { color: gridTheme }, ticks: { color: textTheme } }
            }
        }
    });

    // Categories Donut
    const ctxCats = document.getElementById('chart-categorias').getContext('2d');
    state.charts.categorias = new Chart(ctxCats, {
        type: 'doughnut',
        data: {
            labels: catLabels.length ? catLabels : ['Sin datos'],
            datasets: [{
                data: catData.length ? catData : [1],
                backgroundColor: catData.length ? catColors : ['#475569'],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#0f1524' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textTheme, boxWidth: 12, padding: 12 }
                }
            },
            cutout: '60%'
        }
    });

    // Subcategories Donut
    const ctxSubs = document.getElementById('chart-subcategorias').getContext('2d');
    state.charts.subcategorias = new Chart(ctxSubs, {
        type: 'doughnut',
        data: {
            labels: subLabels.length ? subLabels : ['Sin datos'],
            datasets: [{
                data: subData.length ? subData : [1],
                backgroundColor: subData.length ? subColors : ['#475569'],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#0f1524' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textTheme, boxWidth: 12, padding: 12 }
                }
            },
            cutout: '60%'
        }
    });
}

/* ==========================================================================
   Movements Listing & Filtering
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

            if (query && (!m.concepto || !m.concepto.toLowerCase().includes(query))) {
                return false;
            }
            
            if (yMov !== year) {
                return false;
            }

            if (typeFilter !== 'Todos' && m.tipo !== typeFilter) {
                return false;
            }

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
        } catch (e) {
            return false;
        }
    });

    filtered.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    renderMovementsTable(filtered);
}

function renderMovementsTable(movs) {
    if (movs.length === 0) {
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
            categoryText = cat ? `${cat.icono} ${cat.nombre}` : '-';
            subcatText = sub ? `${sub.icono} ${sub.nombre}` : '-';
        } else if (m.tipo === 'INGRESO') {
            typeBadge = '<span class="val-badge ingreso">Ingreso</span>';
            amountClass = 'val-importe ingreso';
            amountText = `+ ${parseFloat(m.importe).toFixed(2)} €`;
            categoryText = cat ? `${cat.icono} ${cat.nombre}` : '-';
            subcatText = '-';
        } else if (m.tipo === 'TRANSFERENCIA') {
            typeBadge = '<span class="val-badge transfer">Transf.</span>';
            amountClass = 'val-importe transfer';
            amountText = `${parseFloat(m.importe).toFixed(2)} €`;
            
            const catO = state.categorias.find(c => c.id === m.categoriaOrigenId);
            const catD = state.categorias.find(c => c.id === m.categoriaDestinoId);
            categoryText = `${catO ? catO.icono : '❓'} ➔ ${catD ? catD.icono : '❓'}`;
            subcatText = 'Transferencia';
        }

        return `
            <tr>
                <td>${formatDate(m.fecha)}</td>
                <td>${typeBadge}</td>
                <td>${categoryText}</td>
                <td>${subcatText}</td>
                <td>${m.concepto}</td>
                <td class="${amountClass} text-right">${amountText}</td>
            </tr>
        `;
    }).join('');
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

    DOM.formMovimiento.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tipo = DOM.inTipo.value;
        const importe = parseFloat(DOM.inImporte.value);
        const concepto = DOM.inConcepto.value.trim();
        const fecha = DOM.inFecha.value;

        if (isNaN(importe) || importe <= 0) {
            showToast('Por favor introduce un importe válido', 'error');
            return;
        }

        let payload = {
            tipo: tipo,
            importe: importe,
            concepto: concepto,
            fecha: fecha
        };

        let action = 'movimiento';

        if (tipo === 'GASTO') {
            payload.categoriaId = parseInt(DOM.inCategoria.value);
            payload.subcategoriaId = DOM.inSubcategoria.value ? parseInt(DOM.inSubcategoria.value) : '';
        } else if (tipo === 'INGRESO') {
            payload.categoriaId = parseInt(DOM.inCategoria.value);
        } else if (tipo === 'TRANSFERENCIA') {
            action = 'transferencia';
            payload.categoriaOrigenId = parseInt(DOM.inCatOrigen.value);
            payload.categoriaDestinoId = parseInt(DOM.inCatDestino.value);
            
            if (payload.categoriaOrigenId === payload.categoriaDestinoId) {
                showToast('La categoría origen y destino no pueden ser iguales', 'error');
                return;
            }
        }

        const res = await apiRequest(action, 'POST', payload);
        if (res && res.success) {
            showToast('Transacción registrada con éxito', 'success');
            DOM.formMovimiento.reset();
            DOM.inFecha.value = new Date().toISOString().split('T')[0];
            if (!state.isDemoMode) {
                await syncData();
            } else {
                updateDashboardMetrics();
                recreateCharts();
            }
        }
    });

    // Setup API URL Form
    DOM.formApiUrl.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = DOM.inApiUrl.value.trim();
        if (url) {
            localStorage.setItem('contable_api_url', url);
            state.apiUrl = url;
            state.isDemoMode = false;
            DOM.demoModeBadge.classList.add('hidden');
            showToast('Enlace de la API guardado', 'success');
            syncData();
        }
    });

    DOM.btnTestApi.addEventListener('click', async () => {
        const url = DOM.inApiUrl.value.trim();
        if (!url) {
            showToast('Introduce una URL antes de probar', 'error');
            return;
        }
        
        state.apiUrl = url;
        const test = await apiRequest('categorias', 'GET');
        if (test) {
            showToast('¡Conexión probada con éxito!', 'success');
        } else {
            showToast('Error al probar conexión. Verifica tu URL', 'error');
        }
    });

    // Modal API form submission
    DOM.formModalApi.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = DOM.inModalApiUrl.value.trim();
        if (url) {
            localStorage.setItem('contable_api_url', url);
            state.apiUrl = url;
            state.isDemoMode = false;
            DOM.inApiUrl.value = url;
            DOM.modalApiSetup.classList.add('hidden');
            showAppInterface();
            showToast('Conectado con éxito', 'success');
            syncData();
        }
    });

    // Budget creation submission
    DOM.formPresupuesto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            categoriaId: parseInt(DOM.inPresupuestoCat.value),
            mes: parseInt(DOM.inPresupuestoMes.value),
            año: parseInt(DOM.inPresupuestoAno.value),
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

    // Category Creation
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
            populateSelectors();
        }
    });

    // Subcategory Creation
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
            populateSelectors();
        }
    });

    // Automation: Transfer leftovers
    DOM.btnTransferirSobrantes.addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de que deseas transferir los saldos sobrantes del mes anterior al Ahorro? Esta acción generará transferencias automáticas.')) {
            return;
        }
        
        const activeCatIds = state.categorias.filter(c => c.activa && c.id !== 9).map(c => c.id);
        if (activeCatIds.length === 0) {
            showToast('No hay categorías activas', 'error');
            return;
        }

        let transfersCreated = 0;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = state.selectedYear;

        setLoading(true);
        for (const catId of activeCatIds) {
            const budgetObj = state.presupuestos.find(p => p.categoriaId === catId && p.mes === currentMonth && p.año === currentYear);
            const budgetVal = budgetObj ? parseFloat(budgetObj.presupuesto) : 0.0;
            
            let expenseVal = 0.0;
            state.movimientos.forEach(m => {
                try {
                    const parts = m.fecha.split('-');
                    const y = parseInt(parts[0]);
                    const m_ = parseInt(parts[1]);
                    if (m.tipo === 'GASTO' && m.categoriaId === catId && y === currentYear && m_ === currentMonth) {
                        expenseVal += parseFloat(m.importe) || 0.0;
                    }
                } catch(e){}
            });

            const surplus = budgetVal - expenseVal;
            if (surplus > 0) {
                const cat = state.categorias.find(c => c.id === catId);
                const res = await apiRequest('transferencia', 'POST', {
                    categoriaOrigenId: catId,
                    categoriaDestinoId: 9,
                    importe: surplus,
                    concepto: `Transferencia sobrante ${cat ? cat.nombre : catId} (${MESES_ABR[currentMonth-1]} ${currentYear})`,
                    fecha: new Date().toISOString().split('T')[0]
                });
                if (res && res.success) {
                    transfersCreated++;
                }
            }
        }

        setLoading(false);
        if (transfersCreated > 0) {
            showToast(`Automatización finalizada: se crearon ${transfersCreated} transferencias de sobrantes.`, 'success');
            if (!state.isDemoMode) {
                await syncData();
            } else {
                updateDashboardMetrics();
                recreateCharts();
            }
        } else {
            showToast('No se encontraron saldos sobrantes positivos para transferir.', 'warning');
        }
    });
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

    // Build some budgets
    state.presupuestos = [];
    const currentYear = state.selectedYear;
    for (let mes = 1; mes <= 12; mes++) {
        state.presupuestos.push(
            { id: mes*10+1, categoriaId: 1, mes: mes, año: currentYear, presupuesto: 35 },
            { id: mes*10+2, categoriaId: 2, mes: mes, año: currentYear, presupuesto: 15 },
            { id: mes*10+3, categoriaId: 3, mes: mes, año: currentYear, presupuesto: 40 },
            { id: mes*10+4, categoriaId: 4, mes: mes, año: currentYear, presupuesto: 50 },
            { id: mes*10+5, categoriaId: 5, mes: mes, año: currentYear, presupuesto: 75 },
            { id: mes*10+6, categoriaId: 6, mes: mes, año: currentYear, presupuesto: 250 },
            { id: mes*10+7, categoriaId: 7, mes: mes, año: currentYear, presupuesto: 100 },
            { id: mes*10+8, categoriaId: 8, mes: mes, año: currentYear, presupuesto: 80 }
        );
    }

    // Generate simulated movements for current selected year
    state.movimientos = [];
    let mId = 1;
    
    // Monthly income entries
    for (let mes = 1; mes <= 12; mes++) {
        const mm = mes < 10 ? `0${mes}` : mes;
        state.movimientos.push({
            id: mId++,
            fecha: `${currentYear}-${mm}-01`,
            tipo: "INGRESO",
            categoriaId: 9, // income directly accumulates as total balance/saving
            subcategoriaId: "",
            categoriaOrigenId: "",
            categoriaDestinoId: "",
            concepto: "Nómina Mensual Trabajo",
            importe: 1850.00
        });

        // Fixed bills
        state.movimientos.push(
            { id: mId++, fecha: `${currentYear}-${mm}-05`, tipo: "GASTO", categoriaId: 5, subcategoriaId: "", concepto: "Recibo de la Luz", importe: 62.45 },
            { id: mId++, fecha: `${currentYear}-${mm}-06`, tipo: "GASTO", categoriaId: 1, subcategoriaId: "", concepto: "Consumo de Agua Canal", importe: 24.10 },
            { id: mId++, fecha: `${currentYear}-${mm}-10`, tipo: "GASTO", categoriaId: 3, subcategoriaId: "", concepto: "Fibra + Móvil", importe: 38.90 }
        );

        // Shopping
        state.movimientos.push(
            { id: mId++, fecha: `${currentYear}-${mm}-04`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Supermercado Semanal", importe: 64.20 },
            { id: mId++, fecha: `${currentYear}-${mm}-12`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Compra semanal comida", importe: 58.30 },
            { id: mId++, fecha: `${currentYear}-${mm}-18`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 2, concepto: "Sartén antiadherente Tefal", importe: 24.99 },
            { id: mId++, fecha: `${currentYear}-${mm}-20`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 3, concepto: "Detergente y suavizante", importe: 12.80 }
        );

        // Leisure & Restaurants
        state.movimientos.push(
            { id: mId++, fecha: `${currentYear}-${mm}-07`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Cena pizzería fin de semana", importe: 35.50 },
            { id: mId++, fecha: `${currentYear}-${mm}-22`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Almuerzo menú diario oficina", importe: 12.50 }
        );

        // Other expenses
        if (mes % 2 === 0) {
            state.movimientos.push(
                { id: mId++, fecha: `${currentYear}-${mm}-15`, tipo: "GASTO", categoriaId: 8, subcategoriaId: 9, concepto: "Entradas Cine + Palomitas", importe: 18.00 }
            );
        } else {
            state.movimientos.push(
                { id: mId++, fecha: `${currentYear}-${mm}-25`, tipo: "GASTO", categoriaId: 8, subcategoriaId: 7, concepto: "Caja de herramientas y tornillos", importe: 34.50 }
            );
        }

        // Monthly automated transfer to savings (Category 9)
        state.movimientos.push({
            id: mId++,
            fecha: `${currentYear}-${mm}-28`,
            tipo: "TRANSFERENCIA",
            categoriaId: "",
            subcategoriaId: "",
            categoriaOrigenId: 6, // from Compra
            categoriaDestinoId: 9, // to Ahorro
            concepto: "Sobrante mensual ahorro automático",
            importe: 50.00
        });
    }

    populateSelectors();
    updateDashboardMetrics();
    recreateCharts();
    applyMovementsFilters();
}

function handleDemoWriteAction(action, data) {
    if (action === 'movimiento') {
        const id = state.movimientos.length + 1;
        state.movimientos.push({
            id: id,
            fecha: data.fecha,
            tipo: data.tipo,
            categoriaId: data.categoriaId || "",
            subcategoriaId: data.subcategoriaId || "",
            categoriaOrigenId: "",
            categoriaDestinoId: "",
            concepto: data.concepto,
            importe: data.importe
        });
        return { success: true, id: id, message: "Movimiento insertado (Demo)" };
    } else if (action === 'transferencia') {
        const id = state.movimientos.length + 1;
        state.movimientos.push({
            id: id,
            fecha: data.fecha,
            tipo: "TRANSFERENCIA",
            categoriaId: "",
            subcategoriaId: "",
            categoriaOrigenId: data.categoriaOrigenId,
            categoriaDestinoId: data.categoriaDestinoId,
            concepto: data.concepto,
            importe: data.importe
        });
        return { success: true, id: id, message: "Transferencia insertada (Demo)" };
    } else if (action === 'presupuesto') {
        const p = state.presupuestos.find(pr => pr.categoriaId === data.categoriaId && pr.mes === data.mes && pr.año === data.año);
        if (p) {
            p.presupuesto = data.presupuesto;
        } else {
            state.presupuestos.push({
                id: state.presupuestos.length + 1,
                categoriaId: data.categoriaId,
                mes: data.mes,
                año: data.año,
                presupuesto: data.presupuesto
            });
        }
        return { success: true, message: "Presupuesto guardado (Demo)" };
    } else if (action === 'categoria') {
        const id = state.categorias.length + 1;
        state.categorias.push({
            id: id,
            nombre: data.nombre,
            icono: data.icono,
            activa: true
        });
        return { success: true, id: id, message: "Categoría creada (Demo)" };
    } else if (action === 'subcategoria') {
        const id = state.subcategorias.length + 1;
        state.subcategorias.push({
            id: id,
            categoriaId: data.categoriaId,
            nombre: data.nombre,
            icono: data.icono,
            activa: true
        });
        return { success: true, id: id, message: "Subcategoría creada (Demo)" };
    }
    return { success: false, error: 'Acción demo no contemplada' };
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
        const parts = dateStr.split('-');
        const y = parts[0];
        const m = parseInt(parts[1]) - 1;
        const d = parseInt(parts[2]);
        
        return `${d} ${MESES_ABR[m]} ${y}`;
    } catch (e) {
        return dateStr;
    }
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
            }
            .toast {
                min-width: 280px;
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
            }
            .toast.success { background-color: #10b981; }
            .toast.error { background-color: #ef4444; }
            .toast.warning { background-color: #f59e0b; }
            .toast.info { background-color: #3b82f6; }
            @keyframes toast-in {
                from { transform: translateY(20px) scale(0.9); opacity: 0; }
                to { transform: translateY(0) scale(1); opacity: 1; }
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
