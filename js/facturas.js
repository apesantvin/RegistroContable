/* ==========================================================================
   Registro Contable - Facturas: Estado mensual de gastos por categoría
   ========================================================================== */

const FACTURAS_MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Instancias de Chart.js activas en la vista de Facturas, indexadas por categoriaId
let facturaChartInstances = {};

// Devuelve, para una categoría y año dados, los datos de los 12 meses:
// { total, count, completo, status } donde status es 'sin-registrar' | 'incompleto' | 'completo'
function getFacturaYearData(categoriaId, year) {
    const gastosCat = state.movimientos.filter(mv =>
        mv.tipo === 'GASTO' && parseInt(mv.categoriaId) === categoriaId
    );

    const monthKey = (mv) => {
        const refDate = mv.fecha_referencia || mv.fecha;
        if (!refDate) return null;
        const parts = refDate.split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        if (isNaN(y) || isNaN(m)) return null;
        return { y, m };
    };

    const months = [];
    for (let m = 1; m <= 12; m++) {
        const gastosMes = gastosCat.filter(mv => {
            const k = monthKey(mv);
            return k && k.y === year && k.m === m;
        });

        const total = gastosMes.reduce((sum, mv) => sum + (parseFloat(mv.importe) || 0), 0);
        const count = gastosMes.length;

        const nextMonth = m === 12 ? 1 : m + 1;
        const nextYear = m === 12 ? year + 1 : year;
        const nextHasRecord = gastosCat.some(mv => {
            const k = monthKey(mv);
            return k && k.y === nextYear && k.m === nextMonth;
        });

        const completo = count >= 2 || nextHasRecord;
        let status = 'sin-registrar';
        if (count > 0) status = completo ? 'completo' : 'incompleto';

        const budgetObj = getEffectiveBudget(categoriaId, m, year);
        const budget = budgetObj ? parseFloat(budgetObj.presupuesto) : 0;

        months.push({ m, total, count, completo, status, budget });
    }

    return months;
}

// Devuelve, para un año dado, un array de 12 booleanos: true si TODAS las categorías de
// factura (Luz, Gas, Agua, Basuras) tienen ese mes marcado como "completo". Se usa para
// señalar en los gráficos del Dashboard qué meses tienen los gastos ya cerrados.
function getFacturasCompletenessByYear(year) {
    const perCategory = FACTURAS_CATEGORIA_IDS.map(catId => getFacturaYearData(catId, year));
    const flags = [];
    for (let m = 0; m < 12; m++) {
        flags.push(perCategory.every(catMonths => catMonths[m] && catMonths[m].status === 'completo'));
    }
    return flags;
}

function facturaStatusLabel(status) {
    if (status === 'completo') return 'Completo';
    if (status === 'incompleto') return 'Incompleto';
    return 'Sin registrar';
}

// Agrupa los movimientos GASTO de una categoría por facturaId (facturas dadas de alta
// como reparto en varios meses). Devuelve un array ordenado por fecha desc: cada entrada
// es { facturaId, fecha, total, movimientos } con movimientos ordenados por fecha_referencia.
function getFacturaGroups(categoriaId) {
    const gastosCat = state.movimientos.filter(mv =>
        mv.tipo === 'GASTO' && parseInt(mv.categoriaId) === categoriaId && mv.facturaId
    );

    const groups = {};
    gastosCat.forEach(mv => {
        if (!groups[mv.facturaId]) {
            groups[mv.facturaId] = { facturaId: mv.facturaId, fecha: mv.fecha, movimientos: [] };
        }
        groups[mv.facturaId].movimientos.push(mv);
    });

    return Object.values(groups)
        .map(g => ({
            ...g,
            movimientos: g.movimientos.slice().sort((a, b) => (a.fecha_referencia || '').localeCompare(b.fecha_referencia || '')),
            total: g.movimientos.reduce((sum, mv) => sum + (parseFloat(mv.importe) || 0), 0)
        }))
        .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}

