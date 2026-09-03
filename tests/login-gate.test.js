// tests/login-gate.test.js
//
// La app reemplazó el banner no bloqueante de "conecta Drive" por una
// pantalla de login de pantalla completa (#mf-login-gate) que tapa toda
// la app hasta que hay sesión de Google. Este test protege el contrato
// mínimo: el gate existe y arranca visible (fail-closed, sin depender de
// que corra JS), el botón dispara el mismo driveConectar() de siempre, y
// window.v31ShowLockBanner()/v31HideLockBanner() (los mismos nombres que
// ya usaban cargar() y el resto del flujo de Drive) muestran/ocultan el
// gate y marcan #app-wrapper/#mf-tabbar/#mobile-toggle como inert.

const test = require('node:test');
const assert = require('node:assert/strict');

test('#mf-login-gate existe en el HTML y arranca visible (fail-closed)', (t) => {
  const { loadApp } = require('./loadApp.js');
  const { window, document } = loadApp();
  t.after(() => window.close());

  const gate = document.getElementById('mf-login-gate');
  assert.ok(gate, 'debe existir #mf-login-gate en el DOM');
  assert.notEqual(gate.style.display, 'none', 'el gate no debe arrancar oculto por estilo inline');

  const btn = gate.querySelector('.mf-login-gate-btn');
  assert.ok(btn, 'debe existir el botón de login dentro del gate');
  assert.match(btn.getAttribute('onclick') || '', /driveConectar\(\)/, 'el botón debe usar el mismo driveConectar() de siempre');
});

test('v31ShowLockBanner/v31HideLockBanner muestran/ocultan el gate y bloquean el resto de la app', (t) => {
  const { loadApp } = require('./loadApp.js');
  const { window, document } = loadApp();
  t.after(() => window.close());

  assert.equal(typeof window.v31ShowLockBanner, 'function');
  assert.equal(typeof window.v31HideLockBanner, 'function');

  window.v31ShowLockBanner();
  const gate = document.getElementById('mf-login-gate');
  assert.equal(gate.style.display, 'flex');
  ['app-wrapper', 'mf-tabbar', 'mobile-toggle'].forEach((id) => {
    const el = document.getElementById(id);
    assert.ok(el.hasAttribute('inert'), `#${id} debe quedar inert mientras el gate está visible`);
  });

  window.v31HideLockBanner();
  assert.equal(gate.style.display, 'none');
  ['app-wrapper', 'mf-tabbar', 'mobile-toggle'].forEach((id) => {
    const el = document.getElementById(id);
    assert.ok(!el.hasAttribute('inert'), `#${id} no debe quedar inert una vez oculto el gate`);
  });
});
