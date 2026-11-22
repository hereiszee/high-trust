#!/usr/bin/env python3
"""Builds the Steam store and library graphics in assets/store/ from the studio's plates (tools/store-art/out/*.png,
rendered in the real game by studio.js + scenes.js) and the game's logo treatment (logo.css, the title screen's
roof mark and Bowlby One). Layout pages are rendered by Playwright (compose.js) at 3-4x and downsampled here.

Run: python3 tools/store-art/build.py [only]      (needs the plates; see README)"""
import json, os, subprocess, sys, shutil
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw

SA = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SA, '..', '..'))
OUT = os.path.join(SA, 'out')
DEST = os.path.join(ROOT, 'assets', 'store')
ALT = os.path.join(DEST, 'alternates')
ONLY = sys.argv[1] if len(sys.argv) > 1 else ''

# the title screen's roof mark (js/hud.js UI_ICON.roof), with an ink outline under it so it holds on bright art
ROOF_PATHS = '<path d="M4 30L59 5l55 25"/><path d="M88 18V7h10v15" stroke-width="{c}"/>'
def roof_svg(w=7, ink=True):
    o = ''
    if ink:
        o += '<g stroke="#16181c" stroke-width="%g">%s</g>' % (w + 5.5, ROOF_PATHS.format(c=w - 2 + 5.5))
    o += '<g stroke="currentColor" stroke-width="%g">%s</g>' % (w, ROOF_PATHS.format(c=w - 2))
    return ('<svg viewBox="-4 -3 126 40" fill="none" stroke-linejoin="round" stroke-linecap="round">%s</svg>' % o)

def logo_stack(u, style='', cls=''):
    return ('<div class="logo %s" style="--u:%gpx;%s"><span class="roof">%s</span><span class="w">High</span>'
            '<span class="w b">Trust</span></div>' % (cls, u, style, roof_svg()))

def logo_row(u, style='', cls=''):
    return ('<div class="logo %s" style="--u:%gpx;%s"><span class="roof">%s</span><span class="w">High&nbsp;'
            '<span style="color:var(--sun)">Trust</span></span></div>' % (cls, u, style, roof_svg()))

def rel(p):
    return os.path.relpath(p, SA).replace(os.sep, '/')

def cutout(plate, matte, name, grow=0):
    """the crew cut out of the plate with their matte, for layering in front of the logo"""
    dst = os.path.join(OUT, name + '-cut.png')
    if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(plate):
        return dst
    im = Image.open(plate).convert('RGB')
    m = Image.open(matte).convert('L').resize(im.size)
    if grow:
        m = m.filter(ImageFilter.MaxFilter(grow))
    m = m.filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(m)
    im.save(dst)
    return dst

def render(specs):
    path = os.path.join(OUT, '.specs.json')
    with open(path, 'w') as f:
        json.dump(specs, f)
    subprocess.run(['node', os.path.join(SA, 'compose.js'), path], check=True)

def finish(raw, size, dest, fmt='JPEG', q=92):
    im = Image.open(raw)
    if fmt == 'JPEG':
        im = im.convert('RGB')
    if im.size != size:
        im = im.resize(size, Image.LANCZOS)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if fmt == 'JPEG':
        im.save(dest, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=0)
    else:
        im.save(dest, 'PNG', optimize=True)
    os.remove(raw)
    print('wrote', os.path.relpath(dest, ROOT), im.size)

def plate(name):
    return os.path.join(OUT, name + '.png')

SCRIM_LEFT = ('<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,14,18,.86) 0%,'
              'rgba(12,14,18,.62) 26%,rgba(12,14,18,.18) 50%,rgba(12,14,18,0) 62%),'
              'linear-gradient(0deg,rgba(12,14,18,.35),rgba(12,14,18,0) 30%)"></div>')
SCRIM_TOP = ('<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,14,18,.42) 0%,'
             'rgba(12,14,18,.14) 28%,rgba(12,14,18,0) 46%),linear-gradient(0deg,rgba(12,14,18,.3),rgba(12,14,18,0) 22%)"></div>')

