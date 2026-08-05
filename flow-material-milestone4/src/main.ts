import { App } from './app/App';

const container = document.getElementById('app');

if (!container) {
  throw new Error('Missing #app container in index.html');
}

try {
  const app = new App(container);
  app.start();
} catch (err) {
  // WebGL2 fallback UI is already shown by App; this is just for diagnostics.
  console.error(err);
}
