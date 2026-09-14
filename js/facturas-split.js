/* ==========================================================================
   Registro Contable - Facturas: Alta y edición de facturas (divididas o no)
   ========================================================================== */

// Reparto equitativo: importeTotal / numMeses, empezando en mesInicio ('YYYY-MM').
// El último mes absorbe el resto del redondeo para que la suma cuadre exactamente.
function calcularRepartoPorMeses(importeTotal, numMeses, mesInicio) {
    const [y, m] = mesInicio.split('-').map(Number);
    const base = Math.floor((importeTotal / numMeses) * 100) / 100;

    let acumulado = 0;
    const rows = [];
    for (let i = 0; i < numMeses; i++) {
        const mIdx = m - 1 + i;
        const year = y + Math.floor(mIdx / 12);
        const month = (mIdx % 12) + 1;
        const esUltimo = i === numMeses - 1;
        const importe = esUltimo ? Math.round((importeTotal - acumulado) * 100) / 100 : base;
        if (!esUltimo) acumulado += importe;

        rows.push({
            fecha_referencia: `${year}-${String(month).padStart(2, '0')}-01`,
            importe,
            porcentaje: importeTotal > 0 ? (importe / importeTotal) * 100 : 0
        });
    }
    return rows;
}

function diasEntreInclusive(d1, d2) {
    const MS_DIA = 24 * 60 * 60 * 1000;
    return Math.round((d2 - d1) / MS_DIA) + 1;
}

