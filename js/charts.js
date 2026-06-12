/* ==========================================================================
   Registro Contable - Chart.js Integrations & Metrics
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

    const theme = getChartTheme();

    buildChartIngresosGastos(null, theme);
    buildChartCategorias(parseInt(state.chartFilters.categoriasYear) || state.selectedYear, theme);
    buildChartSubcategorias(parseInt(state.chartFilters.subcategorias.year) || state.selectedYear, theme);
    buildChartPresupuestoVsReal(parseInt(state.chartFilters.presupuestoVsRealYear) || state.selectedYear, theme);
    buildChartTopCategorias(theme);
    buildChartAhorro(parseInt(state.chartFilters.ahorro) || state.selectedYear, theme);
    buildChartComparativa(theme);
    buildChartGastoMensual(parseInt(state.chartFilters.gastoMensual) || state.selectedYear, theme);
}

function getLocalRangeMonths(range, customStartStr = '', customEndStr = '', targetYear = null) {
    const now = new Date();
    const year = targetYear || state.selectedYear;
    let startDate, endDate;

    if (range === 'year') {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
    } else if (range === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === '3months') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === '6months') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === 'custom') {
        startDate = customStartStr ? new Date(customStartStr) : new Date(year, 0, 1);
        endDate = customEndStr ? new Date(customEndStr) : new Date(year, 11, 31);
        if (isNaN(startDate.getTime())) startDate = new Date(year, 0, 1);
        if (isNaN(endDate.getTime())) endDate = new Date(year, 11, 31);
    } else {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
    }

    const months = [];
    if (startDate > endDate) {
        const temp = startDate;
        startDate = endDate;
        endDate = temp;
    }
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const limit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cur <= limit) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
        cur.setMonth(cur.getMonth() + 1);
    }
    return months;
}

// 1. Ingresos vs Gastos
function buildChartIngresosGastos(rangeMonths, theme) {
    if (state.charts.ingresosGastos) {
        state.charts.ingresosGastos.destroy();
        state.charts.ingresosGastos = null;
    }
    const rangeVal = state.chartFilters.ingresosGastos || 'year';
    
    let months, ingresos, gastos;
    
    if (rangeVal === 'custom') {
        const startStr = state.chartFilters.ingresosGastosCustom?.start || `${state.selectedYear}-01-01`;
        const endStr = state.chartFilters.ingresosGastosCustom?.end || `${state.selectedYear}-12-31`;
        months = getLocalRangeMonths('custom', startStr, endStr);
        
        const monthlyData = {};
        months.forEach(({ year, month }) => {
            monthlyData[`${year}-${month}`] = { ingresos: 0, gastos: 0 };
        });
        
        state.movimientos.forEach(m => {
            const mDate = m.fecha_referencia || m.fecha;
            if (mDate >= startStr && mDate <= endStr) {
                const parts = mDate.split('-');
                const y = parseInt(parts[0]);
                const mVal = parseInt(parts[1]);
                const key = `${y}-${mVal}`;
                if (monthlyData[key]) {
                    const val = parseFloat(m.importe) || 0;
                    if (m.tipo === 'INGRESO') {
                        monthlyData[key].ingresos += val;
                    } else if (m.tipo === 'GASTO') {
                        monthlyData[key].gastos += val;
                    }
                }
            }
        });
        
        ingresos = months.map(({ year, month }) => monthlyData[`${year}-${month}`].ingresos);
        gastos = months.map(({ year, month }) => monthlyData[`${year}-${month}`].gastos);
    } else {
        const yearVal = parseInt(state.chartFilters.ingresosGastosYear) || state.selectedYear;
        months = rangeMonths || getLocalRangeMonths(rangeVal, '', '', yearVal);
        ingresos = months.map(({ year, month }) => {
            return state.index.byYear[year]?.byMonth?.[month]?.ingresos || 0;
        });
        gastos = months.map(({ year, month }) => {
            return state.index.byYear[year]?.byMonth?.[month]?.gastos || 0;
        });
    }
    const netos = ingresos.map((ing, i) => ing - gastos[i]);
    const labels = months.map(m => `${MESES_ABR[m.month - 1]} ${m.year !== state.selectedYear ? m.year : ''}`);

    const ctx = document.getElementById('chart-ingresos-gastos').getContext('2d');
    state.charts.ingresosGastos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Balance Neto (€)',
                    data: netos,
                    type: 'line',
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.35,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: theme.border,
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: '#3b82f6',
                    pointHoverBorderColor: theme.border,
                    pointRadius: 4,
                    order: -1
                },
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
                    const datasetIndex = element.datasetIndex; // 0 = Balance Neto, 1 = Ingresos, 2 = Gastos
                    
                    const clickedPeriod = months[dataIndex];
                    if (clickedPeriod) {
                        if (state.selectedYear !== clickedPeriod.year) {
                            DOM.yearSelect.value = clickedPeriod.year.toString();
                            DOM.yearSelect.dispatchEvent(new Event('change'));
                        }
                        
                        DOM.filterMonth.value = clickedPeriod.month.toString();
                        if (datasetIndex === 1) {
                            DOM.filterType.value = 'INGRESO';
                        } else if (datasetIndex === 2) {
                            DOM.filterType.value = 'GASTO';
                        } else {
                            DOM.filterType.value = 'Todos';
                        }
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

// 3. Distribución por Categorías
function buildChartCategorias(year, theme) {
    if (state.charts.categorias) {
        state.charts.categorias.destroy();
        state.charts.categorias = null;
    }
    const targetYear = year || parseInt(state.chartFilters.categoriasYear) || state.selectedYear;
    const yearData = state.index.byYear[targetYear];
    const catExpenses = yearData ? yearData.byCategoryExpenses : {};

    const dataPoints = [];
    const labels = [];
    const backgroundColors = [];
    const targetCategories = [];

    const colorsMap = {
        1: '#38bdf8', 2: '#64748b', 3: '#818cf8', 4: '#f59e0b',
        5: '#facc15', 6: '#10b981', 7: '#f43f5e', 8: '#ec4899', 9: '#a855f7'
    };

    state.categorias.forEach(cat => {
        const val = catExpenses[cat.id] || 0;
        if (val > 0) {
            dataPoints.push(val);
            labels.push(`${cat.icono} ${cat.nombre}`);
            backgroundColors.push(colorsMap[cat.id] || '#cbd5e1');
            targetCategories.push(cat);
        }
    });

    if (dataPoints.length === 0) {
        // Render empty chart indicator in UI if needed, but ChartJS handles 0 datasets well.
    }

    const ctx = document.getElementById('chart-categorias').getContext('2d');
    state.charts.categorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: dataPoints,
                backgroundColor: backgroundColors,
                borderWidth: theme.isDark ? 2 : 1,
                borderColor: theme.border
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: theme.text, boxWidth: 12 } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const cat = targetCategories[dataIndex];
                    if (cat) {
                        DOM.filterCategory.value = cat.id.toString();
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = 'Todas';
                        DOM.filterType.value = 'GASTO';
                        DOM.filterMonth.value = 'Todos';
                        
                        if (state.selectedYear !== targetYear) {
                            DOM.yearSelect.value = targetYear.toString();
                            DOM.yearSelect.dispatchEvent(new Event('change'));
                        } else {
                            DOM.filterYear.value = targetYear.toString();
                            state.chartFilters.movementsYear = targetYear.toString();
                        }
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 4. Distribución por Subcategorías
function buildChartSubcategorias(year, theme) {
    if (state.charts.subcategorias) {
        state.charts.subcategorias.destroy();
        state.charts.subcategorias = null;
    }
    const targetYear = year || parseInt(state.chartFilters.subcategorias.year) || state.selectedYear;
    const monthSelect = document.getElementById('chart-subcategorias-month-select');
    const catSelect = document.getElementById('chart-subcategorias-cat-select');
    
    const monthVal = monthSelect ? monthSelect.value : 'year';
    const catVal = catSelect ? catSelect.value : 'Todas';

    let expenses = {};
    if (monthVal === 'year') {
        expenses = state.index.byYear[targetYear]?.bySubcategoryExpenses || {};
    } else {
        const m = parseInt(monthVal);
        expenses = state.index.byYear[targetYear]?.byMonth?.[m]?.bySubcategoryExpenses || {};
    }

    const dataPoints = [];
    const labels = [];
    const targetSubs = [];

    const activeSubs = state.subcategorias.filter(sc => {
        if (!sc.activa) return false;
        if (catVal !== 'Todas' && sc.categoriaId !== parseInt(catVal)) return false;
        return true;
    });

    activeSubs.forEach(sub => {
        const val = expenses[sub.id] || 0;
        if (val > 0) {
            dataPoints.push(val);
            labels.push(`${sub.icono} ${sub.nombre}`);
            targetSubs.push(sub);
        }
    });

    const colors = [
        '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e', '#84cc16'
    ];

    const ctx = document.getElementById('chart-subcategorias').getContext('2d');
    state.charts.subcategorias = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: dataPoints,
                backgroundColor: colors.slice(0, dataPoints.length),
                borderWidth: theme.isDark ? 2 : 1,
                borderColor: theme.border
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: theme.text, boxWidth: 12 } }
            },
            onHover: (event, chartElement) => {
                event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const dataIndex = element.index;
                    const sub = targetSubs[dataIndex];
                    if (sub) {
                        DOM.filterCategory.value = sub.categoriaId.toString();
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = sub.id.toString();
                        DOM.filterType.value = 'GASTO';
                        DOM.filterMonth.value = monthVal === 'year' ? 'Todos' : monthVal;
                        
                        if (state.selectedYear !== targetYear) {
                            DOM.yearSelect.value = targetYear.toString();
                            DOM.yearSelect.dispatchEvent(new Event('change'));
                        } else {
                            DOM.filterYear.value = targetYear.toString();
                            state.chartFilters.movementsYear = targetYear.toString();
                        }
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 5. Presupuesto vs Gasto Real
function buildChartPresupuestoVsReal(year, theme) {
    if (state.charts.presupuestoVsReal) {
        state.charts.presupuestoVsReal.destroy();
        state.charts.presupuestoVsReal = null;
    }
    const targetYear = year || parseInt(state.chartFilters.presupuestoVsRealYear) || state.selectedYear;
    const selectMonth = DOM.chartPresupuestoMonthSelect;
    const month = selectMonth ? parseInt(selectMonth.value) : (new Date().getMonth() + 1);

    const activeCats = state.categorias.filter(c => c.activa && c.id !== 9);
    const labels = [];
    const presupuestos = [];
    const reales = [];
    const targetCategories = [];

    activeCats.forEach(cat => {
        const budgetObj = getEffectiveBudget(cat.id, month, targetYear);
        const budgetVal = budgetObj ? parseFloat(budgetObj.presupuesto) : 0;
        const realVal = state.index.byYear[targetYear]?.byMonth?.[month]?.byCategoryExpenses?.[cat.id] || 0;

        if (budgetVal > 0 || realVal > 0) {
            labels.push(`${cat.icono} ${cat.nombre}`);
            presupuestos.push(budgetVal);
            reales.push(realVal);
            targetCategories.push(cat);
        }
    });

    const ctx = document.getElementById('chart-presupuesto-vs-real').getContext('2d');
    state.charts.presupuestoVsReal = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Presupuesto (€)',
                    data: presupuestos,
                    backgroundColor: 'rgba(99, 102, 241, 0.4)',
                    borderColor: 'rgba(99, 102, 241, 0.8)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Gasto Real (€)',
                    data: reales,
                    backgroundColor: reales.map((val, idx) => {
                        const limit = presupuestos[idx];
                        return (limit > 0 && val > limit) ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
                    }),
                    borderRadius: 4
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
                    const cat = targetCategories[dataIndex];
                    if (cat) {
                        DOM.filterCategory.value = cat.id.toString();
                        updateFilterSubcategoryOptions();
                        DOM.filterSubcategory.value = 'Todas';
                        DOM.filterType.value = 'GASTO';
                        DOM.filterMonth.value = month.toString();
                        
                        if (state.selectedYear !== targetYear) {
                            DOM.yearSelect.value = targetYear.toString();
                            DOM.yearSelect.dispatchEvent(new Event('change'));
                        } else {
                            DOM.filterYear.value = targetYear.toString();
                            state.chartFilters.movementsYear = targetYear.toString();
                        }
                        
                        window.location.hash = '#movimientos';
                    }
                }
            }
        }
    });
}

// 6. Top Categorías de Gasto
function buildChartTopCategorias(theme) {
    if (state.charts.topCategorias) {
        state.charts.topCategorias.destroy();
        state.charts.topCategorias = null;
    }
    const rangeVal = state.chartFilters.topCategorias || 'year';
    
    let expenses = {};
    
    if (rangeVal === 'custom') {
        const startStr = state.chartFilters.topCategoriasCustom?.start || `${state.selectedYear}-01-01`;
        const endStr = state.chartFilters.topCategoriasCustom?.end || `${state.selectedYear}-12-31`;
        
        state.movimientos.forEach(m => {
            if (m.tipo === 'GASTO' && m.categoriaId && m.categoriaId != 9) {
                const mDate = m.fecha_referencia || m.fecha;
                if (mDate >= startStr && mDate <= endStr) {
                    const catId = parseInt(m.categoriaId);
                    const val = parseFloat(m.importe) || 0;
                    expenses[catId] = (expenses[catId] || 0) + val;
                }
            }
        });
    } else if (rangeVal === 'month') {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        expenses = state.index.byYear[y]?.byMonth?.[m]?.byCategoryExpenses || {};
    } else {
        expenses = state.index.byYear[state.selectedYear]?.byCategoryExpenses || {};
    }

    const sorted = [];
    state.categorias.forEach(cat => {
        if (cat.id !== 9) {
            const val = expenses[cat.id] || 0;
            if (val > 0) {
                sorted.push({ id: cat.id, name: `${cat.icono} ${cat.nombre}`, val });
            }
        }
    });
    sorted.sort((a, b) => b.val - a.val);

    const palette = ['#f43f5e', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b', '#cbd5e1'];

    const ctx = document.getElementById('chart-top-categorias').getContext('2d');
    state.charts.topCategorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s.name),
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
    if (state.charts.ahorro) {
        state.charts.ahorro.destroy();
        state.charts.ahorro = null;
    }
    const targetYear = year || parseInt(state.chartFilters.ahorro) || new Date().getFullYear();
    const monthlyAhorro = getAhorroAcumuladoForYear(targetYear);

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
                    
                    if (state.selectedYear !== targetYear) {
                        DOM.yearSelect.value = targetYear.toString();
                        DOM.yearSelect.dispatchEvent(new Event('change'));
                    }
                    
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
    if (state.charts.comparativa) {
        state.charts.comparativa.destroy();
        state.charts.comparativa = null;
    }
    const year = parseInt(state.chartFilters.comparativa) || state.selectedYear;
    const prevYear = year - 1;
    const palette = { current: '#6366f1', prev: '#f59e0b' };

    const monthlyGastosCur = new Array(12).fill(0);
    const monthlyGastosPrev = new Array(12).fill(0);

    for (let m = 1; m <= 12; m++) {
        monthlyGastosCur[m - 1] = state.index.byYear[year]?.byMonth?.[m]?.gastos || 0;
        monthlyGastosPrev[m - 1] = state.index.byYear[prevYear]?.byMonth?.[m]?.gastos || 0;
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
    if (state.charts.gastoMensual) {
        state.charts.gastoMensual.destroy();
        state.charts.gastoMensual = null;
    }
    const targetYear = year || parseInt(state.chartFilters.gastoMensual) || state.selectedYear;
    const monthlyGastos = new Array(12).fill(0);
    for (let m = 1; m <= 12; m++) {
        monthlyGastos[m - 1] = state.index.byYear[targetYear]?.byMonth?.[m]?.gastos || 0;
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
                    
                    if (state.selectedYear !== targetYear) {
                        DOM.yearSelect.value = targetYear.toString();
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
