// tests/no-cripto.test.js
//
// Cripto se eliminó como instrumento de ahorro trackeado en la app.
// Este test evita que alguien (humano o IA) la vuelva a agregar sin darse
// cuenta a alguno de los arrays de cuentas (['mp','be','fr','fc', ...]).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('el archivo fuente no contiene referencias a cripto/ETH/BTC como cuenta', (t) => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const matches = html.match(/cripto|ETH\s*\+\s*BTC/gi) || [];
  assert.equal(
    matches.length,
    0,
    `Se encontraron ${matches.length} referencias a cripto en index.html. ` +
    `Si esto es intencional (se volvió a agregar la cuenta), hay que actualizar este test.`
  );
});

test('no hay ningún input de saldo o depósito para cripto en el DOM', (t) => {
  const { loadApp } = require('./loadApp.js');
  const { window } = loadApp();
  t.after(() => window.close());
  assert.equal(window.document.getElementById('c-cripto'), null);
  assert.equal(window.document.getElementById('dep-cripto'), null);
});