function renderFacturas() {
    if (!DOM.facturasContainer) return;

    // Destruir gráficos previos antes de reconstruir el DOM (los canvas se recrean)
    Object.keys(facturaChartInstances).forEach(catId => {
        if (facturaChartInstances[catId]) {
            facturaChartInstances[catId].destroy();
            delete facturaChartInstances[catId];
        }
    });

    const year = parseInt(DOM.facturasYearSelect?.value) || parseInt(state.chartFilters.facturasYear) || new Date().getFullYear();

    const cardsHtml = FACTURAS_CATEGORIA_IDS.map(catId => {
        const cat = state.categorias.find(c => c.id === catId);
        if (!cat) return '';

        const months = getFacturaYearData(catId, year);
        const view = state.chartFilters.facturasViewMode[catId] || 'table';

        const rows = months.map(({ m, total, status, budget }) => `
            <div class="factura-month-row factura-status--${status}" data-cat-id="${catId}" data-year-month="${year}-${String(m).padStart(2, '0')}">
                <span class="factura-month-name">${FACTURAS_MONTH_NAMES[m - 1]}</span>
                <span class="factura-month-budget">${budget > 0 ? formatCurrency(budget) : '—'}</span>
                <span class="factura-month-amount">${total > 0 ? formatCurrency(total) : '—'}</span>
                <span class="factura-status-badge factura-status-badge--${status}">${facturaStatusLabel(status)}</span>
            </div>
        `).join('');

        return `
            <div class="card cuenta-card factura-card" data-cat-id="${catId}">
                <div class="cuenta-card-header">
                    <span class="cuenta-card-icon">${cat.icono}</span>
                    <span class="cuenta-card-name">${cat.nombre}</span>
                    <div class="factura-view-toggle" data-cat-id="${catId}">
                        <button type="button" class="factura-view-btn ${view === 'table' ? 'active' : ''}" data-view="table" title="Ver como tabla">📋</button>
                        <button type="button" class="factura-view-btn ${view === 'chart' ? 'active' : ''}" data-view="chart" title="Ver como gráfico">📈</button>
                        <button type="button" class="factura-view-btn ${view === 'facturas' ? 'active' : ''}" data-view="facturas" title="Ver por factura">🧾</button>
                    </div>
                </div>

                <div class="factura-month-list ${view === 'table' ? '' : 'hidden'}">
                    <div class="factura-month-header">
                        <span>Mes</span>
                        <span>Presupuesto</span>
                        <span>Importe</span>
                        <span>Estado</span>
                    </div>
                    ${rows}
                </div>

                <div class="factura-chart-wrapper ${view === 'chart' ? '' : 'hidden'}">
                    <div class="factura-chart-canvas-wrapper">
                        <canvas id="chart-factura-${catId}"></canvas>
                    </div>
                    <p class="factura-chart-note">Solo se muestran los meses ya completados.</p>
                </div>

                <div class="factura-group-list ${view === 'facturas' ? '' : 'hidden'}">
                    ${renderFacturaGroupList(catId)}
                </div>
            </div>`;
    }).join('');

    DOM.facturasContainer.innerHTML = `<div class="cuentas-grid factura-grid">${cardsHtml}</div>`;

    // Construir los gráficos solo para las tarjetas que estén en modo "gráfico"
    const theme = getChartTheme();
    FACTURAS_CATEGORIA_IDS.forEach(catId => {
        const view = state.chartFilters.facturasViewMode[catId] || 'table';
        if (view !== 'chart') return;
        const cat = state.categorias.find(c => c.id === catId);
        if (!cat) return;
        buildFacturaChart(catId, cat, year, theme);
    });
}

// Lista "por factura": una fila por facturaId con fecha de alta e importe total,
// desplegable para ver el desglose de los movimientos (mes + importe) que la componen.
// No se filtra por año: una factura dividida puede cruzar el límite de año.
function renderFacturaGroupList(catId) {
    const groups = getFacturaGroups(catId);

    if (groups.length === 0) {
        return '<div class="factura-split-preview-empty">No hay facturas divididas en varios meses registradas para esta categoría.</div>';
    }

    const header = `
        <div class="factura-group-header">
            <span>Fecha</span>
            <span>Nombre</span>
            <span>Importe</span>
            <span>Meses</span>
        </div>`;

    const body = groups.map(g => {
        const detailRows = g.movimientos.map(mv => `
            <div class="factura-group-detail-row">
                <span>${formatMonthYear(mv.fecha_referencia)}</span>
                <span>${formatCurrency(parseFloat(mv.importe) || 0)}</span>
                <span class="factura-group-detail-concepto">${mv.concepto || ''}</span>
            </div>`).join('');

        return `
            <div class="factura-group-item">
                <div class="factura-group-row" data-factura-id="${g.facturaId}">
                    <span>${formatDate(g.fecha)}</span>
                    <span class="factura-group-nombre">${getFacturaNombre(g)}</span>
                    <span class="factura-group-importe">${formatCurrency(g.total)}</span>
                    <span class="factura-group-count">${g.movimientos.length} meses</span>
                </div>
                <div class="factura-group-detail hidden" data-factura-id="${g.facturaId}">
                    ${detailRows}
                </div>
            </div>`;
    }).join('');

    return `${header}${body}`;
}

