import { build as esbuild } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

const sha256b64 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

// Content-Security-Policy als <meta>: Nur genau dieses Skript und genau diese Stile duerfen laufen
// (per Hash), nichts darf ins Netz, kein fremder Code nachgeladen werden. GitHub Pages erlaubt keine
// eigenen HTTP-Kopfzeilen, deshalb per Meta. Die Hashes werden bei jedem Bau neu berechnet.
export function cspFor(html) {
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  const style = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
  return [
    "default-src 'none'",
    `script-src ${sha256b64(script)}`,
    `style-src ${sha256b64(style)}`,
    "style-src-attr 'unsafe-inline'", // style="..." aus dem Programm; Bilder und Netz sind trotzdem gesperrt
    "img-src 'none'",
    'font-src data:',
    "connect-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "manifest-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types 'none'",
  ].join('; ');
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
  const bare = template.replace('<!--CSS-->', () => css).replace('<!--JS-->', () => js);
  const html = bare.replace('<!--CSP-->', () => `<meta http-equiv="Content-Security-Policy" content="${cspFor(bare)}">`);
  mkdirSync(join(root, 'dist'), { recursive: true });
  const out = join(root, 'dist/bruchmonster.html');
  writeFileSync(out, html);
  // Dieselbe Datei als index.html im Hauptverzeichnis: damit GitHub Pages die App direkt ausliefert.
  writeFileSync(join(root, 'index.html'), html);
  // Pruefsumme zum Nachrechnen fuer alle, die die Datei herunterladen (siehe README, Abschnitt Sicherheit).
  writeFileSync(join(root, 'dist/bruchmonster.html.sha256'), `${createHash('sha256').update(html, 'utf8').digest('hex')}  bruchmonster.html\n`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  build().then((out) => console.log('geschrieben:', out));
}
