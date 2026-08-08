#!/usr/bin/env python3
"""recolor-avatar.py — 素体(body-moss.png)のパレットスワップで色変種を生成する。

body-moss.png の モス3値 (shade/base/hi) を、各ターゲット色の3値へ厳密一致で
置換する。ターゲットの3値は基準色から derive_triple() が HSL の明度・彩度差を
保存して導出する（AI再生成なし＝輪郭の完全一致を保証）。輪郭・目(黒)・透過は不変。

ターゲット基準色（economy.js / README のカラーパレット表）:
  body-sky   #8eb9cf   そらいろ
  body-peach #d99794   ももいろ
  body-night #6f7fa6   よぞらいろ（新規・深海テーマ）
"""

import argparse
from pathlib import Path

import avatar_common as ac

TARGETS = {
    "body-sky": (0x8e, 0xb9, 0xcf),
    "body-peach": (0xd9, 0x97, 0x94),
    "body-night": (0x6f, 0x7f, 0xa6),
}


def recolor(src_img, target_triple):
    img = src_img.convert("RGBA")
    swap = {
        ac.MOSS["shade"]: target_triple["shade"] + (255,),
        ac.MOSS["base"]: target_triple["base"] + (255,),
        ac.MOSS["hi"]: target_triple["hi"] + (255,),
    }
    out = []
    for r, g, b, a in img.getdata():
        if a == 0:
            out.append((0, 0, 0, 0))
            continue
        repl = swap.get((r, g, b))
        out.append(repl if repl is not None else (r, g, b, a))
    img.putdata(out)
    return img


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--indir", type=Path, default=Path("public/avatar"))
    parser.add_argument("--outdir", type=Path, default=Path("public/avatar"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    from PIL import Image
    src_path = args.indir / "body-moss.png"
    if not src_path.exists():
        raise SystemExit(f"base sprite not found: {src_path} (run split first)")
    base = Image.open(src_path)

    args.outdir.mkdir(parents=True, exist_ok=True)
    for item_id, base_color in TARGETS.items():
        out_path = args.outdir / f"{item_id}.png"
        if out_path.exists() and not args.force:
            raise SystemExit(f"output exists: {out_path}; pass --force")
        triple = ac.derive_triple(base_color)
        img = recolor(base, triple)
        img.save(out_path)
        print(f"Wrote {out_path}  triple: "
              f"shade=#{'%02x%02x%02x' % triple['shade']} "
              f"base=#{'%02x%02x%02x' % triple['base']} "
              f"hi=#{'%02x%02x%02x' % triple['hi']}")


if __name__ == "__main__":
    main()
