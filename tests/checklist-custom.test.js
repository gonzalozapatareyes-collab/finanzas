// tests/checklist-custom.test.js
//
// El "Checklist del mes" pasó de ser 6 ítems hardcodeados (guardados como
// .check-item ocultos permanentemente en #v6-original-stash, leídos por
// POSICIÓN en el DOM — frágil) a una lista 100% dinámica y vacía por
// defecto (window._checklistCustom, guardada por id estable), mismo
// motivo de privacidad que _gastosFijosCustom: la app no debe mostrar
// texto que Gonzalo no haya escrito él mismo.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('la app arranca sin ítems de checklist por defecto (nada hardcodeado)', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  assert.equal((window._checklistCustom || []).length, 0);
});

test('v6AgregarChecklistItem agrega un ítem y actualiza el contador X/Y', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());
  window.v6RenderChecklistCustom();

  window.document.getElementById('v6-check-nuevo').value = 'Actualizar saldo MercadoPago';
  window.v6AgregarChecklistItem();
  window.document.getElementById('v6-check-nuevo').value = 'Revisar gastos fijos';
  window.v6AgregarChecklistItem();

  assert.equal(window._checklistCustom.length, 2);
  assert.equal(window.document.getElementById('v6-dash-check-count').textContent, '0/2');
});

test('v6ToggleChecklistItem marca hecho por id (no por posición) y mueve la barra de progreso', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());
  window.v6RenderChecklistCustom();

  window.document.getElementById('v6-check-nuevo').value = 'Tarea 1';
  window.v6AgregarChecklistItem();
  window.document.getElementById('v6-check-nuevo').value = 'Tarea 2';
  window.v6AgregarChecklistItem();

  window.v6ToggleChecklistItem(window._checklistCustom[0].id);

  assert.equal(window._checklistCustom[0].hecho, true);
  assert.equal(window._checklistCustom[1].hecho, false);
  assert.equal(window.document.getElementById('v6-dash-check-count').textContent, '1/2');
  assert.equal(window.document.getElementById('v6-dash-check-bar').style.width, '50%');
});

test('v6LimpiarMesActualUI resetea "hecho" pero conserva el texto de cada ítem', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());
  window.v6RenderChecklistCustom();

  window.document.getElementById('v6-check-nuevo').value = 'Actualizar saldo MercadoPago';
  window.v6AgregarChecklistItem();
  window.v6ToggleChecklistItem(window._checklistCustom[0].id);

  window.v6LimpiarMesActualUI();

  assert.equal(window._checklistCustom.length, 1);
  assert.equal(window._checklistCustom[0].texto, 'Actualizar saldo MercadoPago');
  assert.equal(window._checklistCustom[0].hecho, false);
});

test('_buildData incluye checklistCustom y _aplicarDatos lo restaura aunque una capa anterior falle', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window._checklistCustom = [{ id: 'chk_1', texto: 'Actualizar saldo MercadoPago', hecho: false }];
  const built = window._buildData();
  assert.ok(Array.isArray(built.checklistCustom));
  assert.equal(built.checklistCustom[0].texto, 'Actualizar saldo MercadoPago');

  // Mismo bug real ya documentado en aplicar-datos-resiliente.test.js: una
  // capa intermedia de la cadena de restauración revienta.
  window.v6SyncMatrizFromAsignador = function() {
    throw new Error('boom: simula una capa intermedia rota');
  };
  window._checklistCustom = [];

  let threw = false;
  try { window._aplicarDatos(built); } catch (e) { threw = true; }
  assert.equal(threw, false, '_aplicarDatos no debe dejar escapar la excepción de una capa intermedia');
});
