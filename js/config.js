/* ==========================================================================
   Registro Contable - Configuration Management & Automations Tab
   ========================================================================== */

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
        const autoYear = DOM.automationYearSelect ? (parseInt(DOM.automationYearSelect.value) || state.selectedYear) : state.selectedYear;
        const activeCatsToEvaluate = state.categorias.filter(c => c.activa && c.id !== 9);

        let sobrantesHtml = '<div class="mgmt-list">';
        let hasPositiveSurplus = false;
        
        if (activeCatsToEvaluate.length === 0) {
            sobrantesHtml += '<div class="card-description" style="text-align: center;">No hay categorías activas para evaluar.</div>';
        } else {
            activeCatsToEvaluate.forEach(cat => {
                const budgetObj = getEffectiveBudget(cat.id, autoMonth, autoYear);
                const budgetVal = budgetObj ? parseFloat(budgetObj.presupuesto) : 0.0;
                const expenseVal = state.index.byYear[autoYear]?.byMonth?.[autoMonth]?.byCategoryExpenses?.[cat.id] || 0.0;
                
                // Calculate already transferred from this category to Ahorro (9) inside target month/year
                const sourceMovs = (state.isDemoMode || state.isLocalMode) ? state.movimientos : (state.configMonthMovs || []);
                const transferredVal = sourceMovs.reduce((sum, m) => {
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
                    showToast(`Transferencia de ${formatCurrency(surplusVal)} realizada en servidor.`, 'success');
                    if (!state.isDemoMode && !state.isLocalMode) {
                        if (!realtimeChannel) {
                            await syncData();
                        }
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
