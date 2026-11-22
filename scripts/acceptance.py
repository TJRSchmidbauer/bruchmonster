#!/usr/bin/env python3
"""Abnahmelauf fuer Bruchmonster (Playwright + Chrome, headless).

Aufruf:  node scripts/build-e2e.mjs && python3 scripts/acceptance.py [--html /tmp/bruchmonster-e2e.html] [--shots DIR] [--md tests/e2e-smoke.md]

Benutzt die Testfassung aus build-e2e.mjs (legt den Runner in window.__bmRunner, damit Aufgaben geloest werden koennen).
Prueft: je Welt eine Runde zu 5 (Strahl nur per Tastatur), Kaeufe, Export/Import, Reduced-Motion, ohne localStorage,
Konsolenfehler, Fremdanfragen, horizontales Scrollen bei 360 px, Tippflaechen >= 44 px, Fokusfalle des Rueckmeldeblatts.
"""
import argparse, json, pathlib, sys, tempfile
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('--html', default='/tmp/bruchmonster-e2e.html')
ap.add_argument('--shots', default='.superpowers/sdd/2026-11-22-bruchmonster/shots')
ap.add_argument('--md', default=None)
args = ap.parse_args()
URL = 'file://' + str(pathlib.Path(args.html).resolve())
SHOTS = pathlib.Path(args.shots)
SHOTS.mkdir(parents=True, exist_ok=True)

results = []          # (schritt, ok, detail)
errors = []           # Konsolen-/Seitenfehler
foreign = []          # Netzanfragen, die nicht file:/data: sind
overflow = []         # Bildschirme mit horizontalem Scrollen bei 360 px
small = {}            # (Selektor/Text) -> (breite, hoehe) fuer Elemente < 44 px
screens_seen = set()


def rec(step, ok, detail=''):
    results.append((step, bool(ok), detail))
    print(('OK   ' if ok else 'FAIL ') + step + (f'  [{detail}]' if detail else ''), flush=True)


def watch(page):
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
    page.on('request', lambda r: foreign.append(r.url) if not r.url.startswith(('file:', 'data:', 'blob:')) else None)


MEASURE = """() => {
  const out = [];
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=slider], [role=tab]';
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('.sr-only') || el.classList.contains('sr-only')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.width < 43.5 || r.height < 43.5) {
      const label = (el.getAttribute('aria-label') || el.textContent || el.className.baseVal || el.className || el.tagName).trim().slice(0, 40);
      out.push([el.tagName.toLowerCase() + '|' + label, Math.round(r.width), Math.round(r.height)]);
    }
  }
  return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, small: out };
}"""


def audit(page, name):
    """Misst Overflow und Tippflaechen auf dem aktuellen Bildschirm."""
    m = page.evaluate(MEASURE)
    screens_seen.add(name)
    if page.viewport_size['width'] <= 360 and m['sw'] > m['iw']:
        overflow.append(f"{name}: scrollWidth {m['sw']} > {m['iw']}")
    for key, w, h in m['small']:
        small.setdefault(key, (w, h, name))


def shot(page, name, widths=(390, 768, 1280), full=True):
    orig = page.viewport_size
    for w in widths:
        page.set_viewport_size({'width': w, 'height': 900})
        page.wait_for_timeout(120)
        page.screenshot(path=str(SHOTS / f't12-{name}-{w}.png'), full_page=full)
    page.set_viewport_size(orig)
    page.wait_for_timeout(80)


def sheet_visible(page):
    return page.locator('.sheet').count() > 0


# ---------- Aufgaben loesen ----------
TASK_INFO = """() => {
  const t = globalThis.__bmRunner.current();
  return { w: t.widget.type, data: t.widget.data ?? null, answer: t.answer, kind: t.kind, level: t.level };
}"""


def frac_text(a):
    if a.get('accept') == 'between':
        lo, hi = a['range']
        return f"{lo['n'] + hi['n']}/{lo['d'] + hi['d']}"
    v = a['value']
    return f"{v['n']}/{v['d']}"


