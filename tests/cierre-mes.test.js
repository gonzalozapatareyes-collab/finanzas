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

// Regresión del incidente de "agosto en $0": v6CheckAutoSnapshot() corría
// después de cargar(), pero cargar() puede terminar SIN haber traído datos
// reales (Drive momentáneamente inalcanzable, token restaurado tarde, etc.)
// y dejar el DOM en su estado por defecto (todo en cero) sin avisar. Si en
// ese momento cambió el mes, v6CheckAutoSnapshot tomaba esos ceros como el
// cierre real y los subía a Drive, pisando la data real del usuario.
test('v6CheckAutoSnapshot NO toma ni guarda snapshot si los datos reales no se confirmaron cargados', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window._datosRealesCargados = false; // cargar() no llegó a aplicar datos reales
  window.localStorage.setItem('fg_v6_last_month', '2026-07'); // mes anterior pendiente
  setCuenta(window, 'mp', 0); // DOM en su estado por defecto (vacío)

  let confirmLlamado = false;
  window.confirm = () => { confirmLlamado = true; return true; };

  return window.v6CheckAutoSnapshot().then(() => {
    assert.equal(confirmLlamado, false, 'no debe ni preguntar si cerrar el mes sin datos reales confirmados');
    assert.equal(window.v6GetSnapshots().length, 0, 'no debe crear ningún snapshot');
    assert.equal(
      window.localStorage.getItem('fg_v6_last_month'),
      '2026-07',
      'no debe marcar el mes como "visto" — el cierre pendiente debe reintentarse cuando sí haya datos reales'
    );
  });
});

test('v6CheckAutoSnapshot funciona normalmente cuando los datos reales SÍ se confirmaron cargados', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window._datosRealesCargados = true;
  window.localStorage.setItem('fg_v6_last_month', '2026-07');
  setCuenta(window, 'mp', 500000);
  window.confirm = () => true;

  return window.v6CheckAutoSnapshot().then(() => {
    const snaps = window.v6GetSnapshots();
    assert.equal(snaps.length, 1, 'debe crear el snapshot del mes anterior cuando sí hay datos reales');
    assert.notEqual(
      window.localStorage.getItem('fg_v6_last_month'),
      '2026-07',
      'debe actualizar el mes visto una vez procesado el cierre'
    );
  });
});
