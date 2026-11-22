import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { sha256, hmacSha256, seal, unseal, toCode, unsealCode, MAX_SEALED_CHARS, MAX_CODE_CHARS } from '../src/core/seal.js';

const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const utf8 = (s) => new TextEncoder().encode(s);

test('sha256 stimmt mit bekannten Testvektoren ueberein', () => {
  assert.equal(hex(sha256(utf8(''))), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(hex(sha256(utf8('abc'))), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('hmacSha256 stimmt mit RFC 4231 (Testfall 1 und 2) ueberein', () => {
  const k1 = new Uint8Array(20).fill(0x0b);
  assert.equal(hex(hmacSha256(k1, utf8('Hi There'))), 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7');
  assert.equal(hex(hmacSha256(utf8('Jefe'), utf8('what do ya want for nothing?'))),
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
});

test('sha256 und hmac stimmen mit node:crypto fuer viele Laengen ueberein (inkl. Blockgrenzen, langer Schluessel)', () => {
  for (const len of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000, 5000]) {
    const msg = randomBytes(len);
    assert.equal(hex(sha256(msg)), createHash('sha256').update(msg).digest('hex'), `sha256 len ${len}`);
    const key = randomBytes(len % 2 ? 16 : 100);
    assert.equal(hex(hmacSha256(key, msg)), createHmac('sha256', key).update(msg).digest('hex'), `hmac len ${len}`);
  }
});

test('seal/unseal: Rundreise liefert denselben Wert, auch mit Umlauten und Emojis', () => {
  const v = { name: 'Zoë 🦄 Ünal', coins: 12, list: ['a', 'b'], nested: { x: 1.5 } };
  const s = seal(v);
  assert.deepEqual(unseal(s), { ok: true, value: v });
});

test('das Siegel ist nicht lesbar: kein Klartext, nicht deterministisch', () => {
  const v = { name: 'Mia', coins: 987654 };
  const a = seal(v);
  const b = seal(v);
  assert.notEqual(a, b, 'Zufallswert (Nonce) je Datei');
  for (const needle of ['Mia', 'coins', '987654']) assert.ok(!a.includes(needle), `enthaelt ${needle}`);
  assert.ok(!/TWlh/.test(a), 'auch nicht als Base64 von Mia');
});

test('jede Veraenderung der Datei wird erkannt (jede Stelle der Nutzdaten und des Siegels)', () => {
  const s = seal({ name: 'Mia', coins: 5 });
  const doc = JSON.parse(s);
  for (const field of ['n', 'd', 'm']) {
    const val = doc[field];
    for (let i = 0; i < val.length; i += Math.max(1, Math.floor(val.length / 12))) {
      const flipped = val.slice(0, i) + (val[i] === 'A' ? 'B' : 'A') + val.slice(i + 1);
      const res = unseal(JSON.stringify({ ...doc, [field]: flipped }));
      assert.equal(res.ok, false, `${field}[${i}] veraendert`);
    }
  }
});

test('Angriffe: Klartext-Profil, altes Format, fremde Felder und Muell werden abgelehnt, ohne zu werfen', () => {
  const plain = JSON.stringify({ format: 'bruchmonster', version: 1, profile: { name: 'X', coins: 999999 } });
  assert.equal(unseal(plain).ok, false);
  const doc = JSON.parse(seal({ coins: 1 }));
  assert.equal(unseal(JSON.stringify({ ...doc, version: 3 })).ok, false);
  assert.equal(unseal(JSON.stringify({ ...doc, m: 'zz' })).ok, false);
  assert.equal(unseal(JSON.stringify({ ...doc, m: undefined })).ok, false);
  for (const junk of ['', 'null', '[]', '"x"', '{', '{"format":"bruchmonster"}', '__proto__', null, undefined, 42, {}, [], '{"__proto__":{"a":1}}']) {
    assert.doesNotThrow(() => unseal(junk));
    assert.equal(unseal(junk).ok, false);
  }
});

test('zu grosse Eingaben werden abgelehnt, bevor sie verarbeitet werden', () => {
  const t0 = Date.now();
  const res = unseal('x'.repeat(MAX_SEALED_CHARS + 1));
  assert.deepEqual(res, { ok: false, reason: 'zu-gross' });
  assert.ok(Date.now() - t0 < 100);
});

test('seal lehnt Werte ab, die kein JSON sind (kein stilles undefined)', () => {
  assert.throws(() => seal(undefined));
});

// ---- Spielstand-Code (zum Kopieren und Einfuegen) ----
test('Code: Rundreise, nur sichere Zeichen, deutlich kuerzer als die Datei', () => {
  const v = { name: 'Zoë 🦄', coins: 12, list: Array.from({ length: 40 }, (_, i) => `item${i}`) };
  const sealed = seal(v);
  const code = toCode(sealed);
  assert.match(code, /^BM2-[A-Za-z0-9_-]+$/);
  assert.ok(code.length < sealed.length, `${code.length} < ${sealed.length}`);
  assert.deepEqual(unsealCode(code), { ok: true, value: v });
});

test('Code: Zeilenumbrueche, Leerzeichen, Anfuehrungszeichen und unsichtbare Zeichen vom Einfuegen schaden nicht', () => {
  const v = { name: 'Mia', coins: 7 };
  const code = toCode(seal(v));
  const wrapped = code.replace(/(.{20})/g, '$1\n');
  for (const text of [wrapped, `  ${code}  `, `"${code}"`, `\u201C${code}\u201D`, `\u200B${code}\uFEFF`, `<${code}>`, code.replace(/(.{30})/g, '$1 \r\n ')]) {
    assert.deepEqual(unsealCode(text), { ok: true, value: v }, JSON.stringify(text.slice(0, 30)));
  }
});

test('Code: jede Veraenderung wird erkannt', () => {
  const code = toCode(seal({ name: 'Mia', coins: 7 }));
  for (let i = 4; i < code.length; i += 3) {
    const c = code[i] === 'A' ? 'B' : 'A';
    assert.equal(unsealCode(code.slice(0, i) + c + code.slice(i + 1)).ok, false, `Stelle ${i}`);
  }
  assert.equal(unsealCode(code.slice(0, -4)).ok, false, 'abgeschnitten');
  assert.equal(unsealCode(code + 'AAAA').ok, false, 'verlaengert');
});

test('Code: Muell, fremde Texte und zu grosse Eingaben werden abgelehnt, ohne zu werfen', () => {
  assert.deepEqual(unsealCode('hallo'), { ok: false, reason: 'kein-code' });
  assert.deepEqual(unsealCode(''), { ok: false, reason: 'kein-code' });
  assert.deepEqual(unsealCode(seal({ a: 1 })), { ok: false, reason: 'kein-code' }, 'Datei-Inhalt ist kein Code');
  assert.equal(unsealCode('BM2-').ok, false);
  assert.equal(unsealCode('BM2-' + '!'.repeat(50)).ok, false);
  assert.equal(unsealCode('BM1-' + 'A'.repeat(100)).ok, false);
  assert.deepEqual(unsealCode('BM2-' + 'A'.repeat(MAX_CODE_CHARS + 1)), { ok: false, reason: 'zu-gross' });
  for (const junk of [null, undefined, 5, {}, []]) assert.equal(unsealCode(junk).ok, false);
  assert.equal(toCode('kein json'), null);
  assert.equal(toCode(JSON.stringify({ format: 'bruchmonster', version: 2 })), null);
});