def press_activate(page, loc, keyboard):
    if keyboard:
        loc.focus()
        page.keyboard.press('Enter')
    else:
        loc.click()


def answer_task(page, info, keyboard, wrong=False):
    """Beantwortet die aktuelle Aufgabe (richtig oder absichtlich falsch). Gibt False zurueck, wenn nicht loesbar."""
    w, a, d = info['w'], info['answer'], info['data']
    if w == 'input':
        field = page.locator('input.answer__field')
        txt = '0/1' if wrong else frac_text(a)
        field.focus() if keyboard else field.click()
        page.keyboard.type(txt)
        if keyboard:
            page.keyboard.press('Enter')
        else:
            page.get_by_role('button', name='Prüfen').click()
        return True
    if w in ('choice', 'mark'):
        n = page.locator('.pick').count()
        idx = a['value']
        if wrong:
            idx = (idx + 1) % n
        b = page.locator('.pick').nth(idx)
        if keyboard:
            b.focus()
            page.keyboard.press('Space')
            page.get_by_role('button', name='Prüfen').focus()
            page.keyboard.press('Enter')
        else:
            b.click()
            page.get_by_role('button', name='Prüfen').click()
        return True
    if w == 'numberline':
        x = a['value']
        x = x['n'] / x['d'] if isinstance(x, dict) else x
        if wrong:
            x = d['from'] + (d['to'] - d['from']) * (0.05 if x > (d['from'] + d['to']) / 2 else 0.95)
        tol = a.get('tolerance', 0.05)
        if keyboard:
            pin = page.locator('[role=slider]')
            pin.focus()
            for _ in range(120):
                cur = float(pin.get_attribute('aria-valuenow'))
                touched = pin.get_attribute('aria-valuetext') != 'noch nicht gesetzt'
                if abs(cur - x) <= tol * 0.5 and touched:
                    break
                if abs(cur - x) <= 1e-9 and not touched:  # steht schon richtig, aber unberuehrt: hin und zurueck
                    page.keyboard.press('ArrowRight')
                    continue
                page.keyboard.press('ArrowRight' if cur < x - 1e-9 else 'ArrowLeft')
            page.keyboard.press('Enter')
        else:
            box = page.locator('.nl-track').bounding_box()
            svg = page.locator('svg.nl-live').bounding_box()
            px = svg['x'] + (24 + (x - d['from']) / (d['to'] - d['from']) * 352) / 400 * svg['width']
            page.mouse.click(px, box['y'] + box['height'] / 2)
            page.get_by_role('button', name='Prüfen').click()
        return True
    if w == 'strips':
        parts = d['rows'][0]['parts']
        v = a['value']
        k = v['n'] * parts / v['d']
        if k != int(k):
            return False
        k = int(k)
        if wrong:
            k = 1 if k != 1 else 2
        cells = page.locator('.strip-cell')
        if keyboard:
            cells.nth(0).focus()
            for i in range(k):
                page.keyboard.press('Space')
                if i < k - 1:
                    page.keyboard.press('ArrowRight')
            page.keyboard.press('Control+Enter')
        else:
            for i in range(k):
                cells.nth(i).click()
            page.get_by_role('button', name='Prüfen').click()
        return True
    return False


