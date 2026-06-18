/* ==========================================================================
   Registro Contable - Cuentas: Budget Status per Category
   ========================================================================== */

function renderCuentas() {
    const container = document.getElementById('cuentas-container');
    if (!container) return;

    // Initialise filter to current month if empty
    const filterEl = document.getElementById('cuentas-mes-filtro');
    if (filterEl && !filterEl.value) {
        const now = new Date();
        filterEl.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const filterVal = filterEl?.value || '';
    let cm, cy;
    if (filterVal) {
        const p = filterVal.split('-');
        cy = parseInt(p[0]);
        cm = parseInt(p[1]);
    } else {
        const now = new Date();
        cm = now.getMonth() + 1;
        cy = now.getFullYear();
    }

    const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                         'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const activeCats = state.categorias.filter(c =>
        c.activa === true || c.activa === 'true' || c.activa === 1
    );

    let totalBudgetMonth = 0;
    let totalSpentMonth  = 0;
    let grandAccumulated = 0;

    const catData = activeCats.map(cat => {
        const budgetObj = getEffectiveBudget(cat.id, cm, cy);
        const budget    = budgetObj ? parseFloat(budgetObj.presupuesto) : 0;
        const spent     = state.index.byYear[cy]?.byMonth[cm]?.byCategoryExpenses[cat.id] || 0;
        const income    = state.index.byYear[cy]?.byMonth[cm]?.byCategoryIncome[cat.id] || 0;
        const net       = spent - income;
        const remaining = budget - net;

        // Accumulated: sum of (budget − net) for every past month up to now
        let accumulated = 0;
        const monthlyBreakdown = [];
        let running = 0;
        Object.keys(state.index.byYear).map(Number)
            .filter(y => y <= cy)
            .sort()
            .forEach(y => {
                const maxM = (y === cy) ? cm : 12;
                for (let m = 1; m <= maxM; m++) {
                    const mBudgetObj = getEffectiveBudget(cat.id, m, y);
                    const mBudget    = mBudgetObj ? parseFloat(mBudgetObj.presupuesto) : 0;
                    const mSpent     = state.index.byYear[y]?.byMonth[m]?.byCategoryExpenses[cat.id] || 0;
                    const mIncome    = state.index.byYear[y]?.byMonth[m]?.byCategoryIncome[cat.id] || 0;
                    const mNet       = mSpent - mIncome;
                    const mDelta     = mBudget - mNet;
                    if (mBudget > 0 || mNet !== 0) {
                        running += mDelta;
                        accumulated += mDelta;
                        monthlyBreakdown.push({ y, m, mBudget, mNet, mDelta, running });
                    }
                }
            });

        if (budget > 0) {
            totalBudgetMonth += budget;
            totalSpentMonth  += net;
        }
        grandAccumulated += accumulated;

        return { cat, budget, spent, remaining, accumulated, monthlyBreakdown };
    }).filter(d => d.budget > 0 || d.spent > 0 || d.accumulated !== 0);

    const totalRemaining = totalBudgetMonth - totalSpentMonth;
    const globalPct = totalBudgetMonth > 0
        ? Math.max(0, Math.min(100, (totalRemaining / totalBudgetMonth) * 100))
        : 0;

    const summaryHtml = `
        <div class="card cuentas-summary-card">
            <div class="cuentas-summary-top">
                <h2 class="cuentas-main-title">Estado de Cuentas</h2>
                <p class="cuentas-main-sub">${MONTH_NAMES[cm - 1]} ${cy}</p>
            </div>
            <div class="cuentas-summary-metrics">
                <div class="cuentas-metric">
                    <span class="cuentas-metric-label">Presupuesto mes</span>
                    <span class="cuentas-metric-value">${formatCurrency(totalBudgetMonth)}</span>
                </div>
                <div class="cuentas-metric">
                    <span class="cuentas-metric-label">Gastado</span>
                    <span class="cuentas-metric-value cnt-danger">${formatCurrency(totalSpentMonth)}</span>
                </div>
                <div class="cuentas-metric">
                    <span class="cuentas-metric-label">Restante mes</span>
                    <span class="cuentas-metric-value ${totalRemaining >= 0 ? 'cnt-success' : 'cnt-danger'}">${totalRemaining >= 0 ? '+' : ''}${formatCurrency(totalRemaining)}</span>
                </div>
                <div class="cuentas-metric">
                    <span class="cuentas-metric-label">Saldo acumulado</span>
                    <span class="cuentas-metric-value ${grandAccumulated >= 0 ? 'cnt-success' : 'cnt-danger'}">${grandAccumulated >= 0 ? '+' : ''}${formatCurrency(grandAccumulated)}</span>
                </div>
            </div>
            <div class="cnt-bar-track cnt-bar-track--lg">
                <div class="cnt-bar-fill cnt-bar-fill--${cuentasBarColor(totalRemaining, totalBudgetMonth)}" style="width:${globalPct.toFixed(1)}%"></div>
            </div>
            <div class="cnt-bar-legends">
                <span class="cnt-danger">${formatCurrency(totalSpentMonth)} gastado</span>
                <span>${formatCurrency(Math.max(0, totalRemaining))} disponible</span>
                <span class="text-muted">${formatCurrency(totalBudgetMonth)}</span>
            </div>
        </div>`;

    const cardsHtml = catData.map(({ cat, budget, spent, remaining, accumulated, monthlyBreakdown }) => {
        const pct      = budget > 0 ? Math.max(0, Math.min(100, (remaining / budget) * 100)) : 0;
        const isOver   = remaining < 0;
        const colorCls = cuentasBarColor(remaining, budget);
        const accSign  = accumulated >= 0 ? '+' : '';

        const breakdownRows = [...monthlyBreakdown].reverse().map(({ y, m, mBudget, mNet, mDelta, running }) => {
            const dSign = mDelta >= 0 ? '+' : '';
            const rSign = running >= 0 ? '+' : '';
            return `
                <div class="acc-breakdown-row">
                    <span class="acc-month">${MONTH_NAMES[m - 1]} ${y}</span>
                    <span class="acc-col text-muted">${formatCurrency(mBudget)}</span>
                    <span class="acc-col text-muted">${formatCurrency(mNet)}</span>
                    <span class="acc-col acc-delta ${mDelta >= 0 ? 'cnt-success' : 'cnt-danger'}">${dSign}${formatCurrency(mDelta)}</span>
                    <span class="acc-col acc-running ${running >= 0 ? 'cnt-success' : 'cnt-danger'}">${rSign}${formatCurrency(running)}</span>
                </div>`;
        }).join('');

        return `
            <div class="card cuenta-card" data-cat-id="${cat.id}" role="button" tabindex="0">
                <div class="cuenta-card-header">
                    <span class="cuenta-card-icon">${cat.icono}</span>
                    <span class="cuenta-card-name">${cat.nombre}</span>
                    ${isOver
                        ? '<span class="cuenta-badge-over">Excedido</span>'
                        : budget > 0 ? `<span class="cuenta-badge-ok">${pct.toFixed(0)}% restante</span>` : ''}
                </div>

                ${budget > 0 ? `
                <div class="cnt-bar-track">
                    <div class="cnt-bar-fill cnt-bar-fill--${colorCls}" style="width:${pct.toFixed(1)}%"></div>
                </div>
                <div class="cuenta-bar-row">
                    <span class="${isOver ? 'cnt-danger' : 'cnt-strong'}">
                        ${isOver ? '−' : ''}${formatCurrency(Math.abs(remaining))}
                        <small class="text-muted">${isOver ? 'excedido' : 'restantes'}</small>
                    </span>
                    <span class="text-muted">/ ${formatCurrency(budget)}</span>
                </div>
                ` : `<p class="cuenta-no-budget">Sin presupuesto este mes</p>`}

                <div class="cuenta-acumulado-wrapper" data-acc-id="${cat.id}">
                    <div class="cuenta-acumulado cuenta-acumulado--toggle">
                        <span class="cuenta-acumulado-label">
                            Acumulado total
                            <span class="acc-chevron">▾</span>
                        </span>
                        <span class="cuenta-acumulado-value ${accumulated >= 0 ? 'cnt-success' : 'cnt-danger'}">${accSign}${formatCurrency(accumulated)}</span>
                    </div>
                    <div class="acc-breakdown" id="acc-${cat.id}">
                        <div class="acc-breakdown-header">
                            <span>Mes</span>
                            <span>Presup.</span>
                            <span>Neto</span>
                            <span>Δ mes</span>
                            <span>Acumulado</span>
                        </div>
                        ${breakdownRows}
                    </div>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = summaryHtml + `<div class="cuentas-grid">${cardsHtml}</div>`;
}

function cuentasBarColor(remaining, budget) {
    if (budget <= 0) return 'neutral';
    if (remaining <= 0) return 'danger';
    const pct = (remaining / budget) * 100;
    if (pct > 50) return 'success';
    if (pct > 20) return 'warning';
    return 'danger';
}

// Event listeners (bound once at load time)
document.getElementById('cuentas-mes-filtro')
    ?.addEventListener('change', renderCuentas);

document.getElementById('btn-cuentas-hoy')
    ?.addEventListener('click', () => {
        const now = new Date();
        const el = document.getElementById('cuentas-mes-filtro');
        if (el) {
            el.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            renderCuentas();
        }
    });

// Toggle acumulado breakdown
document.getElementById('screen-cuentas')
    ?.addEventListener('click', e => {
        const wrapper = e.target.closest('.cuenta-acumulado-wrapper[data-acc-id]');
        if (!wrapper) return;
        e.stopPropagation();

        const panel  = document.getElementById(`acc-${wrapper.dataset.accId}`);
        const toggle = wrapper.querySelector('.cuenta-acumulado--toggle');
        if (panel)  panel.classList.toggle('acc-breakdown--open');
        if (toggle) toggle.classList.toggle('acc-open');
    });

// Navigate to movimientos filtered by category + reference month on card click
document.getElementById('screen-cuentas')
    ?.addEventListener('click', e => {
        if (e.target.closest('.cuenta-acumulado-wrapper')) return;

        const card = e.target.closest('.cuenta-card[data-cat-id]');
        if (!card) return;

        const catId = card.dataset.catId;
        const mesVal = document.getElementById('cuentas-mes-filtro')?.value || '';

        DOM.filterCategory.value = catId;
        updateFilterSubcategoryOptions();
        DOM.filterSubcategory.value = 'Todas';
        DOM.filterType.value = 'GASTO';
        DOM.filterMesRef.value = mesVal;
        DOM.filterFechaDesde.value = '';
        DOM.filterFechaHasta.value = '';

        window.location.hash = '#movimientos';
    });
