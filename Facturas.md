**Como** gestora de las cuentas
**Quiero** poder ver que facturas están pagadas y cuales quedan por pagar, así como ver la evolución de las mimas
**Para** poder hacerme a la idea de cuanto dinero real queda en la cuenta y poder gestionar si aumentan o diminuyen los gastos

# Descripción 
Quiero poder tener una pestaña de facturas pagadas, para eso hay que saber que gastos son facturas: Luz, Gas, Agua y Basuras. Todos los gastos de estas categorías son "facturas". Las facturas están divididas en varios meses, es decir, una factura puede cubrir del 1 de enero al 15 de marzo y por tanto la sigueinte irá desde el 16 de marzo en adelante. Por tanto, una factura tiene gastos en varios meses y un mes no tiene porque cerrarse con una sola factura y un solo gasto.
La pestaña de facturas quiero que me muestre los gastos mensuales que he ido metiendo en cada categoría, no es necesario agrupar facturas y quiero que me diga si un mes está completo o no. 

¿Cuando un mes esta completo? Cuando ya se ha registrado un cobro en el mes siguiente o cuando al menos, hay dos cobros para ese mes. Por lo general los meses siempre van a estar incompletos hasta que se registr un cobro en el mes siguiente.

# Preguntas y respuestas (aclaraciones previas a la implementación)

**¿Dónde debería vivir la nueva vista de Facturas?**
Nueva pestaña en el sidebar (al mismo nivel que Dashboard, Movimientos, Cuentas, Configuración), no como sub-pestaña de Cuentas.

**¿Qué cuenta como "un cobro registrado" para un mes, a efectos de la regla de completitud?**
Un movimiento GASTO con esa fecha_referencia. Cada registro individual de gasto (tipo GASTO) de esa categoría cuya fecha_referencia caiga en ese mes cuenta como 1 cobro. Si hay 2 registros en el mismo mes (p.ej. dos facturas que se solapan), el mes ya está completo.

**¿Qué alcance temporal debe mostrar la vista de Facturas?**
Filtrado por año con selector (igual que Dashboard/Cuentas: un desplegable de año arriba, y se muestran los meses de ese año).

**¿Se muestran solo los meses con al menos un gasto registrado, o todos los meses (incluyendo huecos sin ningún gasto todavía)?**
Todos los meses del rango: se muestran todos los meses del año seleccionado, marcando explícitamente los que no tienen ningún gasto como "Sin registrar".


# Cambios
Quiero que cada tarjeta de facturas tenga dos formas de visualizarse, en formato tabla (como esta ahora) con el dinero gastado cada mes y si esta completado y otra vista de gráfico en el que me muestre un gráfico del gasto mes a mes, solo de los meses completos, para poder ir controlando.