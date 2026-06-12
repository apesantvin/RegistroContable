/* ==========================================================================
   Registro Contable - Supabase REST and Realtime API Client
   ========================================================================== */

let realtimeChannel = null;
let realtimeClient = null;
let realtimeReloadTimeout = null;

async function apiRequest(action, method = 'GET', data = null, isBackground = false) {
    if (state.isDemoMode) {
        return handleDemoWriteAction(action, data);
    }

    if (state.isLocalMode) {
        return handleLocalWriteAction(action, data);
    }

    if (!state.apiUrl || !state.supabaseKey) {
        if (!isBackground) showToast('Debes configurar la URL y la Anon Key de Supabase.', 'error');
        return null;
    }

    if (!isBackground) setLoading(true);
    try {
        let url = state.apiUrl;
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }
        
        let options = {
            mode: 'cors',
            headers: {
                'apikey': state.supabaseKey,
                'Authorization': `Bearer ${state.supabaseKey}`,
                'Content-Type': 'application/json'
            }
        };

        if (method === 'GET') {
            options.method = 'GET';
            if (action.startsWith('custom:')) {
                url += action.substring(7);
            } else if (action === 'todo') {
                options.method = 'POST';
                url += '/rest/v1/rpc/obtener_todo';
            } else {
                url += `/rest/v1/${action}?select=*`;
                if (action === 'movimientos') {
                    url += '&order=id.asc';
                }
            }
            // If the action specifies pagination, request exact row count from Supabase
            if (url.includes('limit=') || url.includes('offset=')) {
                options.headers['Prefer'] = 'count=exact';
            }
        } else {
            const actionName = action;
            
            if (actionName === 'movimiento') {
                options.method = 'POST';
                url += '/rest/v1/movimientos';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: data.tipo,
                    categoriaId: data.categoriaId ? Number(data.categoriaId) : null,
                    subcategoriaId: data.subcategoriaId ? Number(data.subcategoriaId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'transferencia') {
                options.method = 'POST';
                url += '/rest/v1/movimientos';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: 'TRANSFERENCIA',
                    categoriaOrigenId: data.categoriaOrigenId ? Number(data.categoriaOrigenId) : null,
                    categoriaDestinoId: data.categoriaDestinoId ? Number(data.categoriaDestinoId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'editar_movimiento') {
                options.method = 'PATCH';
                url += `/rest/v1/movimientos?id=eq.${data.id}`;
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: data.tipo,
                    categoriaId: data.categoriaId ? Number(data.categoriaId) : null,
                    subcategoriaId: data.subcategoriaId ? Number(data.subcategoriaId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'editar_transferencia') {
                options.method = 'PATCH';
                url += `/rest/v1/movimientos?id=eq.${data.id}`;
                options.body = JSON.stringify({
                    fecha: data.fecha,
                    fecha_referencia: data.fecha_referencia,
                    tipo: 'TRANSFERENCIA',
                    categoriaOrigenId: data.categoriaOrigenId ? Number(data.categoriaOrigenId) : null,
                    categoriaDestinoId: data.categoriaDestinoId ? Number(data.categoriaDestinoId) : null,
                    concepto: data.concepto,
                    importe: Number(data.importe)
                });
            } else if (actionName === 'eliminar_movimiento') {
                options.method = 'DELETE';
                url += `/rest/v1/movimientos?id=eq.${data.id}`;
            } else if (actionName === 'presupuesto') {
                options.method = 'POST';
                url += '/rest/v1/presupuestos';
                let version = data.version;
                if (version === undefined || isNaN(Number(version))) {
                    const versions = state.presupuestos.filter(pr => pr.categoriaId === Number(data.categoriaId) && pr.fecha_inicio === data.fecha_inicio && pr.fecha_fin === data.fecha_fin);
                    const maxVer = versions.length > 0 ? Math.max(...versions.map(v => v.version || 1)) : 0;
                    version = maxVer + 1;
                }
                options.body = JSON.stringify({
                    categoriaId: Number(data.categoriaId),
                    fecha_inicio: data.fecha_inicio,
                    fecha_fin: data.fecha_fin || null,
                    presupuesto: Number(data.presupuesto),
                    version: Number(version),
                    fecha_version: data.fecha_version || new Date().toISOString(),
                    activa: data.activa !== undefined ? (data.activa === true || data.activa === 'true') : true
                });
            } else if (actionName === 'editar_presupuesto_periodo') {
                options.method = 'PATCH';
                url += `/rest/v1/presupuestos?id=eq.${data.id}`;
                const bodyObj = {};
                if (data.fecha_inicio !== undefined) bodyObj.fecha_inicio = data.fecha_inicio;
                if (data.fecha_fin !== undefined) bodyObj.fecha_fin = data.fecha_fin;
                if (data.presupuesto !== undefined) bodyObj.presupuesto = Number(data.presupuesto);
                if (data.activa !== undefined) bodyObj.activa = (data.activa === true || data.activa === 'true');
                options.body = JSON.stringify(bodyObj);
            } else if (actionName === 'editar_categoria') {
                options.method = 'PATCH';
                url += `/rest/v1/categorias?id=eq.${data.id}`;
                const bodyObj = {};
                if (data.nombre !== undefined) bodyObj.nombre = data.nombre;
                if (data.icono !== undefined) bodyObj.icono = data.icono;
                if (data.activa !== undefined) bodyObj.activa = (data.activa === true || data.activa === 'true');
                options.body = JSON.stringify(bodyObj);
            } else if (actionName === 'editar_subcategoria') {
                options.method = 'PATCH';
                url += `/rest/v1/subcategorias?id=eq.${data.id}`;
                const bodyObj = {};
                if (data.categoriaId !== undefined) bodyObj.categoriaId = Number(data.categoriaId);
                if (data.nombre !== undefined) bodyObj.nombre = data.nombre;
                if (data.icono !== undefined) bodyObj.icono = data.icono;
                if (data.activa !== undefined) bodyObj.activa = (data.activa === true || data.activa === 'true');
                options.body = JSON.stringify(bodyObj);
            } else if (actionName === 'categoria') {
                options.method = 'POST';
                url += '/rest/v1/categorias';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    nombre: data.nombre,
                    icono: data.icono,
                    activa: true
                });
            } else if (actionName === 'subcategoria') {
                options.method = 'POST';
                url += '/rest/v1/subcategorias';
                options.headers['Prefer'] = 'return=representation';
                options.body = JSON.stringify({
                    categoriaId: Number(data.categoriaId),
                    nombre: data.nombre,
                    icono: data.icono,
                    activa: true
                });
            } else {
                throw new Error(`Acción POST no implementada para Supabase: ${actionName}`);
            }
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.message || `Error del servidor Supabase (${response.status})`);
        }

        if (response.status === 204) {
            return { success: true };
        }

        const json = await response.json();
        
        // Read Content-Range for total count when pagination/Prefer is used
        const contentRange = response.headers.get('Content-Range');
        if (contentRange && Array.isArray(json)) {
            const match = contentRange.match(/\/(\d+)$/);
            if (match) {
                json.totalCount = parseInt(match[1]);
            }
        }

        if (method === 'POST' && (action === 'movimiento' || action === 'transferencia' || action === 'categoria' || action === 'subcategoria')) {
            if (Array.isArray(json) && json.length > 0) {
                return { success: true, id: json[0].id };
            }
        }
        
        return json;
    } catch (error) {
        if (!isBackground) showToast('Error de conexión con Supabase: ' + error.message, 'error');
        return null;
    } finally {
        if (!isBackground) setLoading(false);
    }
}

