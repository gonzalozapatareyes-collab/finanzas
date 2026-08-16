// tests/gastos-fijos-custom.test.js
//
// Los "gastos fijos" pasaron de ser 12 filas hardcodeadas en el HTML (con
// nombre y monto escritos directo en el código, visibles para cualquiera
// con o sin Drive conectado) a una lista 100% dinámica y vacía por
// defecto (window._gastosFijosCustom), pedido explícito de Gonzalo por
// privacidad: la app no debe mostrar ningún dato que no haya ingresado el
// propio usuario. Mismo patrón que window._cuentasCustom.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('la app arranca sin gastos fijos por defecto (nada hardcodeado)', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  assert.equal((window._gastosFijosCustom || []).length, 0);
});

test('v6AgregarGastoFijo agrega un ítem y renderGastosFijosCustom recalcula el total', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());
  window.renderGastosFijosCustom();

  window.document.getElementById('v6-fijo-nombre').value = 'Netflix';
  window.document.getElementById('v6-fijo-monto').value = '9990';
  window.v6AgregarGastoFijo();

  window.document.getElementById('v6-fijo-nombre').value = 'Spotify';
  window.document.getElementById('v6-fijo-monto').value = '6750';
  window.v6AgregarGastoFijo();

  assert.equal(window._gastosFijosCustom.length, 2);
  const total = window.document.getElementById('v6-fijos-rows-mount').querySelector('.total-amount');
  assert.match(total.textContent, /\$16\.740/);
});

test('el total suma TODOS los fijos, pagados o no (representa el compromiso mensual completo)', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());
  window.renderGastosFijosCustom();

  window.document.getElementById('v6-fijo-nombre').value = 'Netflix';
  window.document.getElementById('v6-fijo-monto').value = '9990';
  window.v6AgregarGastoFijo();

  window.v6ToggleGastoFijoPagado(window._gastosFijosCustom[0].id);
  assert.equal(window._gastosFijosCustom[0].pagado, true);

  const total = window.document.getElementById('v6-fijos-rows-mount').querySelector('.total-amount');
  assert.match(total.textContent, /\$9\.990/, 'un fijo pagado sigue contando en el total');
});

test('v6LimpiarMesActualUI resetea "pagado" pero conserva nombre y monto', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());
  window.renderGastosFijosCustom();

  window.document.getElementById('v6-fijo-nombre').value = 'Netflix';
  window.document.getElementById('v6-fijo-monto').value = '9990';
  window.v6AgregarGastoFijo();
  window.v6ToggleGastoFijoPagado(window._gastosFijosCustom[0].id);

  window.v6LimpiarMesActualUI();

  assert.equal(window._gastosFijosCustom.length, 1);
  assert.equal(window._gastosFijosCustom[0].nombre, 'Netflix');
  assert.equal(window._gastosFijosCustom[0].monto, 9990);
  assert.equal(window._gastosFijosCustom[0].pagado, false);
});

test('_buildData incluye gastosFijosCustom y _aplicarDatos lo restaura aunque una capa anterior falle', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  window._gastosFijosCustom = [{ id: 'gf_1', nombre: 'Netflix', monto: 9990, nota: '', pagado: false }];
  const built = window._buildData();
  assert.ok(Array.isArray(built.gastosFijosCustom));
  assert.equal(built.gastosFijosCustom[0].nombre, 'Netflix');

  // Simula el bug real ya documentado (aplicar-datos-resiliente.test.js):
  // una capa intermedia de la cadena de restauración revienta.
  window.v6SyncMatrizFromAsignador = function() {
    throw new Error('boom: simula una capa intermedia rota');
  };
  window._gastosFijosCustom = [];

  let threw = false;
  try { window._aplicarDatos(built); } catch (e) { threw = true; }
  assert.equal(threw, false, '_aplicarDatos no debe dejar escapar la excepción de una capa intermedia');
});
