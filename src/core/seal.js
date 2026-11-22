// Siegel fuer Spielstaende: verschluesselt und mit Pruefsumme versehen (SHA-256, HMAC, Stromchiffre).
// Reine Rechnung ohne Browser-Funktionen (laeuft auch von file:// und ueber http).
//
// WICHTIG, ehrlich: Das Programm laeuft komplett im Browser, der Schluessel steckt also im Programmtext.
// Das Siegel verhindert, dass ein Kind den Spielstand mal eben im Texteditor oder in den
// Browser-Werkzeugen aendert. Wer den Quelltext liest und eigenen Code schreibt, kann es umgehen.
// Echte Faelschungssicherheit gibt es nur mit einem Server, den es hier bewusst nicht gibt.

export const MAX_SEALED_CHARS = 200_000;
export const MAX_CODE_CHARS = 60_000;
const FORMAT = 'bruchmonster';
const VERSION = 2;

// ---- SHA-256 ----
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export function sha256(bytes) {
  const len = bytes.length;
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(len / 0x20000000), false);
  view.setUint32(padded.length - 4, (len << 3) >>> 0, false);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i], false);
  return out;
}

export function hmacSha256(key, msg) {
  let k = key.length > 64 ? sha256(key) : key;
  const ipad = new Uint8Array(64).fill(0x36);
  const opad = new Uint8Array(64).fill(0x5c);
  for (let i = 0; i < k.length; i++) { ipad[i] ^= k[i]; opad[i] ^= k[i]; }
  const inner = new Uint8Array(64 + msg.length);
  inner.set(ipad); inner.set(msg, 64);
  const outer = new Uint8Array(64 + 32);
  outer.set(opad); outer.set(sha256(inner), 64);
  return sha256(outer);
}

