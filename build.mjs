import { build as esbuild } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export async function build() {
  const result = await esbuild({
    entryPoints: [join(root, 'src/main.js')],
    bundle: true,
    format: 'iife',
    minify: false,
    write: false,
    charset: 'utf8',
  });
  // Verhindert, dass das Bundle das <script>-Tag vorzeitig beendet.
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = readFileSync(join(root, 'src/styles.css'), 'utf8').replace(/<\/style/gi, '<\\/style');
  const template = readFileSync(join(root, 'src/index.html'), 'utf8');
  // Funktionen als Ersatz, damit "$&" etc. in js/css nicht interpretiert werden.
  const html = template.replace('<!--CSS-->', () => css).replace('<!--JS-->', () => js);
  mkdirSync(join(root, 'dist'), { recursive: true });
  const out = join(root, 'dist/bruchmonster.html');
  writeFileSync(out, html);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  build().then((out) => console.log('geschrieben:', out));
}
