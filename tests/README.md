# Tests de Mis Finanzas

Suite mínima de regresión, enfocada en los puntos frágiles reales de la app
(cierre de mes, sync de historial, cuentas custom). No es una migración a
arquitectura modular — sigue siendo un solo `index.html`; estos tests cargan
ese archivo real dentro de un DOM simulado (jsdom) y llaman a sus funciones
tal cual existen hoy.

## Cómo correrlos

```bash
npm install   # una sola vez
npm test
```

## Qué cubre cada archivo

- **cierre-mes.test.js** — que `v6TomarSnapshot()` siempre lea el estado
  real del DOM al momento de llamarlo (causa raíz del bug de "julio en $0").
- **historial.test.js** — que las cuentas custom (ej. Fintual - APV
  Jubilación) se sumen en `guardarSnapshotHistorial()` y en la tabla
  "Historial mensual" (`v6RenderAhorros`), no solo en el dashboard.
- **no-cripto.test.js** — que la cuenta cripto (eliminada) no vuelva a
  aparecer por accidente en el código ni en el DOM.
- **papa-paola.test.js** — que Papá y Paola (separados de la persona
  combinada "Papa/Paola") tengan filas independientes en `syncTarjetas()`
  sin pisarse entre sí, y que los gastos históricos ya asignados al viejo
  "Papa/Paola" sigan contando en el total general exactamente una vez
  (ni se pierden, ni se funden con la fila nueva de Papá).
- **guardar-concurrencia.test.js** — que `guardar()` encole las escrituras
  a Drive en vez de dispararlas en paralelo. Cubre el bug real donde una
  cuenta custom (APV Jubilación) se veía guardada en pantalla pero
  desaparecía al refrescar: dos guardados casi simultáneos competían, y el
  más viejo podía "llegar" después y pisar al más nuevo sin ningún error
  visible.

## Cuándo correrlos

Antes de subir cualquier cambio al repo (o pídele a Claude Code que los
corra automáticamente antes de hacer commit). Si agregas una cuenta, un
gasto fijo, o tocas el flujo de cierre de mes / sync con Drive, y algún
test se rompe, es una señal real de que algo quedó inconsistente entre los
distintos lugares donde la app calcula totales.
