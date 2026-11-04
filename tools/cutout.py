"""Cut product photos out of their white/light studio backgrounds.
Flood-fills near-white from the image border, feathers the edge, trims, and saves a transparent .webp next to the source."""
import sys, glob, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def cut(src):
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im).astype(np.int16)
    rgb = a[..., :3]
    # "background-like": bright and low saturation
    mx, mn = rgb.max(-1), rgb.min(-1)
    bgish = (mn > 222) & ((mx - mn) < 26)
    lab, _ = ndimage.label(bgish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    if bg.mean() < .03:  # already transparent / no light border: keep as is
        alpha = a[..., 3].astype(np.uint8)
    else:
        bg = ndimage.binary_opening(bg, iterations=1)
        fg = ~bg
        fg = ndimage.binary_fill_holes(fg)
        alpha = (fg * 255).astype(np.uint8)
        alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.8)))
        alpha = np.minimum(alpha, a[..., 3]).astype(np.uint8)
    out = np.dstack([a[..., :3].astype(np.uint8), alpha])
    img = Image.fromarray(out, 'RGBA')
    bb = img.getbbox()
    if bb: img = img.crop(bb)
    dst = os.path.splitext(src)[0] + '.cut.webp'
    img.save(dst, 'WEBP', quality=86, method=5)
    return dst, round(float(bg.mean()), 2)

if __name__ == '__main__':
    files = [f for f in glob.glob('images/products/**/*', recursive=True) if not f.endswith('.cut.webp') and os.path.isfile(f)]
    for f in files:
        try: d, r = cut(f); print(r, d)
        except Exception as e: print('ERR', f, e)
