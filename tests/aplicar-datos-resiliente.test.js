// tests/aplicar-datos-resiliente.test.js
//
// Regresión del bug real reportado por Gonzalo: creó una cuenta custom
// (APV Jubilación, $170.000), la vio guardarse en Drive (confirmado
// inspeccionando el JSON crudo), pero al recargar (F5) la cuenta
// desaparecía de la app.
//
// Causa raíz real (confirmada con el stack trace del usuario): _aplicarDatos
// está reasignada ~5 veces, cada capa envolviendo a la anterior y llamándola
// PRIMERO ("orig.apply(...)") antes de agregar su propia restauración. Una
// de esas capas llamaba a v6SyncMatrizFromAsignador(), que tenía un bug
// (usaba nombres de persona sin normalizar como si fueran ids de fila) y
// tiraba una excepción no capturada. Como ninguna capa envolvía su llamada a
// "orig" en try/catch, esa excepción cortaba la cadena a la mitad — antes de
// llegar a la capa que restaura window._cuentasCustom desde Drive — sin
// ningún error visible para el usuario (solo aparecía en la consola).
//
// Fix: (1) v6SyncMatrizFromAsignador ahora normaliza personas y no revienta
// con nombres inesperados; (2) además, cada una de las 5 capas de
// _aplicarDatos ahora envuelve su llamada a "orig" en try/catch, así que
// CUALQUIER falla futura en una capa temprana ya no puede volver a impedir
// que las capas posteriores (como la de cuentasCustom) restauren los datos.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('_aplicarDatos restaura cuentasCustom aunque una capa anterior de la cadena falle', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  // Simula el bug real: una función intermedia de la cadena de restauración
  // (llamada sincrónicamente dentro de una de las capas de _aplicarDatos)
  // revienta con una excepción no capturada.
  window.v6SyncMatrizFromAsignador = function() {
    throw new Error('boom: simula el bug real de persona sin normalizar');
  };

  window._cuentasCustom = [];
  window._metasCustom = [];

  let threw = false;
  try {
    window._aplicarDatos({
      cuentasCustom: [{ id: 'x1', nombre: 'APV Jubilación', saldo: 170000 }],
      metasCustom: [],
      deudores: [{ nombre: 'Test', monto: 1000, cobrado: false }],
    });
  } catch (e) {
    threw = true;
  }

  assert.equal(threw, false, '_aplicarDatos no debe dejar escapar una excepción de una capa intermedia');
  assert.ok(
    window._cuentasCustom.some((c) => c.nombre === 'APV Jubilación'),
    'la capa que restaura cuentasCustom debe ejecutarse igual, aunque una capa anterior haya fallado'
  );
});
