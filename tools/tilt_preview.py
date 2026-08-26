# -*- coding: utf-8 -*-
"""離線重現網頁裡的視差：把各層依 p 係數位移後疊起來，輸出左／中／右三格。"""
import os, sys
from PIL import Image

OUT = r'C:\Users\User\Desktop\knight\invitation\assets\photos'
NAMES = ['w1-sky', 'w1-far', 'w1-mid', 'w1-near', 'w1-couple', 'w1-fore']

layers = []
for i, n in enumerate(NAMES):
    p = os.path.join(OUT, n + '.webp')
    if not os.path.exists(p) or os.path.getsize(p) < 4096:
        print('  略過（尚未產出）', n)
        continue
    layers.append((Image.open(p).convert('RGBA'), 0.52 + i * 0.115))

W, H = layers[0][0].size
K = 0.050 * W          # 全幅傾斜時最前層的位移量


def frame(px, py):
    base = Image.new('RGBA', (W, H), (14, 18, 32, 255))
    for im, p in layers:
        dx = int(-px * p * K)
        dy = int(py * p * K * 0.62)
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        sh.paste(im, (dx, dy))
        base = Image.alpha_composite(base, sh)
    return base.convert('RGB')


sc = 0.42
tw, th = int(W * sc), int(H * sc)
shots = [('傾斜向左', frame(-1, -0.35)), ('正面', frame(0, 0)), ('傾斜向右', frame(1, 0.35))]
board = Image.new('RGB', (tw * 3 + 40, th + 20), (14, 18, 32))
for i, (_, f) in enumerate(shots):
    board.paste(f.resize((tw, th), Image.LANCZOS), (10 + i * (tw + 10), 10))
board.save(r'C:\Users\User\Desktop\knight\invitation\tilt-preview.jpg', quality=90)
print('已輸出 tilt-preview.jpg，共 %d 層' % len(layers))
