/* ==========================================================================
   Registro Contable - Storage and Local/Demo Mode Helpers
   ========================================================================== */

function validateLocalJSON(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.categorias)) return false;
    if (!Array.isArray(data.subcategorias)) data.subcategorias = [];
    if (!Array.isArray(data.presupuestos)) data.presupuestos = [];
    if (!Array.isArray(data.movimientos)) data.movimientos = [];
    return true;
}

function handleLocalFileSelected(file) {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
        showToast('Por favor, selecciona un archivo .json valido', 'error');
        return;
    }
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
        setLoading(false);
        try {
            const data = JSON.parse(e.target.result);
            if (validateLocalJSON(data)) {
                state.isLocalMode = true;
                state.isDemoMode = false;
                localStorage.setItem('contable_is_local_mode', 'true');
                state.categorias = data.categorias;
                state.subcategorias = data.subcategorias || [];
                state.presupuestos = data.presupuestos || [];
                state.movimientos = data.movimientos || [];
                saveLocalCache();
                DOM.modalApiSetup.classList.add('hidden');
                showAppInterface();
                updateLocalModeUI();
                populateSelectors();
                updateDashboardMetrics();
                recreateCharts();
                applyMovementsFilters();
                showToast(`Base de datos '${file.name}' cargada correctamente`, 'success');
            } else {
                showToast('El archivo JSON no tiene una estructura compatible', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error al parsear el archivo JSON', 'error');
        }
    };
    reader.onerror = () => { setLoading(false); showToast('Error al leer el archivo', 'error'); };
    reader.readAsText(file);
}

function createNewLocalDB() {
    if (state.movimientos.length > 0 || state.categorias.length > 0) {
        if (!confirm('Esto sobrescribira los datos actuales en memoria. Continuar?')) return;
    }
    state.isLocalMode = true;
    state.isDemoMode = false;
    localStorage.setItem('contable_is_local_mode', 'true');
    loadDefaultLocalStructure();
    saveLocalCache();
    DOM.modalApiSetup.classList.add('hidden');
    showAppInterface();
    updateLocalModeUI();
    populateSelectors();
    updateDashboardMetrics();
    recreateCharts();
    applyMovementsFilters();
    showToast('Nueva base de datos local creada con categorias por defecto', 'success');
}

function loadDefaultLocalStructure() {
    state.categorias = [
        { id: 1, nombre: "Agua", icono: "💧", activa: true },
        { id: 2, nombre: "Basuras", icono: "🗑️", activa: true },
        { id: 3, nombre: "Internet", icono: "🛜", activa: true },
        { id: 4, nombre: "Gas", icono: "💨", activa: true },
        { id: 5, nombre: "Luz", icono: "💡", activa: true },
        { id: 6, nombre: "Compra", icono: "🛒", activa: true },
        { id: 7, nombre: "Restaurantes", icono: "🍽️", activa: true },
        { id: 8, nombre: "Otras Compras", icono: "🛍️", activa: true },
        { id: 9, nombre: "Ahorro", icono: "💰", activa: true }
    ];
    state.subcategorias = [
        { id: 1, categoriaId: 6, nombre: "Compra Comida", icono: "🛒", activa: true },
        { id: 2, categoriaId: 6, nombre: "Compra Cocina", icono: "🍳", activa: true },
        { id: 3, categoriaId: 6, nombre: "Compra Limpieza", icono: "🧹", activa: true },
        { id: 4, categoriaId: 6, nombre: "Compra Baño", icono: "🛁", activa: true },
        { id: 5, categoriaId: 6, nombre: "Compra Medicina", icono: "💊", activa: true },
        { id: 6, categoriaId: 8, nombre: "Electrodomesticos", icono: "📺", activa: true },
        { id: 7, categoriaId: 8, nombre: "Bricolaje", icono: "🪛", activa: true },
        { id: 8, categoriaId: 8, nombre: "Evento", icono: "🥳", activa: true },
        { id: 9, categoriaId: 8, fontStyle: "Ocio", icono: "🎉", activa: true },
        { id: 10, categoriaId: 8, nombre: "Otro", icono: "💵", activa: true }
    ];
    state.presupuestos = [];
    state.movimientos = [];
}

function saveLocalCache() {
    localStorage.setItem('contable_local_db', JSON.stringify({
        categorias: state.categorias,
        subcategorias: state.subcategorias,
        presupuestos: state.presupuestos,
        movimientos: state.movimientos
    }));
}

