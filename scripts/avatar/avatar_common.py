#!/usr/bin/env python3
"""Shared palette and helpers for the きせかえ avatar pipeline.

Not one of the four DoD scripts — an internal module imported by
prepare-avatar.py / split-avatar-layers.py / recolor-avatar.py so the
palette definition lives in exactly one place (avoids drift).

All colors are the measured quantized values of the original art
(tmp/imagegen/avatar/body-source.png resized to 128x128 NEAREST).
See IMPLEMENTATION_NOTES.md for why these differ slightly from README.
"""

import colorsys

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Pillow is required. Ask before installing it in this environment.") from exc

# Logical grid the art is quantized to, and the final output edge (2x).
LOGICAL = 128
OUTPUT = 256
BOTTOM_MARGIN = 16   # empty logical rows kept below the character
MIN_TOP_MARGIN = 12  # escalation threshold (README / handoff §2)

# --- Palette (name -> RGB snap target) -------------------------------------
# Background chroma is the real gpt-image magenta, not pure #ff00ff.
BG = (244, 6, 233)
OUTLINE = (0, 0, 0)          # black outline AND eyes (shared across all colors)

MOSS = {
    "shade": (112, 148, 98),
    "base": (134, 170, 116),
    "hi": (171, 199, 148),
}
CREAM = {
    "shade": (230, 209, 170),
    "base": (237, 222, 192),
    "hi": (250, 235, 206),
}

# Ordered snap palette: (label, rgb). Label groups: bg / outline / moss_* / cream_*
PALETTE = [
    ("bg", BG),
    ("outline", OUTLINE),
    ("moss_shade", MOSS["shade"]),
    ("moss_base", MOSS["base"]),
    ("moss_hi", MOSS["hi"]),
    ("cream_shade", CREAM["shade"]),
    ("cream_base", CREAM["base"]),
    ("cream_hi", CREAM["hi"]),
]

CREAM_TO_MOSS = {
    "cream_shade": "moss_shade",
    "cream_base": "moss_base",
    "cream_hi": "moss_hi",
}


def snap_label(rgb):
    """Return the palette label of the nearest color (squared euclidean)."""
    r, g, b = rgb
    best_label = None
    best_dist = None
    for label, (pr, pg, pb) in PALETTE:
        d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if best_dist is None or d < best_dist:
            best_dist = d
            best_label = label
    return best_label


def color_of(label):
    for name, rgb in PALETTE:
        if name == label:
            return rgb
    raise KeyError(label)