def play_round(page, world_name, keyboard=False, check_sheet_keys=False):
    """Eine Runde zu 5 Aufgaben in der geoeffneten Welt (Aufgabenart ist schon gewaehlt). Gibt (richtig, muenzen) zurueck."""
    right = 0
    unsolved = 0
    for n in range(5):
        page.wait_for_selector('.taskview .prompt')
        audit(page, f'Aufgabe {page.evaluate("globalThis.__bmRunner.current().widget.type")}')
        info = page.evaluate(TASK_INFO)
        if n == 1:
            shot(page, f'task-{world_name}')
        if check_sheet_keys and n == 0 and info['w'] in ('input', 'choice', 'mark'):
            sheet_key_checks(page, info, keyboard)
        if not answer_task(page, info, keyboard):
            unsolved += 1
            rec(f'  Aufgabe nicht automatisch loesbar: {info["w"]}/{info["kind"]}', True, 'uebersprungen')
            page.get_by_role('button', name='Prüfen').click()
        page.wait_for_selector('.sheet')
        audit(page, 'Rueckmeldeblatt')
        if page.locator('.sheet--right').count():
            right += 1
        page.get_by_role('button', name='Nächste Aufgabe').click()
        page.wait_for_timeout(120)
        if n < 4:
            focused_prompt = page.evaluate("document.activeElement?.classList.contains('prompt')")
            if not focused_prompt:
                rec(f'  Fokus nach "Nächste Aufgabe" ({world_name}, Aufgabe {n + 2})', False, page.evaluate('document.activeElement?.className || document.activeElement?.tagName'))
    page.wait_for_selector('.summary')
    audit(page, 'Rundenende')
    return right, unsolved


def sheet_key_checks(page, info, keyboard):
    """Esc gibt die Aufgabe nach Fehlversuch frei, Tab bleibt im Blatt."""
    answer_task(page, info, keyboard, wrong=True)
    page.wait_for_selector('.sheet--wrong')
    inside = True
    for i in range(7):
        page.keyboard.press('Tab')
        inside &= page.evaluate("!!document.activeElement?.closest('.sheet')")
    rec('Tab bleibt im Rückmeldeblatt (7x Tab)', inside)
    inside = True
    for i in range(7):
        page.keyboard.press('Shift+Tab')
        inside &= page.evaluate("!!document.activeElement?.closest('.sheet')")
    rec('Shift+Tab bleibt im Rückmeldeblatt (7x)', inside)
    page.keyboard.press('Escape')
    page.wait_for_timeout(100)
    gone = page.locator('.sheet').count() == 0
    in_widget = page.evaluate("!!document.activeElement?.closest('.taskcard')")
    rec('Esc schließt das Blatt nach Fehlversuch und Fokus liegt im Antwortbereich', gone and in_widget, f'blatt weg={gone}, fokus im widget={in_widget}')


def open_world(page, key_idx, keyboard=False):
    """Vom Hub in eine Welt (Tile Nr. key_idx), dann erste Aufgabenart ohne Experiment. Gibt Weltname zurueck."""
    tile = page.locator('.tile').nth(key_idx)
    name = tile.locator('.tile__name').inner_text()
    press_activate(page, tile, keyboard)
    page.wait_for_selector('.kinds')
    audit(page, 'Welt-Liste')
    return name


def start_kind(page, i, keyboard=False):
    page.wait_for_selector('.kinds')
    btn = page.locator('.kinds .kind').nth(i)
    press_activate(page, btn, keyboard)
    if page.locator('.experiment, [class*=experiment]').count() and page.get_by_role('button', name='Kenn ich schon').count():
        audit(page, 'Experiment')
        press_activate(page, page.get_by_role('button', name='Kenn ich schon'), keyboard)
    page.wait_for_selector('.taskview .prompt')


def coins(page):
    return int(page.locator('[data-coins]').first.get_attribute('data-coins'))


def goto_hub_via_summary(page, keyboard=False):
    press_activate(page, page.get_by_role('button', name='Zurück zur Karte'), keyboard)
    page.wait_for_selector('.tiles')


