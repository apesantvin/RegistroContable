# Registro Contable — Documentación Técnica

SPA de contabilidad doméstica en JavaScript vanilla (sin build step, sin framework), pensada como PWA instalable, con tres backends de datos intercambiables: Supabase (Postgres + REST + Realtime), un archivo JSON local, o datos de Demo en memoria.

## 1. Stack y estructura de archivos

- **Frontend**: HTML/CSS/JS vanilla. `index.html` contiene todas las pantallas (una SPA de una sola página, secciones `.app-screen` que se muestran/ocultan).
- **Gráficos**: [Chart.js](https://www.chartjs.org/) (CDN).
- **Backend cloud**: [Supabase](https://supabase.com/) — API REST (`PostgREST`) + Realtime (WebSockets) vía `@supabase/supabase-js` (CDN). No hay backend propio: la app habla directamente con Supabase usando la Anon Key.
- **PWA**: `sw.js` (Service Worker, cache-first para assets estáticos) + `manifest.json`.

```
index.html              Markup de todas las pantallas y modales
app.js                   Entry point, router SPA (hash routing), registro del Service Worker
sw.js                     Service Worker (caché de assets estáticos)
js/state.js              Estado global (state, DOM), índice derivado de movimientos
js/storage.js            Modo Local/Demo: carga, guardado y "escritura" simulada
js/api.js                Cliente REST/Realtime de Supabase, orquestación de sincronización
js/transactions.js       Pantalla Movimientos: filtros, paginación, alta/edición/duplicado
js/accounts.js           Pantalla Cuentas (saldo real por categoría)
js/facturas.js           Pantalla Facturas (estado mensual de gasto por categoría)
js/facturas-split.js     Alta de factura dividida en varios meses (modal)
js/config.js             Pantalla Configuración: gestión de categorías/presupuestos/automatizaciones
js/event-handlers.js     Listeners de formularios/UI, populateSelectors, inicialización
js/charts.js             Construcción de todos los gráficos (Chart.js) y métricas del Dashboard
js/utils.js              Helpers de formato (moneda, fecha), toasts, spinner
```

No hay bundler ni transpilación: los `<script>` se cargan en orden directo desde `index.html`, y todas las funciones/estado son globales (sin módulos ES).

## 2. Los tres modos de funcionamiento

Controlados por `state.isDemoMode` / `state.isLocalMode` (si ambos son `false` y hay `state.apiUrl`, se asume modo Supabase):

| Modo | Persistencia | Activación |
|---|---|---|
| **Supabase** | Postgres remoto vía REST + Realtime | `localStorage` guarda `contable_supabase_api_url` / `contable_supabase_key`; al arrancar, `checkLocalCache()` (`js/storage.js`) detecta la URL guardada y llama a `syncData()` |
| **Local** | Un objeto JSON en memoria, persistido en `localStorage['contable_local_db']` | `contable_is_local_mode = 'true'` en `localStorage`; el usuario carga o crea un `.json` |
| **Demo** | Solo en memoria, se pierde al recargar | Botón "Modo Demo"; `loadDemoData()` genera datos de ejemplo de dos años |

`apiRequest(action, method, data)` (`js/api.js`) es el único punto de entrada para leer/escribir datos, y bifurca internamente:
- Demo → `handleDemoWriteAction()` (`js/storage.js`)
- Local → `handleLocalWriteAction()` (`js/storage.js`), que además persiste con `saveLocalCache()`
- Supabase → construye la petición REST real contra `${apiUrl}/rest/v1/...`

Esto permite que el resto del código (formularios, pantallas) llame siempre a `apiRequest(...)` sin preocuparse del backend activo.

## 3. Modelo de datos

Cuatro entidades, todas planas (sin relaciones anidadas en el cliente; los `...Id` son claves foráneas por convención de nombre):

### `categorias`
```
{ id, nombre, icono, activa, excluida_dashboard }
```
Dos categorías tienen significado especial y **no deben eliminarse** (`js/state.js`):
- `id = 9` → **Ahorro** (`CATEGORIA_AHORRO_ID`)
- `id = 10` → **Inputs** (`CATEGORIA_INGRESOS_ID`), la categoría donde se registran los ingresos (nómina, etc.)

`CATEGORIAS_ESPECIALES_IDS = [9, 10]` se excluye de: formularios de "nueva subcategoría", cálculo de sobrantes/recálculo anual, y del reparto mensual (no tiene sentido repartir presupuesto a Inputs ni a Ahorro, son origen/destino del reparto).

`CATEGORIAS_ORDER` fija el orden visual fijo de las tarjetas; `FACTURAS_CATEGORIA_IDS = [5,4,1,2,3]` (Luz, Gas, Agua, Basuras, Internet) son las categorías tratadas como "facturas" en la pestaña Facturas.

`excluida_dashboard` (booleano, por defecto `false`): marca la categoría como transparente al Dashboard general (gráficos y conteos de ingresos/gastos), sin afectar al saldo total de cuentas ni al listado de Movimientos. Se alterna desde Configuración → Categorías y Subcategorías (badge "📊/🚫 Dashboard"). Ver `isMovimientoExcluidoDashboard()` en `js/state.js`.

### `subcategorias`
```
{ id, categoriaId, nombre, icono, activa, excluida_dashboard }
```
`excluida_dashboard` funciona igual que en `categorias`, con cascada en ambos sentidos: si la categoría padre está excluida, sus subcategorías lo están automáticamente; si solo una subcategoría concreta está excluida, únicamente sus movimientos desaparecen del dashboard (los del resto de subcategorías de la misma categoría se siguen contando).

### `presupuestos`
```
{ id, categoriaId, fecha_inicio, fecha_fin (nullable = indefinido), presupuesto, version, fecha_version, activa }
```
Sistema de **versionado por periodo**: varias filas pueden compartir el mismo `categoriaId + fecha_inicio + fecha_fin` (mismo "periodo"), cada una con un `version` incremental. La versión vigente de un periodo es la de `version` más alta con `activa = true`. Desactivar un presupuesto no lo borra: crea una nueva versión con `activa = false`. Ver `getEffectiveBudget()` en `js/state.js`.

### `movimientos`
```
{ id, fecha, fecha_referencia, tipo, importe, concepto,
  categoriaId, subcategoriaId,        // GASTO / INGRESO
  categoriaOrigenId, categoriaDestinoId, // TRANSFERENCIA
  facturaId }                          // opcional, ver §7
```
- `tipo` ∈ `GASTO | INGRESO | TRANSFERENCIA`.
- `fecha`: fecha real del apunte. `fecha_referencia`: primer día del mes al que "pertenece" contablemente el movimiento (puede diferir de `fecha`, p. ej. una factura pagada en marzo que cubre febrero).
- Un `GASTO`/`INGRESO` usa `categoriaId` (+ `subcategoriaId` opcional, en ambos casos); una `TRANSFERENCIA` usa `categoriaOrigenId`/`categoriaDestinoId` y no lleva categoría ni subcategoría propias.
- `facturaId`: UUID compartido entre los movimientos GASTO generados al dividir una factura en varios meses (ver §7); `null` en movimientos sueltos.

En Supabase estas cuatro tablas existen literalmente con estos nombres y columnas (ver también `Supabase-SobresPresupuestarios.md` para el histórico de cambios de esquema aplicados manualmente).

## 4. Estado global y caché de DOM (`js/state.js`)

`state` es un objeto único con: modo activo, credenciales, año seleccionado, las cuatro colecciones de datos, filtros de cada gráfico/pantalla (`state.chartFilters`), estado de paginación, y `state.loadedScreens` (qué pantallas ya se han cargado desde el servidor, para no repetir peticiones).

`DOM` es un caché de `document.getElementById(...)` de todos los elementos relevantes, calculado una vez al cargar el script — evita relecturas repetidas del DOM.

### Índice derivado: `rebuildIndex()`

Es el corazón de todos los cálculos de saldos. Recorre `state.movimientos` una vez y construye `state.index`:

```
state.index = {
  allTime: { totalNeto, totalAhorro },
  byYear: {
    [año]: {
      totalIngresos, totalGastos,
      byCategoryExpenses, byCategoryIncome,
      byCategoryTransferNet,        // saldo neto de transferencias por categoría (+recibido -enviado)
      byCategoryTransferFromInputs, // solo transferencias cuyo origen es Inputs (reparto mensual)
      byCategoryTransferIn,         // total recibido por transferencia, cualquier origen
      bySubcategoryExpenses,
      ahorroAcumulado[12],          // delta de Ahorro por mes
      byMonth: { [1..12]: { ...mismas claves, a nivel mensual } }
    }
  }
}
```

Reglas de agregación:
- `INGRESO` suma a `totalIngresos` / `byCategoryIncome` (y a `totalNeto` "saldo disponible" global).
- `GASTO` suma a `totalGastos` / `byCategoryExpenses` (y a `bySubcategoryExpenses` si tiene subcategoría) y resta de `totalNeto`.
- `TRANSFERENCIA` **no afecta a `totalNeto`** (mueve dinero entre sobres, no entra ni sale del sistema); resta de `byCategoryTransferNet[origen]` y suma a `byCategoryTransferNet[destino]` / `byCategoryTransferIn[destino]`.
- Movimientos hacia/desde la categoría Ahorro (id 9), de cualquier tipo, alimentan `ahorroDelta`.

`rebuildIndex()` se llama tras cualquier recarga de datos (`updateDashboardMetrics()`, `syncScreenData()`, etc.). En modo Supabase, para el Dashboard/Cuentas/Facturas se pide una versión "ligera" de todos los movimientos históricos (`allTimeMovsCache`, solo columnas necesarias) para poder construir el índice completo sin traer todas las columnas de todo el histórico en la pantalla de Movimientos (que sí es paginada).

### Presupuesto vigente: `getEffectiveBudget(categoriaId, mes, año)`

Busca, entre todas las versiones de presupuesto de una categoría, la de mayor `version` y `activa = true` cuyo periodo (`fecha_inicio`–`fecha_fin`) cubra el mes pedido; si varios periodos solapan, gana el de `fecha_inicio` más reciente (y, en empate, la `fecha_version` más reciente).

### Saldo real ("sobres") por categoría: `getCategoryNetCashFlow(catId, mes, año)`

```
income (INGRESO en esa categoría/mes) − expenses (GASTO) + transfer (neto de TRANSFERENCIA)
```

Este es el flujo de caja real de la categoría en un mes. El **acumulado total** de una categoría (mostrado en Cuentas) es la suma corriente de este flujo desde el primer movimiento hasta el mes de referencia — ya **no** es una simulación basada en presupuesto (así era antes; ver `Supabase-SobresPresupuestarios.md`, sección "0.5. Saldo real por categoría" del plan). El ahorro global (`getAhorroAcumuladoCuentas` / `getAhorroAcumuladoAnual`) usa la misma fórmula aplicada solo a la categoría Ahorro (id 9).

## 5. Reparto mensual y transferencia de sobrantes (`js/config.js`, `js/event-handlers.js`)

Dos automatizaciones que solo generan movimientos `TRANSFERENCIA` normales (no hay lógica especial en el servidor):

- **Reparto mensual** (`computeRepartoMensual`): para un mes dado, toma el total de `INGRESO` registrado en Inputs (id 10) ese mes, genera una línea por cada categoría activa (no especial) con presupuesto vigente > 0, y calcula el remanente (`ingresos − Σ presupuestos`) que se transfiere a Ahorro. `getRepartoMensualExistente()` avisa si ya hay transferencias de reparto ese mes (origen Inputs, `fecha_referencia` = día 1 del mes) para evitar duplicados. Ejecutar el reparto (`btn-ejecutar-reparto`) crea N transferencias `Inputs → categoría` más, opcionalmente, una `Inputs → Ahorro` con el remanente.
- **Transferencia de sobrantes**: para cada categoría no especial, suma `getCategoryNetCashFlow` desde enero hasta el mes actual del año seleccionado; si es positivo, ofrece transferirlo a Ahorro (individualmente o en bloque, importe editable por el usuario antes de confirmar).
- **Recálculo anual** (`renderRecalculoPresupuestos`): compara presupuesto mensual actual vs. gasto real anual / 12 (+ margen de seguridad configurable) por categoría, marca con "⚠️ Revisar" las que difieren más de un 20%, y permite aplicar la propuesta como nuevo periodo de presupuesto del año siguiente (una fila por categoría, aplicable selectivamente vía checkbox).

## 6. Facturas divididas en varios meses

### Estado de completitud (`js/facturas.js`)

`getFacturaYearData(categoriaId, year)` calcula, por cada uno de los 12 meses, el total gastado, nº de movimientos, y un `status`:
- `sin-registrar`: 0 movimientos ese mes.
- `incompleto`: 1 movimiento y el mes siguiente aún no tiene ningún registro.
- `completo`: 2+ movimientos ese mes, **o** ya existe al menos un movimiento en el mes siguiente (se interpreta como que ese recibo ya "cerró" el periodo anterior).

`getFacturasCompletenessByYear()` agrega este estado a través de las 5 categorías de factura, mes a mes (usado para marcar visualmente el Dashboard).

La pestaña Facturas ofrece tres vistas por categoría (tabla / gráfico de línea solo-meses-completos / listado agrupado por `facturaId`).

### Alta dividida (`js/facturas-split.js`)

Dos algoritmos de reparto, ambos con **redondeo a 2 decimales y el último mes absorbiendo el resto** para que la suma cuadre exactamente con el importe total:

- `calcularRepartoPorMeses(importeTotal, numMeses, mesInicio)`: reparto a partes iguales entre `numMeses` empezando en `mesInicio`.
- `calcularRepartoPorRango(importeTotal, fechaInicio, fechaFin)`: reparto proporcional a los días naturales que el rango `[fechaInicio, fechaFin]` ocupa en cada mes calendario que toca.

Al enviar el formulario (`handleFacturaSplitSubmit`), si el resultado tiene más de 1 mes se genera un `facturaId` (`crypto.randomUUID()`) compartido por todos los movimientos `GASTO` creados (uno por mes, acción `movimientos_lote` → `POST` en lote a Supabase, o su equivalente en Demo/Local); si es un solo mes, se crea sin `facturaId`.

## 7. Capa de acceso a datos (`js/api.js`)

`apiRequest(action, method, data, isBackground)` es la única función que habla con el backend. Acciones soportadas (mismo nombre en las tres implementaciones — Supabase / Demo / Local):

```
movimiento, movimientos_lote, transferencia,
editar_movimiento, editar_transferencia, eliminar_movimiento,
presupuesto, editar_presupuesto_periodo, eliminar_presupuesto,
categoria, subcategoria, editar_categoria, editar_subcategoria,
categorias | subcategorias | presupuestos | movimientos (GET),
custom:/rest/v1/... (GET arbitrario, usado para queries filtradas/paginadas), todo (RPC obtener_todo)
```

En modo Supabase cada acción mapea a un verbo REST + endpoint (`/rest/v1/movimientos`, `/rest/v1/presupuestos`, etc.), usando `apikey`/`Authorization: Bearer <anonKey>` como cabeceras. Las respuestas `POST` esperan `Prefer: return=representation` para poder leer el `id` insertado; `Content-Range` se usa para extraer el conteo total en queries paginadas (`Prefer: count=exact`).

### Sincronización (`syncData`, `syncScreenData`)

- `syncData()`: sincronización completa — recarga metadatos (categorías/subcategorías/presupuestos) y fuerza refresco de la pantalla activa. Se llama al arrancar, al pulsar "Sincronizar", o como fallback si Realtime no está disponible.
- `syncScreenData(hash)`: carga bajo demanda solo lo necesario para la pantalla activa (usa `state.loadedScreens` como caché para no repetir peticiones), y decide qué columnas/filtros pedir según la pantalla (p. ej. Movimientos usa paginación server-side; Dashboard/Cuentas/Facturas piden todo el histórico "ligero" para poder indexar).

### Realtime

`initSupabaseRealtime()` abre un canal (`postgres_changes`, `event: '*', schema: 'public'`) con `@supabase/supabase-js`. Cualquier cambio (de este cliente u otro dispositivo) dispara `handleRealtimeChange()`, que hace debounce (300 ms), invalida `state.loadedScreens`, y refresca metadatos + pantalla activa. Gracias a esto, tras cualquier escritura vía `apiRequest`, si `realtimeChannel` está activo **no** se llama a `syncData()` manualmente (se deja que el evento Realtime lo dispare) — se ve en el patrón repetido `if (!realtimeChannel) await syncData();` en los handlers de escritura.

`initVisibilityHandler()` (`js/event-handlers.js`) fuerza reconexión de Realtime y resincronización en background cuando la pestaña vuelve a ser visible (mitiga sockets muertos tras suspender el dispositivo/pestaña).

## 8. Routing SPA (`app.js`)

Enrutado por `hash` (`#dashboard`, `#movimientos`, `#cuentas`, `#facturas`, `#configuracion`). `handleRoute()`:
1. Si se sale de `#movimientos` con una edición en curso, la cancela silenciosamente.
2. Activa/desactiva la sección `.app-screen` y el `.nav-item` correspondientes.
3. En modo Supabase llama a `syncScreenData(hash)`; en Demo/Local llama directamente a la función de renderizado de esa pantalla (`recreateCharts`, `applyMovementsFilters`, `renderCuentas`, `renderFacturas`, `renderConfigManagement`).

No hay dependencias externas de routing (no hay `history.pushState`, todo vía `hashchange`).

## 9. Renderizado por pantalla

- **Dashboard** (`js/charts.js`): `updateDashboardMetrics()` recalcula el índice y las 5 métricas superiores; `recreateCharts()` destruye y reconstruye los 8 gráficos de Chart.js (ingresos vs. gastos, categorías, subcategorías, presupuesto vs. real, top categorías, ahorro, comparativa interanual, histórico mensual), cada uno con sus propios filtros persistidos en `state.chartFilters`.
- **Movimientos** (`js/transactions.js`): en Supabase, filtro y paginación son **server-side** (`custom:/rest/v1/movimientos?select=*&order=...&limit=...&offset=...` con `or=(...)`/`ilike`/`eq` según filtros activos); en Demo/Local se filtra el array en memoria y se pagina client-side. `buildSaldoMap()` calcula el saldo acumulado tras cada movimiento (solo `INGRESO`/`GASTO` afectan; `TRANSFERENCIA` no) para la columna "Saldo".
- **Cuentas** (`js/accounts.js`): tarjeta por categoría activa con barra de progreso (gastado vs. recibido ese mes) y desglose acumulado desplegable mes a mes; usa `getEffectiveBudget` + `getCategoryNetCashFlow`. Marca con una insignia si una categoría de factura está pendiente de pago ese mes (reutiliza `getFacturaYearData`).
- **Facturas** (`js/facturas.js` + `js/facturas-split.js`): ver §6.
- **Configuración** (`js/config.js`): 5 sub-pestañas (Base de Datos, Presupuestos, Categorías y Subcategorías, Acciones Automatizadas, Recálculo Anual), todas renderizadas por `renderConfigManagement()` más las funciones específicas de reparto/recálculo.

## 10. Persistencia local y claves de `localStorage`

```
theme                          'dark' | 'light'
contable_supabase_api_url      URL del proyecto Supabase
contable_supabase_key          Anon Key de Supabase
contable_is_local_mode         'true' | 'false'
contable_local_db              JSON con { categorias, subcategorias, presupuestos, movimientos }
```

El backup manual (botón "Descargar Base de Datos") vuelca exactamente esas cuatro colecciones a un `.json` descargable; `handleLocalFileSelected()` valida su forma (`validateLocalJSON`) antes de cargarlo.

## 11. PWA / Service Worker

`sw.js` implementa cache-first para los assets estáticos (HTML/CSS/JS propios + Chart.js/Supabase-js/fuentes desde CDN), con bypass explícito para cualquier petición a `supabase.co` o `/rest/v1/` (nunca se cachean datos de la API). Fuentes/imágenes se refrescan en segundo plano tras servir la versión cacheada. El Service Worker solo se registra sobre HTTPS o `localhost` (`app.js`).

## 12. Notas de diseño relevantes

- Todas las categorías/subcategorías son **soft-delete** vía `activa` (nunca se borran filas): el histórico de movimientos sigue siendo válido aunque la categoría se desactive.
- Los IDs de categoría especiales (9 = Ahorro, 10 = Inputs) están hardcodeados en `js/state.js` (`CATEGORIA_AHORRO_ID`, `CATEGORIA_INGRESOS_ID`) — cualquier cambio de esquema en Supabase que reasigne esos IDs requiere actualizar también el cliente.
- `TRANSFERENCIA` nunca mueve el "saldo disponible" global (`totalNeto`): es dinero que ya estaba dentro del sistema, solo cambia de sobre.
- El sistema de presupuestos es **append-only versionado**, nunca se actualiza un presupuesto in-place salvo mediante `editar_presupuesto_periodo` (edición de metadatos de una versión concreta, usada internamente al desactivar); la vía normal de "cambiar un presupuesto" es crear una nueva versión con `version + 1`.
