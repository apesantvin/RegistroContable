# Registro Contable — Manual de Usuario

Guía rápida de uso. Para el funcionamiento interno de la app, consulta `DOCUMENTACION-TECNICA.md`.

## 1. Cómo empezar

Al abrir la app eliges uno de tres modos:

- **Conectar a la nube (Supabase)**: introduces la URL y la Anon Key de tu proyecto Supabase. Los datos se guardan en la nube y se sincronizan en tiempo real entre dispositivos.
- **Archivo local**: cargas o creas una base de datos en un archivo `.json` que se guarda en tu navegador. Debes descargarlo de vez en cuando (botón 📥) para tener una copia de seguridad real.
- **Modo Demo**: datos de ejemplo, sin guardar nada. Útil para probar la app.

El botón "Volver a Inicio" del menú lateral te devuelve a esta pantalla de selección.

## 2. Conceptos clave

- **Categorías**: son los "sobres" del dinero (Luz, Agua, Compra, Ahorro, etc.). Cada categoría puede tener **subcategorías** (p. ej. "Compra" → "Compra Comida").
- **Movimientos**: cada apunte que registras. Hay tres tipos:
  - **Gasto**: dinero que sale de una categoría.
  - **Ingreso**: dinero que entra en una categoría (normalmente en "Inputs", la categoría donde entra tu nómina/ingresos).
  - **Transferencia**: mueve dinero de una categoría a otra (no es ni gasto ni ingreso real, solo reparto interno).
- **Mes de referencia**: el mes al que "pertenece" el gasto (puede no coincidir con la fecha en la que lo registras — útil para facturas que llegan más tarde).

## 3. Añadir un gasto (o ingreso)

1. Ve a **Movimientos** y pulsa **+** (o el botón "Añadir Transacción").
2. Elige el tipo: Gasto, Ingreso o Transferencia.
3. Rellena importe, concepto, fecha y categoría (y subcategoría, si aplica).
4. El "mes de referencia" se rellena solo a partir de la fecha, pero puedes cambiarlo.
5. Guarda. Desde la lista de Movimientos puedes editar, duplicar o borrar cualquier apunte con los iconos de la fila.

## 4. Facturas divididas en varios meses

Si una factura (Luz, Gas, Agua, Basuras, Internet) cubre un periodo que cruza varios meses, en la pestaña **Facturas** pulsa **"+ Nueva factura"**:

- **Por número de meses**: indicas el importe total, cuántos meses y el mes de inicio; se reparte a partes iguales.
- **Por rango de fechas**: indicas fecha de inicio y fin; el importe se reparte según los días que caen en cada mes.

Esto crea automáticamente un movimiento de Gasto por cada mes, enlazados entre sí. En la pestaña Facturas puedes ver, por categoría:
- **Tabla**: gasto de cada mes y si está "Completo" (ya se ha registrado el recibo del mes siguiente, o hay 2+ gastos ese mes), "Incompleto" o "Sin registrar".
- **Gráfico**: evolución mensual del gasto (solo meses completos).
- **Por factura**: cada factura dada de alta, con su desglose de meses.

## 5. Sobres / Cuentas (saldo por categoría)

La pestaña **Cuentas** muestra, mes a mes, cuánto dinero real tiene cada categoría:

- **Presupuesto**: el límite mensual que le has asignado (Configuración → Presupuestos).
- **Gastado**: lo gastado ese mes en esa categoría.
- **Restante / Excedido**: lo que le queda o se ha pasado.
- **Acumulado total**: el saldo real acumulado de la categoría desde siempre (ingresos + transferencias recibidas − gastos − transferencias enviadas). Se puede desplegar para ver el detalle mes a mes.

Pulsando sobre una tarjeta vas directo a los Movimientos de esa categoría y mes.

## 6. Presupuestos

En **Configuración → Presupuestos** defines, por categoría, un importe mensual válido para un rango de meses (con fecha de fin opcional = "indefinido"). Puedes editar, desactivar o eliminar un presupuesto, y consultar el historial de versiones si lo has cambiado varias veces.

## 7. Reparto automático de ingresos y sobrantes

En **Configuración → Acciones Automatizadas**:

- **Reparto Mensual de Ingresos**: reparte lo ingresado ese mes en "Inputs" entre las demás categorías según su presupuesto vigente, y manda el remanente a "Ahorro". Se ejecuta con un clic tras revisar la vista previa.
- **Transferencia de Saldos Sobrantes**: muestra el sobrante acumulado de cada categoría en el año y permite transferirlo a "Ahorro", una a una o todas a la vez.

En **Configuración → Recálculo Anual** puedes comparar el presupuesto mensual actual de cada categoría con el gasto real del año y aplicar una propuesta ajustada para el año siguiente.

## 8. Dashboard

Resumen general: saldo disponible, ingresos/gastos del año, ahorro acumulado, y varios gráficos (ingresos vs. gastos, distribución por categoría/subcategoría, presupuesto vs. real, top categorías, evolución del ahorro, comparativa interanual).

## 9. Copia de seguridad (modo local)

En modo Archivo Local, usa el botón **📥 Descargar Base de Datos** regularmente para no perder datos: todo vive en la caché del navegador hasta que lo descargas.
