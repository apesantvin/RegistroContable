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

        months.push({ m, total, count, completo, status });
    }

    return months;
}

function facturaStatusLabel(status) {
    if (status === 'completo') return 'Completo';
    if (status === 'incompleto') return 'Incompleto';
    return 'Sin registrar';
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

        const rows = months.map(({ m, total, status }) => `
            <div class="factura-month-row factura-status--${status}" data-cat-id="${catId}" data-year-month="${year}-${String(m).padStart(2, '0')}">
                <span class="factura-month-name">${FACTURAS_MONTH_NAMES[m - 1]}</span>
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
                    </div>
                </div>

                <div class="factura-month-list ${view === 'chart' ? 'hidden' : ''}">
                    <div class="factura-month-header">
                        <span>Mes</span>
                        <span>Importe</span>
                        <span>Estado</span>
                    </div>
                    ${rows}
                </div>

                <div class="factura-chart-wrapper ${view === 'table' ? 'hidden' : ''}">
                    <div class="factura-chart-canvas-wrapper">
                        <canvas id="chart-factura-${catId}"></canvas>
                    </div>
                    <p class="factura-chart-note">Solo se muestran los meses ya completados.</p>
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
                y: { grid: { color: theme.grid }, ticks: { color: theme.text } }
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
