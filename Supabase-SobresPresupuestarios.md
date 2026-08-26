# Cambios en Supabase — Sobres presupuestarios + facturaId

Extraído de `woolly-foraging-ember.md` (plan guardado en `~/.claude/plans/`). Este documento contiene **únicamente** los cambios a ejecutar manualmente en el proyecto Supabase real — nada de código de la app.

## 1. Nueva categoría "Inputs" (id 10)

```sql
INSERT INTO categorias (id, nombre, icono, activa)
VALUES (10, 'Inputs', '📥', true)
ON CONFLICT (id) DO NOTHING;
```

Si falla con un error del tipo *"cannot insert a non-DEFAULT value into column"* (la columna `id` es `GENERATED ALWAYS`), usar en su lugar:

```sql
INSERT INTO categorias (id, nombre, icono, activa)
OVERRIDING SYSTEM VALUE VALUES (10, 'Inputs', '📥', true)
ON CONFLICT (id) DO NOTHING;
```

En ambos casos, a continuación reajustar la secuencia para que los próximos `INSERT` sin `id` explícito no colisionen con el 10:

```sql
SELECT setval(pg_get_serial_sequence('categorias', 'id'), (SELECT MAX(id) FROM categorias));
```

## 2. Columna `facturaId` en `movimientos`

```sql
ALTER TABLE movimientos ADD COLUMN "facturaId" text;
```

Columna opcional (nullable): `null` para movimientos sueltos (todo el histórico actual y las altas normales), y un identificador compartido (generado por la app) para los movimientos que provienen de una misma factura dividida en varios meses.

## 3. Saldos de apertura por categoría (pendiente de decidir importes)

El plan señala (sección 0.5, marcado ⚠️) que al pasar del "Acumulado" simulado (basado en presupuesto) al saldo real (`income − expenses + transfer`), el histórico de cada categoría puede quedar con saldos negativos artificiales, porque nunca hubo dinero real transferido a ellas antes de este cambio.

Recomendación del plan: registrar una `TRANSFERENCIA` de "saldo de apertura" única por categoría (origen: Inputs u otra fuente → cada categoría) por el importe que se considere que "ya tenían" a esa fecha.

No se incluye SQL cerrado aquí porque depende de los importes reales que decidas asignar a cada categoría. Plantilla a rellenar cuando se decidan los importes:

```sql
INSERT INTO movimientos (fecha, fecha_referencia, tipo, "categoriaOrigenId", "categoriaDestinoId", concepto, importe)
VALUES
  (CURRENT_DATE, date_trunc('month', CURRENT_DATE), 'TRANSFERENCIA', 10, <categoriaId>, 'Saldo de apertura', <importe>);
  -- una fila por categoría con saldo de apertura distinto de 0
```

## Notas

- No hace falta tocar más columnas ni tablas: el reparto/cierre de año reutiliza `movimientos.tipo = 'TRANSFERENCIA'`, que ya existe.
- En modo Demo/Local, la categoría Inputs se añade directamente en `js/storage.js` (código), sin tocar Supabase; `facturaId` en esos modos simplemente se guarda como campo adicional en el array en memoria/JSON, sin migración.
- Según el propio plan (`Verificación`, puntos 1–10 y 12), todo el código se implementa y valida primero en Demo/Local; el SQL de las secciones 1 y 2 se ejecuta **al final**, no como primer paso.
