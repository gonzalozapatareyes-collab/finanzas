// tests/cuentas-custom-historico.test.js
//
// Regresión: el CLAUDE.md del repo ya advierte sobre este patrón ("ver el
// bug de cuentas custom en el historial, donde el dashboard sí sumaba una
// cuenta pero la tabla 'Historial mensual' no") y volvió a pasar en dos
// lugares nuevos:
//
// 1. v6RenderHistorico() (la tarjeta de cada mes en Histórico) sumaba el
//    total "Patrimonio" solo con las 4 cuentas duras (s.cuentas), sin sumar
//    s.cuentasCustom — aunque v6GetEvolucionMensual() y v6RenderDashboard
//    SÍ lo hacen bien. Mismo dato, dos rutas de cálculo, una rota.
//
// 2. v6GuardarSnapshotManual() (el botón "Recuperar mes manualmente") arma
//    su propio snapshot desde cero y nunca capturaba window._cuentasCustom
//    — a diferencia de v6TomarSnapshot() (el snapshot automático), que sí
//    lo hace vía un hook. Resultado real: Gonzalo recuperó un mes a mano
//    y el total quedó exactamente $170.000 corto (el saldo de su cuenta
//    custom "APV Jubilación").
//
// 3. El primer arreglo de (2) autocompletaba las cuentas custom con su
//    saldo ACTUAL en silencio, sin dejar editarlo — igual de incorrecto
//    que autocompletar las 4 cuentas duras con el saldo de hoy en vez del
//    saldo real de ese mes (por eso esas SÍ son un input vacío). Ahora
//    v6AbrirRecuperarSnapshot() genera un input editable por cada cuenta
//    custom (precargado con el saldo actual como punto de partida) y
//    v6GuardarSnapshotManual() lee lo que haya en ese input, no el valor
//    en memoria.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('v6RenderHistorico suma las cuentas custom al total "Patrimonio" de la tarjeta', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  const snaps = [{
    mes: 'Agosto 2026',
    ts: Date.now(),
    cuentas: { mp: 4083297, be: 3383262, fr: 1452149, fc: 1019949 },
    cuentasCustom: [{ id: 'x', nombre: 'APV Jubilación', saldo: 170000 }],
    depositos: {},
    tarjetaMontos: {},
    fijosPagados: {},
  }];
  window.localStorage.setItem('fg_v6_snapshots', JSON.stringify(snaps));

  window.v6RenderHistorico();

  const html = window.document.getElementById('v6-historico-list').innerHTML;
  assert.ok(html.includes('$10.108.657'), 'el total "Patrimonio" debe incluir la cuenta custom (9.938.657 + 170.000)');
});

test('v6GuardarSnapshotManual captura las cuentas custom actuales en el snapshot que crea', (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());

  window._cuentasCustom = [{ id: 'x', nombre: 'APV Jubilación', saldo: 170000, tag: '', color: '#000' }];
  window.confirm = () => true;
  window.alert = () => {};

  window.v6AbrirRecuperarSnapshot();
  document.getElementById('v6rec-mes').value = 'Agosto 2026';
  document.getElementById('v6rec-saldo-mp').value = '4083297';
  document.getElementById('v6rec-saldo-be').value = '3383262';
  document.getElementById('v6rec-saldo-fr').value = '1452149';
  document.getElementById('v6rec-saldo-fc').value = '1019949';

  return window.v6GuardarSnapshotManual().then(() => {
    const snaps = window.v6GetSnapshots();
    const snap = snaps.find(s => s.mes === 'Agosto 2026');
    assert.ok(snap, 'debe crear el snapshot de Agosto 2026');
    assert.ok(Array.isArray(snap.cuentasCustom), 'el snapshot debe incluir cuentasCustom');
    const totalCustom = snap.cuentasCustom.reduce((a, c) => a + (c.saldo || 0), 0);
    assert.equal(totalCustom, 170000, 'debe capturar el saldo real de las cuentas custom, no dejarlo vacío');
  });
});

test('el input de cuenta custom en "Recuperar mes manualmente" es editable, no un saldo fijo', (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());

  window._cuentasCustom = [{ id: 'x', nombre: 'APV Jubilación', saldo: 170000, tag: '', color: '#000' }];
  window.confirm = () => true;
  window.alert = () => {};

  window.v6AbrirRecuperarSnapshot();
  const customInput = document.getElementById('v6rec-custom-x');
  assert.ok(customInput, 'debe existir un input editable para la cuenta custom');
  assert.equal(customInput.value, '170000', 'debe precargar el saldo actual como punto de partida');

  // El usuario corrige el valor: ese mes la cuenta tenía otro saldo.
  customInput.value = '150000';
  document.getElementById('v6rec-mes').value = 'Julio 2026';

  return window.v6GuardarSnapshotManual().then(() => {
    const snap = window.v6GetSnapshots().find(s => s.mes === 'Julio 2026');
    assert.equal(snap.cuentasCustom[0].saldo, 150000, 'debe respetar el valor editado por el usuario, no el saldo actual en memoria');
  });
});
