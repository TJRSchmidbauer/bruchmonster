// Baut eine Testfassung nach /tmp/bruchmonster-e2e.html (NICHT dist/). Einziger Unterschied zur echten Datei:
// createRunner legt den aktuellen Runner in window.__bmRunner, damit das Abnahmeskript Aufgaben loesen kann.
// Aufruf: node scripts/build-e2e.mjs [ausgabe.html]
import { build as esbuild } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fontFaces } from '../build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? '/tmp/bruchmonster-e2e.html';

const hook = {
  name: 'runner-hook',
  setup(b) {
    b.onLoad({ filter: /ui[\\/]runner\.js$/ }, (a) => {
      const src = readFileSync(a.path, 'utf8').replace('export function createRunner(', 'function __createRunner(');
      return { contents: `${src}\nexport function createRunner(o) { const r = __createRunner(o); globalThis.__bmRunner = r; return r; }\n`, loader: 'js' };
    });
  },
};
const r = await esbuild({ entryPoints: [join(root, 'src/main.js')], bundle: true, format: 'iife', write: false, charset: 'utf8', plugins: [hook] });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fontFaces() + '\n' + ['styles.css', 'styles-monster.css'].map((f) => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
const html = readFileSync(join(root, 'src/index.html'), 'utf8').replace('<!--CSS-->', () => css).replace('<!--JS-->', () => js);
writeFileSync(out, html);
console.log('geschrieben:', out);
