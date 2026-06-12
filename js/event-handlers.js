/* ==========================================================================
   Registro Contable - DOM Event Handlers & Selectors Populater
   ========================================================================== */

function initVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (!state.isDemoMode && !state.isLocalMode && state.apiUrl) {
                
                // Force recreating Supabase Realtime subscription to resolve any socket timeout
                initSupabaseRealtime(true);
                
                // Invalidate all screens to ensure they reload when active or visited
                state.loadedScreens.dashboard = false;
                state.loadedScreens.movimientos = false;
                state.loadedScreens.configuracion = false;
                
                // Sync current screen and metadata in the background
                syncData(true);
            }
        }
    });
}

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
        recreateCharts();
    });
}

// Year dropdown setup
function initYearSelector() {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];
    
    DOM.yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    DOM.yearSelect.value = state.selectedYear;
    
    // Set default selected month for budget form to current date
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    DOM.inPresupuestoInicio.value = currentMonthStr;
    DOM.inPresupuestoFin.value = '';
    
    // Set default month select value for budget chart to current month
    if (DOM.chartPresupuestoMonthSelect) {
        DOM.chartPresupuestoMonthSelect.value = (today.getMonth() + 1).toString();
    }

    DOM.yearSelect.addEventListener('change', (e) => {
        state.selectedYear = parseInt(e.target.value);
        if (!state.isDemoMode && !state.isLocalMode && state.apiUrl) {
            state.loadedScreens.dashboard = false;
            state.loadedScreens.movimientos = false;
            state.loadedScreens.configuracion = false;
            syncScreenData(window.location.hash || '#dashboard', false, true);
        } else {
            updateDashboardMetrics();
            recreateCharts();
            applyMovementsFilters();
        }
    });
}

function initConfigTabs() {
    const tabButtons = document.querySelectorAll('.config-nav-btn');
    const tabPanels = document.querySelectorAll('.config-section-panel');
    
    // Set default month for automations
    if (DOM.automationMonthSelect) {
        DOM.automationMonthSelect.value = (new Date().getMonth() + 1).toString();
        DOM.automationMonthSelect.addEventListener('change', () => {
            if (!state.isDemoMode && !state.isLocalMode && state.apiUrl) {
                syncScreenData('#configuracion', false, true);
            } else {
                renderConfigManagement();
            }
        });
    }

    if (DOM.automationYearSelect) {
        DOM.automationYearSelect.addEventListener('change', (e) => {
            state.chartFilters.automationYear = e.target.value;
            if (!state.isDemoMode && !state.isLocalMode && state.apiUrl) {
                syncScreenData('#configuracion', false, true);
            } else {
                renderConfigManagement();
            }
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Toggle active classes on nav buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Toggle active panels
            tabPanels.forEach(p => {
                if (p.id === targetTab) {
                    p.classList.add('active');
                } else {
                    p.classList.remove('active');
                }
            });
        });
    });
}