function updateLocalModeUI() {
    if (state.isLocalMode) {
        DOM.apiStatus.className = 'api-status-badge local-mode';
        DOM.apiStatusText.textContent = 'Archivo Local';
        DOM.btnDownloadLocal.classList.remove('hidden');
        DOM.cardConfigLocal.classList.remove('hidden');
    } else {
        DOM.btnDownloadLocal.classList.add('hidden');
        DOM.cardConfigLocal.classList.add('hidden');
        if (state.isDemoMode) {
            DOM.apiStatus.className = 'api-status-badge connected';
            DOM.apiStatusText.textContent = 'Modo Demo';
        } else if (state.apiUrl) {
            DOM.apiStatus.className = 'api-status-badge connected';
            DOM.apiStatusText.textContent = 'Sincronizado';
        } else {
            DOM.apiStatus.className = 'api-status-badge disconnected';
            DOM.apiStatusText.textContent = 'Desconectado';
        }
    }
}

function downloadLocalDB() {
    const dbData = {
        categorias: state.categorias,
        subcategorias: state.subcategorias,
        presupuestos: state.presupuestos,
        movimientos: state.movimientos
    };
    const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_contable_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada con exito', 'success');
}

function updateApiUIFromState() {
    if (DOM.inApiUrl) DOM.inApiUrl.value = state.supabaseApiUrl;
    if (DOM.inModalApiUrl) DOM.inModalApiUrl.value = state.supabaseApiUrl;
    if (DOM.inSupabaseKey) DOM.inSupabaseKey.value = state.supabaseKey;
    if (DOM.inModalSupabaseKey) DOM.inModalSupabaseKey.value = state.supabaseKey;
}

function checkLocalCache() {
    const wasLocal = localStorage.getItem('contable_is_local_mode') === 'true';
    if (wasLocal) {
        const cached = localStorage.getItem('contable_local_db');
        if (cached) {
            try {
                const data = JSON.parse(cached);
                if (validateLocalJSON(data)) {
                    state.isLocalMode = true;
                    state.isDemoMode = false;
                    state.categorias = data.categorias;
                    state.subcategorias = data.subcategorias || [];
                    state.presupuestos = data.presupuestos || [];
                    state.movimientos = data.movimientos || [];
                    
                    showAppInterface();
                    updateLocalModeUI();
                    populateSelectors();
                    updateDashboardMetrics();
                    recreateCharts();
                    applyMovementsFilters();
                }
            } catch (e) {
                console.error('Error loading cached local DB', e);
            }
        }
    } else if (state.apiUrl) {
        state.isLocalMode = false;
        state.isDemoMode = false;
        
        // Rellenar los inputs y configurar labels según el estado cargado
        updateApiUIFromState();
        
        showAppInterface();
        updateLocalModeUI();
        
        // Connect & initialize Supabase Realtime
        initSupabaseRealtime();
        
        syncData();
    }
}

