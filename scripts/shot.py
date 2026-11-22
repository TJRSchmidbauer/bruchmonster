#!/usr/bin/env python3
"""Usage: shot.py <html> <out.png> <width> [js-to-run-before]  (headless Chrome, file:// URL, height 900)"""
import sys, pathlib
from playwright.sync_api import sync_playwright

html, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
js = sys.argv[4] if len(sys.argv) > 4 else None
pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': width, 'height': 900})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + str(pathlib.Path(html).resolve()))
    if js:
        pg.evaluate(js)
        pg.wait_for_timeout(300)
    pg.screenshot(path=out, full_page=True)
    for e in errors:
        print('console-error:', e)
    b.close()
