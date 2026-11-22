#!/usr/bin/env python3
"""Round 2 key art (scene K in scenes.js): the dad out front, the tank parked beside the minivan with Coach Rick waving from the
hatch, the jet banking low over Maple. Plates r1..r5 come from the studio; this lays out every capsule with honest compositing
of those renders: a grade, a warm sunset gradient laid over the top of the frame, a light background blur behind the dad (his
own cut-out, from the dad-only matte, stays sharp), a warm edge glow on him, and a vignette. The logo is the game's.
Run: python3 tools/store-art/build2.py [only]"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B

OUT, DEST = B.OUT, B.DEST
ONLY = sys.argv[1] if len(sys.argv) > 1 else ''
P = lambda n: os.path.join(OUT, n + '.png')

def layers(name, W, H, blur=2, sky=.55, vig=.45, glow=True):
    """plate (blurred a touch) + sunset gradient + vignette + sharp dad cut-out with a warm edge"""
    p = P(name); cut = B.cutout(p, p.replace('.png', '-matte.png'), name, grow=0)
    g = 'filter:saturate(1.14) contrast(1.06)'
    h = B.img(p, 'width:%dpx;height:%dpx;%s blur(%dpx)' % (W, H, g, blur))
    h += ('<div style="position:absolute;inset:0;mix-blend-mode:soft-light;background:linear-gradient(180deg,'
          'rgba(255,110,60,%.2f) 0%%,rgba(255,150,70,%.2f) 28%%,rgba(255,190,110,0) 60%%)"></div>' % (sky, sky * .6))
    h += ('<div style="position:absolute;inset:0;background:radial-gradient(ellipse 75%% 70%% at 45%% 55%%,rgba(0,0,0,0) 55%%,'
          'rgba(14,10,8,%.2f) 100%%)"></div>' % vig)
    eg = ('drop-shadow(0 0 %dpx rgba(255,200,130,.35)) ' % max(2, W // 900)) if glow else ''
    h += B.img(cut, 'width:%dpx;height:%dpx;filter:%ssaturate(1.12) contrast(1.05) brightness(1.0)' % (W, H, eg))
    return h

def spec(dest, W, H, size, html, **k):
    d = dict(out=dest + '.png', w=W, h=H, scale=1, html=html, size=size, dest=dest); d.update(k); return d

def main_cap(dest):
    W, H = 3696, 2118
    html = layers('r2-main', W, H) + B.logo_row(285, 'right:110px;top:70px')
    return spec(dest, W, H, (1232, 706), html)

def header(dest):
    W, H = 3680, 1720
    html = (layers('r1-header', W, H) +
            '<div style="position:absolute;inset:0;background:linear-gradient(200deg,rgba(12,14,18,.5) 0%,rgba(12,14,18,0) 45%)"></div>' +
            B.logo_stack(395, 'right:150px;top:70px', 'center'))
    return spec(dest, W, H, (920, 430), html)

def vertical(dest, plate='r3-vert', W=2244, H=2688, size=(748, 896), u=430, top=110):
    html = (layers(plate, W, H) +
            '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,14,18,.38) 0%,rgba(12,14,18,0) 34%)"></div>' +
            B.logo_stack(u, 'left:50%%;top:%dpx;transform:translateX(-50%%)' % top, 'center'))
    return spec(dest, W, H, size, html)

def small(dest):
    W, H = 1848, 696
    p = P('r2-main')
    html = (B.img(p, 'width:%dpx;height:%dpx;object-fit:cover;object-position:50%% 60%%;filter:saturate(1.1) brightness(.55) blur(3px)' % (W, H)) +
            '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 80% at 50% 52%,rgba(12,14,18,.5),rgba(12,14,18,.12) 75%)"></div>' +
            B.logo_row(262, 'left:50%;top:50%;transform:translate(-50%,-52%)', 'center'))
    return spec(dest, W, H, (462, 174), html)

def hero(dest):
    W, H = 3840, 1240
    return spec(dest, W, H, (3840, 1240), layers('r5-hero', W, H, blur=3, glow=False) if False else
                B.img(P('r5-hero'), 'width:%dpx;height:%dpx;filter:saturate(1.14) contrast(1.06)' % (W, H)) +
                '<div style="position:absolute;inset:0;mix-blend-mode:soft-light;background:linear-gradient(180deg,rgba(255,110,60,.5) 0%,rgba(255,190,110,0) 60%)"></div>'
                '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 90% at 50% 50%,rgba(0,0,0,0) 60%,rgba(14,10,8,.4) 100%)"></div>')

def master(dest):
    """the main framing at 3696x2118 without the logo: the layered master's flattened key art"""
    W, H = 3696, 2118
    return spec(dest, W, H, (W, H), layers('r2-main', W, H))

if __name__ == '__main__':
    D = lambda n: os.path.join(DEST, n)
    specs = [header(D('header_capsule_920x430')), main_cap(D('main_capsule_1232x706')), vertical(D('vertical_capsule_748x896')),
             vertical(D('library_capsule_600x900'), 'r4-libcap', 1800, 2700, (600, 900), 360, 120), small(D('small_capsule_462x174')),
             hero(D('library_hero_3840x1240')), master(os.path.join(B.ALT, 'key_art_K_3696x2118'))]
    specs = [s for s in specs if not ONLY or ONLY in os.path.basename(s['dest'])]
    B.render(specs)
    for s in specs:
        raw = s['out'][:-4] + '.@2x.png'
        fmt = 'PNG' if s['dest'].endswith('_hero_3840x1240') else 'JPEG'
        B.finish(raw, s['size'], s['dest'] + ('.png' if fmt == 'PNG' else '.jpg'), fmt)
    import shutil
    if os.path.exists(D('header_capsule_920x430.jpg')):
        shutil.copyfile(D('header_capsule_920x430.jpg'), D('library_header_920x430.jpg'))
