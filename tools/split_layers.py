# -*- coding: utf-8 -*-
"""把橋前.HEIC 依深度切成多層去背圖。

這張是隧道式構圖：吊橋往中央的消失點收束，左右樹叢與欄杆從上到下都是近景。
所以深度不用水平分帶，而是「離消失點的透視距離」再混一點垂直分量
（畫面越下面越靠近相機）。人物層用 rembg 另外抽出來蓋在最前面。

所有遮罩最後正規化成總和為 1：疊回去剛好還原原圖，不重疊也不破洞。
"""
import os
import numpy as np
from PIL import Image

BASE = r'C:\Users\User\Desktop\knight\invitation'
OUT = os.path.join(BASE, 'assets', 'photos')
SRC = os.path.join(OUT, 'bridge-full.jpg')

im = Image.open(SRC).convert('RGB')
W0, H0 = im.size
TARGET_W = 1200
im = im.resize((TARGET_W, int(H0 * TARGET_W / W0)), Image.LANCZOS)
W, H = im.size
print('工作尺寸 %d x %d' % (W, H))

yy = np.linspace(0, 1, H)[:, None].repeat(W, axis=1)
xx = np.linspace(0, 1, W)[None, :].repeat(H, axis=0)

# --- 深度場 ---
VPX, VPY = 0.47, 0.28                      # 吊橋的消失點
r = np.sqrt(((xx - VPX) / 0.78) ** 2 + ((yy - VPY) / 0.66) ** 2)
down = np.clip((yy - VPY) / (1 - VPY), 0, 1)
depth = np.clip(0.64 * r + 0.36 * down, 0, 1)   # 0 = 最遠，1 = 最近
print('深度場 min=%.2f max=%.2f' % (depth.min(), depth.max()))


def slab(d0, d1, f=0.115):
    """取出某個深度區間，邊界羽化 f。

    羽化要夠寬，否則天空這種平滑漸層區會看見殼與殼的交界弧線。
    """
    up = np.clip((depth - (d0 - f)) / f, 0, 1)
    dn = np.clip(((d1 + f) - depth) / f, 0, 1)
    return np.clip(np.minimum(up, dn), 0, 1)


m_sky = slab(-1, 0.20)      # 消失點一帶：遠山、雲、橋的另一端
m_far = slab(0.20, 0.38)    # 遠處林線、對岸、湖面
m_mid = slab(0.38, 0.55)    # 吊橋中段、兩側中景樹
m_near = slab(0.55, 0.74)   # 近段橋面、欄杆、近景樹冠
m_fore = slab(0.74, 2)      # 前景階梯、纜線錨碇

# --- 人物層 ---
mask_path = os.path.join(OUT, '_mask_couple.png')
if os.path.exists(mask_path):
    a = Image.open(mask_path).split()[-1].resize((W, H), Image.LANCZOS)
    m_couple = np.asarray(a, np.float32) / 255.0
    print('人物遮罩 已就緒')
else:
    m_couple = np.zeros((H, W), np.float32)
    print('人物遮罩 尚未產出，本輪先不切人物層')

LAYERS = [
    ('w1-sky', m_sky),
    ('w1-far', m_far),
    ('w1-mid', m_mid),
    ('w1-near', m_near),
    ('w1-couple', m_couple),
    ('w1-fore', m_fore),
]

# --- 正規化：人物優先佔位，其餘按比例分掉剩下的權重 ---
tot = sum(m for n, m in LAYERS if n != 'w1-couple')
safe = np.where(tot > 1e-4, tot, 1.0)
share = np.clip(1.0 - m_couple, 0, 1)
LAYERS = [(n, m if n == 'w1-couple' else m / safe * share) for n, m in LAYERS]

cov = sum(m for _, m in LAYERS)
print('覆蓋率 min=%.3f max=%.3f' % (cov.min(), cov.max()))

rgb = np.asarray(im, np.uint8)
total = 0
for name, m in LAYERS:
    if m.max() <= 0.01:
        print('  跳過（空層） %s' % name)
        continue
    a = (np.clip(m, 0, 1) * 255).astype(np.uint8)
    flat = np.where((a > 0)[:, :, None], rgb, 0).astype(np.uint8)   # 透明處抹平 RGB，壓縮率差很多
    p = os.path.join(OUT, name + '.webp')
    Image.fromarray(np.dstack([flat, a]), 'RGBA').save(p, quality=80, method=6)
    kb = os.path.getsize(p) / 1024
    total += kb
    print('  %-12s %6.0f KB   佔畫面 %4.1f%%' % (name, kb, 100 * (a > 8).mean()))

print('總計 %.2f MB' % (total / 1024))