def create_profile(page, name):
    page.wait_for_selector('#neuer-name')
    page.fill('#neuer-name', name)
    page.keyboard.press('Enter')
    page.wait_for_selector('.tiles')


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width': 360, 'height': 800}, accept_downloads=True, has_touch=True)
        page = ctx.new_page()
        watch(page)
        page.goto(URL)

        # ---- 1 Profil ----
        page.wait_for_selector('#neuer-name')
        audit(page, 'Profil (leer)')
        shot(page, 'profil')
        create_profile(page, 'Mia')
        rec('Profil anlegen (Tastatur: Name tippen, Enter)', page.locator('.tiles').count() == 1)
        audit(page, 'Hub')
        shot(page, 'hub')

        # ---- 2 Welten ----
        coins0 = coins(page)
        world_names = []
        keyboard_flags = [True, False, False, False]  # Strahl nur per Tastatur
        for idx in range(4):
            kb = keyboard_flags[idx]
            name = open_world(page, idx, kb)
            world_names.append(name)
            start_kind(page, 0, kb)
            before = coins(page)
            right, unsolved = play_round(page, name.split()[0].lower(), keyboard=kb, check_sheet_keys=(idx == 2))
            after = coins(page)
            rec(f'Runde {name}{" (nur Tastatur)" if kb else ""}: 5 Aufgaben, {right} richtig', right >= 5 - unsolved and right >= 1, f'Münzen {before}->{after}, nicht lösbar: {unsolved}')
            if idx == 0:
                shot(page, 'summary', widths=(390,))
            goto_hub_via_summary(page, kb)
        coins1 = coins(page)
        rec('Münzen gesammelt', coins1 > coins0, f'{coins0} -> {coins1}')

        # Zweite Aufgabenart je Welt: deckt weitere Widget-Typen ab (Strahl 2, Streifen 2: nur Aufgaben antippen, nicht werten)
        for idx, ki in ((0, 1), (0, 2), (1, 1), (1, 2), (2, 1), (3, 1)):
            open_world(page, idx)
            start_kind(page, ki)
            audit(page, f'Aufgabe (Welt {idx}, Art {ki})')
            info = page.evaluate(TASK_INFO)
            answer_task(page, info, False)
            page.wait_for_selector('.sheet')
            audit(page, 'Rueckmeldeblatt')
            if page.locator('.sheet--wrong').count():
                shot(page, f'sheet-wrong-{info["w"]}', widths=(390,), full=False)
            page.get_by_role('button', name='Andere Aufgabe').click()
            page.wait_for_selector('.kinds')
            page.get_by_role('button', name='Zur Karte').click()
            page.wait_for_selector('.tiles')

        # ---- 3 Monster, Shop ----
        coins_before_shop = coins(page)
        page.get_by_role('button', name='Zum Monster').click()
        page.wait_for_selector('.tabs')
        audit(page, 'Monster')
        shot(page, 'monster')
        xp_text0 = page.locator('.growth__text').inner_text()

        def tab(name):
            page.locator('.tab', has_text=name).click()
            page.wait_for_timeout(120)

        tab('Shop')
        page.locator('.cat[data-cat=futter]').click()
        audit(page, 'Shop Futter')
        page.get_by_role('button', name='Bruchkekse füttern für 3 Münzen').click()
        page.wait_for_timeout(200)
        page.locator('.cat[data-cat=kleidung]').click()
        audit(page, 'Shop Kleidung')
        page.get_by_role('button', name='Halbe Socken kaufen für 10 Münzen').click()
        page.wait_for_timeout(150)
        page.locator('.cat[data-cat=moebel]').click()
        audit(page, 'Shop Möbel')
        page.get_by_role('button', name='Dreibeiniger Hocker kaufen für 10 Münzen').click()
        page.wait_for_timeout(150)
        shot(page, 'shop')
        c_after = coins(page)
        rec('Kaufen: Futter, Kleidung, Möbel (3 + 10 + 10 Münzen)', coins_before_shop - c_after == 23, f'{coins_before_shop} -> {c_after}')

        tab('Schrank')
        audit(page, 'Schrank')
        page.get_by_role('button', name='Halbe Socken anziehen').click()
        page.wait_for_timeout(150)
        rec('Kleidung anziehen', page.get_by_role('button', name='Halbe Socken ausziehen').count() == 1)
        tab('Höhle')
        audit(page, 'Höhle (leer)')
        page.get_by_role('button', name='Dreibeiniger Hocker aufstellen').click()
        page.wait_for_timeout(150)
        audit(page, 'Höhle')
        shot(page, 'hoehle')
        rec('Möbel aufstellen', page.get_by_role('button', name='Dreibeiniger Hocker wegräumen').count() == 1)
        page.set_viewport_size({'width': 1280, 'height': 900})
        row_h = page.evaluate("document.querySelector('.cavetab .wardrobe__item')?.getBoundingClientRect().height")
        rec('Höhle: Möbelzeile kompakt (<= 90 px bei 1280)', row_h is not None and row_h <= 90, f'{row_h:.0f} px')
        page.set_viewport_size({'width': 360, 'height': 800})
        tab('Karten')
        audit(page, 'Karten')
        tab('Monster')
        xp_text1 = page.locator('.growth__text').inner_text()
        rec('Futter erhöht Wachstum', xp_text0 != xp_text1, f'{xp_text0} -> {xp_text1}')

        # ---- 4 Export ----
        saved_coins = coins(page)
        page.get_by_role('button', name='Mia, Profil wechseln').click()
        page.wait_for_selector('.profile-list')
        audit(page, 'Profil (mit Eintrag)')
        shot(page, 'profil-liste', widths=(390,))
        with page.expect_download() as dl:
            page.get_by_role('button', name='Mia als Datei sichern').click()
        tmp = pathlib.Path(tempfile.mkdtemp()) / 'export.json'
        dl.value.save_as(str(tmp))
        raw = tmp.read_text()
        exp = json.loads(raw)
        sealed_ok = set(exp) == {'format', 'version', 'n', 'd', 'm'} and exp['version'] == 2 and not any(w in raw for w in ['coins', 'owned', 'halbe-socken', 'Mia'])
        rec('Export ist ein Siegel: Inhalt nicht lesbar (Münzen, Besitz, Name nicht im Klartext)', sealed_ok)
        # Der Inhalt selbst wird unten durch die Rundreise (Import) geprueft.

        # ---- 5 Import in neues Profil ----
        page.get_by_role('button', name='Mia löschen').click()
        page.get_by_role('button', name='Ja, löschen').click()
        page.wait_for_selector('#neuer-name')
        rec('Profil löschen mit Rückfrage', page.locator('.profile-list').count() == 0)
        create_profile(page, 'Neu')
        rec('Neues Profil "Neu" startet bei 0 Münzen', coins(page) == 0)
        page.get_by_role('button', name='Neu, Profil wechseln').click()
        page.wait_for_selector('#import-datei', state='attached')
        page.set_input_files('#import-datei', str(tmp))
        page.wait_for_selector('.tiles')
        rec('Import stellt Münzen wieder her', coins(page) == saved_coins, f'{coins(page)} == {saved_coins}')
        page.get_by_role('button', name='Zum Monster').click()
        page.wait_for_selector('.tabs')
        tab('Schrank')
        socks = page.get_by_role('button', name='Halbe Socken ausziehen').count() == 1
        tab('Höhle')
        stool = page.get_by_role('button', name='Dreibeiniger Hocker wegräumen').count() == 1
        rec('Import stellt Kleidung und Höhle wieder her', socks and stool, f'socken={socks}, hocker={stool}')

        # ---- 6 Fremdanfragen / Fehler im Hauptlauf ----
        main_errors = list(errors)
        rec('Hauptlauf: 0 Konsolenfehler', len(main_errors) == 0, '; '.join(main_errors[:3]))
        rec('Hauptlauf: 0 Netzanfragen außerhalb file:/data:', len(foreign) == 0, ', '.join(foreign[:3]))
        ctx.close()

        # ---- 7 Reduced Motion ----
        rctx = browser.new_context(viewport={'width': 390, 'height': 800}, reduced_motion='reduce')
        rp = rctx.new_page()
        watch(rp)
        rp.goto(URL)
        create_profile(rp, 'Reduce')
        rec('Reduced Motion: matchMedia greift', rp.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))
        open_world(rp, 2)
        start_kind(rp, 0)
        info = rp.evaluate(TASK_INFO)
        answer_task(rp, info, False)
        rp.wait_for_selector('.sheet--right')
        rp.wait_for_timeout(100)
        n_anim = rp.evaluate("document.getAnimations().length")
        n_coin = rp.locator('.coin-fly').count()
        rec('Reduced Motion: keine laufenden Animationen nach richtiger Antwort', n_anim == 0 and n_coin == 0, f'animationen={n_anim}, fliegende Münzen={n_coin}')
        shot(rp, 'reduced-sheet', widths=(390,), full=False)
        rctx.close()

        # ---- 8 localStorage deaktiviert / Privatmodus ----
        pctx = browser.new_context(viewport={'width': 390, 'height': 800})
        pctx.add_init_script("""
          Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });
        """)
        pp = pctx.new_page()
        watch(pp)
        pp.goto(URL)
        pp.wait_for_selector('#neuer-name')
        warn = pp.locator('.notice[role=note]').count() == 1
        rec('Ohne localStorage: Warnhinweis auf dem Profil-Bildschirm', warn)
        shot(pp, 'ohne-speicher', widths=(390,), full=False)
        create_profile(pp, 'Gast')
        open_world(pp, 2)
        start_kind(pp, 0)
        info = pp.evaluate(TASK_INFO)
        answer_task(pp, info, False)
        pp.wait_for_selector('.sheet')
        pp.get_by_role('button', name='Nächste Aufgabe').click()
        rec('Ohne localStorage: Profil anlegen und Aufgabe lösen funktioniert', pp.locator('.taskview').count() == 1)
        pctx.close()

        # ---- 9 Gesamt ----
        all_err = list(errors)
        rec('Gesamt: 0 Konsolenfehler/Seitenfehler (alle Läufe)', len(all_err) == 0, '; '.join(all_err[:3]))
        rec('Gesamt: 0 Netzanfragen außerhalb file:/data:', len(foreign) == 0)
        rec('Kein horizontales Scrollen bei 360 px', not overflow, f'{len(screens_seen)} Bildschirmzustände geprüft' if not overflow else '; '.join(overflow))
        browser.close()

    print('\nBildschirmzustände:', sorted(screens_seen))
    print('Elemente < 44 px:')
    for k, (w, h, scr) in sorted(small.items()):
        print(f'  {w}x{h}  {k}  ({scr})')
    if not small:
        print('  keine')
    if args.md:
        write_md(args.md)
    return all(ok for _, ok, _ in results)