// El nombre de la factura es el concepto de sus movimientos sin el sufijo "(i/N)"
// que añade el reparto en varios meses (ver handleFacturaSplitSubmit).
function getFacturaNombre(g) {
    const concepto = g.movimientos[0]?.concepto || '';
    return concepto.replace(/\s*\(\d+\/\d+\)\s*$/, '');
}

function buildFacturaChart(catId, cat, year, theme) {
    const canvas = document.getElementById(`chart-factura-${catId}`);
    if (!canvas) return;

    const months = getFacturaYearData(catId, year);
    // Solo se representan los meses completos; el resto queda como hueco (null) en la línea
    const data = months.map(({ total, status }) => status === 'completo' ? total : null);

    const ctx = canvas.getContext('2d');
    facturaChartInstances[catId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MESES_ABR,
            datasets: [{
                label: `Gasto ${cat.nombre} (€)`,
                data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                spanGaps: false,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: theme.text } },
                y: { beginAtZero: true, min: 0, grid: { color: theme.grid }, ticks: { color: theme.text } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length === 0) return;
                const dataIndex = elements[0].index;
                if (data[dataIndex] === null) return;
                const month = dataIndex + 1;

                DOM.filterCategory.value = catId.toString();
                updateFilterSubcategoryOptions();
                DOM.filterSubcategory.value = 'Todas';
                DOM.filterType.value = 'GASTO';
                DOM.filterMesRef.value = `${year}-${String(month).padStart(2, '0')}`;
                DOM.filterFechaDesde.value = '';
                DOM.filterFechaHasta.value = '';

                window.location.hash = '#movimientos';
            }
        }
    });
}

// Alternar entre vista de tabla y de gráfico por tarjeta
document.getElementById('screen-facturas')
    ?.addEventListener('click', e => {
        const toggleBtn = e.target.closest('.factura-view-btn');
        if (!toggleBtn) return;

        const wrapper = toggleBtn.closest('.factura-view-toggle');
        const catId = wrapper?.getAttribute('data-cat-id');
        const view = toggleBtn.getAttribute('data-view');
        if (catId && view) {
            state.chartFilters.facturasViewMode[catId] = view;
            renderFacturas();
        }
    });

// Navigate to movimientos filtered by category + reference month on row click
document.getElementById('screen-facturas')
    ?.addEventListener('click', e => {
        const row = e.target.closest('.factura-month-row');
        if (!row) return;

        const catId = row.getAttribute('data-cat-id');
        const yearMonth = row.getAttribute('data-year-month');

        DOM.filterCategory.value = catId;
        updateFilterSubcategoryOptions();
        DOM.filterSubcategory.value = 'Todas';
        DOM.filterType.value = 'GASTO';
        DOM.filterMesRef.value = yearMonth;
        DOM.filterFechaDesde.value = '';
        DOM.filterFechaHasta.value = '';

        window.location.hash = '#movimientos';
    });

// Expandir/colapsar el desglose de movimientos de una factura, en la vista "por factura"
document.getElementById('screen-facturas')
    ?.addEventListener('click', e => {
        const groupRow = e.target.closest('.factura-group-row');
        if (!groupRow) return;

        const facturaId = groupRow.getAttribute('data-factura-id');
        const detail = groupRow.parentElement.querySelector(`.factura-group-detail[data-factura-id="${facturaId}"]`);
        if (detail) detail.classList.toggle('hidden');
    });
