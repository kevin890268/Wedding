# -*- coding: utf-8 -*-
"""把分層照片的視差輸出成動圖，用來檢查景深。

游標走一圈橢圓（px=sin, py=cos），首尾相接所以可以無縫循環。
各層依 p 係數反向位移，和網頁裡的算法一致。
"""
import math
import os
from PIL import Image

OUT = r'C:\Users\User\Desktop\knight\invitation\assets\photos'
DEST = r'C:\Users\User\Desktop\knight\invitation'
NAMES = ['w1-sky', 'w1-far', 'w1-mid', 'w1-near', 'w1-couple', 'w1-fore']

FRAMES = 20
WIDTH = 380          # 動圖寬度
SWING = 0.055        # 最前層在全幅傾斜時的位移量（佔畫面寬度比例）

layers = []
for i, n in enumerate(NAMES):
    p = os.path.join(OUT, n + '.webp')
    if not os.path.exists(p) or os.path.getsize(p) < 4096:
        print('  略過（尚未產出）', n)
        continue
    layers.append((Image.open(p).convert('RGBA'), 0.52 + i * 0.115))

if not layers:
    raise SystemExit('沒有可用的圖層')

W, H = layers[0][0].size
K = SWING * W
scale = WIDTH / W
tw, th = WIDTH, int(H * scale)

frames = []
for f in range(FRAMES):
    a = 2 * math.pi * f / FRAMES
    px, py = math.sin(a), math.cos(a) * 0.42
    base = Image.new('RGBA', (W, H), (14, 18, 32, 255))
    for im, p in layers:
        dx = int(round(-px * p * K))
        dy = int(round(py * p * K * 0.62))
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        sh.paste(im, (dx, dy))
        base = Image.alpha_composite(base, sh)
    frames.append(base.convert('RGB').resize((tw, th), Image.LANCZOS))

# GIF 只有 256 色，先共用一組調色盤，避免每張各自量化造成閃爍與肥大
pal = frames[0].quantize(colors=192, method=Image.MEDIANCUT)
gframes = [f.quantize(palette=pal, dither=Image.FLOYDSTEINBERG) for f in frames]
gif = os.path.join(DEST, 'tilt.gif')
gframes[0].save(gif, save_all=True, append_images=gframes[1:],
                duration=90, loop=0, optimize=True)
print('tilt.gif  %d 張 %dx%d  %.1f MB' % (len(frames), tw, th, os.path.getsize(gif) / 1048576))

# WebP 動畫：同樣內容但畫質好很多，網頁上要用就用這個
webp = os.path.join(DEST, 'tilt.webp')
frames[0].save(webp, save_all=True, append_images=frames[1:],
               duration=90, loop=0, quality=78, method=4)
print('tilt.webp %d 張 %dx%d  %.1f MB' % (len(frames), tw, th, os.path.getsize(webp) / 1048576))
