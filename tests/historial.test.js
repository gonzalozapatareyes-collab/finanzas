// tests/historial.test.js
//
// Regresión del bug real: al agregar una cuenta custom (ej. "Fintual - APV
// Jubilación"), su saldo no se sumaba en la tabla "Historial mensual"
// (guardarSnapshotHistorial / v6RenderAhorros), aunque sí se sumaba en el
// dashboard. Estos tests fijan el comportamiento correcto para que no
// vuelva a desalinearse.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

function setCuenta(window, id, valor) {
  const el = window.document.getElementById('c-' + id);
  assert.ok(el, `no existe el input c-${id}`);
  el.value = String(valor);
}

test('guardarSnapshotHistorial incluye el saldo de cuentas custom en saldoTotal', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  setCuenta(window, 'mp', 1000);
  setCuenta(window, 'be', 2000);
  setCuenta(window, 'fr', 3000);
  setCuenta(window, 'fc', 4000);

  window._cuentasCustom = [
    { id: 'cta_apv', nombre: 'Fintual - APV Jubilación', saldo: 170000, tag: '', color: '#000' },
  ];

  window.guardarSnapshotHistorial();

  const hist = window._historialAhorros;
  assert.equal(hist.length, 1);
  // 1000+2000+3000+4000 = 10000, + 170000 de la cuenta custom
  assert.equal(hist[0].saldoTotal, 180000);
});

test('v6RenderAhorros: el total del mes en curso incluye cuentas custom', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  setCuenta(window, 'mp', 1000);
  setCuenta(window, 'be', 2000);
  setCuenta(window, 'fr', 3000);
  setCuenta(window, 'fc', 4000);

  window._cuentasCustom = [
    { id: 'cta_apv', nombre: 'Fintual - APV Jubilación', saldo: 170000, tag: '', color: '#000' },
  ];
  window._acumuladoMes = {};

  window.v6RenderAhorros();

  const tabla = window.document.getElementById('v6-tabla-historica');
  assert.ok(tabla, 'no existe el contenedor de la tabla histórica');
  // El monto total (10.000 + 170.000 = 180.000) debe aparecer en la fila del mes actual.
  assert.match(tabla.innerHTML, /\$180\.000/);
});

test('sin cuentas custom, el comportamiento no cambia (no rompe el caso normal)', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  setCuenta(window, 'mp', 1000);
  setCuenta(window, 'be', 2000);
  setCuenta(window, 'fr', 3000);
  setCuenta(window, 'fc', 4000);
  window._cuentasCustom = [];

  window.guardarSnapshotHistorial();

  assert.equal(window._historialAhorros[0].saldoTotal, 10000);
});