function loadDemoData() {
    state.categorias = [
        { id: 1, nombre: "Agua", icono: "💧", activa: true },
        { id: 2, nombre: "Basuras", icono: "🗑️", activa: true },
        { id: 3, nombre: "Internet", icono: "🛜", activa: true },
        { id: 4, nombre: "Gas", icono: "💨", activa: true },
        { id: 5, nombre: "Luz", icono: "💡", activa: true },
        { id: 6, nombre: "Compra", icono: "🛒", activa: true },
        { id: 7, nombre: "Restaurantes", icono: "🍽️", activa: true },
        { id: 8, nombre: "Otras Compras", icono: "🛍️", activa: true },
        { id: 9, nombre: "Ahorro", icono: "💰", activa: true }
    ];

    state.subcategorias = [
        { id: 1, categoriaId: 6, nombre: "Compra Comida", icono: "🛒", activa: true },
        { id: 2, categoriaId: 6, nombre: "Compra Cocina", icono: "🍳", activa: true },
        { id: 3, categoriaId: 6, nombre: "Compra Limpieza", icono: "🧹", activa: true },
        { id: 4, categoriaId: 6, nombre: "Compra Baño", icono: "🛁", activa: true },
        { id: 5, categoriaId: 6, nombre: "Compra Medicina", icono: "💊", activa: true },
        { id: 6, categoriaId: 8, nombre: "Electrodomésticos", icono: "📺", activa: true },
        { id: 7, categoriaId: 8, nombre: "Bricolaje", icono: "🪛", activa: true },
        { id: 8, categoriaId: 8, nombre: "Evento", icono: "🥳", activa: true },
        { id: 9, categoriaId: 8, nombre: "Ocio", icono: "🎉", activa: true },
        { id: 10, categoriaId: 8, nombre: "Otro", icono: "💵", activa: true }
    ];

    const currentYear = state.selectedYear;
    state.presupuestos = [
        { id: 101, categoriaId: 1, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 35, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 102, categoriaId: 2, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 15, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 103, categoriaId: 3, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 40, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 104, categoriaId: 4, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 50, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 105, categoriaId: 5, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 75, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 106, categoriaId: 6, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 250, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 107, categoriaId: 7, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 100, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true },
        { id: 108, categoriaId: 8, fecha_inicio: `${currentYear}-01-01`, fecha_fin: `${currentYear}-12-31`, presupuesto: 80, version: 1, fecha_version: `${currentYear}-01-01T00:00:00.000Z`, activa: true }
    ];

    state.movimientos = [];
    let mId = 1;
    const prevYear = currentYear - 1;

    // Previous year data for comparative chart
    for (let mes = 1; mes <= 12; mes++) {
        const mm = mes < 10 ? `0${mes}` : mes;
        state.movimientos.push(
            { id: mId++, fecha: `${prevYear}-${mm}-01`, tipo: "INGRESO", categoriaId: 9, subcategoriaId: "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: "Nomina Mensual", importe: 1750 },
            { id: mId++, fecha: `${prevYear}-${mm}-05`, tipo: "GASTO", categoriaId: 5, subcategoriaId: "", concepto: "Recibo Luz", importe: 68 },
            { id: mId++, fecha: `${prevYear}-${mm}-08`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Supermercado", importe: 70 },
            { id: mId++, fecha: `${prevYear}-${mm}-15`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Restaurante", importe: 40 }
        );
    }

    // Current year data
    for (let mes = 1; mes <= 12; mes++) {
        const mm = mes < 10 ? `0${mes}` : mes;
        state.movimientos.push(
            { id: mId++, fecha: `${currentYear}-${mm}-01`, tipo: "INGRESO", categoriaId: 9, subcategoriaId: "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: "Nomina Mensual Trabajo", importe: 1850 },
            { id: mId++, fecha: `${currentYear}-${mm}-05`, tipo: "GASTO", categoriaId: 5, subcategoriaId: "", concepto: "Recibo de la Luz", importe: 62.45 },
            { id: mId++, fecha: `${currentYear}-${mm}-06`, tipo: "GASTO", categoriaId: 1, subcategoriaId: "", concepto: "Consumo de Agua", importe: 24.10 },
            { id: mId++, fecha: `${currentYear}-${mm}-10`, tipo: "GASTO", categoriaId: 3, subcategoriaId: "", concepto: "Fibra + Movil", importe: 38.90 },
            { id: mId++, fecha: `${currentYear}-${mm}-04`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Supermercado Semanal", importe: 64.20 },
            { id: mId++, fecha: `${currentYear}-${mm}-12`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 1, concepto: "Compra semanal", importe: 58.30 },
            { id: mId++, fecha: `${currentYear}-${mm}-18`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 2, concepto: "Sarten antiadherente", importe: 24.99 },
            { id: mId++, fecha: `${currentYear}-${mm}-20`, tipo: "GASTO", categoriaId: 6, subcategoriaId: 3, concepto: "Detergente y suavizante", importe: 12.80 },
            { id: mId++, fecha: `${currentYear}-${mm}-07`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Cena fin de semana", importe: 35.50 },
            { id: mId++, fecha: `${currentYear}-${mm}-22`, tipo: "GASTO", categoriaId: 7, subcategoriaId: "", concepto: "Almuerzo oficina", importe: 12.50 },
            { id: mId++, fecha: `${currentYear}-${mm}-${mes % 2 === 0 ? '15' : '25'}`, tipo: "GASTO", categoriaId: 8, subcategoriaId: mes % 2 === 0 ? 9 : 7, concepto: mes % 2 === 0 ? "Cine + Palomitas" : "Herramientas", importe: mes % 2 === 0 ? 18 : 34.50 },
            { id: mId++, fecha: `${currentYear}-${mm}-28`, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: 6, categoriaDestinoId: 9, concepto: "Sobrante mensual ahorro", importe: 50 }
        );
    }

    populateSelectors();
    updateDashboardMetrics();
    recreateCharts();
    applyMovementsFilters();
}

function handleDemoWriteAction(action, data) {
    if (action === 'movimiento') {
        const id = state.movimientos.length + 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe });
        return { success: true, id, message: "Movimiento insertado (Demo)" };
    } else if (action === 'transferencia') {
        const id = state.movimientos.length + 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe });
        return { success: true, id, message: "Transferencia insertada (Demo)" };
    } else if (action === 'editar_movimiento') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe };
            return { success: true, message: "Movimiento editado (Demo)" };
        }
        return { success: false, error: 'Movimiento no encontrado' };
    } else if (action === 'editar_transferencia') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe };
            return { success: true, message: "Transferencia editada (Demo)" };
        }
        return { success: false, error: 'Transferencia no encontrada' };
    } else if (action === 'eliminar_movimiento') {
        state.movimientos = state.movimientos.filter(m => m.id != data.id);
        return { success: true, message: "Movimiento eliminado (Demo)" };
    } else if (action === 'presupuesto') {
        const versions = state.presupuestos.filter(pr => pr.categoriaId === data.categoriaId && pr.fecha_inicio === data.fecha_inicio && pr.fecha_fin === data.fecha_fin);
        const maxVer = versions.length > 0 ? Math.max(...versions.map(v => v.version || 1)) : 0;
        const nextVer = maxVer + 1;
        const id = state.presupuestos.length > 0 ? Math.max(...state.presupuestos.map(pr => pr.id)) + 1 : 1;
        state.presupuestos.push({ 
            id, 
            categoriaId: data.categoriaId, 
            fecha_inicio: data.fecha_inicio, 
            fecha_fin: data.fecha_fin || null, 
            presupuesto: data.presupuesto,
            version: nextVer,
            fecha_version: new Date().toISOString(),
            activa: data.activa !== undefined ? (data.activa === true || data.activa === 'true') : true
        });
        return { success: true, message: "Presupuesto guardado (Demo)" };
    } else if (action === 'editar_presupuesto_periodo') {
        const idx = state.presupuestos.findIndex(p => p.id == data.id);
        if (idx !== -1) {
            if (data.fecha_inicio !== undefined) state.presupuestos[idx].fecha_inicio = data.fecha_inicio;
            if (data.fecha_fin !== undefined) state.presupuestos[idx].fecha_fin = data.fecha_fin;
            if (data.presupuesto !== undefined) state.presupuestos[idx].presupuesto = data.presupuesto;
            if (data.activa !== undefined) state.presupuestos[idx].activa = (data.activa === true || data.activa === 'true');
            return { success: true, message: "Presupuesto editado (Demo)" };
        }
        return { success: false, error: 'Presupuesto no encontrado' };
    } else if (action === 'editar_categoria') {
        const idx = state.categorias.findIndex(c => c.id == data.id);
        if (idx !== -1) {
            if (data.nombre !== undefined) state.categorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.categorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.categorias[idx].activa = (data.activa === true || data.activa === 'true');
            return { success: true, message: "Categoria editada (Demo)" };
        }
        return { success: false, error: 'Categoria no encontrada' };
    } else if (action === 'editar_subcategoria') {
        const idx = state.subcategorias.findIndex(s => s.id == data.id);
        if (idx !== -1) {
            if (data.categoriaId !== undefined) state.subcategorias[idx].categoriaId = Number(data.categoriaId);
            if (data.nombre !== undefined) state.subcategorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.subcategorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.subcategorias[idx].activa = (data.activa === true || data.activa === 'true');
            return { success: true, message: "Subcategoria editada (Demo)" };
        }
        return { success: false, error: 'Subcategoria no encontrada' };
    } else if (action === 'categoria') {
        const id = state.categorias.length + 1;
        state.categorias.push({ id, nombre: data.nombre, icono: data.icono, activa: true });
        return { success: true, id, message: "Categoria creada (Demo)" };
    } else if (action === 'subcategoria') {
        const id = state.subcategorias.length + 1;
        state.subcategorias.push({ id, categoriaId: data.categoriaId, nombre: data.nombre, icono: data.icono, activa: true });
        return { success: true, id, message: "Subcategoria creada (Demo)" };
    }
    return { success: false, error: 'Accion demo no contemplada' };
}