function initChartFiltersListeners() {
    // 1. Ingresos vs Gastos range
    const rangeIG = document.getElementById('chart-ingresos-gastos-range-select');
    if (rangeIG) {
        rangeIG.addEventListener('change', (e) => {
            state.chartFilters.ingresosGastos = e.target.value;
            const theme = getChartTheme();
            const yearVal = parseInt(state.chartFilters.ingresosGastosYear) || state.selectedYear;
            const rangeMonths = getLocalRangeMonths(e.target.value, '', '', yearVal);
            buildChartIngresosGastos(rangeMonths, theme);
            const wrapper = document.getElementById('chart-ingresos-gastos-year-wrapper');
            if (wrapper) {
                wrapper.style.display = e.target.value === 'year' ? 'flex' : 'none';
            }
        });
    }
    const yearIG = document.getElementById('chart-ingresos-gastos-year-select');
    if (yearIG) {
        yearIG.addEventListener('change', (e) => {
            state.chartFilters.ingresosGastosYear = e.target.value;
            const theme = getChartTheme();
            const rangeVal = state.chartFilters.ingresosGastos || 'year';
            const rangeMonths = getLocalRangeMonths(rangeVal, '', '', parseInt(e.target.value));
            buildChartIngresosGastos(rangeMonths, theme);
        });
    }

    // 3. Distribución por Categorías año y mes
    const yearCat = document.getElementById('chart-categorias-year-select');
    if (yearCat) {
        yearCat.addEventListener('change', (e) => {
            state.chartFilters.categoriasYear = e.target.value;
            const theme = getChartTheme();
            buildChartCategorias(parseInt(e.target.value), theme);
        });
    }
    const monthCat = document.getElementById('chart-categorias-month-select');
    if (monthCat) {
        monthCat.addEventListener('change', (e) => {
            state.chartFilters.categorias = e.target.value;
            const theme = getChartTheme();
            buildChartCategorias(parseInt(state.chartFilters.categoriasYear) || state.selectedYear, theme);
        });
    }

    // 4. Distribución por Subcategorías filters
    const subCatSelect = document.getElementById('chart-subcategorias-cat-select');
    const subYearSelect = document.getElementById('chart-subcategorias-year-select');
    const subMonthSelect = document.getElementById('chart-subcategorias-month-select');
    if (subCatSelect && subMonthSelect) {
        subCatSelect.addEventListener('change', (e) => {
            state.chartFilters.subcategorias.category = e.target.value;
            const theme = getChartTheme();
            buildChartSubcategorias(parseInt(state.chartFilters.subcategorias.year) || state.selectedYear, theme);
        });
        if (subYearSelect) {
            subYearSelect.addEventListener('change', (e) => {
                state.chartFilters.subcategorias.year = e.target.value;
                const theme = getChartTheme();
                buildChartSubcategorias(parseInt(e.target.value), theme);
            });
        }
        subMonthSelect.addEventListener('change', (e) => {
            state.chartFilters.subcategorias.month = e.target.value;
            const theme = getChartTheme();
            buildChartSubcategorias(parseInt(state.chartFilters.subcategorias.year) || state.selectedYear, theme);
        });
    }

    // 5. Presupuesto vs Real filters
    const yearPresupuesto = document.getElementById('chart-presupuesto-year-select');
    if (yearPresupuesto) {
        yearPresupuesto.addEventListener('change', (e) => {
            state.chartFilters.presupuestoVsRealYear = e.target.value;
            const theme = getChartTheme();
            buildChartPresupuestoVsReal(parseInt(e.target.value), theme);
        });
    }
    const monthPresupuesto = document.getElementById('chart-presupuesto-month-select');
    if (monthPresupuesto) {
        monthPresupuesto.addEventListener('change', (e) => {
            state.chartFilters.presupuestoVsReal = e.target.value;
            const theme = getChartTheme();
            buildChartPresupuestoVsReal(parseInt(state.chartFilters.presupuestoVsRealYear) || state.selectedYear, theme);
        });
    }

    // 6. Top Categorías range select
    const rangeTop = document.getElementById('chart-top-range-select');
    const customTop = document.getElementById('chart-top-custom-range');
    const startTop = document.getElementById('chart-top-start');
    const endTop = document.getElementById('chart-top-end');
    
    if (rangeTop) {
        rangeTop.addEventListener('change', (e) => {
            const val = e.target.value;
            state.chartFilters.topCategorias = val;
            
            if (val === 'custom') {
                if (customTop) customTop.style.display = 'flex';
                if (startTop && endTop) {
                    if (!state.chartFilters.topCategoriasCustom.start) {
                        state.chartFilters.topCategoriasCustom.start = `${state.selectedYear}-01-01`;
                    }
                    if (!state.chartFilters.topCategoriasCustom.end) {
                        const currentYear = new Date().getFullYear();
                        if (state.selectedYear === currentYear) {
                            const todayStr = new Date().toISOString().split('T')[0];
                            state.chartFilters.topCategoriasCustom.end = todayStr;
                        } else {
                            state.chartFilters.topCategoriasCustom.end = `${state.selectedYear}-12-31`;
                        }
                    }
                    startTop.value = state.chartFilters.topCategoriasCustom.start;
                    endTop.value = state.chartFilters.topCategoriasCustom.end;
                }
            } else {
                if (customTop) customTop.style.display = 'none';
            }
            const theme = getChartTheme();
            buildChartTopCategorias(theme);
        });
        
        if (startTop && endTop) {
            const handleTopDateChange = () => {
                state.chartFilters.topCategoriasCustom.start = startTop.value;
                state.chartFilters.topCategoriasCustom.end = endTop.value;
                const theme = getChartTheme();
                buildChartTopCategorias(theme);
            };
            startTop.addEventListener('change', handleTopDateChange);
            endTop.addEventListener('change', handleTopDateChange);
        }
    }

    // 7. Ahorro year select
    const yearAhorro = document.getElementById('chart-ahorro-year-select');
    if (yearAhorro) {
        yearAhorro.addEventListener('change', (e) => {
            state.chartFilters.ahorro = e.target.value;
            const theme = getChartTheme();
            buildChartAhorro(parseInt(e.target.value), theme);
        });
    }

    // 8. Comparativa year select
    const yearComparativa = document.getElementById('chart-comparativa-year-select');
    if (yearComparativa) {
        yearComparativa.addEventListener('change', (e) => {
            state.chartFilters.comparativa = e.target.value;
            const theme = getChartTheme();
            buildChartComparativa(theme);
        });
    }

    // 9. Historial year select
    const yearHistory = document.getElementById('chart-gasto-mensual-year-select');
    if (yearHistory) {
        yearHistory.addEventListener('change', (e) => {
            state.chartFilters.gastoMensual = e.target.value;
            const theme = getChartTheme();
            buildChartGastoMensual(parseInt(e.target.value), theme);
        });
    }
}

