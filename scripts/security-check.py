#!/usr/bin/env python3
"""Sicherheitspruefung im echten Browser (Chrome headless) gegen dist/bruchmonster.html.
Aufruf: python3 scripts/security-check.py [pfad-zur-html]
Prueft: (1) normale Nutzung loest keine Sperre der Content-Security-Policy aus,
(2) eingeschleuster Code, Netzzugriffe und HTML-Einfuegen werden blockiert,
(3) Namen mit HTML bleiben Text, (4) Spielstand-Datei: gesiegelt, Rundreise ok, Veraenderung/Klartext abgelehnt."""
import sys, json, pathlib
from playwright.sync_api import sync_playwright

HTML = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'dist/bruchmonster.html').resolve()
results = []
def check(name, ok, detail=''):
    results.append(ok)
    print(('OK   ' if ok else 'FEHL ') + name + (f'  [{detail}]' if detail and not ok else ''))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page()
    log, page_errors, requests = [], [], []
    pg.on('console', lambda m: log.append(m.text))
    pg.on('pageerror', lambda e: page_errors.append(str(e)))
    # Zaehlt nur Anfragen, die wirklich eine Antwort bekommen haben (blockierte bekommen keine).
    pg.on('response', lambda r: requests.append(r.url) if not r.url.startswith(('file:', 'data:', 'blob:')) else None)
    pg.goto('file://' + str(HTML))
    pg.wait_for_timeout(300)

    def violations():
        return [m for m in log if 'Content Security Policy' in m or 'Refused to' in m or 'TrustedHTML' in m or 'Trusted Type' in m]

    # (3) Name mit HTML bleibt Text
    evil_name = '<img src=x onerror=alert(1)>'
    pg.fill('#neuer-name', evil_name)
    pg.click('[data-act="create"]')
    pg.wait_for_timeout(300)
    check('Name mit HTML erzeugt kein Element', pg.evaluate("document.querySelectorAll('img').length") == 0)
    check('Name wird (gekuerzt) als Text angezeigt', '<img' in pg.inner_text('.topbar'))

    # (1) normale Nutzung: Hub, Welt, Monster, Shop-Reiter
    pg.click('.bubble button'); pg.wait_for_timeout(400)
    pg.go_back() if False else None
    pg.click('.topbar__name'); pg.wait_for_timeout(300)             # zurueck zu den Profilen
    pg.click('text=Spielen'); pg.wait_for_timeout(300)
    pg.click('text=Zum Monster'); pg.wait_for_timeout(500)
    for tab in pg.locator('[role=tab]').all():
        tab.click(); pg.wait_for_timeout(150)
    check('Normale Nutzung loest keine CSP-Sperre aus', not violations(), '; '.join(violations())[:300])
    check('Keine JavaScript-Fehler bei normaler Nutzung', not page_errors, '; '.join(page_errors)[:300])

    # (2) Angriffe
    pg.evaluate("""() => { try { const s = document.createElement('script'); s.textContent = 'window.__pwned = 1'; document.body.append(s); } catch (e) { /* gesperrt */ } }""")
    pg.evaluate("""() => { try { const s = document.createElement('script'); s.src = 'data:text/javascript,window.__pwned=1'; document.body.append(s); } catch (e) { /* gesperrt */ } }""")
    pg.wait_for_timeout(300)
    check('Eingeschleustes Skript (Text oder data:-Adresse) laeuft nicht', pg.evaluate('window.__pwned') is None)
    pg.evaluate("""() => { try { const d = document.createElement('div'); d.innerHTML = '<img src=x onerror="window.__pwned2=1">'; document.body.append(d); window.__innerHtml = 'erlaubt'; } catch (e) { window.__innerHtml = 'blockiert'; } }""")
    check('innerHTML ist gesperrt (Trusted Types)', pg.evaluate('window.__innerHtml') == 'blockiert')
    check('onerror aus eingefuegtem HTML laeuft nicht', pg.evaluate('window.__pwned2') is None)
    net = pg.evaluate("""async () => { try { await fetch('https://example.com/x'); return 'erlaubt'; } catch (e) { return 'blockiert'; } }""")
    check('fetch ins Netz ist gesperrt', net == 'blockiert')
    pg.evaluate("""() => { const i = document.createElement('img'); i.src = 'https://example.com/track.png'; document.body.append(i); }""")
    pg.evaluate("""() => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://example.com/x.css'; document.head.append(l); }""")
    pg.evaluate("""() => { const f = document.createElement('iframe'); f.src = 'https://example.com'; document.body.append(f); }""")
    pg.wait_for_timeout(500)
    check('Keine einzige Anfrage an fremde Adressen wird beantwortet', not requests, ', '.join(requests)[:200])
    check('Die Sperren melden sich (Bild, Stil, Rahmen, fetch)', len(violations()) >= 4, str(len(violations())))

    # (4) Spielstand-Datei
    # Profil mit Muenzen anlegen: Muenzen im Speicher setzen geht nur ueber die App -> eine Aufgabe zu loesen ist aufwendig,
    # deshalb nutzen wir den Export des frischen Profils und pruefen Struktur und Rundreise.
    pg.click('.topbar__name'); pg.wait_for_timeout(300)
    with pg.expect_download() as dl:
        pg.click('.profile-row >> text=Als Datei sichern')
    path = dl.value.path()
    text = pathlib.Path(path).read_text()
    doc = json.loads(text)
    check('Export ist nur ein Siegel (format, version 2, n, d, m)', set(doc) == {'format', 'version', 'n', 'd', 'm'} and doc['version'] == 2)
    check('Export verraet weder Name noch Felder', not any(w in text for w in ['coins', 'owned', 'img', 'Monsterfreund', 'kiwi']))

    def do_import(content, name='stand.json'):
        pg.set_input_files('#import-datei', files=[{'name': name, 'mimeType': 'application/json', 'buffer': content.encode()}])
        pg.wait_for_timeout(500)
        return pg.inner_text('body')

    body = do_import(json.dumps({**doc, 'd': doc['d'][:5] + ('A' if doc['d'][5] != 'A' else 'B') + doc['d'][6:]}))
    check('Veraenderte Datei wird abgelehnt', 'verändert' in body)
    body = do_import(json.dumps({'format': 'bruchmonster', 'version': 1, 'profile': {'name': 'Schummler', 'coins': 999999}}))
    check('Klartext-Datei mit Wunschmuenzen wird abgelehnt', 'Schummler' not in body and 'gehört nicht zu Bruchmonster' in body)
    body = do_import('x' * 300000)
    check('Riesige Datei wird abgelehnt', 'viel zu groß' in body)
    n_before = pg.locator('.profile-row').count()
    do_import(text)
    n_after = pg.locator('.profile-row, .topbar__name').count()
    check('Echte, unveraenderte Sicherung laesst sich laden', 'Hallo' in pg.inner_text('body') or n_after > n_before)

    # localStorage-Eintrag von Hand veraendern -> Profil wird nicht geladen
    keys = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('bruchmonster:profile:'))")
    check('Profile liegen gesiegelt im Browser-Speicher', keys and all('coins' not in pg.evaluate(f"localStorage.getItem({json.dumps(k)})") for k in keys))
    pg.evaluate("""(ks) => { for (const k of ks) { const o = JSON.parse(localStorage.getItem(k)); o.d = o.d.slice(0,8) + (o.d[8]==='A'?'B':'A') + o.d.slice(9); localStorage.setItem(k, JSON.stringify(o)); } }""", keys)
    pg.reload(); pg.wait_for_timeout(400)
    pg.click(f'text=Spielen >> nth=0'); pg.wait_for_timeout(300)
    check('Von Hand veraenderter Browser-Speicher wird nicht geladen', 'verändert' in pg.inner_text('body'))
    pg.evaluate("""(ks) => { for (const k of ks) localStorage.setItem(k, JSON.stringify({name:'Schummler', coins: 99999})); }""", keys)
    pg.reload(); pg.wait_for_timeout(400)
    pg.click(f'text=Spielen >> nth=0'); pg.wait_for_timeout(300)
    check('Klartext im Browser-Speicher wird nicht geladen', 'verändert' in pg.inner_text('body') and 'Schummler' not in pg.inner_text('body'))
    b.close()

failed = results.count(False)
print(f'\n{len(results) - failed} von {len(results)} Pruefungen bestanden')
sys.exit(1 if failed else 0)
