# Presupuesto por subcategoría — Requisitos y decisiones

Documento de trabajo para definir cómo debería funcionar el presupuesto a nivel de subcategoría,
antes de convertirlo en un plan de implementación. Recoge (1) cómo funciona hoy el presupuesto por
categoría en cada parte de la app, y (2) las decisiones del usuario sobre cómo extenderlo a subcategorías.

## Cómo funciona el presupuesto por categoría hoy (estado actual, sin cambios)

### Modelo de datos
Un registro de `presupuesto` tiene: `categoriaId`, `fecha_inicio` (día 1 del mes), `fecha_fin`
(último día del mes, o `null` = indefinido), `presupuesto` (importe mensual), `version` (entero
incremental) y `activa` (booleano). El sistema es **append-only y versionado**: nunca se edita un
presupuesto in-place — "editar" o "desactivar" siempre crean una fila nueva con `version + 1` dentro
del mismo "período" (`categoriaId + fecha_inicio + fecha_fin`). Solo cuenta la versión más alta de
cada período, y solo si está `activa`. "Eliminar" sí borra físicamente todas las versiones de un período.

`getEffectiveBudget(categoriaId, mes, año)` decide el presupuesto vigente de un mes: agrupa por
período, coge la última versión de cada uno, descarta las inactivas, y de los períodos que cubren
ese mes elige el de `fecha_inicio` más reciente (gana el rango más específico/tardío).

### Configuración → pestaña "Presupuestos"
Formulario con Categoría, Mes Inicio, Mes Fin (opcional) e Importe. Debajo, un histórico agrupado
por categoría y período, con botones Editar (precarga el formulario, no edita in-place), Desactivar
(crea versión con importe 0) y Eliminar (borra todo el período). No existe ningún selector de
subcategoría en este formulario.

### Configuración → "Reparto mensual"
Reparte el ingreso registrado en "Inputs" ese mes entre las demás categorías **según su presupuesto
vigente**, y manda el remanente a Ahorro. Usa `computeRepartoMensual`, que sencillamente suma
`getEffectiveBudget` de cada categoría no especial.

### Configuración → "Recálculo anual de presupuestos"
Compara, por categoría, el presupuesto mensual actual con el gasto real del año, y propone un nuevo
presupuesto mensual (gasto real medio + margen de seguridad %) para crearlo como período anual
completo del año siguiente.

### Cuentas
Cada categoría es una tarjeta ("cuenta") con: presupuesto del mes filtrado, barra de progreso,
badge "Excedido" o "X% restante", y un desglose mensual histórico con presupuesto/ingreso/delta de
cada mes. Si la categoría no tiene presupuesto ese mes, se muestra "Sin presupuesto este mes" y no
hay barra.

### Dashboard
Único gráfico con presupuesto: "Presupuesto vs Gasto Real" (barras), una barra de presupuesto y una
de gasto real por categoría, coloreada en rojo si el gasto supera el presupuesto, verde si no, y
ámbar si es una categoría de factura con el mes aún no cerrado.

### Facturas
Columna informativa "Presupuesto" por mes en las tarjetas de Luz/Gas/Agua/Basuras/Internet — solo
para mostrar el dato, sin badges ni colores condicionales. **Estas categorías de factura hoy no
tienen subcategorías** en los datos de ejemplo (solo "Compra" y "Otras Compras" las tienen).

### Punto clave para el rediseño
Todo el sistema pivota sobre `categoriaId`; no existe `subcategoriaId` en `presupuestos` en ningún
sitio. Extender esto implica decidir el modelo de datos, cómo se relaciona con el presupuesto de la
categoría padre, y cómo lo reflejan Cuentas, Dashboard, Facturas, Reparto y Recálculo.

---

## Decisiones del usuario

### 1. Relación entre presupuesto de categoría y de subcategoría
**Presupuesto repartido.** Cuando una categoría reparte su presupuesto por subcategorías, la
categoría deja de tener un importe propio "manual": su presupuesto efectivo pasa a ser la **suma**
de los presupuestos de sus subcategorías (para ese mes/período). Las subcategorías sin presupuesto
propio no tienen límite individual, pero su gasto sí cuenta dentro del total gastado de la categoría.

### 2. Alcance — para qué categorías aplica, y cuándo se cae al modo categoría
**Automático, con fallback por categoría.** No hace falta activar nada a nivel de categoría. El
criterio, por categoría y por mes, es:
- Si la categoría tiene **al menos una subcategoría con presupuesto vigente ese mes** → el
  presupuesto efectivo de la categoría = suma de los presupuestos vigentes de sus subcategorías
  (modo "repartido", punto 1).
- Si la categoría **no tiene ningún presupuesto de subcategoría vigente ese mes** → se usa el
  presupuesto de la categoría tal cual funciona hoy (sin cambios).

Esto aplica igual a cualquier categoría que tenga subcategorías activas (hoy: Compra, Otras Compras;
en el futuro, cualquier otra a la que se le añadan subcategorías, incluidas las de factura).

### 3. Formulario de alta en Configuración → Presupuestos
**Mismo formulario, con selector opcional.** Se añade un desplegable "Subcategoría (opcional)" junto
al de Categoría. En "(Toda la categoría)" se comporta exactamente como hoy. Al elegir una
subcategoría, el alta/versión de presupuesto se aplica a esa subcategoría en vez de a la categoría.

