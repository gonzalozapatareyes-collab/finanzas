// tests/papa-paola.test.js
//
// Regresión del bug real: al separar "Papa/Paola" en dos personas
// individuales (Papá y Paola) para poder preseleccionarlas por separado
// en Gastos, syncTarjetas() pisaba el total de una encima del otro cuando
// dos nombres apuntaban a la misma fila de la matriz. El fix agrupa por
// rowId y SUMA en vez de sobreescribir. Además, los gastos históricos que
// quedaron asignados al viejo "Papa/Paola" (antes de la separación) deben
// seguir contando en el total general exactamente una vez — ni perderse,
// ni duplicarse contra la fila nueva de Papá.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('Papá y Paola tienen filas propias en la Matriz de tarjetas y no se pisan entre sí', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window.allGastos = [
    { fecha: '14 may', desc: 'Gasto de Papá', monto: 84320, banco: 'Bco Chile', moneda: '$', persona: 'Papá', ignorado: false },
    { fecha: '09 may', desc: 'Gasto de Paola', monto: 15000, banco: 'CMR', moneda: '$', persona: 'Paola', ignorado: false },
  ];
  window.syncTarjetas();

  assert.equal(window.document.getElementById('bc-papa').value, '84320');
  assert.equal(window.document.getElementById('cmr-papa').value, '0');
  assert.equal(window.document.getElementById('bc-paola').value, '0');
  assert.equal(window.document.getElementById('cmr-paola').value, '15000');
});

test('un gasto histórico asignado al viejo "Papa/Paola" no se funde con la fila de Papá ni se pierde', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window.allGastos = [
    { fecha: '14 may', desc: 'Gasto de Papá', monto: 84320, banco: 'Bco Chile', moneda: '$', persona: 'Papá', ignorado: false },
    { fecha: '10 may', desc: 'Gasto viejo compartido', monto: 20000, banco: 'CMR', moneda: '$', persona: 'Papa/Paola', ignorado: false },
    { fecha: '09 may', desc: 'Gasto de Paola', monto: 15000, banco: 'CMR', moneda: '$', persona: 'Paola', ignorado: false },
  ];
  window.syncTarjetas();

  // La fila de Papá NO debe incluir el monto del legado "Papa/Paola" (antes
  // se pisaban y el total de Papá terminaba en 0 en vez de 84320).
  assert.equal(window.document.getElementById('bc-papa').value, '84320');
  assert.equal(window.document.getElementById('cmr-papa').value, '0');
  assert.equal(window.document.getElementById('cmr-paola').value, '15000');

  // El gasto legado sigue contando, como su propia fila "custom".
  const customRows = window.document.getElementById('tarjeta-custom-rows');
  assert.match(customRows.innerHTML, /Papa\/Paola/);
  assert.match(customRows.innerHTML, /20\.000/);

  // El total general suma los tres gastos exactamente una vez: 84320 + 20000 + 15000 = 119320.
  window.calcGrandTotal();
  assert.equal(window.document.getElementById('grand-total').textContent, '$119.320');
});
