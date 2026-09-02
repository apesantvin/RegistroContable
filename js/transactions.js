/* ==========================================================================
   Registro Contable - Movements Listing, Filtering & Pagination
   ========================================================================== */

async function applyMovementsFilters(resetPage = true) {
    if (window.location.hash !== '#movimientos') return;

    if (resetPage) {
        state.currentPage = 1;
    }

    if (state.isDemoMode || state.isLocalMode) {
        const query = DOM.filterSearch.value.toLowerCase().trim();
        const typeFilter = DOM.filterType.value;
        const catFilter = DOM.filterCategory.value;
        const subFilter = DOM.filterSubcategory.value;
        const fechaDesde = DOM.filterFechaDesde.value;
        const fechaHasta = DOM.filterFechaHasta.value;
        const mesRefFilter = DOM.filterMesRef.value;

        let filtered = state.movimientos.filter(m => {
            try {
                if (query && (!m.concepto || !m.concepto.toLowerCase().includes(query))) return false;
                if (fechaDesde && m.fecha < fechaDesde) return false;
                if (fechaHasta && m.fecha > fechaHasta) return false;
                if (mesRefFilter) {
                    const refMonth = (m.fecha_referencia || m.fecha || '').substring(0, 7);
                    if (refMonth !== mesRefFilter) return false;
                }
                if (typeFilter === 'SIN_TRANSFERENCIAS') {
                    if (m.tipo === 'TRANSFERENCIA') return false;
                } else if (typeFilter !== 'Todos' && m.tipo !== typeFilter) return false;
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
                return true;
            } catch (e) { return false; }
        });

        filtered.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
        state.filteredMovimientos = filtered;
        renderMovementsPage();
        return;
    }

    // Supabase Mode: Server-side query
    if (!state.apiUrl) return;

    try {
        let actionPath = 'custom:/rest/v1/movimientos?select=*';
        actionPath += '&order=fecha.desc,id.desc';

        const limit = state.itemsPerPage;
        const offset = (state.currentPage - 1) * state.itemsPerPage;
        actionPath += `&limit=${limit}&offset=${offset}`;

        const fechaDesde = DOM.filterFechaDesde.value;
        const fechaHasta = DOM.filterFechaHasta.value;
        const mesRefFilter = DOM.filterMesRef.value;
        if (fechaDesde) actionPath += `&fecha=gte.${fechaDesde}`;
        if (fechaHasta) actionPath += `&fecha=lte.${fechaHasta}`;
        if (mesRefFilter) actionPath += `&fecha_referencia=eq.${mesRefFilter}-01`;

        const typeFilter = DOM.filterType.value;
        if (typeFilter === 'SIN_TRANSFERENCIAS') {
            actionPath += '&tipo=neq.TRANSFERENCIA';
        } else if (typeFilter !== 'Todos') {
            actionPath += `&tipo=eq.${typeFilter}`;
        }

        const catFilter = DOM.filterCategory.value;
        if (catFilter !== 'Todas') {
            const catId = parseInt(catFilter);
            actionPath += `&or=(categoriaId.eq.${catId},categoriaOrigenId.eq.${catId},categoriaDestinoId.eq.${catId})`;
        }

        const subFilter = DOM.filterSubcategory.value;
        if (subFilter !== 'Todas') {
            const subId = parseInt(subFilter);
            actionPath += `&subcategoriaId=eq.${subId}`;
        }

        const query = DOM.filterSearch.value.trim();
        if (query) {
            actionPath += `&concepto=ilike.*${encodeURIComponent(query)}*`;
        }

        const needsAllTimeCache = !state.allTimeMovsCache;
        const [pageMovs, allTimeLightMovs] = await Promise.all([
            apiRequest(actionPath, 'GET'),
            needsAllTimeCache
                ? apiRequest('custom:/rest/v1/movimientos?select=id,fecha,fecha_referencia,tipo,importe,categoriaId,subcategoriaId,categoriaOrigenId,categoriaDestinoId', 'GET', null, true)
                : Promise.resolve(null)
        ]);

        if (needsAllTimeCache && allTimeLightMovs) {
            state.allTimeMovsCache = allTimeLightMovs;
        }

        if (pageMovs) {
            state.filteredMovimientos = pageMovs;
            renderMovementsPage();
        }
    } catch (err) {
        console.error('Error fetching movements page:', err);
    }
}

