// tests/insights-doble-conteo.test.js
//
// Gonzalo reportó que la tarjeta "Meta más cercana" del Dashboard mostraba
// 101% mientras que "Plan Auto" (Cuentas) mostraba 95.3% para la misma
// cuenta — ver el fix y el test en evolucion-mensual.test.js. Al buscar
// otras funciones que combinan saldo + _acumuladoMes (como pide CLAUDE.md:
// "buscar TODAS las funciones relacionadas"), aparecieron dos más con el
// mismo bug: el motor de Insights (v17GenerarInsights) y el generador del
// Reporte mensual en PDF (v17GenerarReportePDF, vía
// v17CalcularPatrimonioReporte). En ambos, _acumuladoMes[k] es un contador
// informativo que NO se resetea al confirmar un depósito — confirmarDeposito()
// lo incrementa Y suma el mismo monto al saldo a la vez — así que sumarlo
// de nuevo encima del saldo duplicaba el depósito apenas se confirmaba.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

function confirmarListo(document, k) {
  const btn = document.getElementById('btn-' + k);
  btn.classList.remove('pendiente');
  btn.classList.add('listo');
}

test('v17GenerarInsights no da por cumplida la meta auto por sumar _acumuladoMes encima del saldo confirmado', (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());

  document.getElementById('c-mp').value = '4766558'; // saldo YA incluye el depósito confirmado
  document.getElementById('dep-mp').value = '0';
  confirmarListo(document, 'mp');
  window._acumuladoMes = { mp: 283261 }; // no se resetea al confirmar
  document.getElementById('auto-meta').value = '5000000';

  const insights = window.v17GenerarInsights();
  // Con el saldo real (4.766.558) la meta auto (5.000.000) todavía NO está
  // cumplida, así que debe aparecer el insight predictivo. Si el bug
  // estuviera presente, autoSaldo sería 5.049.819 (> meta) y esta función
  // ni siquiera entraría al bloque que genera el insight.
  const metaAuto = insights.find(i => i.titulo === 'Meta auto');
  assert.ok(metaAuto, 'con 4.766.558 de 5.000.000 la meta auto no está cumplida, debería generar un insight predictivo');
});

test('v17CalcularPatrimonioReporte no duplica un depósito ya confirmado', (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());

  document.getElementById('c-mp').value = '4766558';
  document.getElementById('dep-mp').value = '0';
  confirmarListo(document, 'mp');
  window._acumuladoMes = { mp: 283261 };

  const { cuentas, patrimonioTotal } = window.v17CalcularPatrimonioReporte();
  assert.equal(cuentas.MercadoPago, 4766558, 'no debe sumar _acumuladoMes.mp encima del saldo ya confirmado');
  assert.equal(patrimonioTotal, 4766558);
});

test('v17CalcularPatrimonioReporte SÍ suma un depósito todavía pendiente de confirmar', (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());

  document.getElementById('c-mp').value = '4083297';
  document.getElementById('dep-mp').value = '400000'; // pendiente: el botón sigue en "pendiente"

  const { cuentas, patrimonioTotal } = window.v17CalcularPatrimonioReporte();
  assert.equal(cuentas.MercadoPago, 4483297);
  assert.equal(patrimonioTotal, 4483297);
});
