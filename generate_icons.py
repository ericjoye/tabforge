#!/usr/bin/env python3
"""Generate TabForge icons at 16x16, 48x48, and 128x128.

Visual: an indigo forge/anvil silhouette with a stacked-tabs mark — evoking
"forging" browser tabs into saved sessions. Pure Pillow, no external assets.
"""

import os
import math
from PIL import Image, ImageDraw

# Brand palette (matches popup.css)
INDIGO       = (99, 102, 241)    # #6366f1
INDIGO_DEEP  = (67, 56, 202)     # #4338ca
VIOLET       = (124, 58, 237)    # #7c3aed
WHITE        = (255, 255, 255)
AMBER        = (245, 158, 11)    # #f59e0b — the "spark"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "icons")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_icon(size: int) -> Image.Image:
    # Supersample 4x for crisp anti-aliased edges, then downscale.
    ss = 4
    px = size * ss
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = px / 128.0  # scale relative to a 128 design grid

    # --- Background: rounded square with a vertical indigo→violet gradient ---
    pad = int(6 * s)
    radius = int(26 * s)
    grad = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    for y in range(px):
        t = y / px
        gdraw.line([(0, y), (px, y)], fill=lerp(INDIGO_DEEP, VIOLET, t) + (255,))
    mask = Image.new("L", (px, px), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([pad, pad, px - pad, px - pad], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)
    draw = ImageDraw.Draw(img)

    # Subtle top highlight for depth
    draw.rounded_rectangle(
        [pad, pad, px - pad, px - pad],
        radius=radius,
        outline=(255, 255, 255, 38),
        width=max(1, int(1.5 * s)),
    )

    # --- Stacked "tabs" mark: three rounded bars, offset like a tab stack ---
    cx = px / 2
    bar_w = int(58 * s)
    bar_h = int(15 * s)
    bar_r = int(5 * s)
    gap = int(9 * s)
    top = int(30 * s)
    offsets = [int(-10 * s), 0, int(10 * s)]   # horizontal stagger
    shades = [0.0, 0.45, 0.9]                  # white → faint
    for i, (ox, sh) in enumerate(zip(offsets, shades)):
        y0 = top + i * (bar_h + gap)
        x0 = cx - bar_w / 2 + ox
        alpha = int(255 - sh * 120)
        draw.rounded_rectangle(
            [x0, y0, x0 + bar_w, y0 + bar_h],
            radius=bar_r,
            fill=WHITE[:3] + (alpha,),
        )
        # little "tab" notch on the leading bar
        if i == 0:
            nb = int(7 * s)
            draw.ellipse([x0 + int(6 * s), y0 - nb // 2,
                          x0 + int(6 * s) + nb, y0 - nb // 2 + nb],
                         fill=AMBER + (255,))

    # --- Amber spark (the "forge") bottom-right ---
    sx, sy = px - int(34 * s), px - int(34 * s)
    r = int(7 * s)
    draw.ellipse([sx - r, sy - r, sx + r, sy + r], fill=AMBER + (255,))
    # four-point sparkle rays
    ray = int(13 * s)
    w = max(1, int(2.5 * s))
    for ang in (0, 90, 45, 135):
        rad = math.radians(ang)
        dx, dy = math.cos(rad) * ray, math.sin(rad) * ray
        draw.line([(sx - dx, sy - dy), (sx + dx, sy + dy)],
                  fill=AMBER + (220,), width=w)

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for size in (16, 48, 128):
        icon = draw_icon(size)
        path = os.path.join(OUTPUT_DIR, f"icon{size}.png")
        icon.save(path, "PNG", optimize=True)
        print(f"Generated {path} ({size}x{size})")
    print("Done.")


if __name__ == "__main__":
    main()