async function syncMetadata(isBackground = false) {
    if (!state.apiUrl) return false;
    try {
        const categories = await apiRequest('categorias', 'GET', null, isBackground);
        const subcategories = await apiRequest('subcategorias', 'GET', null, isBackground);
        const budgets = await apiRequest('presupuestos', 'GET', null, isBackground);
        
        if (categories && subcategories && budgets) {
            state.categorias = categories;
            state.subcategorias = subcategories;
            state.presupuestos = budgets;
            return true;
        }
    } catch (err) {
    }
    return false;
}

async function syncScreenData(screenId, isBackground = false, forceRefresh = false) {
    if (state.isDemoMode || state.isLocalMode) return;
    const cleanId = screenId.replace('#', '') || 'dashboard';

    if (state.loadedScreens[cleanId] && !forceRefresh) {
        if (cleanId === 'dashboard') {
            populateSelectors();
            updateDashboardMetrics();
            recreateCharts();
        } else if (cleanId === 'movimientos') {
            renderMovementsPage();
        } else if (cleanId === 'configuracion') {
            populateSelectors();
            await renderConfigManagement();
        }
        return;
    }

    try {
        if (cleanId === 'dashboard') {
            const allTimeLightMovs = await apiRequest('custom:/rest/v1/movimientos?select=id,fecha,fecha_referencia,tipo,importe,categoriaId,subcategoriaId,categoriaOrigenId,categoriaDestinoId', 'GET', null, isBackground);
            
            if (allTimeLightMovs) {
                state.movimientos = allTimeLightMovs;
                state.allTimeMovsCache = allTimeLightMovs;
                rebuildIndex();
                
                populateSelectors();
                updateDashboardMetrics();
                recreateCharts();
                state.loadedScreens.dashboard = true;
            }
        } else if (cleanId === 'movimientos') {
            await applyMovementsFilters(false);
            state.loadedScreens.movimientos = true;
        } else if (cleanId === 'configuracion') {
            populateSelectors();
            
            if (DOM.containerSobrantesGestion && DOM.automationMonthSelect) {
                const autoMonth = parseInt(DOM.automationMonthSelect.value);
                const autoYear = DOM.automationYearSelect ? (parseInt(DOM.automationYearSelect.value) || state.selectedYear) : state.selectedYear;
                const monthStr = String(autoMonth).padStart(2, '0');
                const lastDay = new Date(autoYear, autoMonth, 0).getDate();
                
                const monthMovs = await apiRequest(`custom:/rest/v1/movimientos?select=*&fecha=gte.${autoYear}-${monthStr}-01&fecha=lte.${autoYear}-${monthStr}-${lastDay}`, 'GET', null, isBackground);
                if (monthMovs) {
                    state.configMonthMovs = monthMovs;
                    rebuildIndex();
                }
            }
            await renderConfigManagement();
            state.loadedScreens.configuracion = true;
        }
    } catch (err) {
    }
}

