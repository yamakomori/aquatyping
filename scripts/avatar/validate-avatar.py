#!/usr/bin/env python3
"""validate-avatar.py — アバターアセット(1コマ 256x256)の検証。

各ファイルについて:
  - 寸法 256x256
  - モード RGBA
  - 外周1px が完全透明
  - 可視画素が十分ある
  - 透明に4近傍で隣接する可視ピクセルがすべて ink 系（輪郭色）である
  - (--mirror-dir 指定時) ミラー先と SHA256 一致

参考: .claude/skills/type-rogue-creature-sprites/scripts/validate-sprite.py（4コマ版）
"""

import argparse
import hashlib
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required. Ask before installing it in this environment.") from exc

WIDTH = HEIGHT = 256
INK_MAX_CHANNEL = 80  # a border pixel counts as "ink" only if all RGB channels are below this


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(path):
    errors = []
    warnings = []
    image = Image.open(path)
    if image.size != (WIDTH, HEIGHT):
        errors.append(f"expected {WIDTH}x{HEIGHT}, got {image.width}x{image.height}")
    if image.mode != "RGBA":
        errors.append(f"expected RGBA, got {image.mode}")
    rgba = image.convert("RGBA")
    w, h = rgba.size
    alpha = rgba.getchannel("A")

    hidden = sum(1 for r, g, b, a in rgba.getdata() if a == 0 and (r or g or b))
    if hidden:
        warnings.append(f"{hidden} transparent pixels retain hidden RGB color")

    if (any(alpha.crop((0, 0, w, 1)).getdata())
            or any(alpha.crop((0, h - 1, w, h)).getdata())
            or any(alpha.crop((0, 0, 1, h)).getdata())
            or any(alpha.crop((w - 1, 0, w, h)).getdata())):
        errors.append("outer 1px border must be fully transparent")

    visible = sum(1 for v in alpha.getdata() if v > 0)
    if visible < 400:
        errors.append(f"too few visible pixels: {visible}")

    # border pixels (visible, 4-adjacent to transparency) must all be ink
    px = rgba.load()
    non_ink_border = 0
    sample = None
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            on_edge = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] == 0:
                    on_edge = True
                    break
            if on_edge and max(r, g, b) >= INK_MAX_CHANNEL:
                non_ink_border += 1
                if sample is None:
                    sample = (x, y, (r, g, b))
    if non_ink_border:
        errors.append(
            f"{non_ink_border} border pixels are not ink "
            f"(first at {sample[0]},{sample[1]} rgb={sample[2]})")

    return {"path": path, "visible": visible, "errors": errors, "warnings": warnings}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--mirror-dir", type=Path)
    args = parser.parse_args()

    failed = False
    for path in args.files:
        result = validate(path)
        if args.mirror_dir:
            mirror = args.mirror_dir / path.name
            if not mirror.exists():
                result["errors"].append(f"mirror is missing: {mirror}")
            elif digest(path) != digest(mirror):
                result["errors"].append(f"mirror differs (SHA256): {mirror}")

        print(f"{path}: visible={result['visible']}")
        for warning in result["warnings"]:
            print(f"  WARN: {warning}")
        for error in result["errors"]:
            print(f"  ERROR: {error}")
        failed = failed or bool(result["errors"])

    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
