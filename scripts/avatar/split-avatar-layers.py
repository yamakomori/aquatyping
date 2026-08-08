#!/usr/bin/env python3
"""split-avatar-layers.py — 合成スプライトを素体と服の2レイヤーに分離する。

同一原画から量子化・センタリングした 128 論理ラベルグリッドを起点にするため、
2レイヤーの位置ズレは原理的に発生しない（README「レイヤー分離の方針」）。

- body-moss.png : クリーム画素をモス画素へ写像した「全身グリーンの素体」。
  cream_shade→moss_shade / cream_base→moss_base / cream_hi→moss_hi。輪郭・目は黒のまま。
- outfit-cloth.png : クリーム画素 + それに4近傍で隣接する輪郭(黒)画素のみを残した
  透過レイヤー。頭と襟の境界の輪郭が素体側と二重になるのは許容（同色で見えない）。

どちらも 256x256 RGBA。差し戻し修正（2026-08-08）: 各レイヤーとも
「透明に隣接する可視ピクセルはすべて輪郭色」を strip_color_fringe で保証する。
"""

import argparse
from pathlib import Path

import avatar_common as ac


def outfit_keep_set(labels):
    """Return a 2D bool grid: True for pixels kept in the outfit layer
    (cream pixels + outline pixels 4-adjacent to any cream pixel)."""
    n = ac.LOGICAL
    cream = {"cream_shade", "cream_base", "cream_hi"}
    keep = [[False] * n for _ in range(n)]
    for y in range(n):
        for x in range(n):
            if labels[y][x] in cream:
                keep[y][x] = True
    # add outline pixels adjacent to cream
    for y in range(n):
        for x in range(n):
            if labels[y][x] != "outline":
                continue
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < n and 0 <= nx < n and labels[ny][nx] in cream:
                    keep[y][x] = True
                    break
    return keep


def render_masked(labels, keep, relabel=None):
    """Render only pixels where keep[y][x] is True, to 256x256 RGBA."""
    n = ac.LOGICAL
    from PIL import Image
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    px = img.load()
    for y in range(n):
        for x in range(n):
            if not keep[y][x]:
                continue
            label = labels[y][x]
            if relabel:
                label = relabel.get(label, label)
            r, g, b = ac.color_of(label)
            px[x, y] = (r, g, b, 255)
    return img.resize((ac.OUTPUT, ac.OUTPUT), Image.Resampling.NEAREST)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, nargs="?",
                        default=Path("tmp/imagegen/avatar/body-source.png"))
    parser.add_argument("--outdir", type=Path, default=Path("public/avatar"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"source not found: {args.source}")

    labels = ac.quantize_to_labels(args.source)
    centered, info = ac.center_labels(labels)  # raises if top margin too small
    sil_recolored, sil_deleted, sil_passes = ac.strip_color_fringe(centered)

    args.outdir.mkdir(parents=True, exist_ok=True)
    body_path = args.outdir / "body-moss.png"
    outfit_path = args.outdir / "outfit-cloth.png"
    for p in (body_path, outfit_path):
        if p.exists() and not args.force:
            raise SystemExit(f"output exists: {p}; pass --force")

    # body: cream -> moss, everything else (moss/outline) kept, bg transparent
    body = ac.labels_to_rgba256(centered, relabel=ac.CREAM_TO_MOSS)
    body.save(body_path)

    # outfit: cream + adjacent outline only, as its own label grid so the
    # same border guarantee (visible border pixels are ink) applies to the
    # outfit silhouette too.
    keep = outfit_keep_set(centered)
    outfit_labels = [
        [centered[y][x] if keep[y][x] else "bg" for x in range(ac.LOGICAL)]
        for y in range(ac.LOGICAL)
    ]
    out_recolored, out_deleted, out_passes = ac.strip_color_fringe(outfit_labels)
    outfit_keep = [[l != "bg" for l in row] for row in outfit_labels]
    outfit = render_masked(outfit_labels, outfit_keep)
    outfit.save(outfit_path)

    cream_n = sum(1 for row in centered for l in row
                  if l in ("cream_shade", "cream_base", "cream_hi"))
    keep_n = sum(1 for row in outfit_keep for v in row if v)
    print(f"Wrote {body_path}")
    print(f"Wrote {outfit_path}")
    print(f"  silhouette fringe fix = recolored {sil_recolored}, deleted {sil_deleted} "
          f"logical px ({sil_passes} pass(es))")
    print(f"  outfit fringe fix     = recolored {out_recolored}, deleted {out_deleted} "
          f"logical px ({out_passes} pass(es))")
    print(f"  cream logical px = {cream_n}, outfit kept logical px = {keep_n}")


if __name__ == "__main__":
    main()