async function syncData(isBackground = false) {
    if (state.isDemoMode) return;
    
    if (state.isLocalMode) {
        populateSelectors();
        updateDashboardMetrics();
        recreateCharts();
        applyMovementsFilters();
        if (window.location.hash === '#configuracion') {
            renderConfigManagement();
        }
        saveLocalCache();
        return;
    }

    if (!state.apiUrl) return;
    
    if (!isBackground) {
        setLoading(true);
        DOM.apiStatus.className = 'api-status-badge disconnected';
        DOM.apiStatusText.textContent = 'Sincronizando...';
    }
    
    try {
        // Ensure realtime subscription is active
        initSupabaseRealtime();

        state.loadedScreens.dashboard = false;
        state.loadedScreens.movimientos = false;
        state.loadedScreens.configuracion = false;

        const metaSuccess = await syncMetadata(isBackground);
        if (metaSuccess) {
            const hash = window.location.hash || '#dashboard';
            await syncScreenData(hash, isBackground, true);
            
            DOM.apiStatus.className = 'api-status-badge connected';
            DOM.apiStatusText.textContent = 'Sincronizado';
        } else {
            if (!isBackground) {
                DOM.apiStatus.className = 'api-status-badge disconnected';
                DOM.apiStatusText.textContent = 'Error de Sinc.';
            }
        }
    } catch (err) {
        if (!isBackground) {
            DOM.apiStatus.className = 'api-status-badge disconnected';
            DOM.apiStatusText.textContent = 'Desconectado';
        }
    } finally {
        if (!isBackground) {
            setLoading(false);
        }
    }
}

function initSupabaseRealtime(force = false) {
    if (state.isDemoMode || state.isLocalMode || !state.apiUrl || !state.supabaseKey) {
        if (realtimeChannel) {
            realtimeChannel.unsubscribe();
            realtimeChannel = null;
        }
        realtimeClient = null;
        return;
    }

    if (!force && realtimeClient && realtimeClient.supabaseUrl === state.apiUrl) {
        return; 
    }

    if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
    }

    try {
        if (!window.supabase) {
            return;
        }
        const { createClient } = window.supabase;
        realtimeClient = createClient(state.apiUrl, state.supabaseKey);
        
        realtimeChannel = realtimeClient
            .channel('public-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                handleRealtimeChange(payload);
            })
            .subscribe();
    } catch (e) {
    }
}

function handleRealtimeChange(payload) {
    if (!payload || !payload.table) return;
    if (realtimeReloadTimeout) {
        clearTimeout(realtimeReloadTimeout);
    }
    realtimeReloadTimeout = setTimeout(async () => {
        DOM.apiStatusText.textContent = 'Actualizando...';
        DOM.apiStatus.className = 'api-status-badge connected';
        
        // Invalidate all screens, so they will be fetched fresh when next visited.
        state.loadedScreens.dashboard = false;
        state.loadedScreens.movimientos = false;
        state.loadedScreens.configuracion = false;
        
        await syncMetadata(true);
        const hash = window.location.hash || '#dashboard';
        await syncScreenData(hash, true, true); // Force active screen to reload
        
        DOM.apiStatusText.textContent = 'Sincronizado';
    }, 300);
}
