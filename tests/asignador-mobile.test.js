// tests/asignador-mobile.test.js
//
// Regresión real: Gonzalo reportó que en el asignador móvil (pila de
// tarjetas, <900px) tocar un chip de persona ("Yo", "Papá", etc.) no
// parecía confirmar ni avanzar a la siguiente transacción — solo "Dividir
// entre varios" funcionaba.
//
// Causa raíz: v6RenderAsignadorMobile() armaba el botón de cada chip con
//   onclick="v6AsignarMobile(${i}, ${JSON.stringify(n)})"
// JSON.stringify(n) usa comillas DOBLES, y el atributo onclick TAMBIÉN
// estaba entre comillas dobles — el HTML se cortaba a la mitad del valor
// (ej. onclick="v6AsignarMobile(0, "Yo")"), dejando el argumento
// incompleto/roto para CUALQUIER persona, no solo casos con caracteres
// especiales. El botón quedaba efectivamente inerte.
//
// Se agregó además: deshacer el último paso ("Atrás"), la opción "+Otro"
// con nombre personalizado, y editar nombre/cuotas desde la tarjeta móvil.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

function seedGastos(window) {
  window.allGastos = [
    { fecha: '19/08/2026', desc: 'INTERESES MORA', monto: 96, banco: 'CMR', moneda: '$', persona: '', ignorado: false },
    { fecha: '17/08/2026', desc: 'PAGO CESANTIA', monto: 1920, banco: 'CMR', moneda: '$', persona: '', ignorado: false },
  ];
  window._v6MobileSkipped = new Set();
  window._v6MobileHistory = [];
}

test('el onclick de cada chip de persona es HTML válido (no se corta a mitad del atributo)', (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());
  seedGastos(window);
  window.v6RenderAsignadorMobile();

  const chip = document.querySelector('.mf-asigmov-chips .mf-asigmov-chip');
  assert.ok(chip, 'debe existir al menos un chip de persona');
  // Si el HTML se cortó, getAttribute('onclick') no contendría el nombre
  // completo entre paréntesis, o el navegador habría generado atributos
  // basura adicionales a partir del resto del string.
  assert.equal(chip.getAttribute('onclick'), 'v6AsignarMobile(0, "Yo")');
  assert.equal(Array.from(chip.attributes).length, 2, 'solo debe tener class y onclick — un HTML roto genera atributos extra');
});

test('tocar un chip de persona asigna Y avanza a la siguiente tarjeta (no solo "Dividir entre varios")', async (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());
  seedGastos(window);
  window.v6RenderAsignadorMobile();

  const chip = document.querySelector('.mf-asigmov-chips .mf-asigmov-chip');
  chip.click();

  assert.equal(window.allGastos[0].persona, 'Yo', 'debe quedar asignado de inmediato');

  await new Promise((r) => setTimeout(r, 300)); // esperar la animación de salida

  const desc = document.querySelector('.mf-asigmov-desc');
  assert.equal(desc.textContent, 'PAGO CESANTIA', 'debe mostrar la siguiente transacción pendiente sin acción extra');
});

test('"Atrás" deshace la última asignación', async (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());
  seedGastos(window);
  window.v6RenderAsignadorMobile();

  document.querySelector('.mf-asigmov-chips .mf-asigmov-chip').click();
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(document.querySelector('.mf-asigmov-back').disabled, false);
  window.v6DeshacerAsignadorMobile();

  assert.equal(window.allGastos[0].persona, '', 'debe revertir la asignación');
  assert.equal(document.querySelector('.mf-asigmov-desc').textContent, 'INTERESES MORA', 'debe volver a mostrar la tarjeta anterior');
});

test('"+ Otro" pide un nombre y lo asigna', async (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());
  seedGastos(window);
  window.confirm = () => true;
  window.prompt = () => 'Compañero de prueba';
  window.v6RenderAsignadorMobile();

  document.querySelector('.mf-asigmov-chip-otro').click();
  assert.equal(window.allGastos[0].persona, 'Compañero de prueba');
});

test('editar nombre y cuotas desde la tarjeta móvil actualizan el movimiento', (t) => {
  const { window, document } = loadApp();
  t.after(() => window.close());
  seedGastos(window);
  window.v6RenderAsignadorMobile();

  window.prompt = (msg, def) => {
    if (msg.includes('Nombre del movimiento')) return 'Nombre editado';
    if (msg.includes('Cuota actual')) return '2';
    if (msg.includes('Cuota total')) return '6';
    return def;
  };

  document.querySelector('.mf-asigmov-icon-btn[title="Editar nombre"]').click();
  assert.equal(window.allGastos[0]._label, 'Nombre editado');

  document.querySelector('.mf-asigmov-icon-btn[title="Cuotas"]').click();
  assert.equal(window.allGastos[0]._cuotaActual, 2);
  assert.equal(window.allGastos[0]._cuotaTotal, 6);
});