### 4. Versionado/histórico de presupuestos de subcategoría
**Igual que el de categoría.** Mismas reglas: rango `fecha_inicio`/`fecha_fin`, versionado
append-only (`version`, `activa`), botones Desactivar (crea versión a 0) y Eliminar (borra el
período completo). Misma lógica de `getEffectiveBudget`, mismos criterios de vigencia.

### 5. Pestaña Cuentas — visualización
**Desglose expandible.** La tarjeta de una categoría que reparte por subcategorías sigue mostrando
el total (barra + badge Excedido/% restante) igual que hoy, pero además se puede expandir para ver
una barra de progreso individual por cada subcategoría (presupuesto propio / gastado / restante).

### 6. Dashboard — gráfico "Presupuesto vs Gasto Real"
**Sin cambios.** El gráfico sigue mostrando una barra por categoría (usando el nuevo total, sea
presupuesto propio o suma de subcategorías). No se añade desglose por subcategoría en el gráfico.

### 7. Reparto mensual
**Una transferencia por categoría.** Igual que hoy: se transfiere un único importe (el total/suma)
de Inputs a la categoría. El reparto por subcategoría es solo para control de presupuesto — no
cambia cómo se mueve el dinero entre cuentas.

### 8. Recálculo anual
**También por subcategoría.** Si la categoría reparte por subcategorías, el recálculo se hace por
subcategoría: compara el gasto real anual de cada subcategoría con su presupuesto actual y propone
un nuevo importe por subcategoría, aplicable con el mismo checkbox de hoy.

### 9. Subcategorías sin presupuesto propio en el desglose de Cuentas
**Se listan igual, sin barra de límite.** Aparecen en el desglose expandible mostrando solo su
gasto del mes (p. ej. "Gasto: 24€ · sin presupuesto propio"), consistente con cómo hoy se trata una
categoría sin presupuesto (mensaje informativo, sin barra de progreso).

### 10. Recálculo anual — presentación de las filas de subcategoría
**Desglose expandible, igual patrón que Cuentas.** La fila de la categoría se puede expandir para
ver una fila de recálculo (propuesta + checkbox "Aplicar") por cada una de sus subcategorías.
Consistente con el punto 5.

### 11. Configuración — ubicación del histórico de versiones de subcategoría
**Anidado en la tarjeta de la categoría padre.** Dentro de la tarjeta de la categoría (p. ej.
"Compra"), un sub-bloque con su propio histórico de versiones por cada subcategoría con presupuesto.
Todo visualmente junto y jerárquico, coherente con los puntos 5 y 10.

### 12. Caso borde — presupuesto de categoría cuando ya hay subcategorías activas
**Se permite añadir, pero queda visualmente marcado como desactivado.** El formulario no bloquea
definir un presupuesto de categoría aunque ya existan subcategorías con presupuesto vigente ese
período: se guarda igual, pero en el histórico de Configuración se muestra claramente etiquetado
como "Desactivado (sustituido por presupuesto de subcategorías)" mientras haya al menos una
subcategoría con presupuesto vigente. Si más adelante se desactivan/eliminan todas las
subcategorías de esa categoría, ese presupuesto de categoría vuelve a aplicar automáticamente (sin
necesidad de recrearlo) y deja de mostrarse como desactivado.

### Nota — pestaña Facturas
No se ha preguntado específicamente porque no requiere una decisión propia: hereda el modelo
automáticamente (punto 2). Hoy las categorías de factura (Luz, Gas, Agua, Basuras, Internet) no
tienen subcategorías, así que su columna "Presupuesto" seguiría mostrando el presupuesto de
categoría sin cambios — a menos que en el futuro se les añadan subcategorías con presupuesto, en
cuyo caso mostraría automáticamente la suma, igual que cualquier otra categoría.

---

## Resumen para el plan de implementación

Piezas que tocará el desarrollo:
1. **Esquema**: añadir `subcategoriaId` (nullable) a `presupuestos`.
2. **`getEffectiveBudget`**: nueva lógica de resolución — por subcategoría igual que hoy por
   categoría; y una función/capa que calcule el "presupuesto efectivo de categoría" = suma de
   subcategorías vigentes si existe alguna, si no, el presupuesto propio de la categoría (con el
   marcado de "desactivado" del punto 12 cuando aplique).
3. **Formulario de Configuración** (`index.html` + `event-handlers.js`): selector de subcategoría
   opcional, y ajuste del submit para incluir `subcategoriaId` en el payload.
4. **Histórico de Configuración** (`config.js`): anidar sub-bloques de historial de subcategoría
   dentro de la tarjeta de categoría; marcar presupuestos de categoría "desactivados".
5. **Cuentas** (`accounts.js`): desglose expandible por subcategoría dentro de la tarjeta.
6. **Recálculo anual** (`config.js` + `event-handlers.js`): calcular y aplicar propuestas también
   por subcategoría, con el mismo patrón de desglose expandible.
7. **Reparto mensual**: sin cambios funcionales (sigue operando a nivel de categoría con el importe
   ya sumado).
8. **Dashboard**: sin cambios (usa el total ya calculado).
9. **API/Storage** (`api.js`, `storage.js`): incluir `subcategoriaId` en las acciones
   `presupuesto`/`eliminar_presupuesto` para Supabase, Demo y Local.


