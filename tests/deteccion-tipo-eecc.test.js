// tests/deteccion-tipo-eecc.test.js
//
// Regresión real: Gonzalo subió su estado de cuenta de Bco Chile Nacional
// (formato real: fila "Movimientos Nacionales" como encabezado de sección,
// datos con Categoría/Fecha/Descripción/Cuotas/Monto) y la app lo clasificó
// como CMR — porque uno de sus movimientos era una compra en "FALABELLA
// PLAZA OESTE", y la detección de tipo miraba la palabra "falabella" en
// CUALQUIER parte del contenido ANTES de revisar si el archivo tenía
// marcadores propios de Bco Chile. Resultado: el archivo entero (29
// movimientos reales) se perdió — ni se sumó en "Bco Chile" del resumen,
// ni apareció al filtrar por "Bco Chile" en el asignador.
//
// v6DetectarTipoEECC() ahora revisa PRIMERO los marcadores específicos de
// cada banco ("Movimientos Nacionales" / "Movimientos Internacionales")
// y recién si ninguno matchea cae a las señales más débiles de CMR.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

// Arma el mismo string que arma v6HandleUnifiedFiles: JSON.stringify de las
// primeras filas (formato XLSX.utils.sheet_to_json con header automático),
// en minúsculas. Estructura sintética (no la data real de Gonzalo) que
// reproduce el mismo problema estructural: encabezado de sección propio del
// banco + un movimiento cuyo COMERCIO se llama "Falabella algo".
function sampleStr(rows) {
  return JSON.stringify(rows).toLowerCase();
}

test('un estado de cuenta de Bco Chile Nacional con una compra en Falabella se detecta como "nac", no "cmr"', () => {
  const { window } = loadApp();
  const rows = [
    { __EMPTY: '', __EMPTY_1: 'Sr(a).: ', __EMPTY_2: 'Cliente Ejemplo' },
    { __EMPTY: '', __EMPTY_1: 'Tipo de Tarjeta:', __EMPTY_2: 'Titular Visa Platinum ****0000' },
    { __EMPTY: '', __EMPTY_1: 'Movimientos Nacionales' },
    { __EMPTY: '', __EMPTY_1: 'Categoría', __EMPTY_2: 'Fecha', __EMPTY_3: 'Descripción', __EMPTY_7: 'Monto ($)' },
    { __EMPTY: '', __EMPTY_1: 'Total de Pagos, Compras, Cuotas y Avance', __EMPTY_2: '01/08/2026', __EMPTY_3: 'FALABELLA PLAZA EJEMPLO', __EMPTY_7: 10000 },
  ];
  const tipo = window.v6DetectarTipoEECC('mov_facturado.xls', sampleStr(rows));
  assert.equal(tipo, 'nac', 'debe detectarse como Bco Chile Nacional pese a mencionar "Falabella" como comercio');
  window.close();
});

test('un estado de cuenta CMR real (con columna TITULAR/ADICIONAL) sigue detectándose como "cmr"', () => {
  const { window } = loadApp();
  const rows = [
    { FECHA: '2026-08-01', DESCRIPCION: 'COMPRA EJEMPLO', 'TITULAR/ADICIONAL': 'Titular', ' MONTO': 5000, 'CUOTAS PENDIENTES': 0, 'VALOR CUOTA': 5000 },
  ];
  const tipo = window.v6DetectarTipoEECC('b2517b39-e32e-46aa.xlsx', sampleStr(rows));
  assert.equal(tipo, 'cmr', 'un CMR real no debe dejar de detectarse por el reordenamiento');
  window.close();
});

test('un estado de cuenta de Bco Chile Internacional (USD) se detecta como "int"', () => {
  const { window } = loadApp();
  const rows = [
    { __EMPTY: '', __EMPTY_1: 'Movimientos Internacionales' },
    { __EMPTY: '', __EMPTY_1: 'Categoría', __EMPTY_2: 'Fecha', __EMPTY_3: 'Descripción', __EMPTY_7: 'Monto (US$)' },
    { __EMPTY: '', __EMPTY_1: 'Total de Pagos', __EMPTY_2: '01/08/2026', __EMPTY_3: 'SPOTIFY SUECIA', __EMPTY_7: 7.5 },
  ];
  const tipo = window.v6DetectarTipoEECC('estado_usd.xls', sampleStr(rows));
  assert.equal(tipo, 'int');
  window.close();
});

test('sin ningún marcador reconocible, no adivina (devuelve null para que se pregunte al usuario)', () => {
  const { window } = loadApp();
  const tipo = window.v6DetectarTipoEECC('archivo_random.xls', sampleStr([{ a: 'texto sin relación' }]));
  assert.equal(tipo, null);
  window.close();
});