def img(p, style='', grade=True):
    g = 'filter:saturate(1.1) contrast(1.04);' if grade and 'filter:' not in style else ''
    return '<img src="%s" style="position:absolute;left:0;top:0;%s%s">' % (rel(p), g, style)

# ---------------------------------------------------------------- capsules
def header(tag, dest):
    p = plate('p1-header-' + tag) if tag == 'A' else plate('q1-header-' + tag)
    W, H = 3680, 1720
    html = img(p, 'width:%dpx;height:%dpx' % (W, H)) + SCRIM_LEFT + logo_stack(430, 'left:190px;top:330px')
    return dict(out=dest + '.png', w=W, h=H, scale=1, html=html, size=(920, 430), dest=dest)

def main_capsule(tag, dest):
    p = plate('p2-main-' + tag) if tag == 'A' else plate('q2-main-' + tag)
    m = p.replace('.png', '-matte.png')
    W, H = 3696, 2118
    cut = cutout(p, m, os.path.basename(p)[:-4])
    html = (img(p, 'width:%dpx;height:%dpx' % (W, H)) + SCRIM_TOP +
            logo_row(330, 'left:50%;top:110px;transform:translateX(-50%)', 'center') +
            img(cut, 'width:%dpx;height:%dpx' % (W, H)))
    return dict(out=dest + '.png', w=W, h=H, scale=1, html=html, size=(1232, 706), dest=dest)

def vertical(dest):
    p = plate('p3-vert-A'); m = p.replace('.png', '-matte.png'); W, H = 2244, 2688
    cut = cutout(p, m, 'p3-vert-A')
    html = (img(p, 'width:%dpx;height:%dpx' % (W, H)) + SCRIM_TOP +
            logo_stack(470, 'left:50%;top:150px;transform:translateX(-50%)', 'center') + img(cut, 'width:%dpx;height:%dpx' % (W, H)))
    return dict(out=dest + '.png', w=W, h=H, scale=1, html=html, size=(748, 896), dest=dest)

def libcap(dest):
    p = plate('p4-libcap-A'); m = p.replace('.png', '-matte.png'); W, H = 1800, 2700
    cut = cutout(p, m, 'p4-libcap-A')
    html = (img(p, 'width:%dpx;height:%dpx' % (W, H)) + SCRIM_TOP +
            logo_stack(395, 'left:50%;top:190px;transform:translateX(-50%)', 'center') + img(cut, 'width:%dpx;height:%dpx' % (W, H)))
    return dict(out=dest + '.png', w=W, h=H, scale=1, html=html, size=(600, 900), dest=dest)

def small(dest):
    # mostly logo: the street behind it, darkened, the crew and the van just readable under the wordmark
    p = plate('p5-hero-A'); W, H = 1848, 696
    html = (img(p, 'width:%dpx;height:%dpx;object-fit:cover;object-position:50%% 62%%;filter:saturate(1.05) brightness(.62)' % (W, H)) +
            '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 80% at 50% 52%,rgba(12,14,18,.55),rgba(12,14,18,.15) 75%)"></div>' +
            logo_row(262, 'left:50%;top:50%;transform:translate(-50%,-52%)', 'center'))
    return dict(out=dest + '.png', w=W, h=H, scale=1, html=html, size=(462, 174), dest=dest)

def lib_logo(dest):
    W, H = 1700, 1100
    html = logo_stack(440, 'left:60px;top:40px')
    return dict(out=dest + '.png', w=W, h=H, scale=1, html=html, transparent=True, dest=dest, kind='logo')

def background(dest):
    p = plate('p5-hero-A'); W, H = 1438, 810
    html = (img(p, 'width:%dpx;height:%dpx;object-fit:cover;object-position:50%% 40%%;filter:blur(18px) saturate(.75) brightness(.42)' % (W, H)) +
            '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(22,24,28,.15),rgba(22,24,28,.75) 70%,#16181c 100%),'
            'radial-gradient(ellipse at 50% 0%,rgba(255,201,74,.08),rgba(0,0,0,0) 60%)"></div>')
    return dict(out=dest + '.png', w=W, h=H, scale=1, html=html, size=(1438, 810), dest=dest)

