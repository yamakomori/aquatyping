#!/usr/bin/env python3
"""make-item.py — 生成した帽子・持ち物スプライトを透過→量子化→アンカー配置で
256x256 アバターキャンバスに焼き込む（README「帽子・持ち物の制作方針」）。

素体と同じ 128 論理グリッド系（prepare-avatar.py の流儀）で扱う:
  <item-id>-source.png(1024, 純色クロマキー背景) → 128 論理へ NEAREST 量子化 →
  クロマキー透過 → アイテム bbox をターゲット論理サイズへ NEAREST 縮小 →
  基準体アンカー位置へ配置 → シルエット最外周を ink(黒) に保証（塗り替え方式・
  完全浮遊ドットは削除）→ NEAREST 2倍 → 256x256 RGBA。

配置アンカーは body-moss.png 実測（README「基準位置」）:
  頭頂 y16 / 頭中心 x63 / 目の行 y47 / 右手先端 (x96,y85)

ITEMS 辞書で各アイテムの key色・ターゲットサイズ・配置を定義。座標は論理px。
"""

import argparse
from pathlib import Path

import avatar_common as ac
from PIL import Image

SRC_DIR = Path("tmp/imagegen/avatar")
PUBLIC = Path("public/avatar")
MIRROR = Path("concept_art/avatar")

N = ac.LOGICAL  # 128
INK_THRESHOLD = 60  # a pixel is "ink" if max(r,g,b) < this

# Anchor constants (logical 128), from README 基準位置.
HEAD_TOP = 16
HEAD_CX = 63
EYE_ROW = 47
HAND_TIP = (96, 85)

# Per-item config.
#   key: chroma key hex the source was generated on.
#   dim: ("w"|"h", pixels) target size (the other dimension scales proportionally).
#   place: how to anchor (see place_item()).
# place ("head", bottom_y): item horizontal-center = HEAD_CX, item bottom row =
#   bottom_y (so the hat sits DOWN over the head; crown rises toward canvas top).
#   Only ~16 logical px exist above HEAD_TOP, so hats overlap the head.
# place ("center", (x,y)): item centered on (x,y).
# place ("hand", (dx,dy)): item near the right hand tip + nudge.
ITEMS = {
    "head-leaf":    dict(key=(255, 0, 255), dim=("w", 34), place=("head", 33)),
    "head-star":    dict(key=(255, 0, 255), dim=("h", 42), place=("head", 44)),
    "head-shell":   dict(key=(0, 255, 0),   dim=("w", 40), place=("head", 34)),
    "head-diver":   dict(key=(255, 0, 255), dim=("w", 50), place=("center", (HEAD_CX, EYE_ROW))),
    "head-lantern": dict(key=(0, 0, 255),   dim=("h", 22), place=("head", 24)),
    # hands: near the right hand tip.
    "hand-net":     dict(key=(255, 0, 255), dim=("h", 40), place=("hand", (0, -4))),
    "hand-bag":     dict(key=(0, 255, 0),   dim=("h", 26), place=("hand", (2, 0))),
    "hand-lantern": dict(key=(0, 0, 255),   dim=("h", 30), place=("hand", (2, -2))),
    "hand-pen":     dict(key=(0, 0, 255),   dim=("h", 44), place=("hand", (4, -2))),
}


