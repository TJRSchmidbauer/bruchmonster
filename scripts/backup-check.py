#!/usr/bin/env python3
"""Browser-Pruefung der Sicherungswege (Chrome headless) gegen dist/bruchmonster.html.
Aufruf: python3 scripts/backup-check.py
Prueft: Code kopieren (mit und ohne Zwischenablage), Code und Datei auf einem frischen Geraet laden
(auch mit Zeilenumbruechen und geschweiften Anfuehrungszeichen), Ziehen und Ablegen, Erinnerung im Hub, Fehlermeldungen."""
import sys, json, pathlib, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = 'file://' + str(ROOT / 'dist/bruchmonster.html')
results = []
def check(name, ok, detail=''):
    results.append(ok)
    print(('OK   ' if ok else 'FEHL ') + name + (f'  [{detail}]' if detail and not ok else ''))

def node(js):
    return subprocess.run(['node', '--input-type=module', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()

# Ein fleissiges Profil (25 richtige Antworten, 77 Muenzen) als Code und als Datei, von der Spiellogik selbst erzeugt.
FIX = json.loads(node("""
import { defaultProfile, exportProfile, exportCode } from './src/core/storage.js';
const p = { ...defaultProfile('Fleißig', 'pfix'), coins: 77, owned: ['halbe-socken'], mastery: { kuerzen: { right: 25, wrong: 3, last: 1 } } };
console.log(JSON.stringify({ code: exportCode(p), file: exportProfile(p) }));
"""))
CODE, FILE = FIX['code'], FIX['file']

def fresh(b, **kw):
    ctx = b.new_context(viewport={'width': 1100, 'height': 900}, accept_downloads=True, **kw)
    pg = ctx.new_page()
    pg.errs, pg.log = [], []
    pg.on('pageerror', lambda e: pg.errs.append(str(e)))
    pg.on('console', lambda m: pg.log.append(m.text))
    pg.goto(HTML); pg.wait_for_timeout(250)
    return ctx, pg

def load_code(pg, text):
    pg.fill('#import-code', text)
    pg.click('[data-act="load-code"]')
    pg.wait_for_timeout(400)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])

    # ---- Code einfuegen auf einem frischen Geraet, auch verunstaltet ----
    ctx, pg = fresh(b)
    check('Code ist kurz und beginnt mit BM2-', CODE.startswith('BM2-') and len(CODE) < len(FILE))
    load_code(pg, CODE[:25] + '\n' + CODE[25:])
    body = pg.inner_text('body')
    check('Code mit Zeilenumbruch laedt das Profil', 'Fleißig' in body and '77' in body, body[:80])
    ctx.close()

    for label, mangled in [('geschweifte Anfuehrungszeichen', '“' + CODE + '”'), ('Leerzeichen und Umbrueche', '  ' + '\r\n '.join(CODE[i:i+40] for i in range(0, len(CODE), 40)) + ' \n')]:
        ctx, pg = fresh(b)
        load_code(pg, mangled)
        check(f'Code mit {label} laedt das Profil', 'Fleißig' in pg.inner_text('body'))
        ctx.close()

    # ---- Fehlermeldungen: Text bleibt stehen ----
    ctx, pg = fresh(b)
    broken = CODE[:30] + ('A' if CODE[30] != 'A' else 'B') + CODE[31:]
    load_code(pg, broken)
    check('Veraenderter Code: Meldung, Text bleibt im Feld', 'unvollständig oder wurde verändert' in pg.inner_text('body') and pg.input_value('#import-code') == broken)
    load_code(pg, 'hallo welt')
    check('Fremder Text: verstaendliche Meldung', 'beginnt mit BM2-' in pg.inner_text('body'))
    check('Kein Profil durch falsche Codes entstanden', pg.locator('.profile-row').count() == 0)
    ctx.close()

    # ---- Ziehen und Ablegen ----
    DROP = """(args) => {
      const [sel, content, name] = args;
      const dt = new DataTransfer();
      dt.items.add(new File([content], name, { type: 'application/json' }));
      const target = document.querySelector(sel);
      const fire = (type) => target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
      fire('dragenter'); fire('dragover');
      const over = document.querySelector('.dropzone')?.classList.contains('dropzone--over');
      const ev = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
      target.dispatchEvent(ev);
      return { over, prevented: ev.defaultPrevented };
    }"""
    ctx, pg = fresh(b)
    r = pg.evaluate(DROP, ['.dropzone', FILE, 'sicherung.json'])
    pg.wait_for_timeout(400)
    check('Datei auf die Ablagezone ziehen laedt das Profil', 'Fleißig' in pg.inner_text('body'))
    check('Zone leuchtet beim Ueberfahren, Standardaktion verhindert', r['over'] and r['prevented'])
    ctx.close()

    ctx, pg = fresh(b)
    pg.evaluate(DROP, ['body', FILE, 'sicherung.json'])
    pg.wait_for_timeout(400)
    check('Datei neben die Zone fallen lassen: wird ebenfalls geladen, App bleibt offen', 'Fleißig' in pg.inner_text('body') and pg.url.startswith('file://') and pg.url.endswith('bruchmonster.html'))
    ctx.close()

    ctx, pg = fresh(b)
    pg.evaluate(DROP, ['.dropzone', json.dumps({'format': 'bruchmonster', 'version': 1, 'profile': {'name': 'Schummler', 'coins': 99999}}), 'x.json'])
    pg.wait_for_timeout(400)
    check('Gezogene Klartext-Datei wird abgelehnt', 'Schummler' not in pg.inner_text('body') and 'gehört nicht zu Bruchmonster' in pg.inner_text('body'))
    ctx.close()

    # ---- Erinnerung im Hub ----
    ctx, pg = fresh(b)
    load_code(pg, CODE)
    check('Hub: Erinnerung erscheint nach vielen richtigen Antworten', pg.locator('.backup-hint').count() == 1)
    with pg.expect_download() as dl:
        pg.click('[data-act="hint-file"]')
    check('Hub: Datei wird gesichert, Erinnerung verschwindet', dl.value.suggested_filename.endswith('.json') and pg.locator('.backup-hint').count() == 0)
    pg.reload(); pg.wait_for_timeout(400)
    check('Nach Neuladen keine Erinnerung mehr', pg.locator('.backup-hint').count() == 0)
    pg.click('.topbar__name'); pg.wait_for_timeout(300)
    check('Profilliste zeigt "heute gesichert"', 'heute gesichert' in pg.inner_text('.profile-row'))
    ctx.close()

    # ---- Code kopieren: Zwischenablage erlaubt ----
    ctx, pg = fresh(b, permissions=['clipboard-read', 'clipboard-write'])
    load_code(pg, CODE)
    pg.click('.topbar__name'); pg.wait_for_timeout(300)
    check('Vorher: Zeile zeigt Sicherungsstand', 'noch nie gesichert' in pg.inner_text('.profile-row') or 'heute gesichert' in pg.inner_text('.profile-row'))
    pg.click('.profile-row [data-act="copy-code"]'); pg.wait_for_timeout(400)
    clip = pg.evaluate('navigator.clipboard.readText()')
    check('Code kopieren legt einen BM2-Code in die Zwischenablage', clip.startswith('BM2-') and 'Fleißig' not in clip)
    check('Meldung bestaetigt das Kopieren', 'Code kopiert' in pg.inner_text('body'))
    check('Zeile zeigt "heute gesichert"', 'heute gesichert' in pg.inner_text('.profile-row'))
    # Rundreise: kopierter Code auf frischem Geraet
    ctx2, pg2 = fresh(b)
    load_code(pg2, clip)
    check('Rundreise: kopierter Code laedt auf frischem Geraet dasselbe Profil', 'Fleißig' in pg2.inner_text('body') and '77' in pg2.inner_text('body'))
    ctx2.close(); ctx.close()

    # ---- Code kopieren: Zwischenablage gesperrt -> Ausweg ----
    ctx, pg = fresh(b)
    pg.add_init_script("Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })")
    pg.reload(); pg.wait_for_timeout(300)
    load_code(pg, CODE)
    pg.click('.topbar__name'); pg.wait_for_timeout(300)
    pg.click('.profile-row [data-act="copy-code"]'); pg.wait_for_timeout(300)
    ta = pg.locator('.profile-row .codebox__text')
    check('Ohne Zwischenablage: Feld mit Code erscheint zum Markieren', ta.count() == 1 and ta.input_value().startswith('BM2-'))
    sel = pg.evaluate("(() => { const t = document.querySelector('.profile-row .codebox__text'); return t.selectionEnd - t.selectionStart; })()")
    check('Der Code ist bereits markiert', sel > 20, str(sel))
    ctx.close()

    # ---- Keine Sperren der Content-Security-Policy, keine Fehler ----
    ctx, pg = fresh(b)
    load_code(pg, CODE)
    pg.click('[data-act="copy-code"]'); pg.wait_for_timeout(300)
    viol = [m for m in pg.log if 'Content Security Policy' in m or 'Refused to' in m]
    check('Keine CSP-Sperre und keine Seitenfehler bei allen Wegen', not viol and not pg.errs, '; '.join(viol + pg.errs)[:200])
    ctx.close()
    b.close()

failed = results.count(False)
print(f'\n{len(results) - failed} von {len(results)} Pruefungen bestanden')
sys.exit(1 if failed else 0)
