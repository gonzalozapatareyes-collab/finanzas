# Mis Finanzas — contexto para Claude Code

App personal de finanzas de Gonzalo: single-file HTML/JS (`index.html`), PWA,
sync con Google Drive vía OAuth, hosteada en GitHub Pages.

## Reglas duras (no negociables)

- **El módulo de deudores NO se toca**, bajo ninguna circunstancia, salvo
  pedido explícito y específico de Gonzalo.
- Trabajar siempre en **pesos chilenos** (formato `$1.234.567`, sin decimales).
- No eres asesor financiero certificado: entrega información y escenarios
  claros, no recomendaciones categóricas.
- Antes de cualquier commit: correr `npm test` y que pasen todos los tests.
  Si un cambio rompe un test, no es "ajustar el test" por defecto — primero
  hay que entender si el test detectó un bug real.

## Arquitectura (importante entenderla antes de tocar código)

Es un archivo único de ~10.600 líneas con capas de parches apiladas
(v6, v17, v19, v24, v25, v28, v31...) que se re-envuelven entre sí —
`_aplicarDatos` está reasignada ~5 veces, por ejemplo. Antes de "arreglar"
algo, buscar TODAS las funciones relacionadas (suele haber más de una
ruta de cálculo para lo mismo — ver el bug de cuentas custom en el
historial, donde el dashboard sí sumaba una cuenta pero la tabla
"Historial mensual" no).

Hay **dos sistemas de historial en paralelo**, que hay que mantener
consistentes entre sí cuando se toca cualquiera de los dos:
- `window._historialAhorros` (legacy, alimenta la tabla "Historial mensual")
- Snapshots V6 (`v6GetSnapshots()` / `v6SaveSnapshots()`, alimentan
  Histórico con tarjetas y "Recuperar mes manualmente")

Cuentas: 4 "duras" (`mp`, `be`, `fr`, `fc`) hardcodeadas en ~30 lugares del
código, más un sistema de **cuentas custom** (`window._cuentasCustom`)
completamente aparte para cuentas agregadas por el usuario vía la UI
("+ Agregar cuenta"). Al tocar cualquier cálculo de totales, verificar que
sume ambas fuentes.

Cripto (ETH+BTC) fue eliminada como cuenta trackeada — no debe reaparecer
en ningún array ni cálculo (hay un test que lo cubre: `tests/no-cripto.test.js`).

## Tests

`tests/` usa jsdom para cargar el `index.html` real dentro de un DOM
simulado y llamar a sus funciones tal cual, sin mocks de la lógica de
negocio. Ver `tests/README.md` para el detalle de qué cubre cada archivo.

```
npm install
npm test
```

## Estilo de trabajo esperado

- Cambios quirúrgicos, no refactors grandes sin que Gonzalo los pida
  explícitamente.
- Si un cambio toca un cálculo de totales/historial, agregar o actualizar
  un test que lo cubra.
- Explicar en español, claro y directo, qué se cambió y por qué — Gonzalo
  no es programador de profesión.