function renderMovementsPage() {
    let pageMovs;
    let total;
    let totalPages;
    let start;
    let end;

    if (!state.isDemoMode && !state.isLocalMode && state.apiUrl) {
        pageMovs = state.filteredMovimientos;
        total = state.filteredMovimientos.totalCount || 0;
        totalPages = Math.ceil(total / state.itemsPerPage);
        start = (state.currentPage - 1) * state.itemsPerPage;
        end = Math.min(start + pageMovs.length, total);
    } else {
        total = state.filteredMovimientos.length;
        totalPages = Math.ceil(total / state.itemsPerPage);
        start = (state.currentPage - 1) * state.itemsPerPage;
        end = Math.min(start + state.itemsPerPage, total);
        pageMovs = state.filteredMovimientos.slice(start, end);
    }

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
            const pageNum = parseInt(btn.getAttribute('data-page'));
            if (!isNaN(pageNum)) {
                state.currentPage = pageNum;
                applyMovementsFilters(false);
            }
        });
    });
}

// Saldo (running total) after each movement, keyed by movement id.
// Mirrors the "Saldo Disponible" logic in rebuildIndex(): INGRESO suma, GASTO resta,
// TRANSFERENCIA no afecta al total (mueve dinero entre categorías, no entra ni sale).
function buildSaldoMap() {
    const source = (state.isDemoMode || state.isLocalMode)
        ? state.movimientos
        : (state.allTimeMovsCache || []);

    const sorted = source.slice().sort((a, b) => {
        const fa = normalizeDateString(a.fecha);
        const fb = normalizeDateString(b.fecha);
        return fa.localeCompare(fb) || a.id - b.id;
    });

    const map = {};
    let running = 0;
    sorted.forEach(m => {
        const val = parseFloat(m.importe) || 0;
        if (m.tipo === 'INGRESO') running += val;
        else if (m.tipo === 'GASTO') running -= val;
        map[m.id] = running;
    });
    return map;
}