function initPaginationControls() {
    DOM.btnPagePrev.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            applyMovementsFilters(false);
        }
    });
    DOM.btnPageNext.addEventListener('click', () => {
        const total = (!state.isDemoMode && !state.isLocalMode && state.apiUrl)
            ? (state.filteredMovimientos.totalCount || 0)
            : state.filteredMovimientos.length;
        const totalPages = Math.ceil(total / state.itemsPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            applyMovementsFilters(false);
        }
    });
}

function initMobileSidebar() {
    DOM.btnMenuToggle.addEventListener('click', () => DOM.sidebar.classList.add('mobile-open'));
    DOM.btnCloseSidebar.addEventListener('click', () => DOM.sidebar.classList.remove('mobile-open'));
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (DOM.sidebar.classList.contains('mobile-open') &&
            !DOM.sidebar.contains(e.target) &&
            !DOM.btnMenuToggle.contains(e.target)) {
            DOM.sidebar.classList.remove('mobile-open');
        }
    });
}

function initLandingActions() {
    const triggerDemo = () => {
        state.isDemoMode = true;
        state.isLocalMode = false;
        localStorage.setItem('contable_is_local_mode', 'false');
        loadDemoData();
        showAppInterface();
        updateLocalModeUI();
        DOM.demoModeBadge.classList.remove('hidden');
        DOM.apiStatus.className = 'api-status-badge connected';
        DOM.apiStatusText.textContent = 'Modo Demo';
        showToast('Iniciado en Modo Demostración. Explora las pestañas.', 'info');
    };

    DOM.btnLandingDemo.addEventListener('click', triggerDemo);
    DOM.btnHeroDemo.addEventListener('click', triggerDemo);

    const triggerConnect = () => {
        state.isDemoMode = false;
        DOM.demoModeBadge.classList.add('hidden');
        
        if (state.apiUrl) {
            DOM.inApiUrl.value = state.apiUrl;
            state.isLocalMode = false;
            localStorage.setItem('contable_is_local_mode', 'false');
            showAppInterface();
            updateLocalModeUI();
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

    const triggerSelectLocalFile = () => {
        DOM.inputLocalFile.click();
    };
    
    DOM.btnLandingLocal.addEventListener('click', triggerSelectLocalFile);
    DOM.btnHeroLocal.addEventListener('click', triggerSelectLocalFile);
    DOM.btnModalLoadLocal.addEventListener('click', triggerSelectLocalFile);
    DOM.btnConfigLoadLocal.addEventListener('click', triggerSelectLocalFile);
    
    DOM.inputLocalFile.addEventListener('change', (e) => {
        handleLocalFileSelected(e.target.files[0]);
    });
    
    DOM.btnModalNewLocal.addEventListener('click', createNewLocalDB);
    
    DOM.btnDownloadLocal.addEventListener('click', downloadLocalDB);
    DOM.btnConfigDownloadLocal.addEventListener('click', downloadLocalDB);
    
    DOM.btnManualSync.addEventListener('click', () => {
        showToast('Sincronizando datos...', 'info');
        syncData();
    });

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

    DOM.btnCancelEdit.addEventListener('click', () => cancelEditMovimiento(true));

    if (DOM.btnAddMovimientoTrigger) {
        DOM.btnAddMovimientoTrigger.addEventListener('click', () => {
            openNewTransactionModal();
        });
    }

    if (DOM.btnCloseTransactionModal) {
        DOM.btnCloseTransactionModal.addEventListener('click', () => {
            closeTransactionModal();
        });
    }

    DOM.inFecha.addEventListener('change', () => {
        if (DOM.inFecha.value) {
            DOM.inFechaReferencia.value = DOM.inFecha.value.substring(0, 7);
        }
    });

    DOM.formMovimiento.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tipo = DOM.inTipo.value;
        const importe = parseFloat(DOM.inImporte.value);
        const concepto = DOM.inConcepto.value.trim();
        const fecha = DOM.inFecha.value;
        const refMonthVal = DOM.inFechaReferencia.value;
        const fecha_referencia = refMonthVal ? `${refMonthVal}-01` : `${fecha.substring(0, 7)}-01`;

        if (isNaN(importe) || importe <= 0) {
            showToast('Por favor introduce un importe válido', 'error');
            return;
        }

        let payload = { tipo, importe, concepto, fecha, fecha_referencia };
        let action = 'movimiento';

        if (state.editingMovimientoId) {
            payload.id = state.editingMovimientoId;
            action = 'editar_movimiento';
        }

        if (tipo === 'GASTO') {
            payload.categoriaId = parseInt(DOM.inCategoria.value);
            payload.subcategoriaId = DOM.inSubcategoria.value ? parseInt(DOM.inSubcategoria.value) : '';
        } else if (tipo === 'INGRESO') {
            payload.categoriaId = parseInt(DOM.inCategoria.value);
        } else if (tipo === 'TRANSFERENCIA') {
            if (state.editingMovimientoId) {
                action = 'editar_transferencia';
            } else {
                action = 'transferencia';
            }
            payload.categoriaOrigenId = parseInt(DOM.inCatOrigen.value);
            payload.categoriaDestinoId = parseInt(DOM.inCatDestino.value);
            if (payload.categoriaOrigenId === payload.categoriaDestinoId) {
                showToast('La categoría origen y destino no pueden ser iguales', 'error');
                return;
            }
        }

        const res = await apiRequest(action, 'POST', payload);
        if (res && res.success) {
            showToast(state.editingMovimientoId ? 'Editado en servidor' : 'Guardado en servidor', 'success');
            
            const wasEditing = !!state.editingMovimientoId;
            cancelEditMovimiento(wasEditing);
            
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
    });

    DOM.formApiUrl.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = DOM.inApiUrl.value.trim();
        const key = DOM.inSupabaseKey.value.trim();
        
        if (url && key) {
            localStorage.setItem('contable_supabase_api_url', url);
            localStorage.setItem('contable_supabase_key', key);
            state.supabaseApiUrl = url;
            state.supabaseKey = key;
            state.isDemoMode = false;
            state.isLocalMode = false;
            localStorage.setItem('contable_is_local_mode', 'false');
            
            DOM.demoModeBadge.classList.add('hidden');
            updateLocalModeUI();
            updateApiUIFromState();
            
            showToast('Configuración de la API guardada. Conectando...', 'success');
            syncData();
        }
    });

    DOM.btnTestApi.addEventListener('click', async () => {
        const url = DOM.inApiUrl.value.trim();
        const key = DOM.inSupabaseKey.value.trim();
        
        if (!url) {
            showToast('Introduce una URL antes de probar', 'error');
            return;
        }
        if (!key) {
            showToast('Introduce la Anon Key antes de probar', 'error');
            return;
        }

        const oldSupabaseUrl = state.supabaseApiUrl;
        const oldKey = state.supabaseKey;
        
        state.supabaseApiUrl = url;
        state.supabaseKey = key;
        
        const test = await apiRequest('categorias', 'GET');
        if (test) {
            showToast('Conexión probada con éxito!', 'success');
        } else {
            showToast('Error al probar conexión. Verifica tus credenciales', 'error');
            state.supabaseApiUrl = oldSupabaseUrl;
            state.supabaseKey = oldKey;
        }
    });

    DOM.formModalApi.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = DOM.inModalApiUrl.value.trim();
        const key = DOM.inModalSupabaseKey.value.trim();
        
        if (url && key) {
            localStorage.setItem('contable_supabase_api_url', url);
            localStorage.setItem('contable_supabase_key', key);
            state.supabaseApiUrl = url;
            state.supabaseKey = key;
            state.isDemoMode = false;
            state.isLocalMode = false;
            localStorage.setItem('contable_is_local_mode', 'false');
            
            updateApiUIFromState();
            
            DOM.modalApiSetup.classList.add('hidden');
            showAppInterface();
            updateLocalModeUI();
            showToast('Conectado con éxito', 'success');
            syncData();
        }
    });

    DOM.formPresupuesto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const startVal = DOM.inPresupuestoInicio.value;
        const endVal = DOM.inPresupuestoFin.value;

        if (!startVal) {
            showToast('El mes de inicio es obligatorio', 'error');
            return;
        }

        const fecha_inicio = `${startVal}-01`;
        let fecha_fin = null;
        if (endVal) {
            const parts = endVal.split('-');
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const lastDay = new Date(y, m, 0).getDate();
            fecha_fin = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }

        const payload = {
            categoriaId: parseInt(DOM.inPresupuestoCat.value),
            fecha_inicio,
            fecha_fin,
            presupuesto: parseFloat(DOM.inPresupuestoImporte.value)
        };

        if (isNaN(payload.presupuesto) || payload.presupuesto < 0) {
            showToast('Presupuesto no válido', 'error');
            return;
        }

        const res = await apiRequest('presupuesto', 'POST', payload);
        if (res && res.success) {
            showToast('Guardado en servidor', 'success');
            DOM.inPresupuestoImporte.value = '';
            if (!state.isDemoMode && !state.isLocalMode) {
                if (!realtimeChannel) {
                    await syncData();
                }
            } else {
                await syncData();
            }
        }
    });

    DOM.formCrearCategoria.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nombre: DOM.inNewCatNombre.value.trim(),
            icono: DOM.inNewCatIcono.value.trim()
        };
        const res = await apiRequest('categoria', 'POST', payload);
        if (res && res.success) {
            showToast('Creado en servidor', 'success');
            DOM.inNewCatNombre.value = '';
            DOM.inNewCatIcono.value = '';
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

    DOM.formCrearSubcategoria.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            categoriaId: parseInt(DOM.inNewSubParent.value),
            nombre: DOM.inNewSubNombre.value.trim(),
            icono: DOM.inNewSubIcono.value.trim()
        };
        const res = await apiRequest('subcategoria', 'POST', payload);
        if (res && res.success) {
            showToast('Creado en servidor', 'success');
            DOM.inNewSubNombre.value = '';
            DOM.inNewSubIcono.value = '';
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

    if (DOM.btnTransferirTodosSobrantes) {
        DOM.btnTransferirTodosSobrantes.addEventListener('click', async () => {
            const month = parseInt(DOM.automationMonthSelect.value);
            const year = DOM.automationYearSelect ? (parseInt(DOM.automationYearSelect.value) || state.selectedYear) : state.selectedYear;
            
            const activeCats = state.categorias.filter(c => c.activa && c.id !== 9);
            if (activeCats.length === 0) {
                showToast('No hay categorías activas', 'error');
                return;
            }

            // Calculate which categories have positive surplus
            const categoriesToTransfer = [];
            let totalSurplus = 0;

            activeCats.forEach(cat => {
                const budgetObj = getEffectiveBudget(cat.id, month, year);
                const budgetVal = budgetObj ? parseFloat(budgetObj.presupuesto) : 0.0;
                const expenseVal = state.index.byYear[year]?.byMonth?.[month]?.byCategoryExpenses?.[cat.id] || 0.0;
                
                // Calculate already transferred
                const sourceMovs = (state.isDemoMode || state.isLocalMode) ? state.movimientos : (state.configMonthMovs || []);
                const transferredVal = sourceMovs.reduce((sum, m) => {
                    if (m.tipo === 'TRANSFERENCIA' && parseInt(m.categoriaOrigenId) === cat.id && parseInt(m.categoriaDestinoId) === 9) {
                        const refDate = m.fecha_referencia || m.fecha;
                        const parts = refDate.split('-');
                        const yMov = parseInt(parts[0]);
                        const mMov = parseInt(parts[1]);
                        if (yMov === year && mMov === month) {
                            return sum + (parseFloat(m.importe) || 0);
                        }
                    }
                    return sum;
                }, 0);

                const surplus = budgetVal - expenseVal - transferredVal;
                if (surplus > 0.01) { // avoid floating point issues near 0
                    categoriesToTransfer.push({ cat, surplus });
                    totalSurplus += surplus;
                }
            });

            if (categoriesToTransfer.length === 0) {
                showToast('No se encontraron saldos sobrantes positivos para transferir en este período.', 'warning');
                return;
            }

            if (!confirm(`¿Estás seguro de que deseas transferir los saldos sobrantes de ${categoriesToTransfer.length} categorías (Total: ${formatCurrency(totalSurplus)}) del mes de ${MESES_ABR[month-1]} ${year} al Ahorro?`)) return;

            setLoading(true);
            let transfersCreated = 0;

            for (const item of categoriesToTransfer) {
                const res = await apiRequest('transferencia', 'POST', {
                    categoriaOrigenId: item.cat.id,
                    categoriaDestinoId: 9,
                    importe: item.surplus,
                    concepto: `Transferencia sobrante ${item.cat.nombre} (${MESES_ABR[month-1]} ${year})`,
                    fecha: new Date().toISOString().split('T')[0],
                    fecha_referencia: `${year}-${String(month).padStart(2, '0')}-01`
                });
                if (res && res.success) transfersCreated++;
            }

            setLoading(false);
            if (transfersCreated > 0) {
                showToast(`Automatización finalizada: ${transfersCreated} transferencias creadas en servidor.`, 'success');
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
                showToast('No se pudieron crear las transferencias.', 'error');
            }
        });
    }
}

