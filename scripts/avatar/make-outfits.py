#!/usr/bin/env python3
"""make-outfits.py — 服(outfit)を outfit-cloth.png のマスク内加工で量産する。

全服が outfit-cloth（たびのふく）のシルエット＝マスクを共有し、マスク内部の
色・パターンだけで差別化する（README「服(outfit)の制作方針」）。輪郭(ink)は
一切変えないため、境界inkの品質保証と位置ズレなしが原理的に保たれる。

処理:
  outfit-cloth.png(256, NEAREST 2x) → 論理128グリッドへ復元（各2x2ブロック）→
  ラベル分類(outline / cream_shade|base|hi / bg) → 服ごとに内部のcreamを
  色写像 or パターン置換（決定論的にPILで、1論理px=2出力px）→ NEAREST 2x で
  256x256 RGBA を書き出し、public/avatar と concept_art/avatar の両方に保存。

輪郭(outline)画素は不変・cream画素は全て内部（border画素は cloth の
strip_color_fringe で ink 保証済み）のため、border ink 保証は維持される。
"""

import argparse
from pathlib import Path

import avatar_common as ac
from PIL import Image

CLOTH = Path("public/avatar/outfit-cloth.png")

CREAM = ac.CREAM  # source triple (cloth's shading reference)


def derive_from(src_triple, base_rgb):
    """Map a source (shade,base,hi) triple onto a new base color, preserving the
    source's HSL saturation/lightness deltas (keeps the cloth's shade structure)."""
    sh = ac.rgb_to_hsl(src_triple["shade"])
    sb = ac.rgb_to_hsl(src_triple["base"])
    shi = ac.rgb_to_hsl(src_triple["hi"])
    th, ts, tl = ac.rgb_to_hsl(base_rgb)
    return {
        "shade": ac.hsl_to_rgb(th, ts + (sh[1] - sb[1]), tl + (sh[2] - sb[2])),
        "base": ac.hsl_to_rgb(th, ts, tl),
        "hi": ac.hsl_to_rgb(th, ts + (shi[1] - sb[1]), tl + (shi[2] - sb[2])),
    }


def load_cloth_labels():
    """Reconstruct the logical 128 grid of outfit-cloth.png.

    Returns labels[y][x] in {"bg","outline","cream_shade","cream_base","cream_hi"}.
    """
    img = Image.open(CLOTH).convert("RGBA")
    W, H = img.size
    assert (W, H) == (ac.OUTPUT, ac.OUTPUT)
    px = img.load()
    n = ac.LOGICAL
    labels = [["bg"] * n for _ in range(n)]
    for y in range(n):
        for x in range(n):
            r, g, b, a = px[x * 2, y * 2]
            if a == 0:
                continue
            if max(r, g, b) < 50:
                labels[y][x] = "outline"
            else:
                labels[y][x] = ac.snap_label((r, g, b))  # cream_*
    return labels


def cream_bbox(labels):
    n = ac.LOGICAL
    xs = [x for y in range(n) for x in range(n) if labels[y][x].startswith("cream")]
    ys = [y for y in range(n) for x in range(n) if labels[y][x].startswith("cream")]
    return min(xs), min(ys), max(xs), max(ys)


def render(color_grid):
    """color_grid[y][x] -> None(bg) or (r,g,b). Render logical128 -> 256 NEAREST 2x."""
    n = ac.LOGICAL
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    px = img.load()
    for y in range(n):
        for x in range(n):
            c = color_grid[y][x]
            if c is not None:
                px[x, y] = c + (255,)
    return img.resize((ac.OUTPUT, ac.OUTPUT), Image.Resampling.NEAREST)


def assert_border_ink(color_grid):
    """Every visible pixel 4-adjacent to bg must be black (ink)."""
    n = ac.LOGICAL
    for y in range(n):
        for x in range(n):
            c = color_grid[y][x]
            if c is None:
                continue
            border = False
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if not (0 <= ny < n and 0 <= nx < n) or color_grid[ny][nx] is None:
                    border = True
                    break
            if border and max(c) >= 50:
                raise SystemExit(f"border ink violation at logical ({x},{y}) rgb={c}")


def base_color_grid(labels, triple):
    """cream_* -> triple values, outline -> black, bg -> None."""
    n = ac.LOGICAL
    cmap = {
        "cream_shade": triple["shade"],
        "cream_base": triple["base"],
        "cream_hi": triple["hi"],
        "outline": (0, 0, 0),
    }
    return [[cmap.get(labels[y][x]) for x in range(n)] for y in range(n)]


def is_inner(labels, x, y):
    return labels[y][x].startswith("cream")


# ---- per-outfit builders (all operate on the shared cloth label grid) -------