function renderMovementsTable(movs) {
    if (movs.length === 0 && state.filteredMovimientos.length === 0) {
        DOM.listMovimientosBody.innerHTML = '';
        DOM.tableEmpty.classList.remove('hidden');
        return;
    }
    DOM.tableEmpty.classList.add('hidden');

    const saldoMap = buildSaldoMap();

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
            subcatText = sub ? `${sub.icono} ${sub.nombre}` : '';
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

        const saldoAfter = saldoMap[m.id];
        const hasSaldo = saldoAfter !== undefined;
        const saldoClass = hasSaldo ? (saldoAfter >= 0 ? 'cnt-success' : 'cnt-danger') : 'text-muted';
        const saldoText = hasSaldo ? formatCurrency(saldoAfter) : '—';

        return `
            <tr class="mov-row" data-id="${m.id}">
                <td data-label="Fecha">${formatDate(m.fecha)}</td>
                <td data-label="Ref.">${formatMonthYear(m.fecha_referencia)}</td>
                <td data-label="Tipo">${typeBadge}</td>
                <td data-label="Categoría">
                    <span class="desktop-cat">${categoryText}</span>
                    <span class="mobile-catsubcat">${catSubcatCombined}</span>
                </td>
                <td data-label="Subcategoría">${subcatText}</td>
                <td data-label="Concepto">${m.concepto}</td>
                <td data-label="Importe" class="${amountClass} text-right">${amountText}</td>
                <td data-label="Saldo" class="val-saldo ${saldoClass} text-right">${saldoText}</td>
                <td data-label="Acciones" class="text-center">
                    <div class="actions-cell">
                        <button class="btn-action-edit" data-id="${m.id}" title="Editar">✏️</button>
                        <button class="btn-action-duplicate" data-id="${m.id}" title="Duplicar">📋</button>
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

    DOM.listMovimientosBody.querySelectorAll('.btn-action-duplicate').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            startDuplicateMovimiento(id);
        });
    });

    DOM.listMovimientosBody.querySelectorAll('.btn-action-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            deleteMovimiento(id);
        });
    });

    // Mobile card view: tapping the row opens it for editing (icons are hidden there)
    DOM.listMovimientosBody.querySelectorAll('.mov-row').forEach(row => {
        row.addEventListener('click', () => {
            if (!window.matchMedia('(max-width: 600px)').matches) return;
            startEditMovimiento(row.getAttribute('data-id'));
        });
    });
}

function populateMovimientoForm(m) {
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
    if (m.tipo === 'GASTO' || m.tipo === 'INGRESO') {
        DOM.condGastoIngreso.forEach(el => el.classList.remove('hidden'));
        DOM.condGasto.forEach(el => el.classList.remove('hidden'));
        DOM.condTransferencia.forEach(el => el.classList.add('hidden'));

        DOM.inCategoria.value = m.categoriaId;
        updateSubcategoryOptions();
        DOM.inSubcategoria.value = m.subcategoriaId || '';
    } else if (m.tipo === 'TRANSFERENCIA') {
        DOM.condGastoIngreso.forEach(el => el.classList.add('hidden'));
        DOM.condGasto.forEach(el => el.classList.add('hidden'));
        DOM.condTransferencia.forEach(el => el.classList.remove('hidden'));

        DOM.inCatOrigen.value = m.categoriaOrigenId;
        DOM.inCatDestino.value = m.categoriaDestinoId;
    }
}

function startEditMovimiento(id) {
    const m = state.filteredMovimientos.find(mov => mov.id == id) || state.movimientos.find(mov => mov.id == id);
    if (!m) return;

    state.editingMovimientoId = id;

    // Show indicator and Cancel button
    DOM.editIndicator.classList.remove('hidden');
    DOM.editIdBadge.textContent = `#${id}`;
    DOM.btnCancelEdit.classList.remove('hidden');
    DOM.btnDeleteMovimiento.classList.remove('hidden');
    DOM.btnDuplicateMovimiento.classList.remove('hidden');
    DOM.btnSubmitMovimiento.textContent = 'Guardar Cambios';

    populateMovimientoForm(m);

    const modalTitle = document.getElementById('modal-transaction-title');
    if (modalTitle) modalTitle.textContent = 'Editar Transacción';

    if (DOM.modalTransaction) DOM.modalTransaction.classList.remove('hidden');
}

function startDuplicateMovimiento(id) {
    const m = state.filteredMovimientos.find(mov => mov.id == id) || state.movimientos.find(mov => mov.id == id);
    if (!m) return;

    const useToday = confirm(`¿Usar la fecha de hoy en la transacción duplicada?\n\nAceptar = fecha de hoy\nCancelar = mantener la fecha original (${formatDate(m.fecha)})`);

    // Duplicar = alta nueva, no edición del original
    state.editingMovimientoId = null;

    DOM.editIndicator.classList.add('hidden');
    DOM.btnCancelEdit.classList.add('hidden');
    DOM.btnDeleteMovimiento.classList.add('hidden');
    DOM.btnDuplicateMovimiento.classList.add('hidden');
    DOM.btnSubmitMovimiento.textContent = 'Registrar Transacción';

    populateMovimientoForm(m);

    if (useToday) {
        const todayStr = new Date().toISOString().split('T')[0];
        DOM.inFecha.value = todayStr;
        DOM.inFechaReferencia.value = todayStr.substring(0, 7);
    }

    const modalTitle = document.getElementById('modal-transaction-title');
    if (modalTitle) modalTitle.textContent = 'Duplicar Transacción';

    if (DOM.modalTransaction) DOM.modalTransaction.classList.remove('hidden');
}

