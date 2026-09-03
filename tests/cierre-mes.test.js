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

test('v6CheckAutoSnapshot NO cierra el mes si no hay driveAccessToken, aunque los datos estén confirmados', (t) => {
  // Regla explícita pedida por Gonzalo: el cierre automático solo puede
  // correr una vez que la app está VINCULADA a Drive. En la práctica
  // _datosRealesCargados no debería poder quedar en true sin token (ver
  // cargar()), pero el guardarraíl chequea ambos por separado para que la
  // regla no dependa de esa cadena de causalidad indirecta.
  const { window } = loadApp();
  t.after(() => window.close());

  window._datosRealesCargados = true;
  // driveAccessToken es un `let` de módulo, no una propiedad de `window`
  // (ver tests/guardar-concurrencia.test.js) — ya arranca en null por
  // defecto, así que no hace falta setearlo acá; se deja explícito igual.
  window.eval('driveAccessToken = null;'); // no vinculado a Drive
  window.localStorage.setItem('fg_v6_last_month', '2026-07');
  setCuenta(window, 'mp', 500000);

  let confirmLlamado = false;
  window.confirm = () => { confirmLlamado = true; return true; };

  return window.v6CheckAutoSnapshot().then(() => {
    assert.equal(confirmLlamado, false, 'no debe preguntar si cerrar el mes sin estar vinculado a Drive');
    assert.equal(window.v6GetSnapshots().length, 0, 'no debe crear ningún snapshot sin Drive vinculado');
    assert.equal(
      window.localStorage.getItem('fg_v6_last_month'),
      '2026-07',
      'el cierre pendiente debe reintentarse cuando sí esté vinculado a Drive'
    );
  });
});

test('v6CheckAutoSnapshot funciona normalmente cuando hay datos reales confirmados Y Drive vinculado', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window._datosRealesCargados = true;
  // driveAccessToken es un `let` de módulo, no una propiedad de `window`
  // (ver tests/guardar-concurrencia.test.js) — hay que setearlo vía eval.
  window.eval('driveAccessToken = "fake-token-de-test";');
  window.localStorage.setItem('fg_v6_last_month', '2026-07');
  setCuenta(window, 'mp', 500000);
  window.confirm = () => true;
  window.guardar = window.guardar || (() => Promise.resolve(true));

  return window.v6CheckAutoSnapshot().then(() => {
    const snaps = window.v6GetSnapshots();
    assert.equal(snaps.length, 1, 'debe crear el snapshot del mes anterior cuando hay datos reales y Drive vinculado');
    assert.notEqual(
      window.localStorage.getItem('fg_v6_last_month'),
      '2026-07',
      'debe actualizar el mes visto una vez procesado el cierre'
    );
  });
});