function handleLocalWriteAction(action, data) {
    if (action === 'movimiento') {
        const id = state.movimientos.length > 0 ? Math.max(...state.movimientos.map(m => m.id)) + 1 : 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe });
        saveLocalCache();
        return { success: true, id, message: "Movimiento guardado localmente" };
    } else if (action === 'transferencia') {
        const id = state.movimientos.length > 0 ? Math.max(...state.movimientos.map(m => m.id)) + 1 : 1;
        state.movimientos.push({ id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe });
        saveLocalCache();
        return { success: true, id, message: "Transferencia guardada localmente" };
    } else if (action === 'editar_movimiento') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: data.tipo, categoriaId: data.categoriaId || "", subcategoriaId: data.subcategoriaId || "", categoriaOrigenId: "", categoriaDestinoId: "", concepto: data.concepto, importe: data.importe };
            saveLocalCache();
            return { success: true, message: "Movimiento editado localmente" };
        }
        return { success: false, error: 'Movimiento no encontrado' };
    } else if (action === 'editar_transferencia') {
        const idx = state.movimientos.findIndex(m => m.id == data.id);
        if (idx !== -1) {
            state.movimientos[idx] = { id: data.id, fecha: data.fecha, fecha_referencia: data.fecha_referencia, tipo: "TRANSFERENCIA", categoriaId: "", subcategoriaId: "", categoriaOrigenId: data.categoriaOrigenId, categoriaDestinoId: data.categoriaDestinoId, concepto: data.concepto, importe: data.importe };
            saveLocalCache();
            return { success: true, message: "Transferencia editada localmente" };
        }
        return { success: false, error: 'Transferencia no encontrada' };
    } else if (action === 'eliminar_movimiento') {
        state.movimientos = state.movimientos.filter(m => m.id != data.id);
        saveLocalCache();
        return { success: true, message: "Movimiento eliminado localmente" };
    } else if (action === 'presupuesto') {
        const versions = state.presupuestos.filter(pr => pr.categoriaId === data.categoriaId && pr.fecha_inicio === data.fecha_inicio && pr.fecha_fin === data.fecha_fin);
        const maxVer = versions.length > 0 ? Math.max(...versions.map(v => v.version || 1)) : 0;
        const nextVer = maxVer + 1;
        const id = state.presupuestos.length > 0 ? Math.max(...state.presupuestos.map(pr => pr.id)) + 1 : 1;
        state.presupuestos.push({ 
            id, 
            categoriaId: data.categoriaId, 
            fecha_inicio: data.fecha_inicio, 
            fecha_fin: data.fecha_fin || null, 
            presupuesto: data.presupuesto,
            version: nextVer,
            fecha_version: new Date().toISOString(),
            activa: data.activa !== undefined ? (data.activa === true || data.activa === 'true') : true
        });
        saveLocalCache();
        return { success: true, message: "Presupuesto guardado localmente" };
    } else if (action === 'editar_presupuesto_periodo') {
        const idx = state.presupuestos.findIndex(p => p.id == data.id);
        if (idx !== -1) {
            if (data.fecha_inicio !== undefined) state.presupuestos[idx].fecha_inicio = data.fecha_inicio;
            if (data.fecha_fin !== undefined) state.presupuestos[idx].fecha_fin = data.fecha_fin;
            if (data.presupuesto !== undefined) state.presupuestos[idx].presupuesto = data.presupuesto;
            if (data.activa !== undefined) state.presupuestos[idx].activa = (data.activa === true || data.activa === 'true');
            saveLocalCache();
            return { success: true, message: "Presupuesto editado localmente" };
        }
        return { success: false, error: 'Presupuesto no encontrado' };
    } else if (action === 'editar_categoria') {
        const idx = state.categorias.findIndex(c => c.id == data.id);
        if (idx !== -1) {
            if (data.nombre !== undefined) state.categorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.categorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.categorias[idx].activa = (data.activa === true || data.activa === 'true');
            saveLocalCache();
            return { success: true, message: "Categoria editada localmente" };
        }
        return { success: false, error: 'Categoria no encontrada' };
    } else if (action === 'editar_subcategoria') {
        const idx = state.subcategorias.findIndex(s => s.id == data.id);
        if (idx !== -1) {
            if (data.categoriaId !== undefined) state.subcategorias[idx].categoriaId = Number(data.categoriaId);
            if (data.nombre !== undefined) state.subcategorias[idx].nombre = data.nombre;
            if (data.icono !== undefined) state.subcategorias[idx].icono = data.icono;
            if (data.activa !== undefined) state.subcategorias[idx].activa = (data.activa === true || data.activa === 'true');
            saveLocalCache();
            return { success: true, message: "Subcategoria editada localmente" };
        }
        return { success: false, error: 'Subcategoria no encontrada' };
    } else if (action === 'categoria') {
        const id = state.categorias.length > 0 ? Math.max(...state.categorias.map(c => c.id)) + 1 : 1;
        state.categorias.push({ id, nombre: data.nombre, icono: data.icono, activa: true });
        saveLocalCache();
        return { success: true, id, message: "Categoria creada localmente" };
    } else if (action === 'subcategoria') {
        const id = state.subcategorias.length > 0 ? Math.max(...state.subcategorias.map(s => s.id)) + 1 : 1;
        state.subcategorias.push({ id, categoriaId: data.categoriaId, nombre: data.nombre, icono: data.icono, activa: true });
        saveLocalCache();
        return { success: true, id, message: "Subcategoria creada localmente" };
    }
    return { success: false, error: 'Accion local no contemplada' };
}