function cancelEditMovimiento(shouldRedirect = true) {
    state.editingMovimientoId = null;
    
    // Reset indicators and buttons
    DOM.editIndicator.classList.add('hidden');
    DOM.btnCancelEdit.classList.add('hidden');
    DOM.btnDeleteMovimiento.classList.add('hidden');
    DOM.btnDuplicateMovimiento.classList.add('hidden');
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

    if (DOM.modalTransaction) DOM.modalTransaction.classList.add('hidden');

    if (shouldRedirect) {
        window.location.hash = '#movimientos';
    }
}

async function deleteMovimiento(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la transacción #${id}?`)) return false;

    const res = await apiRequest('eliminar_movimiento', 'POST', { id });
    if (res && res.success) {
        showToast('Borrado en servidor', 'success');
        if (!state.isDemoMode && !state.isLocalMode) {
            if (!realtimeChannel) {
                await syncData();
            }
        } else {
            updateDashboardMetrics();
            recreateCharts();
            applyMovementsFilters();
            refreshCuentasIfActive();
            refreshFacturasIfActive();
        }
        return true;
    }
    return false;
}

function openNewTransactionModal() {
    state.editingMovimientoId = null;
    DOM.editIndicator.classList.add('hidden');
    DOM.btnCancelEdit.classList.add('hidden');
    DOM.btnDeleteMovimiento.classList.add('hidden');
    DOM.btnDuplicateMovimiento.classList.add('hidden');
    DOM.btnSubmitMovimiento.textContent = 'Registrar Transacción';

    DOM.formMovimiento.reset();

    // Set date to today
    const todayStr = new Date().toISOString().split('T')[0];
    DOM.inFecha.value = todayStr;
    DOM.inFechaReferencia.value = todayStr.substring(0, 7);

    // Reset type to default GASTO
    DOM.inTipo.value = 'GASTO';
    DOM.formTabBtns.forEach(b => {
        if (b.getAttribute('data-type') === 'GASTO') b.classList.add('active');
        else b.classList.remove('active');
    });
    DOM.condGastoIngreso.forEach(el => el.classList.remove('hidden'));
    DOM.condGasto.forEach(el => el.classList.remove('hidden'));
    DOM.condTransferencia.forEach(el => el.classList.add('hidden'));

    // Reset category to the default (first option) and reload its subcategories
    DOM.inCategoria.selectedIndex = 0;
    updateSubcategoryOptions();
    DOM.inSubcategoria.value = '';

    const modalTitle = document.getElementById('modal-transaction-title');
    if (modalTitle) modalTitle.textContent = 'Añadir Transacción';

    if (DOM.modalTransaction) DOM.modalTransaction.classList.remove('hidden');
}

function closeTransactionModal() {
    if (DOM.modalTransaction) DOM.modalTransaction.classList.add('hidden');
    if (state.editingMovimientoId) {
        cancelEditMovimiento(false);
    }
}

// Event Listeners for Filters
DOM.filterSearch.addEventListener('input', applyMovementsFilters);
DOM.filterType.addEventListener('change', applyMovementsFilters);
DOM.filterCategory.addEventListener('change', applyMovementsFilters);
DOM.filterSubcategory.addEventListener('change', applyMovementsFilters);
DOM.filterFechaDesde.addEventListener('change', applyMovementsFilters);
DOM.filterFechaHasta.addEventListener('change', applyMovementsFilters);
DOM.filterMesRef.addEventListener('change', applyMovementsFilters);

DOM.btnClearFilters.addEventListener('click', () => {
    DOM.filterSearch.value = '';
    DOM.filterType.value = 'SIN_TRANSFERENCIAS';
    DOM.filterCategory.value = 'Todas';
    updateFilterSubcategoryOptions();
    DOM.filterSubcategory.value = 'Todas';
    DOM.filterFechaDesde.value = '';
    DOM.filterFechaHasta.value = '';
    DOM.filterMesRef.value = '';
    applyMovementsFilters();
});

DOM.btnToggleFilters.addEventListener('click', () => {
    DOM.advancedFilters.classList.toggle('collapsed');
});
