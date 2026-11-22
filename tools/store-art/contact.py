#!/usr/bin/env python3
"""assets/store/contact-sheet.jpg: every store and library graphic and the screenshots at a glance, with names and sizes."""
import os, glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(ROOT, 'assets', 'store')
INK, PAPER, SUN = (22, 24, 28), (246, 241, 227), (255, 201, 74)
def font(sz, bold=False):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else ''),
              '/usr/share/fonts/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

W = 2400
items = [  # (file, display width)
    ('main_capsule_1232x706.jpg', 1232), ('header_capsule_920x430.jpg', 920),
    ('vertical_capsule_748x896.jpg', 560), ('library_capsule_600x900.jpg', 520), ('small_capsule_462x174.jpg', 462),
    ('library_hero_3840x1240.png', 1920), ('library_logo.png', 556), ('page_background_1438x810.jpg', 719),
    ('shortcut_icon_256.png', 256), ('app_icon_184.jpg', 184),
]
shots = sorted(glob.glob(os.path.join(D, 'screenshots', '*.jpg')))
alts = sorted(glob.glob(os.path.join(D, 'alternates', '*.jpg')))

def tile(path, w):
    im = Image.open(path)
    real = im.size
    if im.mode == 'RGBA':
        bg = Image.new('RGBA', im.size, (70, 74, 84, 255)); bg.alpha_composite(im); im = bg
    im = im.convert('RGB')
    h = round(im.height * w / im.width)
    return im.resize((w, h), Image.LANCZOS), real

rows, cur, x, rh = [], [], 0, 0
def flush():
    global cur, x, rh
    if cur:
        rows.append((cur, rh)); cur, x, rh = [], 0, 0
def add(path, w):
    global x, rh
    im, real = tile(path, w)
    if x + w > W - 80 and cur:
        flush()
    cur.append((im, os.path.relpath(path, D), real)); x += w + 40; rh = max(rh, im.height)

for f, w in items:
    p = os.path.join(D, f)
    if os.path.exists(p):
        add(p, w)
flush()
sec_shots = len(rows)
for p in shots:
    add(p, 740)
flush()
sec_alts = len(rows)
for p in alts:
    add(p, 560 if 'header' in p else 740)
flush()

LBL = 46
H = 150 + sum(h + LBL + 40 for _, h in rows) + 140
sheet = Image.new('RGB', (W, H), INK)
d = ImageDraw.Draw(sheet)
d.text((40, 36), 'HIGH TRUST · Steam store and library graphics', fill=SUN, font=font(44, True))
d.text((40, 92), 'assets/store/ · everything rendered from the game itself', fill=PAPER, font=font(24))
y = 150
for i, (cur, h) in enumerate(rows):
    if i == sec_shots and shots:
        d.text((40, y), 'Screenshots (1920×1080)', fill=SUN, font=font(32, True)); y += 60
    if i == sec_alts and alts:
        d.text((40, y), 'Alternates (owner to choose)', fill=SUN, font=font(32, True)); y += 60
    x = 40
    for im, name, real in cur:
        sheet.paste(im, (x, y))
        d.text((x, y + im.height + 8), '%s  ·  %d×%d' % (name, real[0], real[1]), fill=PAPER, font=font(20))
        x += im.width + 40
    y += h + LBL + 40
sheet = sheet.crop((0, 0, W, y + 20))
out = os.path.join(D, 'contact-sheet.jpg')
sheet.save(out, 'JPEG', quality=86, optimize=True)
print('wrote', out, sheet.size)
