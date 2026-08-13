/* ==========================================================================
   Registro Contable - State & Data Indexing Module
   ========================================================================== */

// Orden visual de categorías: [6=Compra, 7=Restaurantes, 3=Internet, 8=Otras Compras, 5=Luz, 4=Gas, 1=Agua, 2=Basuras, 9=Ahorro]
const CATEGORIAS_ORDER = [6, 7, 3, 8, 5, 4, 1, 2, 9];

// Categorías consideradas "facturas" (Luz, Gas, Agua, Basuras), en el orden en que se muestran en la pestaña Facturas
const FACTURAS_CATEGORIA_IDS = [5, 4, 1, 2];

function sortCategorias(arr) {
    return arr.slice().sort((a, b) => {
        const ia = CATEGORIAS_ORDER.indexOf(a.id);
        const ib = CATEGORIAS_ORDER.indexOf(b.id);
        if (ia === -1 && ib === -1) return a.id - b.id;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

// App State
const state = {
    supabaseApiUrl: localStorage.getItem('contable_supabase_api_url') || '',
    supabaseKey: localStorage.getItem('contable_supabase_key') || '',
    get apiUrl() {
        return this.supabaseApiUrl;
    },
    selectedYear: new Date().getFullYear(),
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
        categorias: null,
        subcategorias: null,
        presupuestoVsReal: null,
        topCategorias: null,
        ahorro: null,
        comparativa: null,
        gastoMensual: null
    },
    index: null,
    editingMovimientoId: null,
    allTimeMovsCache: null,
    loadedScreens: {
        dashboard: false,
        movimientos: false,
        configuracion: false,
        cuentas: false,
        facturas: false
    },
    configMonthMovs: [],
    chartFilters: {
        ingresosGastos: 'year',
        ingresosGastosYear: new Date().getFullYear().toString(),
        categorias: 'year',
        categoriasYear: new Date().getFullYear().toString(),
        subcategorias: { month: 'year', category: 'Todas', year: new Date().getFullYear().toString() },
        presupuestoVsReal: (new Date().getMonth() + 1).toString(),
        presupuestoVsRealYear: new Date().getFullYear().toString(),
        topCategorias: 'year',
        topCategoriasCustom: { start: '', end: '' },
        ahorro: new Date().getFullYear().toString(),
        comparativa: new Date().getFullYear().toString(),
        gastoMensual: new Date().getFullYear().toString(),
        automationYear: new Date().getFullYear().toString(),
        facturasYear: new Date().getFullYear().toString(),
        facturasViewMode: {} // { [categoriaId]: 'table' | 'chart' }
    }
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
    
    // Movements screen
    filterSearch: document.getElementById('filter-search'),
    btnToggleFilters: document.getElementById('btn-toggle-filters'),
    advancedFilters: document.getElementById('advanced-filters'),
    filterType: document.getElementById('filter-type'),
    filterCategory: document.getElementById('filter-category'),
    filterSubcategory: document.getElementById('filter-subcategory'),
    filterFechaDesde: document.getElementById('filter-fecha-desde'),
    filterFechaHasta: document.getElementById('filter-fecha-hasta'),
    filterMesRef: document.getElementById('filter-mes-ref'),
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
    btnDeleteMovimiento: document.getElementById('btn-delete-movimiento'),
    btnDuplicateMovimiento: document.getElementById('btn-duplicate-movimiento'),
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
    automationYearSelect: document.getElementById('automation-year-select'),
    containerSobrantesGestion: document.getElementById('container-sobrantes-gestion'),
    chartPresupuestoMonthSelect: document.getElementById('chart-presupuesto-month-select'),

    // Facturas screen
    facturasYearSelect: document.getElementById('facturas-year-select'),
    facturasContainer: document.getElementById('facturas-container'),
    
    // Modals
    modalTransaction: document.getElementById('modal-transaction'),
    btnCloseTransactionModal: document.getElementById('btn-close-transaction-modal'),
    btnAddMovimientoTrigger: document.getElementById('btn-add-movimiento-trigger'),
    modalApiSetup: document.getElementById('api-modal-setup'),
    formModalApi: document.getElementById('form-modal-api'),
    inModalApiUrl: document.getElementById('in-modal-api-url'),
    inModalSupabaseKey: document.getElementById('in-modal-supabase-key'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    btnModalLoadLocal: document.getElementById('btn-modal-load-local'),
    btnModalNewLocal: document.getElementById('btn-modal-new-local')
};

// Months translation list
const MESES_ABR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/* ==========================================================================
   Data Caching, Indexing & Helpers
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

function rebuildIndex(allTimeMovs = null) {
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
                byCategoryIncome: {},
                bySubcategoryExpenses: {}
            };
            for (let m = 1; m <= 12; m++) {
                state.index.byYear[y].byMonth[m] = {
                    ingresos: 0,
                    gastos: 0,
                    ahorroDelta: 0,
                    byCategoryExpenses: {},
                    byCategoryIncome: {},
                    bySubcategoryExpenses: {}
                };
            }
        }
    };

    if (allTimeMovs) {
        state.allTimeMovsCache = allTimeMovs;
    }
    const targetAllTime = state.allTimeMovsCache || state.movimientos;
    targetAllTime.forEach(m => {
        try {
            const val = parseFloat(m.importe) || 0;
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

            if (m.tipo === 'INGRESO') {
                state.index.allTime.totalNeto += val;
            } else if (m.tipo === 'GASTO') {
                state.index.allTime.totalNeto -= val;
            }

            if (ahorroDelta !== 0) {
                state.index.allTime.totalAhorro += ahorroDelta;
            }
        } catch (e) {
            console.error('Error calculating all-time balance', m, e);
        }
    });

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
                yearData.totalIngresos += val;
                monthData.ingresos += val;

                const catId = parseInt(m.categoriaId);
                if (!isNaN(catId)) {
                    yearData.byCategoryIncome[catId] = (yearData.byCategoryIncome[catId] || 0) + val;
                    monthData.byCategoryIncome[catId] = (monthData.byCategoryIncome[catId] || 0) + val;
                }
            } else if (m.tipo === 'GASTO') {
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
                monthData.ahorroDelta += ahorroDelta;
            }
        } catch (e) {
            console.error('Error indexing movement', m, e);
        }
    });

    // Ahorro por mes: delta real (ingresos/gastos/transferencias) + presupuesto de ese mes,
    // cada mes de forma independiente (no es una suma corriendo con los demás meses).
    const sortedYears = Object.keys(state.index.byYear).map(Number).sort((a, b) => a - b);
    sortedYears.forEach(y => {
        state.index.byYear[y].ahorroAcumulado = new Array(12).fill(0);
        for (let m = 1; m <= 12; m++) {
            const budgetObj = getEffectiveBudget(9, m, y);
            const budgetVal = budgetObj ? parseFloat(budgetObj.presupuesto) : 0;
            state.index.byYear[y].ahorroAcumulado[m - 1] = state.index.byYear[y].byMonth[m].ahorroDelta + budgetVal;
        }
    });
}

function getAhorroAcumuladoForYear(year) {
    if (state.index.byYear[year] && state.index.byYear[year].ahorroAcumulado) {
        return state.index.byYear[year].ahorroAcumulado;
    }
    return new Array(12).fill(0);
}

// Mismo cálculo de "Acumulado total" que la pestaña Cuentas, para la categoría Ahorro (id 9),
// usando el mes actual como mes de referencia.
function getAhorroAcumuladoCuentas() {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    const categoriaAhorroId = 9;

    let accumulated = 0;
    Object.keys(state.index.byYear).map(Number)
        .filter(y => y <= cy)
        .sort()
        .forEach(y => {
            const maxM = (y === cy) ? cm : 12;
            for (let m = 1; m <= maxM; m++) {
                const budgetObj = getEffectiveBudget(categoriaAhorroId, m, y);
                const budget    = budgetObj ? parseFloat(budgetObj.presupuesto) : 0;
                const spent     = state.index.byYear[y]?.byMonth[m]?.byCategoryExpenses[categoriaAhorroId] || 0;
                const income    = state.index.byYear[y]?.byMonth[m]?.byCategoryIncome[categoriaAhorroId] || 0;
                const net       = spent - income;
                const delta     = budget - net;
                if (budget > 0 || net !== 0) {
                    accumulated += delta;
                }
            }
        });
    return accumulated;
}

function getEffectiveBudget(categoriaId, mes, año) {
    const targetStart = `${año}-${String(mes).padStart(2, '0')}-01`;

    // Find all budget records for this category
    const catBudgets = state.presupuestos.filter(p => p.categoriaId === categoriaId);
    if (catBudgets.length === 0) return null;

    // Group the versions by their period key: `${fecha_inicio}_${fecha_fin || 'indefinido'}`
    const periodsMap = {};
    catBudgets.forEach(p => {
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
