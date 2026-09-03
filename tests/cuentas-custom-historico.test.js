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
