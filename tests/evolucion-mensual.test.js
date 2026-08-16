// tests/evolucion-mensual.test.js
//
// Regresión real reportada por Gonzalo: la comparación "vs mes anterior"
// del Dashboard mostraba un delta que no cuadraba con lo que la propia
// página Histórico mostraba para el mismo mes.
//
// Causa raíz: v6GetEvolucionMensual() leía window._historialAhorros, que
// se actualiza cada vez que se confirma un depósito ("✓ Listo") DURANTE
// el mes — un valor a mitad de mes — pero ni v6CerrarMesManual ni
// v6CheckAutoSnapshot lo vuelven a sincronizar al cerrar el mes. Queda
// congelado en lo último que valía cuando se tocó "Listo" por última vez,
// no en el saldo real de cierre. v6_snapshots (la fuente de la página
// Histórico) sí queda congelado con el valor real de cierre. Ahora
// v6GetEvolucionMensual usa v6_snapshots para los meses ya cerrados.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('v6GetEvolucionMensual usa el saldo de v6_snapshots (cierre real), no el de _historialAhorros (mitad de mes)', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  // Simula el caso real: _historialAhorros quedó con un valor de mitad de
  // mes para Julio (se actualizó la última vez que se tocó "Listo"), pero
  // el snapshot de cierre real (v6_snapshots) tiene el valor correcto.
  window._historialAhorros = [
    { mes: 'Julio 2026', saldoTotal: 9538657, totalDeposito: 435000, ts: 1 },
  ];
  window.localStorage.setItem('fg_v6_snapshots', JSON.stringify([
    { mes: 'Julio 2026', ts: 2, cuentas: { mp: 3683297, be: 3383262, fr: 0, fc: 0 }, depositos: {} },
  ]));

  const evolucion = window.v6GetEvolucionMensual();
  const julio = evolucion.find(m => m.mes === 'Julio 2026');

  assert.ok(julio, 'debe incluir el mes Julio 2026');
  assert.equal(julio.saldo, 7066559, 'debe usar el saldo del snapshot de cierre (v6_snapshots), no el de _historialAhorros');
});

test('v6GetEvolucionMensual ordena los meses cronológicamente aunque los snapshots no estén en ese orden', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window.localStorage.setItem('fg_v6_snapshots', JSON.stringify([
    { mes: 'Mayo 2026', ts: 1, cuentas: { mp: 1000000 }, depositos: {} },
    { mes: 'Julio 2026', ts: 2, cuentas: { mp: 3000000 }, depositos: {} },
    { mes: 'Junio 2026', ts: 9999, cuentas: { mp: 2000000 }, depositos: {} },
  ]));

  const evolucion = window.v6GetEvolucionMensual();
  const meses = evolucion.filter(m => !m._esActual).map(m => m.mes);

  assert.equal(meses.join(','), 'Mayo 2026,Junio 2026,Julio 2026');
});

test('v6GetEvolucionMensual no cuenta dos veces un depósito ya confirmado en el mes actual', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  // confirmarDeposito() ya suma cada depósito confirmado DIRECTO al saldo
  // de la cuenta (c-mp) y, por separado, a _acumuladoMes (solo informativo,
  // para mostrar "cuánto llevas depositado este mes"). El punto del mes en
  // curso acá NO debe volver a sumar _acumuladoMes sobre un saldo que ya lo
  // incluye — v6RenderDashboard ya tenía este mismo fix para el hero
  // ("evita doble conteo"), pero acá faltaba aplicarlo: Gonzalo vio el
  // comparativo mostrando $400.000 de más, justo lo que llevaba depositado
  // y confirmado ese mes.
  window.document.getElementById('c-mp').value = '1000000';
  window._acumuladoMes = { mp: 400000 };

  const mesActual = window.v6GetMesActualNombre();
  const evolucion = window.v6GetEvolucionMensual();
  const actual = evolucion.find(m => m.mes === mesActual);

  assert.ok(actual, 'debe incluir el mes en curso');
  assert.equal(actual.saldo, 1000000, 'no debe sumar _acumuladoMes otra vez sobre un saldo que ya lo incluye');
});
