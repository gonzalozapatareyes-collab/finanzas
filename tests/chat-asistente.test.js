// tests/chat-asistente.test.js
//
// Gonzalo notó que el asistente del chat era muy limitado: preguntas como
// "¿qué metas tengo?" o "¿qué puedes responder?" no matcheaban ningún
// patrón de responderConsulta() y quedaban silenciosamente guardadas como
// nota, sin avisar que no se entendieron. Se amplía la cobertura (metas
// genéricas, gastos fijos pendientes, checklist del mes) y se mejora el
// mensaje cuando algo con pinta de pregunta no matchea nada.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('responderConsulta responde sobre metas en general (auto + vivienda + custom)', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window.document.getElementById('c-mp').value = '4483297';
  window.document.getElementById('c-be').value = '3383262';
  window._metasCustom = [{ id: 'm1', nombre: 'APV Jubilación', tracking: 'manual', saldoManual: 170000, target: 1000000 }];

  const r = window.responderConsulta('que metas de ahorro tengo?');
  assert.match(r, /Auto/);
  assert.match(r, /Vivienda/);
  assert.match(r, /APV Jubilación/);
  assert.match(r, /\$170\.000/);
});

test('responderConsulta lista gastos fijos pendientes de pagar', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window._gastosFijosCustom = [
    { id: 'gf1', nombre: 'Netflix', monto: 9990, pagado: false },
    { id: 'gf2', nombre: 'Spotify', monto: 6750, pagado: true },
  ];

  const r = window.responderConsulta('cuanto me falta de gastos fijos?');
  assert.match(r, /Netflix/);
  assert.doesNotMatch(r, /Spotify/, 'no debe listar los ya pagados');
  assert.match(r, /\$9\.990/);
});

test('responderConsulta lista ítems pendientes del checklist del mes', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window._checklistCustom = [
    { id: 'c1', texto: 'Actualizar saldo MercadoPago', hecho: false },
    { id: 'c2', texto: 'Revisar gastos fijos', hecho: true },
  ];

  const r = window.responderConsulta('que me falta del checklist?');
  assert.match(r, /Actualizar saldo MercadoPago/);
  assert.doesNotMatch(r, /Revisar gastos fijos/, 'no debe listar los ya hechos');
});

test('responderConsulta reconoce "qué puedes responder" (no solo "qué puedes hacer")', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  const r = window.responderConsulta('que puedes responder?');
  assert.match(r, /Puedo:/);
});

test('una pregunta que no matchea ningún patrón devuelve null (no se inventa una respuesta)', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  const r = window.responderConsulta('cuando cae la luna llena?');
  assert.equal(r, null);
});