def icon_html(S, bg=True, round_=True):
    r = int(S * .2) if round_ else 0
    box = ('<div style="position:absolute;inset:0;border-radius:%dpx;background:radial-gradient(circle at 50%% 30%%,#2a2e36,#16181c 72%%);'
           'box-shadow:inset 0 0 0 %dpx rgba(255,201,74,.0)"></div>' % (r, S // 64)) if bg else ''
    svg = ('<svg viewBox="-6 -8 130 50" style="position:absolute;left:%dpx;top:%dpx;width:%dpx;height:%dpx" fill="none" stroke="#ffc94a" '
           'stroke-linejoin="round" stroke-linecap="round"><path d="M6 36L59 10l53 26" stroke-width="13"/><path d="M87 20V6h11v18" stroke-width="9"/></svg>'
           % (S * .08, S * .26, S * .84, S * .84 * 50 / 130))
    word = ('<div style="position:absolute;left:0;right:0;top:%dpx;text-align:center;font:400 %dpx/1 \'Bowlby One\';color:#fff;letter-spacing:-.01em">HT</div>'
            % (S * .5, S * .36))
    return box + svg + word

def icons():
    specs = [dict(out=os.path.join(OUT, 'icon-shortcut.png'), w=256, h=256, scale=4, html=icon_html(256), transparent=True),
             dict(out=os.path.join(OUT, 'icon-app.png'), w=184, h=184, scale=4, html=icon_html(184, round_=False), transparent=False)]
    render(specs)
    im = Image.open(os.path.join(OUT, 'icon-shortcut.@2x.png')).convert('RGBA').resize((256, 256), Image.LANCZOS)
    im.save(os.path.join(DEST, 'shortcut_icon_256.png'), optimize=True)
    im.save(os.path.join(DEST, 'shortcut_icon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    a = Image.open(os.path.join(OUT, 'icon-app.@2x.png')).convert('RGB').resize((184, 184), Image.LANCZOS)
    a.save(os.path.join(DEST, 'app_icon_184.jpg'), 'JPEG', quality=94, subsampling=0)
    print('wrote icons')

def run(specs):
    specs = [s for s in specs if not ONLY or ONLY in os.path.basename(s['dest'])]
    if not specs:
        return
    render(specs)
    for s in specs:
        raw = s['out'][:-4] + '.@2x.png'
        if s.get('kind') == 'logo':
            im = Image.open(raw).convert('RGBA'); bb = im.getbbox(); im = im.crop(bb)
            k = 720 / im.height
            if im.width * k > 1280:
                k = 1280 / im.width
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            im.save(s['dest'] + '.png', optimize=True); os.remove(raw); print('wrote', s['dest'] + '.png', im.size)
            continue
        fmt = 'PNG' if s['dest'].endswith('_hero') else 'JPEG'
        finish(raw, s['size'], s['dest'] + ('.png' if fmt == 'PNG' else '.jpg'), fmt)

if __name__ == '__main__':
    os.makedirs(ALT, exist_ok=True)
    D = lambda n: os.path.join(DEST, n)
    A = lambda n: os.path.join(ALT, n)
    specs = [header('A', D('header_capsule_920x430')), main_capsule('A', D('main_capsule_1232x706')),
             vertical(D('vertical_capsule_748x896')), small(D('small_capsule_462x174')),
             libcap(D('library_capsule_600x900')), lib_logo(D('library_logo')), background(D('page_background_1438x810'))]
    for t in ('B', 'C'):
        if os.path.exists(plate('q1-header-' + t)):
            specs.append(header(t, A('header_capsule_920x430_' + t)))
        if os.path.exists(plate('q2-main-' + t)):
            specs.append(main_capsule(t, A('main_capsule_1232x706_' + t)))
    run(specs)
    if not ONLY or ONLY == 'icons':
        icons()
    if not ONLY or ONLY == 'hero':
        im = Image.open(plate('p5-hero-A')).convert('RGB')
        im.save(D('library_hero_3840x1240.png'), optimize=True); print('wrote library_hero', im.size)
    if not ONLY or ONLY == 'libheader':
        shutil.copyfile(D('header_capsule_920x430.jpg'), D('library_header_920x430.jpg'))
