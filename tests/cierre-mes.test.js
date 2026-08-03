// tests/cierre-mes.test.js
//
// Regresión del bug de "julio en $0": el snapshot de cierre de mes se tomó
// antes de que los datos reales (cargados desde Drive) estuvieran puestos
// en los inputs del DOM, así que v6TomarSnapshot() leyó ceros.
//
// No podemos re-simular el timing exacto de window.onload + Drive aquí,
// pero SÍ podemos fijar el contrato que evita que ese bug se repita:
// v6TomarSnapshot() debe reflejar exactamente lo que hay en el DOM en el
// momento en que se llama — nunca un valor cacheado o vacío.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

function setCuenta(window, id, valor) {
  window.document.getElementById('c-' + id).value = String(valor);
}
function setDeposito(window, id, valor) {
  window.document.getElementById('dep-' + id).value = String(valor);
}

test('v6TomarSnapshot refleja el saldo real del DOM en el momento de llamarlo', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  setCuenta(window, 'mp', 500000);
  setCuenta(window, 'be', 300000);
  setCuenta(window, 'fr', 200000);
  setCuenta(window, 'fc', 100000);

  const snap = window.v6TomarSnapshot('Julio 2026');

  assert.ok(snap, 'v6TomarSnapshot no debería devolver null/undefined con datos cargados');
  const total = Object.values(snap.cuentas).reduce((a, b) => a + (b || 0), 0);
  assert.equal(total, 1100000, 'el snapshot no refleja los saldos reales del DOM');
});

test('v6TomarSnapshot NO debe devolver todo en cero si el DOM tiene datos cargados', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  setCuenta(window, 'mp', 123456);
  setCuenta(window, 'be', 0);
  setCuenta(window, 'fr', 0);
  setCuenta(window, 'fc', 0);

  const snap = window.v6TomarSnapshot('Agosto 2026');
  const total = Object.values(snap.cuentas).reduce((a, b) => a + (b || 0), 0);

  // Guardarraíl explícito: si esto falla, algo está leyendo el DOM antes
  // de tiempo (mismo patrón que causó julio en $0).
  assert.notEqual(total, 0);
  assert.equal(total, 123456);
});

test('los depósitos pendientes del mes también quedan en el snapshot', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  setCuenta(window, 'mp', 100000);
  setDeposito(window, 'mp', 50000);

  const snap = window.v6TomarSnapshot('Agosto 2026');
  assert.equal(snap.depositos.mp.monto, 50000);
});
