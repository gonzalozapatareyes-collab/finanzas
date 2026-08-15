// tests/historico-orden.test.js
//
// Regresión: en la página "Histórico", Gonzalo reportó que las tarjetas de
// mes no quedaban en orden temporal. Causa raíz: v6RenderHistorico() hacía
// snaps.slice().reverse(), asumiendo que el array de snapshots siempre está
// en orden de inserción == orden cronológico. Eso se rompe con "Recuperar
// mes manualmente" (v6GuardarSnapshotManual), que le pone ts:Date.now() al
// guardar sin importar qué mes representa — un mes VIEJO recuperado HOY
// queda al final del array y, tras el reverse(), salta arriba de meses más
// recientes.
//
// Fix: ordenar por la fecha real que dice "mes" (parseada de "Julio 2026"),
// no por el orden/momento en que se guardó el snapshot.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('v6RenderHistorico ordena las tarjetas por el mes real, no por orden de inserción', (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  // Orden de inserción deliberadamente "roto": Enero antes que Marzo, y
  // Diciembre 2023 (el más viejo de los tres) agregado AL FINAL con un ts
  // reciente — exactamente lo que hace una recuperación manual de un mes
  // viejo hecha hoy.
  const snaps = [
    { mes: 'Enero 2024', ts: 1000, cuentas: {}, depositos: {}, tarjetaMontos: {}, fijosPagados: {} },
    { mes: 'Marzo 2024', ts: 2000, cuentas: {}, depositos: {}, tarjetaMontos: {}, fijosPagados: {} },
    { mes: 'Diciembre 2023', ts: 9999999, cuentas: {}, depositos: {}, tarjetaMontos: {}, fijosPagados: {} },
  ];
  window.localStorage.setItem('fg_v6_snapshots', JSON.stringify(snaps));

  window.v6RenderHistorico();

  const cont = window.document.getElementById('v6-historico-list');
  assert.ok(cont, 'no existe el contenedor v6-historico-list');

  const html = cont.innerHTML;
  const posMarzo = html.indexOf('Marzo 2024');
  const posEnero = html.indexOf('Enero 2024');
  const posDiciembre = html.indexOf('Diciembre 2023');

  assert.notEqual(posMarzo, -1, 'Marzo 2024 debe estar en el render');
  assert.notEqual(posEnero, -1, 'Enero 2024 debe estar en el render');
  assert.notEqual(posDiciembre, -1, 'Diciembre 2023 debe estar en el render');

  assert.ok(posMarzo < posEnero, 'Marzo 2024 (más reciente) debe aparecer antes que Enero 2024');
  assert.ok(posEnero < posDiciembre, 'Enero 2024 debe aparecer antes que Diciembre 2023 (el más viejo), pese a haberse guardado al final');
});
