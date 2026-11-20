# Texture edits for the Riverside cast (run with python3 -I texfx.py <op> <jpg> [args])
#  tint <jpg> <r,g,b> [x0,y0,x1,y1]  : recolour white/light-grey cloth (low saturation, bright) to a colour, keeping the shading
#  apron <jpg> <x0,y0,x1,y1>          : paint a striped vendor apron (white/pink) over a UV rect (fractions, top-left origin)
import sys
from PIL import Image
op, path = sys.argv[1], sys.argv[2]
im = Image.open(path).convert('RGB'); W, H = im.size; px = im.load()
def rect(s):
    x0, y0, x1, y1 = [float(v) for v in s.split(',')]; return int(x0*W), int(y0*H), int(x1*W), int(y1*H)
if op == 'tint':
    col = [float(v) for v in sys.argv[3].split(',')]
    x0, y0, x1, y1 = rect(sys.argv[4]) if len(sys.argv) > 4 and "," in sys.argv[4] else (0, 0, W, H)
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]; mx, mn = max(r, g, b), min(r, g, b)
            if mx < 120 or (mx - mn) > 0.16*mx: continue
            k = mx/235.0
            px[x, y] = tuple(min(255, int(c*255*k)) for c in col)
elif op == 'apron':
    x0, y0, x1, y1 = rect(sys.argv[3]); sw = max(4, (x1-x0)//9)
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]; shade = max(r, g, b)/235.0
            shade = 0.55 + 0.45*min(1.0, shade)
            pink = ((x-x0)//sw) % 2 == 0
            c = (236, 120, 160) if pink else (245, 240, 236)
            if y > y1 - (y1-y0)//14: c = (236, 120, 160)  # hem band
            px[x, y] = tuple(int(v*shade) for v in c)
im.save(path, quality=int(sys.argv[-1]) if sys.argv[-1].isdigit() else 85)
