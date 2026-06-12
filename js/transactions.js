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
        const monthFilter = DOM.filterMonth.value;
        const yearFilter = DOM.filterYear ? DOM.filterYear.value : 'Todos';

        let filtered = state.movimientos.filter(m => {
            try {
                const parts = m.fecha.split('-');
                const yMov = parseInt(parts[0]);
                const mMov = parseInt(parts[1]);

                if (query && (!m.concepto || !m.concepto.toLowerCase().includes(query))) return false;
                if (yearFilter !== 'Todos' && yMov !== parseInt(yearFilter)) return false;
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

        const yearFilter = DOM.filterYear ? DOM.filterYear.value : 'Todos';
        const monthFilter = DOM.filterMonth.value;
        if (yearFilter === 'Todos') {
            if (monthFilter !== 'Todos') {
                const month = String(monthFilter).padStart(2, '0');
                actionPath += `&fecha=like.*-${month}-*`;
            }
        } else {
            const year = parseInt(yearFilter);
            if (monthFilter === 'Todos') {
                actionPath += `&fecha=gte.${year}-01-01&fecha=lte.${year}-12-31`;
            } else {
                const month = String(monthFilter).padStart(2, '0');
                const lastDay = new Date(year, parseInt(monthFilter), 0).getDate();
                actionPath += `&fecha=gte.${year}-${month}-01&fecha=lte.${year}-${month}-${lastDay}`;
            }
        }

        const typeFilter = DOM.filterType.value;
        if (typeFilter !== 'Todos') {
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

        const pageMovs = await apiRequest(actionPath, 'GET');
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
    const m = state.filteredMovimientos.find(mov => mov.id == id) || state.movimientos.find(mov => mov.id == id);
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

    const modalTitle = document.getElementById('modal-transaction-title');
    if (modalTitle) modalTitle.textContent = 'Editar Transacción';
    
    if (DOM.modalTransaction) DOM.modalTransaction.classList.remove('hidden');
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

    if (DOM.modalTransaction) DOM.modalTransaction.classList.add('hidden');

    if (shouldRedirect) {
        window.location.hash = '#movimientos';
    }
}

async function deleteMovimiento(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la transacción #${id}?`)) return;
    
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
        }
    }
}

function openNewTransactionModal() {
    state.editingMovimientoId = null;
    DOM.editIndicator.classList.add('hidden');
    DOM.btnCancelEdit.classList.add('hidden');
    DOM.btnSubmitMovimiento.textContent = 'Registrar Transacción';
    
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
DOM.filterMonth.addEventListener('change', applyMovementsFilters);
if (DOM.filterYear) {
    DOM.filterYear.addEventListener('change', (e) => {
        state.chartFilters.movementsYear = e.target.value;
        applyMovementsFilters();
    });
}

DOM.btnClearFilters.addEventListener('click', () => {
    DOM.filterSearch.value = '';
    DOM.filterType.value = 'Todos';
    DOM.filterCategory.value = 'Todas';
    updateFilterSubcategoryOptions();
    DOM.filterSubcategory.value = 'Todas';
    DOM.filterMonth.value = 'Todos';
    if (DOM.filterYear) {
        DOM.filterYear.value = 'Todos';
        state.chartFilters.movementsYear = 'Todos';
    }
    applyMovementsFilters();
});

DOM.btnToggleFilters.addEventListener('click', () => {
    DOM.advancedFilters.classList.toggle('collapsed');
});
