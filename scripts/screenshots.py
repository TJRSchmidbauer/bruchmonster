#!/usr/bin/env python3
"""Erzeugt die Bilder fuer die README aus der gebauten App (dist/bruchmonster.html), echt im Browser:
Desktop, Tablet (iPad-Groesse) und Handy, dazu ein Titelbild. Aufruf: npm run build && python3 scripts/screenshots.py"""
import json, pathlib, subprocess
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = 'file://' + str(ROOT / 'dist/bruchmonster.html')
OUT = ROOT / 'docs' / 'bilder'
OUT.mkdir(parents=True, exist_ok=True)

CODE = subprocess.run(['node', '--input-type=module', '-e', """
import { defaultProfile, exportCode } from './src/core/storage.js';
import { markBackedUp } from './src/core/backup.js';
const mastery = {};
const stand = { platzieren: 14, schaetzen: 6, vergleichen: 31, dazwischen: 3, darstellen: 12, erweitern: 8, kuerzen: 26, addieren: 5, 'anteil-von-groesse': 6, rezept: 2 };
for (const [k, r] of Object.entries(stand)) mastery[k] = { right: r, wrong: Math.round(r / 6), last: 1 };
const p = markBackedUp({ ...defaultProfile('Mia', 'pshot'), coins: 120, mastery, seen: Object.keys(mastery) }, new Date().toISOString().slice(0, 10));
console.log(exportCode(p));
"""], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()

GERAETE = {
    'handy': dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'tablet': dict(viewport={'width': 820, 'height': 1180}, device_scale_factor=2, is_mobile=True, has_touch=True),
    'desktop': dict(viewport={'width': 1280, 'height': 800}, device_scale_factor=1),
}

def shot(pg, name, full=False):
    pg.evaluate("document.querySelectorAll('.toast').forEach(t => { t.hidden = true; })")
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT / f'{name}.png'), full_page=full)

def hub(b, kw):
    ctx = b.new_context(reduced_motion='reduce', **kw)
    pg = ctx.new_page()
    pg.goto(HTML); pg.wait_for_timeout(250)
    pg.fill('#import-code', CODE); pg.click('[data-act="load-code"]')
    pg.wait_for_selector('.hub__monster')
    return ctx, pg

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    for dev, kw in GERAETE.items():
        ctx = b.new_context(reduced_motion='reduce', **kw)
        pg = ctx.new_page(); pg.goto(HTML); pg.wait_for_timeout(300)
        shot(pg, f'{dev}-start'); ctx.close()

        ctx, pg = hub(b, kw); shot(pg, f'{dev}-hub')
        pg.click('.tile >> nth=1'); pg.wait_for_selector('.kinds'); shot(pg, f'{dev}-welt')
        pg.click('.kind >> nth=0'); pg.wait_for_selector('.strips-widget')
        zellen = pg.query_selector_all('.strips-widget [aria-label^="Teil"]')
        for z in zellen[:max(1, len(zellen) // 2)]:
            z.click()
        shot(pg, f'{dev}-aufgabe-streifen')
        ctx.close()

        ctx, pg = hub(b, kw)
        pg.click('.tile >> nth=0'); pg.wait_for_selector('.kinds'); pg.click('.kind >> nth=0')
        pg.wait_for_selector('svg.drawing--line'); shot(pg, f'{dev}-aufgabe-strahl')
        ctx.close()

        ctx, pg = hub(b, kw)
        pg.click('text=Zum Monster'); pg.wait_for_timeout(500); shot(pg, f'{dev}-monster')
        ctx.close()
    b.close()

# ---- Titelbild: Desktop, Tablet und Handy nebeneinander auf farbigem Grund ----
def rounded(im, r):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.paste(im.convert('RGBA'), (0, 0), m)
    return out

def geraet(name, hoehe, rand, radius):
    im = Image.open(OUT / name).convert('RGB')
    im = im.crop((0, 0, im.width, min(im.height, int(im.width * hoehe))))
    w = im.width + 2 * rand
    h_ = im.height + 2 * rand
    body = Image.new('RGBA', (w, h_), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle([0, 0, w - 1, h_ - 1], radius + rand, fill=(45, 29, 62, 255))
    body.alpha_composite(rounded(im, radius), (rand, rand))
    return body

W, H = 2400, 1060
bg = Image.new('RGBA', (W, H), (236, 227, 255, 255))
d = geraet('desktop-aufgabe-strahl.png', 0.625, 12, 12)
d = d.resize((1060, int(1060 * d.height / d.width)))
t = geraet('tablet-hub.png', 1.38, 20, 30)
t = t.resize((560, int(560 * t.height / t.width)))
ph = geraet('handy-aufgabe-streifen.png', 2.0, 16, 44)
ph = ph.resize((380, int(380 * ph.height / ph.width)))
def schatten(img, x, y, off=16, blur=22):
    sh = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    a = img.split()[3].point(lambda v: 70 if v else 0)
    sh.paste((45, 29, 62, 255), (x + off, y + off), a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    bg.alpha_composite(sh); bg.alpha_composite(img, (x, y))
schatten(d, 70, 230)
schatten(t, 1210, 60)
schatten(ph, 1850, 250)
bg.convert('RGB').save(OUT / 'titel.png', optimize=True)
for f in OUT.glob('*.png'):
    im = Image.open(f); im.save(f, optimize=True)
print('fertig', sorted(x.name for x in OUT.iterdir()))
