// tests/guardar-concurrencia.test.js
//
// Regresión del bug real reportado por Gonzalo: agregó una cuenta custom
// (APV Jubilación) y le depositó, ambas acciones se veían guardadas en
// pantalla, pero al refrescar la cuenta había desaparecido de Drive.
//
// Causa: cada acción dispara su propio guardar() independiente, y
// driveGuardar() hace un PATCH simple sin control de versión. Si dos
// guardados quedan "en vuelo" al mismo tiempo, el que responda MÁS TARDE
// gana — aunque tenga datos más viejos — y así se pierde el cambio más
// reciente sin ningún error visible.
//
// Fix: guardar() ahora encola las llamadas concurrentes en vez de
// dispararlas en paralelo, así nunca hay dos escrituras a Drive en vuelo
// al mismo tiempo y el orden de escritura siempre respeta el orden real
// de los cambios.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./loadApp.js');

test('guardar() encola escrituras a Drive: una más vieja y lenta no puede pisar a una más nueva y rápida', async (t) => {
  const { window } = loadApp();
  t.after(() => window.close());

  // Requisitos para que el guard de "deudores vacíos" no bloquee el guardado.
  window._deudores = [{ nombre: 'Test', monto: 1000, cobrado: false }];
  window._v6_drive_data_received = true;
  // driveAccessToken/driveFileId son `let` de módulo, no propiedades de
  // `window` — hay que setearlas vía eval en el mismo scope global del
  // documento (jsdom comparte ese scope entre todos los <script> inline).
  window.eval('driveAccessToken = "fake-token"; driveFileId = "fake-file-id";');

  // "Servidor" simulado: solo importa qué body queda guardado al FINAL,
  // cuando cada escritura efectivamente termina — no en qué orden se
  // *iniciaron* las llamadas a fetch.
  let serverState = null;
  let resolveFirst;
  const firstGate = new Promise((res) => { resolveFirst = res; });
  let callCount = 0;

  window.fetch = async (url, opts) => {
    callCount++;
    const isFirst = callCount === 1;
    const bodyText = await opts.body.text();
    // La primera escritura es la LENTA (como una respuesta de red que
    // tarda más) — si guardar() no encolara, esta terminaría DESPUÉS de
    // la segunda y pisaría el "servidor" con datos viejos.
    if (isFirst) await firstGate;
    serverState = bodyText;
    return { ok: true, status: 200, json: async () => ({}) };
  };

  window._cuentasCustom = [];
  const p1 = window.guardar(); // captura estado SIN la cuenta nueva

  window._cuentasCustom = [{ id: 'x1', nombre: 'APV Jubilación', saldo: 170000 }];
  const p2 = window.guardar(); // captura estado CON la cuenta nueva, casi al mismo tiempo

  setTimeout(resolveFirst, 20); // recién ahora "responde" la primera escritura

  await Promise.all([p1, p2]);

  assert.equal(callCount, 2, 'debe haber exactamente 2 escrituras a Drive, nunca fusionadas ni perdidas');

  const finalState = JSON.parse(serverState);
  assert.ok(
    (finalState.cuentasCustom || []).some((c) => c.nombre === 'APV Jubilación'),
    'lo que queda guardado en Drive al final debe incluir la cuenta nueva — la escritura vieja y lenta no puede pisarla'
  );
});
