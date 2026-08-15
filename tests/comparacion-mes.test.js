// tests/comparacion-mes.test.js
//
// El gráfico de área del Dashboard (v6RenderAreaChart) no reflejaba
// variación real con pocos puntos de dato y se veía mal en mobile (pedido
// de Gonzalo). Se reemplazó por v6RenderComparacionMes: patrimonio actual
// vs el mes anterior, directo.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('v6RenderComparacionMes muestra la variación contra el mes anterior', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  const cont = window.document.createElement('div');
  cont.id = 'v6-dash-evolucion-test';
  window.document.body.appendChild(cont);

  window.v6RenderComparacionMes('v6-dash-evolucion-test', [
    { mes: 'Junio 2026', saldo: 9000000 },
    { mes: 'Julio 2026', saldo: 10000000 },
  ]);

  const html = cont.innerHTML;
  assert.match(html, /\+\$1\.000\.000/, 'debe mostrar el delta positivo formateado');
  assert.match(html, /Junio 2026/, 'debe nombrar el mes anterior contra el que compara');
  assert.match(html, /up/, 'debe marcar el estado como "up" cuando el patrimonio subió');
});

test('v6RenderComparacionMes marca bajada cuando el patrimonio cae', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  const cont = window.document.createElement('div');
  cont.id = 'v6-dash-evolucion-test2';
  window.document.body.appendChild(cont);

  window.v6RenderComparacionMes('v6-dash-evolucion-test2', [
    { mes: 'Junio 2026', saldo: 10000000 },
    { mes: 'Julio 2026', saldo: 8500000 },
  ]);

  const html = cont.innerHTML;
  assert.match(html, /−\$1\.500\.000/, 'debe mostrar el delta negativo formateado');
  assert.match(html, /down/, 'debe marcar el estado como "down" cuando el patrimonio bajó');
});

test('v6RenderComparacionMes con menos de 2 puntos no revienta y muestra estado vacío', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  const cont = window.document.createElement('div');
  cont.id = 'v6-dash-evolucion-test3';
  window.document.body.appendChild(cont);

  window.v6RenderComparacionMes('v6-dash-evolucion-test3', [{ mes: 'Julio 2026', saldo: 10000000 }]);

  assert.match(cont.innerHTML, /no hay un mes anterior/i);
});
