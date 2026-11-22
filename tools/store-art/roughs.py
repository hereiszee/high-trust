#!/usr/bin/env python3
"""The three round-2 key-art concepts as main-capsule roughs (1232x706) with the logo, plus their thumbnail reads at 231 and 120 px.
A = the dad, the tank in the driveway and the jet (scene K, used); B = the crew on the tank on the lawn; C = the porch pirate caught on the Millers' path."""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B
D = os.path.join(B.DEST, 'alternates', 'round2-roughs'); os.makedirs(D, exist_ok=True)
W, H = 2464, 1412
g = 'filter:saturate(1.14) contrast(1.06)'
sky = '<div style="position:absolute;inset:0;mix-blend-mode:soft-light;background:linear-gradient(180deg,rgba(255,110,60,.55) 0%,rgba(255,190,110,0) 60%)"></div>'
specs = [dict(out=os.path.join(D, 'concept_A_tank_in_the_driveway.png'), plate='r2-main', logo=B.logo_row(200, 'right:80px;top:70px')),
         dict(out=os.path.join(D, 'concept_B_crew_on_the_tank.png'), plate='c13-B', logo=B.logo_row(200, 'left:50%;top:60px;transform:translateX(-50%)')),
         dict(out=os.path.join(D, 'concept_C_porch_pirate.png'), plate='c14-C', logo=B.logo_row(200, 'left:70px;top:60px'))]
for s in specs:
    p = os.path.join(B.OUT, s['plate'] + '.png')
    s.update(w=W, h=H, scale=1, html=B.img(p, 'width:%dpx;height:%dpx;object-fit:cover;%s' % (W, H, g)) + sky + s['logo'])
B.render(specs)
sheet = Image.new('RGB', (1232 + 40 + 231 + 20 + 120, 3 * 726), (30, 32, 38)); y = 0
for s in specs:
    raw = s['out'][:-4] + '.@2x.png'; im = Image.open(raw).convert('RGB').resize((1232, 706), Image.LANCZOS)
    jp = s['out'][:-4] + '.jpg'; im.save(jp, 'JPEG', quality=90); os.remove(raw)
    sheet.paste(im, (0, y)); sheet.paste(im.resize((231, 132), Image.LANCZOS), (1272, y)); sheet.paste(im.resize((120, 69), Image.LANCZOS), (1523, y)); y += 726
    print('wrote', jp)
sheet.save(os.path.join(D, 'thumbnail_check.jpg'), 'JPEG', quality=88)
