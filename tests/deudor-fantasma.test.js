// tests/deudor-fantasma.test.js
//
// Regresión: Gonzalo reportó que un deudor eliminado ("Cops") volvía a
// aparecer cada vez que la app cargaba desde Drive en la versión web, sin
// importar cuántas veces lo borrara.
//
// Causa raíz: loadDeudores() tenía un fallback a localStorage[DEUDORES_KEY]
// ('finanzas_gonzalo_deudores_v1'), una key legacy que el rediseño v6 dejó
// de escribir (la UI actual usa v6AgregarDeudorPropio/v6ToggleDeudorCobrado,
// que sólo persisten a través de Drive, nunca a esa key). Esa key quedaba
// congelada con el último estado que tuvo antes del rediseño — incluyendo
// deudores ya eliminados hace mucho. Si loadDeudores() corría antes de que
// Drive respondiera (window._v6_drive_data_received === false), ese fantasma
// resucitaba en window._deudores.
//
// Fix: loadDeudores() ya no lee esa key (los deudores viven en Drive, ver
// _buildData/_aplicarDatos) y la key se limpia una vez al cargar el script.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('loadDeudores no resucita un deudor viejo desde la key legacy de localStorage', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  // Simula el fantasma: un deudor ya eliminado que quedó congelado en la
  // key legacy antes de que este test siquiera cargue la app de nuevo.
  window.localStorage.setItem(
    'finanzas_gonzalo_deudores_v1',
    JSON.stringify([{ id: 1, nombre: 'Cops', monto: 33000, cobrado: false }])
  );

  // Estado real: sin deudores en memoria, Drive todavía no respondió
  // (el escenario exacto en el que el fallback viejo se disparaba).
  window._deudores = [];
  window._v6_drive_data_received = false;

  window.loadDeudores();

  assert.deepEqual(
    window._deudores,
    [],
    'loadDeudores no debe repoblar _deudores desde la key legacy de localStorage'
  );
});