def quantize_to_labels(source_path):
    """Load source, NEAREST-resize to 128, snap every pixel to a palette label.

    Returns a 2D list labels[y][x] of palette label strings.
    """
    img = Image.open(source_path).convert("RGB")
    small = img.resize((LOGICAL, LOGICAL), Image.Resampling.NEAREST)
    px = list(small.getdata())
    labels = [[None] * LOGICAL for _ in range(LOGICAL)]
    for i, rgb in enumerate(px):
        labels[i // LOGICAL][i % LOGICAL] = snap_label(rgb)
    return labels


def bbox_of(labels):
    """Bounding box of non-background pixels: (min_x, min_y, max_x, max_y)."""
    min_x = min_y = LOGICAL
    max_x = max_y = -1
    for y in range(LOGICAL):
        for x in range(LOGICAL):
            if labels[y][x] != "bg":
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y
    return min_x, min_y, max_x, max_y


def center_labels(labels):
    """Translate (no rescale) to horizontal-center + BOTTOM_MARGIN.

    Returns (centered_labels, info dict). Raises ValueError if the resulting
    top margin is below MIN_TOP_MARGIN (escalation condition).
    """
    min_x, min_y, max_x, max_y = bbox_of(labels)
    w = max_x - min_x + 1
    # horizontal: equal left/right margin
    left_margin = (LOGICAL - w) // 2
    shift_x = left_margin - min_x
    # vertical: bottom of bbox sits BOTTOM_MARGIN rows from the bottom edge
    target_bottom = LOGICAL - 1 - BOTTOM_MARGIN
    shift_y = target_bottom - max_y

    out = [["bg"] * LOGICAL for _ in range(LOGICAL)]
    for y in range(LOGICAL):
        ny = y + shift_y
        if ny < 0 or ny >= LOGICAL:
            continue
        row = labels[y]
        orow = out[ny]
        for x in range(LOGICAL):
            if row[x] == "bg":
                continue
            nx = x + shift_x
            if 0 <= nx < LOGICAL:
                orow[nx] = row[x]

    new_min_x = min_x + shift_x
    new_top = min_y + shift_y
    new_bottom = max_y + shift_y
    info = {
        "src_bbox": (min_x, min_y, max_x, max_y),
        "shift": (shift_x, shift_y),
        "top_margin": new_top,
        "bottom_margin": LOGICAL - 1 - new_bottom,
        "left_margin": new_min_x,
        "char_w": w,
        "char_h": max_y - min_y + 1,
    }
    if new_top < MIN_TOP_MARGIN:
        raise ValueError(
            f"top margin {new_top} < {MIN_TOP_MARGIN} logical px (帽子スペース不足)"
        )
    return out, info


INK_LABELS = {"outline"}
FRINGE_MAX_ITER = 4
FRINGE_MAX_RATIO = 0.03


def strip_color_fringe(labels, max_iter=FRINGE_MAX_ITER, max_ratio=FRINGE_MAX_RATIO):
    """Guarantee an ink border: every visible pixel 4-adjacent to
    transparency ("bg") must be an ink/outline pixel.

    Design ruling (2026-08-08 差し戻し裁定・塗り替え方式): non-ink border
    pixels are RECOLORED to the outline color, not deleted — deletion
    diverges at diagonal-only outline steps (erosion channels eat into the
    character), while recoloring closes those gaps and preserves the
    silhouette. Pre-step (裁量): a border pixel with 3+ transparent
    4-neighbours is a fully detached fringe dot and is deleted instead,
    so no stray black dots are left floating outside the silhouette.

    Mutates labels in place. Returns (recolored, deleted, passes).
    Raises ValueError (escalation) if non-ink borders remain after max_iter
    or if deletions exceed max_ratio of the visible pixel count.
    """
    n = LOGICAL
    visible_total = sum(1 for row in labels for l in row if l != "bg")

    def offenders():
        """Non-ink visible border pixels -> list of (y, x, bg_neighbour_count)."""
        out = []
        for y in range(n):
            for x in range(n):
                label = labels[y][x]
                if label == "bg" or label in INK_LABELS:
                    continue
                bg_n = 0
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if not (0 <= ny < n and 0 <= nx < n) or labels[ny][nx] == "bg":
                        bg_n += 1
                if bg_n:
                    out.append((y, x, bg_n))
        return out

    recolored = 0
    deleted = 0
    passes = 0
    for _ in range(max_iter):
        found = offenders()
        if not found:
            break
        for y, x, bg_n in found:
            if bg_n >= 3:
                labels[y][x] = "bg"       # detached dot: delete
                deleted += 1
            else:
                labels[y][x] = "outline"  # leak: close with ink
                recolored += 1
        passes += 1
    if offenders():
        raise ValueError(
            f"non-ink border pixels remain after {max_iter} passes "
            f"(recolored {recolored}, deleted {deleted}) — 停止"
        )
    if visible_total and deleted > visible_total * max_ratio:
        raise ValueError(
            f"fringe deletion {deleted}px exceeds {max_ratio:.0%} of visible "
            f"{visible_total}px — 過剰侵食、停止"
        )
    return recolored, deleted, passes


def labels_to_rgba256(labels, relabel=None, keep=None):
    """Render a centered 128 label grid to a 256x256 RGBA image (NEAREST 2x).

    relabel: optional dict remapping labels before rendering.
    keep: optional set of labels to render; labels outside it become transparent.
    """
    img = Image.new("RGBA", (LOGICAL, LOGICAL), (0, 0, 0, 0))
    px = img.load()
    for y in range(LOGICAL):
        for x in range(LOGICAL):
            label = labels[y][x]
            if relabel:
                label = relabel.get(label, label)
            if label == "bg":
                continue
            if keep is not None and label not in keep:
                continue
            r, g, b = color_of(label)
            px[x, y] = (r, g, b, 255)
    return img.resize((OUTPUT, OUTPUT), Image.Resampling.NEAREST)


# --- HSL palette swap (recolor) --------------------------------------------

def rgb_to_hsl(rgb):
    r, g, b = (c / 255.0 for c in rgb)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h, s, l


def hsl_to_rgb(h, s, l):
    h = h % 1.0
    s = min(1.0, max(0.0, s))
    l = min(1.0, max(0.0, l))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return (round(r * 255), round(g * 255), round(b * 255))


def derive_triple(base_rgb):
    """Given a target base color, derive (shade, base, hi) RGB by applying the
    moss triple's HSL saturation/lightness deltas to the target hue.

    Preserves the original art's shading relationship (README: 明度・彩度差を
    HSL 空間で保存して各色相へ写像).
    """
    mh_s, ms_s, ml_s = rgb_to_hsl(MOSS["shade"])
    mh_b, ms_b, ml_b = rgb_to_hsl(MOSS["base"])
    mh_h, ms_h, ml_h = rgb_to_hsl(MOSS["hi"])
    th, ts, tl = rgb_to_hsl(base_rgb)
    shade = hsl_to_rgb(th, ts + (ms_s - ms_b), tl + (ml_s - ml_b))
    base = hsl_to_rgb(th, ts, tl)
    hi = hsl_to_rgb(th, ts + (ms_h - ms_b), tl + (ml_h - ml_b))
    return {"shade": shade, "base": base, "hi": hi}
