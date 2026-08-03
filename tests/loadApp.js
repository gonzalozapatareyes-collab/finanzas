// tests/loadApp.js
//
// Carga el index.html REAL de la app dentro de un DOM simulado (jsdom),
// ejecuta todos sus <script> inline en orden, y devuelve el `window`
// resultante para que los tests puedan llamar a las funciones tal cual
// existen en producción (sin mocks ni reescrituras).
//
// Esto es intencionalmente una prueba de "caja gris": no testea unidades
// aisladas (la app no está modularizada), testea el comportamiento real
// del archivo que se sube a GitHub Pages.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

function loadApp({ url = 'https://mis-finanzas.test/' } = {}) {
  let html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Sacamos scripts externos (ej. Google Identity Services) y cualquier
  // <link> que apunte a un recurso remoto: en los tests no hay red, y no
  // los necesitamos para probar la lógica de cuentas/snapshots/historial.
  html = html.replace(/<script[^>]*\ssrc=["'][^"']*["'][^>]*>\s*<\/script>/gi, '');
  html = html.replace(/<link[^>]*\shref=["']https?:\/\/[^"']*["'][^>]*>/gi, '');

  const dom = new JSDOM(html, {
    url,
    runScripts: 'dangerously', // ejecuta los <script> inline del archivo real
    resources: undefined,      // NO fetch de recursos externos (sin red en tests)
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // fetch no debería usarse en los flujos que testeamos (sin token de Drive),
  // pero por si acaso, que falle rápido en vez de colgar el proceso.
  window.fetch = () => Promise.reject(new Error('fetch deshabilitado en tests'));

  // Stubs de cosas que jsdom no implementa / que no queremos que se disparen en tests:
  window.confirm = () => true;   // por defecto acepta cualquier confirm()
  window.alert = () => {};
  window.localStorage.clear();

  // La app llama a esto en varios flujos de Drive; lo dejamos como no-op
  // salvo que un test explícitamente lo quiera espiar.
  window.driveAccessToken = null;
  window.guardar = window.guardar || function () {};

  return { dom, window, document: window.document };
}

module.exports = { loadApp };