function populateSelectors() {
    // Guardar todos los filtros y valores de formulario previos
    const prevFilterSearch = DOM.filterSearch.value;
    const prevFilterType = DOM.filterType.value;
    const prevFilterCategory = DOM.filterCategory.value;
    const prevFilterSubcategory = DOM.filterSubcategory.value;
    const prevFilterMonth = DOM.filterMonth.value;

    const prevInCategoria = DOM.inCategoria.value;
    const prevInSubcategoria = DOM.inSubcategoria.value;
    const prevInCatOrigen = DOM.inCatOrigen.value;
    const prevInCatDestino = DOM.inCatDestino.value;
    const prevInNewSubParent = DOM.inNewSubParent.value;
    const prevInPresupuestoCat = DOM.inPresupuestoCat.value;

    const activeCats = state.categorias.filter(c => c.activa);
    
    const catOptions = activeCats.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    DOM.inCategoria.innerHTML = catOptions;
    DOM.inCatOrigen.innerHTML = catOptions;
    DOM.inCatDestino.innerHTML = catOptions;
    
    if (activeCats.length > 1) {
        DOM.inCatDestino.selectedIndex = 1;
    }

    const filteredParents = activeCats.filter(c => c.id !== 9);
    DOM.inNewSubParent.innerHTML = filteredParents.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');

    DOM.inPresupuestoCat.innerHTML = catOptions;

    const filterCatOptions = '<option value="Todas">Todas</option>' + activeCats.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    DOM.filterCategory.innerHTML = filterCatOptions;
    
    // Restaurar todos los filtros estáticos y valores del formulario
    DOM.filterSearch.value = prevFilterSearch;
    DOM.filterType.value = prevFilterType;
    DOM.filterMonth.value = prevFilterMonth;
    
    if (prevInCategoria) DOM.inCategoria.value = prevInCategoria;
    if (prevInCatOrigen) DOM.inCatOrigen.value = prevInCatOrigen;
    if (prevInCatDestino) DOM.inCatDestino.value = prevInCatDestino;
    if (prevInNewSubParent) DOM.inNewSubParent.value = prevInNewSubParent;
    if (prevInPresupuestoCat) DOM.inPresupuestoCat.value = prevInPresupuestoCat;
    
    if (prevFilterCategory) DOM.filterCategory.value = prevFilterCategory;

    // Poblar y restablecer las opciones y selecciones de subcategorías
    updateSubcategoryOptions();
    if (prevInSubcategoria) {
        DOM.inSubcategoria.value = prevInSubcategoria;
    }
    
    updateFilterSubcategoryOptions();
    if (prevFilterSubcategory) {
        DOM.filterSubcategory.value = prevFilterSubcategory;
    }
    populateChartFiltersDropdowns();
}

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