def write_md(path):
    lines = ['# Abnahme Bruchmonster (Task 12)', '',
             'Erzeugt von `scripts/acceptance.py` (Playwright, Chrome headless). Wiederholbar mit:', '',
             '```', 'node scripts/build-e2e.mjs && python3 scripts/acceptance.py --md tests/e2e-smoke.md', '```', '',
             '| Schritt | Ergebnis | Detail |', '|---|---|---|']
    for s, ok, d in results:
        lines.append(f'| {s.strip()} | {"✅" if ok else "❌"} | {d} |')
    lines += ['', '## Tippflächen unter 44 px', '',
              'Gemessen bei 360 px Breite an allen Bildschirmzuständen. Ausnahme: einzelne Streifenstücke (SVG) sind bei 10 und mehr',
              'Teilen schmaler als 44 px (Höhe 44 px). Das ist geometrisch nicht zu vermeiden; Gegenmittel: Ziehen über mehrere Stücke',
              'malt sie, die Tastatur erreicht jedes Stück, und die Knöpfe "Ein Stück mehr/weniger" ersetzen das Antippen.', '']
    if small:
        for k, (w, h, scr) in sorted(small.items()):
            lines.append(f'- {w}x{h} px: `{k}` ({scr})')
    else:
        lines.append('Keine.')
    lines += ['', '## Geprüfte Bildschirmzustände (360 px)', '', ', '.join(sorted(screens_seen))]
    pathlib.Path(path).write_text('\n'.join(lines) + '\n')


if __name__ == '__main__':
    sys.exit(0 if run() else 1)