def build_rain(labels):
    return base_color_grid(labels, derive_from(CREAM, (0x7c, 0x9a, 0xc7)))


def build_sun(labels):
    return base_color_grid(labels, derive_from(CREAM, (0xd2, 0xa3, 0x4d)))


def build_stripe(labels):
    """白地＋オレンジの横しま（クマノミ柄）。stripe count は裁量。"""
    triple = derive_from(CREAM, (0xf0, 0xee, 0xe6))  # near-white ground
    grid = base_color_grid(labels, triple)
    x0, y0, x1, y1 = cream_bbox(labels)
    orange = (0xe8, 0x87, 0x3c)
    orange_sh = (0xc9, 0x6e, 0x2c)
    h = y1 - y0 + 1
    # 3 orange bands, ~3 logical px thick, evenly spaced inside the cloth
    bands = []
    for k in range(3):
        cy = y0 + round(h * (k + 1) / 4.0)
        bands.append(range(cy - 1, cy + 2))
    band_rows = {ry for band in bands for ry in band}
    for y in range(y0, y1 + 1):
        if y not in band_rows:
            continue
        for x in range(ac.LOGICAL):
            if is_inner(labels, x, y):
                # keep shade cells slightly darker so shading survives
                grid[y][x] = orange_sh if labels[y][x] == "cream_shade" else orange
    return grid


def build_scale(labels):
    """青緑地＋うろこ（段々の弧）。うろこ段数は裁量。"""
    triple = derive_from(CREAM, (0x4f, 0xa5, 0x9c))  # teal ground
    grid = base_color_grid(labels, triple)
    arc = triple["shade"]  # darker teal for the scale arcs
    x0, y0, x1, y1 = cream_bbox(labels)
    # repeating scallop cells: width 6, height 5; draw a down-arc (∪) per cell,
    # offset every other row-band for an overlapping-scale look.
    cw, ch = 6, 5
    row_i = 0
    y = y0
    while y <= y1:
        offset = (cw // 2) if (row_i % 2) else 0
        # arc shape within a cell: relative (dx -> dy of the ∪ bottom)
        arc_map = {0: 2, 1: 3, 2: 3, 3: 3, 4: 3, 5: 2}
        for x in range(x0 - cw, x1 + cw):
            local = (x - x0 + offset) % cw
            dy = arc_map.get(local)
            if dy is None:
                continue
            yy = y + dy
            if y0 <= yy <= y1 and 0 <= x < ac.LOGICAL and is_inner(labels, x, yy):
                grid[yy][x] = arc
        y += ch
        row_i += 1
    return grid


def build_deep(labels):
    """濃紺地＋明るい襟ライン＋リベット2つ（しんかいスーツ）。位置は裁量。"""
    triple = derive_from(CREAM, (0x2b, 0x36, 0x5a))  # dark navy ground
    grid = base_color_grid(labels, triple)
    x0, y0, x1, y1 = cream_bbox(labels)
    collar = (0x8f, 0xc9, 0xd6)  # bright cyan collar line
    rivet = (0xb9, 0xc2, 0xcf)   # steel rivet
    # collar: the topmost inner row-band of the cloth (2 logical rows)
    for y in range(y0, y0 + 3):
        for x in range(ac.LOGICAL):
            if is_inner(labels, x, y):
                grid[y][x] = collar
    # 2 rivets: symmetric about head-center x63, mid-lower on the chest
    cx = 63
    ry = y0 + round((y1 - y0) * 0.6)
    for rx in (cx - 8, cx + 8):
        for dy in (0, 1):
            for dx in (0, 1):
                xx, yy = rx + dx, ry + dy
                if 0 <= xx < ac.LOGICAL and is_inner(labels, xx, yy):
                    grid[yy][xx] = rivet
    return grid


BUILDERS = {
    "outfit-rain": build_rain,
    "outfit-sun": build_sun,
    "outfit-stripe": build_stripe,
    "outfit-scale": build_scale,
    "outfit-deep": build_deep,
}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("items", nargs="*", default=list(BUILDERS),
                    help="outfit ids to build (default: all)")
    ap.add_argument("--public", type=Path, default=Path("public/avatar"))
    ap.add_argument("--mirror", type=Path, default=Path("concept_art/avatar"))
    args = ap.parse_args()

    labels = load_cloth_labels()
    for item_id in args.items:
        grid = BUILDERS[item_id](labels)
        assert_border_ink(grid)
        img = render(grid)
        for d in (args.public, args.mirror):
            d.mkdir(parents=True, exist_ok=True)
            img.save(d / f"{item_id}.png")
        print(f"Wrote {item_id}.png -> {args.public} + {args.mirror}")


if __name__ == "__main__":
    main()