function populateChartFiltersDropdowns() {
    // 1. Populate category select in subcategories chart
    const catSelect = document.getElementById('chart-subcategorias-cat-select');
    if (catSelect) {
        const prevVal = catSelect.value;
        const activeCats = state.categorias.filter(c => c.activa);
        let optionsHtml = '<option value="Todas">Categoría: Todas</option>';
        activeCats.forEach(c => {
            optionsHtml += `<option value="${c.id}">${c.icono} ${c.nombre}</option>`;
        });
        catSelect.innerHTML = optionsHtml;
        if (activeCats.some(c => c.id.toString() === prevVal) || prevVal === 'Todas') {
            catSelect.value = prevVal;
        } else {
            catSelect.value = 'Todas';
        }
    }

    // 2. Populate local year select dropdowns
    const yearSelects = document.querySelectorAll('.chart-year-dropdown');
    if (yearSelects.length > 0) {
        const yearsSet = new Set();
        state.movimientos.forEach(m => {
            const dateStr = m.fecha_referencia || m.fecha;
            if (dateStr) {
                const parts = dateStr.split('-');
                const y = parseInt(parts[0]);
                if (!isNaN(y)) yearsSet.add(y);
            }
        });
        
        const currentYear = new Date().getFullYear();
        if (yearsSet.size === 0) {
            yearsSet.add(currentYear);
        }
        
        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        
        yearSelects.forEach(select => {
            const prevVal = select.value;
            let optionsHtml = sortedYears.map(y => `<option value="${y}">${y}</option>`).join('');
            if (select.id === 'filter-year') {
                optionsHtml = '<option value="Todos">Todos</option>' + optionsHtml;
            }
            select.innerHTML = optionsHtml;
            
            if (select.id === 'chart-ahorro-year-select') {
                select.value = state.chartFilters.ahorro || currentYear.toString();
            } else if (select.id === 'chart-comparativa-year-select') {
                select.value = state.chartFilters.comparativa || currentYear.toString();
            } else if (select.id === 'chart-gasto-mensual-year-select') {
                select.value = state.chartFilters.gastoMensual || currentYear.toString();
            } else if (select.id === 'chart-ingresos-gastos-year-select') {
                select.value = state.chartFilters.ingresosGastosYear || currentYear.toString();
            } else if (select.id === 'chart-categorias-year-select') {
                select.value = state.chartFilters.categoriasYear || currentYear.toString();
            } else if (select.id === 'chart-subcategorias-year-select') {
                select.value = state.chartFilters.subcategorias.year || currentYear.toString();
            } else if (select.id === 'chart-presupuesto-year-select') {
                select.value = state.chartFilters.presupuestoVsRealYear || currentYear.toString();
            } else if (select.id === 'filter-year') {
                select.value = state.chartFilters.movementsYear || 'Todos';
            } else if (select.id === 'automation-year-select') {
                select.value = state.chartFilters.automationYear || currentYear.toString();
            } else if (sortedYears.includes(parseInt(prevVal))) {
                select.value = prevVal;
            } else {
                select.value = currentYear.toString();
            }
        });
    }

    // 3. Restore range selects and toggle local year select wrappers
    const rangeIG = document.getElementById('chart-ingresos-gastos-range-select');
    if (rangeIG) {
        rangeIG.value = state.chartFilters.ingresosGastos || 'year';
        const wrapperIG = document.getElementById('chart-ingresos-gastos-year-wrapper');
        if (wrapperIG) {
            wrapperIG.style.display = rangeIG.value === 'year' ? 'flex' : 'none';
        }
    }


    const rangeTop = document.getElementById('chart-top-range-select');
    if (rangeTop) {
        rangeTop.value = state.chartFilters.topCategorias || 'year';
        const customTop = document.getElementById('chart-top-custom-range');
        if (customTop) {
            customTop.style.display = rangeTop.value === 'custom' ? 'flex' : 'none';
            const startInput = document.getElementById('chart-top-start');
            const endInput = document.getElementById('chart-top-end');
            if (startInput && endInput) {
                startInput.value = state.chartFilters.topCategoriasCustom?.start || '';
                endInput.value = state.chartFilters.topCategoriasCustom?.end || '';
            }
        }
    }
}

DOM.inCategoria.addEventListener('change', updateSubcategoryOptions);
DOM.filterCategory.addEventListener('change', updateFilterSubcategoryOptions);
