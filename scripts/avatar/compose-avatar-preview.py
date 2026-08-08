#!/usr/bin/env python3
"""compose-avatar-preview.py — きせかえ全アイテムの目視QAグリッドを出力する。

2枚構成を1画像に縦連結して tmp/imagegen/avatar/preview-items.png に書き出す:
  上段ブロック : 全アイテムを基準体(moss)に単品装備したグリッド
                 （bodyColor は色替え単体、head/outfit/hand は moss に1個ずつ重ねる）
  下段ブロック : 雑多なフル装備例4体（body+outfit+head+hand の組み合わせ）

各セルは 128px 表示（256pxアセットを縮小）＋ラベル。位置ズレ・縁残り・
スケール不整合・縮小時の可読性を1画面で確認する用途。
"""

from pathlib import Path

from PIL import Image, ImageDraw

PUB = Path("public/avatar")
OUT = Path("tmp/imagegen/avatar/preview-items.png")

CELL = 128          # avatar draw size in a cell
LABEL_H = 16
PAD = 8
COLS = 6
BG = (208, 212, 216, 255)
BG2 = (32, 38, 46, 255)   # dark strip to check light-on-dark
FG = (20, 20, 20, 255)
FG2 = (235, 235, 235, 255)

BODIES = ["body-moss", "body-sky", "body-peach", "body-night"]
HEADS = ["head-leaf", "head-star", "head-shell", "head-diver", "head-lantern"]
OUTFITS = ["outfit-cloth", "outfit-rain", "outfit-sun", "outfit-stripe",
           "outfit-scale", "outfit-deep"]
HANDS = ["hand-net", "hand-bag", "hand-lantern", "hand-pen"]

# full-dress examples: (body, outfit, head, hand)
EXAMPLES = [
    ("body-sky", "outfit-rain", "head-diver", "hand-net"),
    ("body-peach", "outfit-stripe", "head-shell", "hand-bag"),
    ("body-night", "outfit-deep", "head-lantern", "hand-lantern"),
    ("body-moss", "outfit-sun", "head-star", "hand-pen"),
]


def load(item):
    return Image.open(PUB / f"{item}.png").convert("RGBA")


def stack(layers):
    """Composite a list of item-ids into one 256x256 avatar."""
    base = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    for item in layers:
        if item is None:
            continue
        base.alpha_composite(load(item))
    return base


def cell(av, label, dark=False):
    w = CELL + PAD * 2
    h = CELL + LABEL_H + PAD * 2
    tile = Image.new("RGBA", (w, h), BG2 if dark else BG)
    tile.alpha_composite(av.resize((CELL, CELL), Image.Resampling.NEAREST), (PAD, PAD))
    d = ImageDraw.Draw(tile)
    d.text((PAD, CELL + PAD + 2), label, fill=FG2 if dark else FG)
    return tile


def grid(cells, cols=COLS):
    if not cells:
        return Image.new("RGBA", (1, 1))
    cw, ch = cells[0].size
    rows = (len(cells) + cols - 1) // cols
    g = Image.new("RGBA", (cw * cols, ch * rows), (255, 255, 255, 255))
    for i, c in enumerate(cells):
        g.alpha_composite(c, ((i % cols) * cw, (i // cols) * ch))
    return g


def main():
    singles = []
    for b in BODIES:
        singles.append(cell(stack([b]), b))
    for o in OUTFITS:
        singles.append(cell(stack(["body-moss", o]), o))
    for hd in HEADS:
        singles.append(cell(stack(["body-moss", hd]), hd))
    for hn in HANDS:
        singles.append(cell(stack(["body-moss", hn]), hn))
    top = grid(singles)

    ex_cells = []
    for i, (b, o, hd, hn) in enumerate(EXAMPLES):
        dark = i % 2 == 1
        ex_cells.append(cell(stack([b, o, hd, hn]), f"{o}/{hd}/{hn}", dark=dark))
    bottom = grid(ex_cells, cols=len(EXAMPLES))

    W = max(top.width, bottom.width)
    gap = 12
    canvas = Image.new("RGBA", (W, top.height + gap + bottom.height), (255, 255, 255, 255))
    canvas.alpha_composite(top, (0, 0))
    canvas.alpha_composite(bottom, (0, top.height + gap))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT)
    print(f"Wrote {OUT} ({canvas.width}x{canvas.height})")


if __name__ == "__main__":
    main()