def load_logical(path, key):
    """Load source, NEAREST-resize to 128, key out the chroma background.
    Returns grid[y][x] = (r,g,b) or None (transparent)."""
    img = Image.open(path).convert("RGB").resize((N, N), Image.Resampling.NEAREST)
    px = img.load()
    kr, kg, kb = key
    grid = [[None] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            r, g, b = px[x, y]
            if (r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2 <= 60 ** 2:
                continue  # background
            grid[y][x] = (r, g, b)
    return grid


def bbox(grid):
    xs = [x for y in range(N) for x in range(N) if grid[y][x] is not None]
    ys = [y for y in range(N) for x in range(N) if grid[y][x] is not None]
    return min(xs), min(ys), max(xs), max(ys)


def crop_and_scale(grid, dim):
    """Crop to item bbox, scale so the given dimension == target (NEAREST).
    Returns a small dense grid[list[list]] and its (w,h)."""
    x0, y0, x1, y1 = bbox(grid)
    w, h = x1 - x0 + 1, y1 - y0 + 1
    axis, target = dim
    scale = target / (w if axis == "w" else h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    # render crop to an RGBA image, resize NEAREST, read back
    crop = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cpx = crop.load()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = grid[y][x]
            if c is not None:
                cpx[x - x0, y - y0] = c + (255,)
    small = crop.resize((nw, nh), Image.Resampling.NEAREST)
    spx = small.load()
    out = [[None] * nw for _ in range(nh)]
    for y in range(nh):
        for x in range(nw):
            r, g, b, a = spx[x, y]
            if a > 0:
                out[y][x] = (r, g, b)
    return out, nw, nh


def place_item(cfg, item, iw, ih):
    """Return (ox, oy) top-left placement of the item grid in the 128 canvas."""
    mode = cfg["place"][0]
    if mode == "head":
        bottom_y = cfg["place"][1]
        ox = HEAD_CX - iw // 2
        oy = bottom_y - ih  # bottom row sits at bottom_y; crown rises upward
        return ox, oy
    if mode == "center":
        cx, cy = cfg["place"][1]
        return cx - iw // 2, cy - ih // 2
    if mode == "hand":
        dx, dy = cfg["place"][1]
        hx, hy = HAND_TIP
        # item horizontal-center near hand tip, item bottom near hand tip
        ox = hx - iw // 2 + dx
        oy = hy - ih + dy
        return ox, oy
    raise ValueError(mode)


def paste(canvas, item, ox, oy):
    ih = len(item)
    iw = len(item[0]) if ih else 0
    for y in range(ih):
        for x in range(iw):
            c = item[y][x]
            if c is None:
                continue
            cy, cx = oy + y, ox + x
            if 0 <= cy < N and 0 <= cx < N:
                canvas[cy][cx] = c


def guarantee_border_ink(grid, max_iter=30):
    """Every visible pixel 4-adjacent to transparency must be ink (black).
    Recolor non-ink border pixels to black (converges); delete fully detached
    dots (3+ transparent neighbours). Returns (recolored, deleted)."""
    def is_ink(c):
        return c is not None and max(c) < INK_THRESHOLD

    recolored = deleted = 0
    for _ in range(max_iter):
        offenders = []
        for y in range(N):
            for x in range(N):
                c = grid[y][x]
                if c is None or is_ink(c):
                    continue
                bgn = 0
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if not (0 <= ny < N and 0 <= nx < N) or grid[ny][nx] is None:
                        bgn += 1
                if bgn:
                    offenders.append((y, x, bgn))
        if not offenders:
            break
        for y, x, bgn in offenders:
            if bgn >= 3:
                grid[y][x] = None
                deleted += 1
            else:
                grid[y][x] = (0, 0, 0)
                recolored += 1
    return recolored, deleted


def build(item_id, cfg):
    src = SRC_DIR / f"{item_id}-source.png"
    if not src.exists():
        raise SystemExit(f"source not found: {src}")
    logical = load_logical(src, cfg["key"])
    item, iw, ih = crop_and_scale(logical, cfg["dim"])
    ox, oy = place_item(cfg, item_id, iw, ih)
    canvas = [[None] * N for _ in range(N)]
    paste(canvas, item, ox, oy)
    rec, dele = guarantee_border_ink(canvas)
    # render to 256
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    px = img.load()
    for y in range(N):
        for x in range(N):
            c = canvas[y][x]
            if c is not None:
                px[x, y] = c + (255,)
    out = img.resize((ac.OUTPUT, ac.OUTPUT), Image.Resampling.NEAREST)
    for d in (PUBLIC, MIRROR):
        d.mkdir(parents=True, exist_ok=True)
        out.save(d / f"{item_id}.png")
    print(f"{item_id}: item {iw}x{ih} @({ox},{oy}) ink fix rec={rec} del={dele}")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("items", nargs="*", default=list(ITEMS))
    args = ap.parse_args()
    for item_id in args.items:
        build(item_id, ITEMS[item_id])


if __name__ == "__main__":
    main()
