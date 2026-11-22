import { build as esbuild } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

// Schriften (OFL) als Data-URI einbetten: keine externen Anfragen.
const FONTS = [
  ['Grandstander', 'grandstander', 700],
  ['Grandstander', 'grandstander', 900],
  ['Atkinson Hyperlegible', 'atkinson-hyperlegible', 400],
  ['Atkinson Hyperlegible', 'atkinson-hyperlegible', 700],
];

export function fontFaces() {
  return FONTS.map(([family, pkg, weight]) => {
    const file = join(root, 'node_modules/@fontsource', pkg, 'files', `${pkg}-latin-${weight}-normal.woff2`);
    const b64 = readFileSync(file).toString('base64');
    return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
  }).join('\n');
}

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
  const css = (fontFaces() + '\n' + ['styles.css', 'styles-monster.css'].map((f) => readFileSync(join(root, 'src', f), 'utf8')).join('\n')).replace(/<\/style/gi, '<\\/style');
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
