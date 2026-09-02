/* ==========================================================================
   Registro Contable - Configuration Management & Automations Tab
   ========================================================================== */

async function renderConfigManagement() {
    if (!DOM.containerCategoriasGestion || !DOM.containerPresupuestosGestion) return;

    // 1. Render Categories & Subcategories
    let catsHtml = '<div class="mgmt-list">';
    state.categorias.forEach(cat => {
        const isActive = cat.activa === true || cat.activa === 'true' || cat.activa === 1;
        const isExcludedDashboard = cat.excluida_dashboard === true || cat.excluida_dashboard === 'true' || cat.excluida_dashboard === 1;
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
                        <span class="mgmt-badge ${isExcludedDashboard ? 'dashboard-hidden' : 'dashboard-visible'} toggle-dashboard-cat" title="Haga clic para alternar visibilidad en el Dashboard general">
                            ${isExcludedDashboard ? '🚫 Dashboard' : '📊 Dashboard'}
                        </span>
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
                const subExcludedDashboard = sub.excluida_dashboard === true || sub.excluida_dashboard === 'true' || sub.excluida_dashboard === 1;
                catsHtml += `
                    <div class="mgmt-sub-row" data-sub-id="${sub.id}">
                        <div class="mgmt-sub-info">
                            <span class="mgmt-emoji">${sub.icono || '📄'}</span>
                            <span class="mgmt-name">${sub.nombre}</span>
                        </div>
                        <div class="mgmt-actions">
                            <button class="mgmt-btn-edit btn-edit-sub" title="Editar Nombre/Emoji">✏️</button>
                            <span class="mgmt-badge ${subExcludedDashboard ? 'dashboard-hidden' : 'dashboard-visible'} toggle-dashboard-sub" title="Haga clic para alternar visibilidad en el Dashboard general">
                                ${subExcludedDashboard ? '🚫 Dashboard' : '📊 Dashboard'}
                            </span>
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
                                        <button class="budget-mgmt-btn-toggle btn-deactivate-budget" style="border-color: var(--warning); color: var(--warning);" title="Desactivar este presupuesto">⏸️ Quitar</button>
                                    ` : ''}
                                    <button class="budget-mgmt-btn-toggle btn-delete-budget" style="border-color: var(--danger); color: var(--danger);" title="Eliminar definitivamente todas las versiones de este período">🗑️ Eliminar</button>
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
    if (DOM.containerSobrantesGestion) {
        const autoYear = DOM.automationYearSelect ? (parseInt(DOM.automationYearSelect.value) || state.selectedYear) : state.selectedYear;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const maxMonth = (autoYear === currentYear) ? currentMonth : 12;
        const activeCatsToEvaluate = state.categorias.filter(c => c.activa && !CATEGORIAS_ESPECIALES_IDS.includes(c.id));

        let sobrantesHtml = '<div class="mgmt-list">';
        let hasPositiveSurplus = false;

        if (activeCatsToEvaluate.length === 0) {
            sobrantesHtml += '<div class="card-description" style="text-align: center;">No hay categorías activas para evaluar.</div>';
        } else {
            activeCatsToEvaluate.forEach(cat => {
                // Presupuesto acumulado del año (informativo) y saldo real acumulado (sección 0.5):
                // getCategoryNetCashFlow ya incluye ingresos, gastos y transferencias (salidas
                // previas ya la reducen, así que no hace falta restar "lo ya transferido" aparte).
                let accBudget = 0;
                let accExpenses = 0;
                let surplus = 0;
                for (let m = 1; m <= maxMonth; m++) {
                    const budgetObj = getEffectiveBudget(cat.id, m, autoYear);
                    accBudget += budgetObj ? parseFloat(budgetObj.presupuesto) : 0.0;
                    accExpenses += state.index.byYear[autoYear]?.byMonth?.[m]?.byCategoryExpenses?.[cat.id] || 0.0;
                    surplus += getCategoryNetCashFlow(cat.id, m, autoYear);
                }

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
                                    <input type="number" step="0.01" min="0" max="${surplus.toFixed(2)}" class="form-input input-transfer-amount" data-cat-id="${cat.id}" data-max-surplus="${surplus}" value="${surplus.toFixed(2)}" style="width: 100px; padding: 6px 8px; font-size: 12px;">
                                    <button type="button" class="btn btn-secondary btn-sm btn-transfer-single" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer;">💸 Transferir</button>
                                ` : `
                                    <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Sin sobrante</span>
                                `}
                            </div>
                        </div>
                        <div class="automation-details">
                            <span>📋 Presupuesto acumulado: <strong>${formatCurrency(accBudget)}</strong></span>
                            <span>📉 Gastado acumulado: <strong>${formatCurrency(accExpenses)}</strong></span>
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
                const input = item.querySelector('.input-transfer-amount');
                const maxSurplus = parseFloat(input?.getAttribute('data-max-surplus')) || 0;
                const surplusVal = parseFloat(input?.value);

                if (!cat) return;
                if (isNaN(surplusVal) || surplusVal <= 0 || surplusVal > maxSurplus + 0.01) {
                    showToast('Introduce un importe válido (mayor que 0 y no superior al sobrante).', 'error');
                    return;
                }

                if (!confirm(`¿Estás seguro de que deseas transferir ${formatCurrency(surplusVal)} de "${cat.nombre}" a la categoría de Ahorro?`)) {
                    return;
                }

                setLoading(true);
                const res = await apiRequest('transferencia', 'POST', {
                    categoriaOrigenId: catId,
                    categoriaDestinoId: CATEGORIA_AHORRO_ID,
                    importe: surplusVal,
                    concepto: `Transferencia sobrante acumulado ${cat.nombre} (${autoYear})`,
                    fecha: new Date().toISOString().split('T')[0],
                    fecha_referencia: `${autoYear}-${String(maxMonth).padStart(2, '0')}-01`
                });

                setLoading(false);
                if (res && res.success) {
                    showToast(`Transferencia de ${formatCurrency(surplusVal)} realizada en servidor.`, 'success');
                    if (!state.isDemoMode && !state.isLocalMode) {
                        if (!realtimeChannel) {
                            await syncData();
                        }
                    } else {
                        updateDashboardMetrics();
                        recreateCharts();
                        renderConfigManagement();
                        refreshCuentasIfActive();
                    }
                } else {
                    showToast('Ocurrió un error al realizar la transferencia.', 'error');
                }
            });
        });
    }

    // 4. Reparto mensual preview
    renderRepartoPreview();

    // 5. Recálculo anual de presupuestos
    renderRecalculoPresupuestos();

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
                showToast('Editado en servidor', 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) {
                        await syncData();
                    }
                } else {
                    populateSelectors();
                    renderConfigManagement();
                }
            }
        });
    });

    DOM.containerCategoriasGestion.querySelectorAll('.toggle-dashboard-cat').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.mgmt-item');
            const catId = parseInt(item.getAttribute('data-cat-id'));
            const cat = state.categorias.find(c => c.id === catId);
            if (!cat) return;

            const newValue = !(cat.excluida_dashboard === true || cat.excluida_dashboard === 'true' || cat.excluida_dashboard === 1);

            const res = await apiRequest('editar_categoria', 'PATCH', { id: catId, excluida_dashboard: newValue });
            if (res && res.success) {
                showToast(`Modificado en servidor`, 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) {
                        await syncData();
                    }
                } else {
                    populateSelectors();
                    renderConfigManagement();
                    updateDashboardMetrics();
                    recreateCharts();
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
                showToast(`Modificado en servidor`, 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) {
                        await syncData();
                    }
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
                showToast('Editado en servidor', 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) {
                        await syncData();
                    }
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
                showToast(`Modificado en servidor`, 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) {
                        await syncData();
                    }
                } else {
                    populateSelectors();
                    renderConfigManagement();
                }
            }
        });
    });

    DOM.containerCategoriasGestion.querySelectorAll('.toggle-dashboard-sub').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.mgmt-sub-row');
            const subId = parseInt(item.getAttribute('data-sub-id'));
            const sub = state.subcategorias.find(s => s.id === subId);
            if (!sub) return;

            const newValue = !(sub.excluida_dashboard === true || sub.excluida_dashboard === 'true' || sub.excluida_dashboard === 1);

            const res = await apiRequest('editar_subcategoria', 'PATCH', { id: subId, excluida_dashboard: newValue });
            if (res && res.success) {
                showToast(`Modificado en servidor`, 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) {
                        await syncData();
                    }
                } else {
                    populateSelectors();
                    renderConfigManagement();
                    updateDashboardMetrics();
                    recreateCharts();
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
                showToast('Modificado en servidor', 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) {
                        await syncData();
                    }
                } else {
                    renderConfigManagement();
                }
            }
        });
    });

    DOM.containerPresupuestosGestion.querySelectorAll('.btn-delete-budget').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const row = e.target.closest('.budget-mgmt-main');
            const periodKey = row.getAttribute('data-period-key');
            const budgetId  = parseInt(row.getAttribute('data-budget-id'));
            const budget    = state.presupuestos.find(p => p.id === budgetId);
            if (!budget) return;

            const periodName = formatPeriod(budget.fecha_inicio, budget.fecha_fin);
            if (!confirm(`¿Eliminar definitivamente el presupuesto del período "${periodName}"? Se borrarán todas sus versiones y no podrá recuperarse.`)) return;

            // All versions of this period share the same fecha_inicio + fecha_fin
            const allVersions = state.presupuestos.filter(p =>
                p.categoriaId === budget.categoriaId &&
                p.fecha_inicio === budget.fecha_inicio &&
                (p.fecha_fin || null) === (budget.fecha_fin || null)
            );

            const results = await Promise.all(
                allVersions.map(p => apiRequest('eliminar_presupuesto', 'POST', { id: p.id }))
            );

            if (results.every(r => r && r.success)) {
                showToast('Presupuesto eliminado', 'success');
                if (!state.isDemoMode && !state.isLocalMode) {
                    if (!realtimeChannel) await syncData();
                } else {
                    renderConfigManagement();
                }
            } else {
                showToast('Error al eliminar el presupuesto', 'error');
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

// Vista previa del reparto mensual (Inputs -> categorías -> Ahorro) para el mes seleccionado
// en #reparto-mes-filtro. Solo lectura: la ejecución real la hace el handler de
// #btn-ejecutar-reparto (js/event-handlers.js), que reutiliza estos mismos cálculos.
function renderRepartoPreview() {
    if (!DOM.containerRepartoPreview) return;

    if (DOM.repartoMesFiltro && !DOM.repartoMesFiltro.value) {
        const now = new Date();
        DOM.repartoMesFiltro.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const filterVal = DOM.repartoMesFiltro?.value || '';
    if (!filterVal) {
        DOM.containerRepartoPreview.innerHTML = '<div class="card-description">Selecciona un mes para ver la vista previa del reparto.</div>';
        return;
    }

    const [year, month] = filterVal.split('-').map(Number);
    const existentes = getRepartoMensualExistente(CATEGORIA_INGRESOS_ID, month, year);
    const { totalIngresos, lineas, totalPresupuestado, remanenteAhorro } = computeRepartoMensual(CATEGORIA_INGRESOS_ID, month, year);

    const lineasHtml = lineas.map(l => `
        <div class="automation-details" style="display: flex; justify-content: space-between;">
            <span>${l.nombre}</span>
            <span><strong>${formatCurrency(l.presupuesto)}</strong></span>
        </div>`).join('');

    DOM.containerRepartoPreview.innerHTML = `
        ${existentes.length > 0 ? `<div class="card-description" style="color: var(--warning);">⚠️ Ya existe${existentes.length > 1 ? 'n' : ''} ${existentes.length} transferencia(s) de reparto para este mes. Ejecutarlo de nuevo podría duplicarlas.</div>` : ''}
        <div class="automation-details" style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>💰 Ingresos en Inputs este mes</span>
            <span>${formatCurrency(totalIngresos)}</span>
        </div>
        ${lineasHtml || '<div class="card-description" style="margin: 4px 0; font-style: italic;">No hay categorías con presupuesto vigente ese mes.</div>'}
        <div class="automation-details" style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid var(--border-color); padding-top: 6px; margin-top: 6px;">
            <span>Total repartido</span>
            <span>${formatCurrency(totalPresupuestado)}</span>
        </div>
        <div class="automation-details" style="display: flex; justify-content: space-between; font-weight: 700;">
            <span>Remanente a Ahorro</span>
            <span class="${remanenteAhorro >= 0 ? 'cnt-success' : 'cnt-danger'}">${formatCurrency(remanenteAhorro)}</span>
        </div>`;
}

// Escuchar el <input type="month"> del reparto una sola vez (fuera de renderConfigManagement,
// que se llama en cada refresco de la pestaña Configuración) para no duplicar listeners.
document.getElementById('reparto-mes-filtro')
    ?.addEventListener('change', renderRepartoPreview);

// Escuchar el input de margen de seguridad una sola vez, igual que reparto-mes-filtro.
document.getElementById('recalc-margin-input')
    ?.addEventListener('input', (e) => {
        state.chartFilters.recalcMarginPct = e.target.value;
        renderRecalculoPresupuestos();
    });

// Tabla de recálculo anual de presupuestos: presupuesto mensual actual vs gasto real del año,
// con una propuesta editable (gasto real / 12 + margen de seguridad) por categoría, marcando
// visualmente las filas con mucha diferencia respecto al presupuesto actual, y un checkbox
// para aplicarla.
function renderRecalculoPresupuestos() {
    if (!DOM.containerRecalculoPresupuestos) return;

    const year = DOM.recalcYearSelect ? (parseInt(DOM.recalcYearSelect.value) || state.selectedYear) : state.selectedYear;
    const activeCats = state.categorias.filter(c => c.activa && !CATEGORIAS_ESPECIALES_IDS.includes(c.id));

    if (activeCats.length === 0) {
        DOM.containerRecalculoPresupuestos.innerHTML = '<div class="card-description" style="text-align: center;">No hay categorías activas para evaluar.</div>';
        return;
    }

    // Diferencia relativa entre la propuesta y el presupuesto mensual actual a partir de la
    // cual se marca la fila para revisión manual (además de un presupuesto actual en 0 con
    // gasto real, que siempre se marca por ser una categoría sin presupuestar hasta ahora).
    const REVIEW_THRESHOLD_PCT = 0.20;

    const marginPct = DOM.recalcMarginInput ? (parseFloat(DOM.recalcMarginInput.value) || 0) : parseFloat(state.chartFilters.recalcMarginPct) || 0;

    const gridCols = '1.5fr 110px 100px 100px 130px 70px';
    const header = `
        <div class="factura-month-header" style="grid-template-columns: ${gridCols};">
            <span>Categoría</span>
            <span>Presup. mensual actual</span>
            <span>Gasto real anual</span>
            <span>Diferencia anual</span>
            <span>Propuesta/mes (+${marginPct}%)</span>
            <span>Aplicar</span>
        </div>`;

    const rows = activeCats.map(cat => {
        const annualBudget = getAnnualBudgetByCategory(cat.id, year);
        const annualExpense = getAnnualExpenseByCategory(cat.id, year);
        const diff = annualExpense - annualBudget;
        const currentMonthlyBudget = Math.round((annualBudget / 12) * 100) / 100;
        const baseProposal = annualExpense / 12;
        const proposal = Math.round((baseProposal * (1 + marginPct / 100)) * 100) / 100;

        const diffRatio = currentMonthlyBudget > 0.01
            ? Math.abs(proposal - currentMonthlyBudget) / currentMonthlyBudget
            : (proposal > 0.01 ? 1 : 0);
        const needsReview = diffRatio > REVIEW_THRESHOLD_PCT;
        const shouldCheck = Math.abs(proposal - currentMonthlyBudget) > 0.01;

        return `
            <div class="factura-month-row recalc-row ${needsReview ? 'recalc-row--review' : ''}" data-cat-id="${cat.id}" style="grid-template-columns: ${gridCols}; cursor: default;">
                <span class="factura-month-name">${cat.icono || ''} ${cat.nombre}${needsReview ? ' <span class="recalc-review-badge" title="Diferencia grande respecto al presupuesto actual: revisar">⚠️ Revisar</span>' : ''}</span>
                <span class="factura-month-amount">${formatCurrency(currentMonthlyBudget)}</span>
                <span class="factura-month-amount">${formatCurrency(annualExpense)}</span>
                <span class="factura-month-amount ${diff >= 0 ? 'cnt-danger' : 'cnt-success'}">${diff >= 0 ? '+' : ''}${formatCurrency(diff)}</span>
                <span><input type="number" step="0.01" min="0" class="form-input recalc-proposal-input" value="${proposal.toFixed(2)}" style="width: 100%; padding: 4px 6px; font-size: 12px;"></span>
                <span style="text-align: center;"><input type="checkbox" class="recalc-apply-checkbox" ${shouldCheck ? 'checked' : ''}></span>
            </div>`;
    }).join('');

    DOM.containerRecalculoPresupuestos.innerHTML = `<div class="factura-month-list">${header}${rows}</div>`;
}