// ---- Hilfen ----
const utf8 = (s) => new TextEncoder().encode(s);
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toB64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 3) {
    const n = (u8[i] << 16) | ((u8[i + 1] ?? 0) << 8) | (u8[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < u8.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < u8.length ? B64[n & 63] : '=');
  }
  return s;
}
function fromB64(s) {
  if (s.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null;
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((s.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12) | ((B64.indexOf(s[i + 2]) & 63) << 6) | (B64.indexOf(s[i + 3]) & 63);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return toB64(out) === s ? out : null; // nur die eine, kanonische Schreibweise
}
const sameHex = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

// Schluessel stecken in Teilen im Programm und werden erst zur Laufzeit zusammengesetzt.
const PARTS = [[0x6b, 0x35, 0x91, 0xd2], [0x07, 0xae, 0x48, 0xf3], [0xc9, 0x1b, 0x62, 0x84], [0x3e, 0xd7, 0xa0, 0x5a]];
const MASK = [0x42, 0x72, 0x75, 0x63, 0x68, 0x4d, 0x6f, 0x6e, 0x73, 0x74, 0x65, 0x72, 0x32, 0x30, 0x32, 0x36];
const master = () => Uint8Array.from(PARTS.flat(), (b, i) => b ^ MASK[i % MASK.length]);
const keyFor = (label) => hmacSha256(master(), utf8(`bruchmonster/v${VERSION}/${label}`));

function randomBytes(n) {
  const out = new Uint8Array(n);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(out);
  else for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

// Stromchiffre: Schluesselstrom = HMAC(Schluessel, Nonce | Zaehler); Daten werden damit verXORt.
function crypt(data, kEnc, nonce) {
  const out = new Uint8Array(data.length);
  for (let block = 0, o = 0; o < data.length; block++) {
    const ctr = new Uint8Array(4);
    new DataView(ctr.buffer).setUint32(0, block, false);
    const ks = hmacSha256(kEnc, concat(nonce, ctr));
    for (let i = 0; i < 32 && o < data.length; i++, o++) out[o] = data[o] ^ ks[i];
  }
  return out;
}

const macOf = (nonce, cipher) => toHex(hmacSha256(keyFor('mac'), concat(utf8(`v${VERSION}`), nonce, cipher)));

// Verpackt einen JSON-faehigen Wert als Text (eine Zeile JSON mit undurchsichtigem Inhalt).
export function seal(value) {
  const json = JSON.stringify(value);
  if (typeof json !== 'string') throw new TypeError('seal: Wert ist nicht als JSON darstellbar');
  const nonce = randomBytes(12);
  const cipher = crypt(utf8(json), keyFor('enc'), nonce);
  return JSON.stringify({ format: FORMAT, version: VERSION, n: toB64(nonce), d: toB64(cipher), m: macOf(nonce, cipher) });
}

// Oeffnet ein Siegel. Wirft nie. Gibt { ok: true, value } oder { ok: false, reason } zurueck.
export function unseal(text) {
  const fail = (reason) => ({ ok: false, reason });
  if (typeof text !== 'string') return fail('kein-json');
  if (text.length > MAX_SEALED_CHARS) return fail('zu-gross');
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return fail('kein-json');
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc) || doc.format !== FORMAT) return fail('falsches-format');
  if (doc.version !== VERSION) return fail('falsches-format');
  const { n, d, m } = doc;
  if (typeof n !== 'string' || typeof d !== 'string' || typeof m !== 'string' || !/^[0-9a-f]{64}$/.test(m)) return fail('verfaelscht');
  const nonce = fromB64(n);
  const cipher = fromB64(d);
  if (!nonce || !cipher || nonce.length !== 12) return fail('verfaelscht');
  if (!sameHex(macOf(nonce, cipher), m)) return fail('verfaelscht');
  try {
    const json = new TextDecoder('utf-8', { fatal: true }).decode(crypt(cipher, keyFor('enc'), nonce));
    return { ok: true, value: JSON.parse(json) };
  } catch {
    return fail('verfaelscht');
  }
}

// ---- Spielstand-Code: dasselbe Siegel als kurzer Text zum Kopieren und Einfuegen ----
// Aufbau: "BM2-" + Base64 (URL-sicher) aus Nonce (12 Byte) | verschluesselte Daten | Pruefsumme (32 Byte).
const CODE_PREFIX = 'BM2-';
// Beim Einfuegen schleichen sich Umbrueche, Leerzeichen, geschweifte Anfuehrungszeichen u.a. ein.
const CODE_NOISE = /[\s\u200B-\u200D\u2060\uFEFF"'\u201C\u201D\u201E\u2018\u2019\u201A\u00AB\u00BB<>]/g;
const hexToBytes = (hex) => Uint8Array.from(hex.match(/../g), (h2) => parseInt(h2, 16));

// Macht aus dem Datei-Text (seal) einen Code. Gibt null zurueck, wenn der Text kein Siegel ist.
export function toCode(sealedText) {
  if (typeof sealedText !== 'string' || sealedText.length > MAX_SEALED_CHARS) return null;
  let doc;
  try { doc = JSON.parse(sealedText); } catch { return null; }
  if (doc === null || typeof doc !== 'object' || doc.format !== FORMAT || doc.version !== VERSION) return null;
  if (typeof doc.n !== 'string' || typeof doc.d !== 'string' || typeof doc.m !== 'string' || !/^[0-9a-f]{64}$/.test(doc.m)) return null;
  const nonce = fromB64(doc.n);
  const cipher = fromB64(doc.d);
  if (!nonce || !cipher || nonce.length !== 12) return null;
  return CODE_PREFIX + toB64(concat(nonce, cipher, hexToBytes(doc.m))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Oeffnet einen Code. Wirft nie. Gruende: kein-code, zu-gross, verfaelscht (und die von unseal).
export function unsealCode(code) {
  const fail = (reason) => ({ ok: false, reason });
  if (typeof code !== 'string') return fail('kein-code');
  if (code.length > MAX_CODE_CHARS * 2) return fail('zu-gross');
  const clean = code.replace(CODE_NOISE, '');
  if (!clean.startsWith(CODE_PREFIX)) return fail('kein-code');
  if (clean.length > MAX_CODE_CHARS) return fail('zu-gross');
  const body = clean.slice(CODE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
  if (body.length < 4 || !/^[A-Za-z0-9+/]+$/.test(body)) return fail('verfaelscht');
  const bytes = fromB64(body + '='.repeat((4 - (body.length % 4)) % 4));
  if (!bytes || bytes.length < 12 + 32) return fail('verfaelscht');
  const nonce = bytes.slice(0, 12);
  const mac = bytes.slice(bytes.length - 32);
  const cipher = bytes.slice(12, bytes.length - 32);
  return unseal(JSON.stringify({ format: FORMAT, version: VERSION, n: toB64(nonce), d: toB64(cipher), m: toHex(mac) }));
}