// Reparto proporcional: para cada mes natural que toca el rango [fechaInicio, fechaFin],
// se calcula el % de días de ese mes dentro del rango y se aplica al importe total.
// El último mes absorbe el resto del redondeo para que la suma cuadre exactamente.
function calcularRepartoPorRango(importeTotal, fechaInicioStr, fechaFinStr) {
    const fechaInicio = new Date(`${fechaInicioStr}T00:00:00`);
    const fechaFin = new Date(`${fechaFinStr}T00:00:00`);
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime()) || fechaFin < fechaInicio) return [];

    const totalDias = diasEntreInclusive(fechaInicio, fechaFin);

    const meses = [];
    let cursor = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
    const finMes = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1);
    while (cursor <= finMes) {
        const inicioMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const finDeMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const solapeInicio = inicioMes > fechaInicio ? inicioMes : fechaInicio;
        const solapeFin = finDeMes < fechaFin ? finDeMes : fechaFin;
        meses.push({
            year: cursor.getFullYear(),
            month: cursor.getMonth() + 1,
            dias: diasEntreInclusive(solapeInicio, solapeFin)
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    let acumulado = 0;
    return meses.map((mes, idx) => {
        const esUltimo = idx === meses.length - 1;
        const importe = esUltimo
            ? Math.round((importeTotal - acumulado) * 100) / 100
            : Math.round((importeTotal * mes.dias / totalDias) * 100) / 100;
        if (!esUltimo) acumulado += importe;

        return {
            fecha_referencia: `${mes.year}-${String(mes.month).padStart(2, '0')}-01`,
            importe,
            dias: mes.dias,
            porcentaje: totalDias > 0 ? (mes.dias / totalDias) * 100 : 0
        };
    });
}

// Último día del mes 'YYYY-MM', como string 'YYYY-MM-DD'.
function lastDayOfMonthStr(yyyyMm) {
    const [y, m] = yyyyMm.split('-').map(Number);
    const d = new Date(y, m, 0); // día 0 del mes siguiente = último día de este mes
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ==========================================================================
   UI del modal
   ========================================================================== */

let facturaSplitModo = 'meses';
let facturaEditingId = null;

function getFacturaModalEls() {
    return {
        modal: document.getElementById('modal-factura-dividida'),
        modalTitle: document.getElementById('factura-modal-title'),
        btnSubmit: document.getElementById('btn-submit-factura-dividida'),
        form: document.getElementById('form-factura-dividida'),
        inCategoria: document.getElementById('in-factura-categoria'),
        inSubcategoria: document.getElementById('in-factura-subcategoria'),
        inConcepto: document.getElementById('in-factura-concepto'),
        inImporte: document.getElementById('in-factura-importe'),
        inFecha: document.getElementById('in-factura-fecha'),
        inFechaCobro: document.getElementById('in-factura-fecha-cobro'),
        tabMeses: document.getElementById('tab-btn-factura-meses'),
        tabRango: document.getElementById('tab-btn-factura-rango'),
        condMeses: document.querySelectorAll('.cond-factura-meses'),
        condRango: document.querySelectorAll('.cond-factura-rango'),
        inNumMeses: document.getElementById('in-factura-num-meses'),
        inMesInicio: document.getElementById('in-factura-mes-inicio'),
        inRangoInicio: document.getElementById('in-factura-rango-inicio'),
        inRangoFin: document.getElementById('in-factura-rango-fin'),
        preview: document.getElementById('factura-split-preview')
    };
}

function populateFacturaCategoriaOptions() {
    const els = getFacturaModalEls();
    if (!els.inCategoria) return;
    els.inCategoria.innerHTML = FACTURAS_CATEGORIA_IDS
        .map(id => state.categorias.find(c => c.id === id))
        .filter(Boolean)
        .map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`)
        .join('');
}

function updateFacturaSubcategoriaOptions() {
    const els = getFacturaModalEls();
    if (!els.inSubcategoria) return;

    const parentId = parseInt(els.inCategoria.value);
    const subs = state.subcategorias.filter(sc => sc.categoriaId === parentId && sc.activa);

    if (subs.length > 0) {
        els.inSubcategoria.innerHTML = '<option value="">(Sin subcategoría)</option>' + subs.map(sc => `<option value="${sc.id}">${sc.icono} ${sc.nombre}</option>`).join('');
        els.inSubcategoria.disabled = false;
    } else {
        els.inSubcategoria.innerHTML = '<option value="">(No hay subcategorías)</option>';
        els.inSubcategoria.disabled = true;
    }
}

function setFacturaSplitModo(modo) {
    facturaSplitModo = modo;
    const els = getFacturaModalEls();
    els.tabMeses.classList.toggle('active', modo === 'meses');
    els.tabRango.classList.toggle('active', modo === 'rango');
    els.condMeses.forEach(el => el.classList.toggle('hidden', modo !== 'meses'));
    els.condRango.forEach(el => el.classList.toggle('hidden', modo !== 'rango'));
    renderFacturaSplitPreview();
}

// A partir del reparto guardado, adivina si conviene precargar el modal de edición en
// modo "por nº de meses" (reparto equitativo) o "por rango de fechas" (proporcional).
function inferSplitModeFromFactura(factura) {
    const reparto = factura.reparto || [];
    if (reparto.length <= 1) {
        return {
            modo: 'meses',
            numMeses: 1,
            mesInicio: reparto[0] ? reparto[0].mes : (factura.fecha_consumo_inicio || '').substring(0, 7)
        };
    }

    const base = reparto[0].importe;
    const esEquitativo = reparto.slice(0, -1).every(r => Math.abs(r.importe - base) < 0.01);
    if (esEquitativo) {
        return { modo: 'meses', numMeses: reparto.length, mesInicio: reparto[0].mes };
    }
    return {
        modo: 'rango',
        rangoInicio: factura.fecha_consumo_inicio,
        rangoFin: factura.fecha_consumo_fin
    };
}

function updateFacturaModalTexts() {
    const els = getFacturaModalEls();
    const isEdit = !!facturaEditingId;
    if (els.modalTitle) els.modalTitle.textContent = isEdit ? 'Editar Factura' : 'Nueva Factura';
    if (els.btnSubmit) els.btnSubmit.textContent = isEdit ? 'Guardar cambios' : 'Crear factura';
}

// factura = null → alta nueva. factura = objeto de state.facturas → edición.
function openFacturaModal(factura = null) {
    const els = getFacturaModalEls();
    if (!els.modal) return;

    populateFacturaCategoriaOptions();
    els.form.reset();
    facturaEditingId = factura ? factura.id : null;

    if (factura) {
        els.inCategoria.value = factura.categoriaId;
        updateFacturaSubcategoriaOptions();
        els.inSubcategoria.value = factura.subcategoriaId || '';
        els.inConcepto.value = factura.concepto;
        els.inImporte.value = factura.importe_total;
        els.inFecha.value = factura.fecha_creacion;
        els.inFechaCobro.value = factura.fecha_cobro || '';

        const inferred = inferSplitModeFromFactura(factura);
        if (inferred.modo === 'meses') {
            els.inNumMeses.value = inferred.numMeses;
            els.inMesInicio.value = inferred.mesInicio;
            els.inRangoInicio.value = '';
            els.inRangoFin.value = '';
        } else {
            els.inRangoInicio.value = inferred.rangoInicio;
            els.inRangoFin.value = inferred.rangoFin;
            els.inNumMeses.value = 1;
            els.inMesInicio.value = (factura.fecha_consumo_inicio || '').substring(0, 7);
        }
        setFacturaSplitModo(inferred.modo);
    } else {
        updateFacturaSubcategoriaOptions();
        const todayStr = new Date().toISOString().split('T')[0];
        els.inFecha.value = todayStr;
        els.inFechaCobro.value = '';
        els.inMesInicio.value = todayStr.substring(0, 7);
        els.inNumMeses.value = 1;
        els.inRangoInicio.value = '';
        els.inRangoFin.value = '';
        setFacturaSplitModo('meses');
    }

    updateFacturaModalTexts();
    els.modal.classList.remove('hidden');
}

function closeFacturaSplitModal() {
    const els = getFacturaModalEls();
    if (els.modal) els.modal.classList.add('hidden');
    facturaEditingId = null;
}

function getFacturaSplitRows() {
    const els = getFacturaModalEls();
    const importeTotal = parseFloat(els.inImporte.value);
    if (isNaN(importeTotal) || importeTotal <= 0) return [];

    if (facturaSplitModo === 'meses') {
        const numMeses = parseInt(els.inNumMeses.value);
        const mesInicio = els.inMesInicio.value;
        if (!numMeses || numMeses < 1 || !mesInicio) return [];
        return calcularRepartoPorMeses(importeTotal, numMeses, mesInicio);
    }

    const fechaInicio = els.inRangoInicio.value;
    const fechaFin = els.inRangoFin.value;
    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) return [];
    return calcularRepartoPorRango(importeTotal, fechaInicio, fechaFin);
}

function renderFacturaSplitPreview() {
    const els = getFacturaModalEls();
    if (!els.preview) return;

    const rows = getFacturaSplitRows();
    if (rows.length === 0) {
        els.preview.innerHTML = '<div class="factura-split-preview-empty">Completa los datos para ver el reparto por mes.</div>';
        return;
    }

    const showDias = facturaSplitModo === 'rango';
    const header = `
        <div class="factura-split-preview-header">
            <span>Mes</span>
            <span>${showDias ? 'Días' : '%'}</span>
            <span>Importe</span>
        </div>`;

    const body = rows.map(r => {
        const [y, m] = r.fecha_referencia.split('-');
        const label = `${FACTURAS_MONTH_NAMES[parseInt(m) - 1]} ${y}`;
        const middle = showDias ? `${r.dias}d (${r.porcentaje.toFixed(1)}%)` : `${r.porcentaje.toFixed(1)}%`;
        return `
            <div class="factura-split-preview-row">
                <span>${label}</span>
                <span class="factura-split-preview-pct">${middle}</span>
                <span class="factura-split-preview-amount">${formatCurrency(r.importe)}</span>
            </div>`;
    }).join('');

    const total = rows.reduce((sum, r) => sum + r.importe, 0);

    els.preview.innerHTML = `
        ${header}
        ${body}
        <div class="factura-split-preview-total">
            <span>Total</span>
            <span>${formatCurrency(total)}</span>
        </div>`;
}

async function handleFacturaFormSubmit(e) {
    e.preventDefault();
    const els = getFacturaModalEls();

    const categoriaId = parseInt(els.inCategoria.value);
    const subcategoriaId = els.inSubcategoria.value ? parseInt(els.inSubcategoria.value) : '';
    const concepto = els.inConcepto.value.trim();
    const fechaCreacion = els.inFecha.value;
    const fechaCobro = els.inFechaCobro.value || null;
    const rows = getFacturaSplitRows();

    if (!categoriaId || !concepto || !fechaCreacion) {
        showToast('Completa todos los campos obligatorios', 'error');
        return;
    }
    if (rows.length === 0) {
        showToast('Revisa el reparto: no se ha podido calcular ningún mes', 'error');
        return;
    }

    const importeTotal = rows.reduce((sum, r) => sum + r.importe, 0);
    const reparto = rows.map(r => ({ mes: r.fecha_referencia.substring(0, 7), importe: r.importe }));
    const mesesOrdenados = reparto.map(r => r.mes).slice().sort();
    const fechaConsumoInicio = `${mesesOrdenados[0]}-01`;
    const fechaConsumoFin = lastDayOfMonthStr(mesesOrdenados[mesesOrdenados.length - 1]);

    const facturaPayload = {
        categoriaId,
        subcategoriaId,
        concepto,
        importe_total: importeTotal,
        fecha_creacion: fechaCreacion,
        fecha_cobro: fechaCobro,
        fecha_consumo_inicio: fechaConsumoInicio,
        fecha_consumo_fin: fechaConsumoFin,
        reparto
    };

    const isEdit = !!facturaEditingId;
    const previousFactura = isEdit ? state.facturas.find(f => f.id == facturaEditingId) : null;

    // Si la factura editada ya tenía movimientos generados (estaba cobrada), se borran:
    // se regeneran a continuación con los datos nuevos (importe/reparto/fecha de cobro).
    if (isEdit && previousFactura && previousFactura.fecha_cobro) {
        const delRes = await apiRequest('eliminar_movimientos_por_factura', 'POST', { facturaId: String(facturaEditingId) });
        if (!delRes || !delRes.success) {
            showToast('No se pudieron borrar los movimientos anteriores de la factura', 'error');
            return;
        }
    }

    let facturaId = facturaEditingId;
    if (isEdit) {
        const res = await apiRequest('editar_factura', 'PATCH', { id: facturaEditingId, ...facturaPayload });
        if (!res || !res.success) {
            showToast('No se pudo actualizar la factura', 'error');
            return;
        }
    } else {
        const res = await apiRequest('factura', 'POST', facturaPayload);
        if (!res || !res.success) {
            showToast('No se pudo crear la factura', 'error');
            return;
        }
        facturaId = res.id;
    }

    if (fechaCobro) {
        const totalMeses = rows.length;
        const movPayload = rows.map((r, idx) => ({
            fecha: fechaCobro,
            fecha_referencia: r.fecha_referencia,
            categoriaId,
            subcategoriaId,
            concepto: totalMeses > 1 ? `${concepto} (${idx + 1}/${totalMeses})` : concepto,
            importe: r.importe,
            facturaId: String(facturaId)
        }));
        const movRes = await apiRequest('movimientos_lote', 'POST', movPayload);
        if (!movRes || !movRes.success) {
            showToast('La factura se guardó pero falló la creación de sus movimientos', 'error');
            return;
        }
    }

    showToast(isEdit ? 'Factura actualizada' : (fechaCobro ? 'Factura creada' : 'Factura creada (pendiente de pago)'), 'success');
    closeFacturaSplitModal();

    if (!state.isDemoMode && !state.isLocalMode) {
        if (!realtimeChannel) {
            await syncData();
        }
    } else {
        updateDashboardMetrics();
        recreateCharts();
        applyMovementsFilters();
        renderFacturas();
        refreshCuentasIfActive();
    }
}

async function deleteFactura(id) {
    const factura = state.facturas.find(f => f.id == id);
    if (!confirm(`¿Estás seguro de que deseas eliminar la factura "${factura ? factura.concepto : id}"?`)) return;

    if (factura && factura.fecha_cobro) {
        const delRes = await apiRequest('eliminar_movimientos_por_factura', 'POST', { facturaId: String(id) });
        if (!delRes || !delRes.success) {
            showToast('No se pudieron eliminar los movimientos de la factura', 'error');
            return;
        }
    }

    const res = await apiRequest('eliminar_factura', 'POST', { id });
    if (res && res.success) {
        showToast('Factura eliminada', 'success');
        if (!state.isDemoMode && !state.isLocalMode) {
            if (!realtimeChannel) {
                await syncData();
            }
        } else {
            updateDashboardMetrics();
            recreateCharts();
            applyMovementsFilters();
            renderFacturas();
            refreshCuentasIfActive();
        }
    }
}

document.getElementById('in-factura-categoria')?.addEventListener('change', updateFacturaSubcategoriaOptions);
document.getElementById('btn-nueva-factura-dividida')?.addEventListener('click', () => openFacturaModal());
document.getElementById('btn-close-factura-dividida-modal')?.addEventListener('click', closeFacturaSplitModal);
document.getElementById('btn-cancel-factura-dividida')?.addEventListener('click', closeFacturaSplitModal);
document.getElementById('tab-btn-factura-meses')?.addEventListener('click', () => setFacturaSplitModo('meses'));
document.getElementById('tab-btn-factura-rango')?.addEventListener('click', () => setFacturaSplitModo('rango'));
document.getElementById('form-factura-dividida')?.addEventListener('submit', handleFacturaFormSubmit);

['in-factura-importe', 'in-factura-num-meses', 'in-factura-mes-inicio', 'in-factura-rango-inicio', 'in-factura-rango-fin']
    .forEach(id => {
        document.getElementById(id)?.addEventListener('input', renderFacturaSplitPreview);
    });
