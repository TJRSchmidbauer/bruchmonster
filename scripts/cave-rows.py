#!/usr/bin/env python3
"""Hilfsskript: Profil mit allen Moebeln in der Hoehle, misst die Zeilenhoehen (Hoehle-Tab). Aufruf: cave-rows.py [html] [breite] [shot.png]"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
html = sys.argv[1] if len(sys.argv) > 1 else '/tmp/bruchmonster-e2e.html'
width = int(sys.argv[2]) if len(sys.argv) > 2 else 1280
out = sys.argv[3] if len(sys.argv) > 3 else None
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': width, 'height': 900})
    pg.goto('file://' + str(pathlib.Path(html).resolve()))
    pg.fill('#neuer-name', 'Cave'); pg.keyboard.press('Enter'); pg.wait_for_selector('.tiles')
    pg.evaluate("""() => {
      const k = Object.keys(localStorage).find(x => x.startsWith('bruchmonster:profile:'));
      const p = JSON.parse(localStorage[k]);
      p.coins = 500;
      p.owned = ['dreibein-hocker','stachel-kaktus','halbrunder-teppich','bruchsack-kissen','dreiviertel-gemaelde','zaehlerregal','viertelmond-lampe','nenner-esstisch'];
      p.cave = p.owned.slice();
      localStorage[k] = JSON.stringify(p);
    }""")
    pg.reload(); pg.wait_for_selector('.tiles')
    pg.get_by_role('button', name='Zum Monster').click()
    pg.locator('.tab', has_text='Höhle').click()
    pg.wait_for_timeout(200)
    print(pg.evaluate("[...document.querySelectorAll('.cavetab .wardrobe__item')].map(e=>Math.round(e.getBoundingClientRect().height))"))
    if out:
        pg.screenshot(path=out, full_page=True)
