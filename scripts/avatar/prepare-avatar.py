#!/usr/bin/env python3
"""prepare-avatar.py — 原画を素体スプライトの土台に整形する。

原画(1254x1254, #f406e9 マゼンタ背景) → 128 論理グリッドへ NEAREST 量子化 →
限定パレットへスナップ → マゼンタを透過 → 水平センタリング + 下余白16論理px へ
平行移動（再スケール禁止） → NEAREST 2倍 → 256x256 RGBA を書き出す。

出力はクリームのポンチョを着たままの「合成スプライト」（素体+服+輪郭）。
レイヤー分離は split-avatar-layers.py が行う。上余白が MIN_TOP_MARGIN 未満なら
停止して報告する（帽子スペース不足のエスカレーション条件）。

参考: .claude/skills/type-rogue-creature-sprites/scripts/prepare-sprite.py
"""

import argparse
from pathlib import Path

import avatar_common as ac


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, nargs="?",
                        default=Path("tmp/imagegen/avatar/body-source.png"))
    parser.add_argument("output", type=Path, nargs="?",
                        default=Path("tmp/imagegen/avatar/_prepared.png"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if args.output.exists() and not args.force:
        raise SystemExit(f"output exists: {args.output}; pass --force")
    if not args.input.exists():
        raise SystemExit(f"input not found: {args.input}")

    labels = ac.quantize_to_labels(args.input)
    centered, info = ac.center_labels(labels)  # raises if top margin too small
    recolored, deleted, passes = ac.strip_color_fringe(centered)  # raises on escalation
    img = ac.labels_to_rgba256(centered)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    img.save(args.output)

    counts = {}
    for row in centered:
        for lbl in row:
            counts[lbl] = counts.get(lbl, 0) + 1

    print(f"Wrote {args.output} ({ac.OUTPUT}x{ac.OUTPUT} RGBA)")
    print(f"  src bbox (128) : {info['src_bbox']}")
    print(f"  shift          : {info['shift']}")
    print(f"  margins logical: top={info['top_margin']} bottom={info['bottom_margin']} "
          f"left={info['left_margin']} (char {info['char_w']}x{info['char_h']})")
    print(f"  fringe fix     : recolored {recolored}, deleted {deleted} logical px "
          f"in {passes} pass(es)")
    print(f"  label counts   : " + ", ".join(
        f"{k}={counts.get(k,0)}" for k, _ in ac.PALETTE))


if __name__ == "__main__":
    main()
