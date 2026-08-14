#!/usr/bin/env python3
"""Spectacular Obsidian Amber 1200x630 OG / tweet card for GrokForge.

Aesthetic locked to DESIGN-TOKENS.md (void black + amber forge).
Typography: Fontshare Clash Display + Satoshi (fallback Segoe UI).
Composition: full-bleed void, multi-agent constellation, glass type stack.
"""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public"
DESKTOP = Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Desktop" / "GrokForge-tweet-ready"
W, H = 1200, 630

# Obsidian Amber tokens
VOID = (5, 5, 5)
ELEVATED = (10, 10, 10)
CARD = (18, 18, 18)
PEARL = (250, 250, 249)
MUTED = (168, 162, 158)
AMBER = (245, 158, 11)
AMBER_HOT = (251, 191, 36)
AMBER_SOFT = (253, 230, 138)
BRONZE = (180, 83, 9)
STONE = (120, 113, 108)

FONT_KIT = Path(os.environ.get("USERPROFILE", str(Path.home()))) / "design-assets" / "fontshare"


def load_font(size: int, *, display: bool = False, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates: list[Path] = []
    if mono:
        candidates.extend(
            [
                Path(r"C:\Windows\Fonts\CascadiaMono.ttf"),
                Path(r"C:\Windows\Fonts\consolab.ttf"),
                Path(r"C:\Windows\Fonts\consola.ttf"),
            ]
        )
    elif display:
        candidates.extend(
            [
                FONT_KIT / "clash-display" / "otf" / "ClashDisplay-Bold.otf",
                FONT_KIT / "clash-display" / "otf" / "ClashDisplay-Semibold.otf",
                Path(r"C:\Windows\Fonts\segoeuib.ttf"),
            ]
        )
    elif bold:
        candidates.extend(
            [
                FONT_KIT / "satoshi" / "otf" / "Satoshi-Bold.otf",
                FONT_KIT / "satoshi" / "otf" / "Satoshi-Black.otf",
                Path(r"C:\Windows\Fonts\segoeuib.ttf"),
            ]
        )
    else:
        candidates.extend(
            [
                FONT_KIT / "satoshi" / "otf" / "Satoshi-Medium.otf",
                FONT_KIT / "satoshi" / "otf" / "Satoshi-Regular.otf",
                Path(r"C:\Windows\Fonts\segoeui.ttf"),
            ]
        )
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def soft_orb(base: Image.Image, cx: int, cy: int, r: int, color: tuple[int, int, int], peak: int) -> Image.Image:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i, a in enumerate(range(peak, 0, -5)):
        rr = r + i * 12
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(*color, max(1, a // 7)))
    layer = layer.filter(ImageFilter.GaussianBlur(36))
    return Image.alpha_composite(base, layer)


def film_grain(img: Image.Image, amount: int = 14) -> Image.Image:
    rng = random.Random(42)
    grain = Image.new("RGBA", img.size, (0, 0, 0, 0))
    px = grain.load()
    assert px is not None
    for y in range(0, img.height, 2):
        for x in range(0, img.width, 2):
            n = rng.randint(-amount, amount)
            a = abs(n)
            if a < 2:
                continue
            c = 255 if n > 0 else 0
            px[x, y] = (c, c, c, min(28, a))
    grain = grain.filter(ImageFilter.GaussianBlur(0.6))
    return Image.alpha_composite(img, grain)


def draw_grid(draw: ImageDraw.ImageDraw, step: int = 48, alpha: int = 18) -> None:
    for x in range(0, W, step):
        draw.line([(x, 0), (x, H)], fill=(255, 255, 255, alpha))
    for y in range(0, H, step):
        draw.line([(0, y), (W, y)], fill=(255, 255, 255, alpha))


def hierarchical_constellation(base: Image.Image) -> Image.Image:
    """Right-side multi-agent hierarchy: root -> managers -> workers."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Layout in the right half
    root = (980, 150)
    managers = [(860, 300), (1020, 310), (1120, 280)]
    workers = [
        (780, 470),
        (880, 500),
        (960, 460),
        (1040, 520),
        (1120, 470),
        (1180, 430),
    ]

    def edge(a: tuple[int, int], b: tuple[int, int], w: int = 2, alpha: int = 90) -> None:
        # soft glow line under crisp line
        for pad, a2 in ((6, 22), (3, 50), (0, alpha)):
            d.line([a, b], fill=(*AMBER, a2), width=w + pad)

    for m in managers:
        edge(root, m, w=2, alpha=110)
    for i, w in enumerate(workers):
        edge(managers[i % len(managers)], w, w=1, alpha=70)

    # faint peer mesh among workers
    for i in range(len(workers) - 1):
        if i % 2 == 0:
            edge(workers[i], workers[i + 1], w=1, alpha=35)

    def node(p: tuple[int, int], r: int, core: tuple[int, int, int], glow_a: int) -> None:
        gx = Image.new("RGBA", base.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(gx)
        gd.ellipse([p[0] - r * 3, p[1] - r * 3, p[0] + r * 3, p[1] + r * 3], fill=(*core, glow_a))
        gx = gx.filter(ImageFilter.GaussianBlur(10))
        nonlocal layer
        layer = Image.alpha_composite(layer, gx)
        d2 = ImageDraw.Draw(layer)
        d2.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=(*core, 255))
        d2.ellipse(
            [p[0] - r + 2, p[1] - r + 2, p[0] + r - 2, p[1] + r - 2],
            outline=(0, 0, 0, 90),
            width=1,
        )

    for w in workers:
        node(w, 7, AMBER_SOFT, 28)
    for m in managers:
        node(m, 11, AMBER, 40)
    node(root, 16, AMBER_HOT, 55)

    # monogram core on root
    d = ImageDraw.Draw(layer)
    f = load_font(14, bold=True)
    d.text((root[0] - 8, root[1] - 8), "GF", font=f, fill=(0, 0, 0, 255))

    # floating ember particles
    rng = random.Random(7)
    for _ in range(48):
        x = rng.randint(640, 1180)
        y = rng.randint(40, 590)
        r = rng.randint(1, 3)
        a = rng.randint(40, 140)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(*AMBER_HOT, a))

    return Image.alpha_composite(base, layer)


def rounded_rect_glow(
    base: Image.Image,
    box: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int],
    width: int = 2,
) -> Image.Image:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)
    return Image.alpha_composite(base, layer)


def pill(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.ImageFont,
    *,
    fill: tuple[int, int, int, int],
    outline: tuple[int, int, int, int],
    text_fill: tuple[int, int, int, int],
    pad_x: int = 14,
    pad_y: int = 8,
) -> int:
    x, y = xy
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + pad_x * 2
    h = th + pad_y * 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=fill, outline=outline, width=1)
    # optical vertical center
    ty = y + (h - th) // 2 - bbox[1]
    draw.text((x + pad_x, ty), text, font=font, fill=text_fill)
    return w


def main() -> None:
    OUT.mkdir(exist_ok=True)
    DESKTOP.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGBA", (W, H), (*VOID, 255))

    # Vertical forge gradient (void -> bronze ember floor)
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        t = y / (H - 1)
        r = int(5 + (BRONZE[0] - 5) * t * 0.22)
        g = int(5 + (BRONZE[1] - 5) * t * 0.12)
        b = int(5 + 2 * t)
        gd.line([(0, y), (W, y)], fill=(r, g, b, 255))
    img = Image.alpha_composite(img, grad)

    # Amber forge orbs
    img = soft_orb(img, 180, -40, 260, BRONZE, 70)
    img = soft_orb(img, 980, 120, 320, AMBER, 55)
    img = soft_orb(img, 700, 620, 280, BRONZE, 45)
    img = soft_orb(img, -40, 400, 200, AMBER, 30)

    # Technical grid (builder eye)
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_grid(ImageDraw.Draw(grid), step=56, alpha=14)
    img = Image.alpha_composite(img, grid)

    # Multi-agent constellation visual
    img = hierarchical_constellation(img)

    # Left glass content panel (subtle, not a heavy card border)
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle(
        [48, 48, 640, H - 48],
        radius=28,
        fill=(10, 10, 10, 170),
        outline=(*AMBER, 55),
        width=1,
    )
    # inner highlight edge
    pd.rounded_rectangle(
        [50, 50, 638, H - 50],
        radius=26,
        outline=(255, 255, 255, 12),
        width=1,
    )
    panel = panel.filter(ImageFilter.GaussianBlur(0.4))
    img = Image.alpha_composite(img, panel)

    # Outer frame - premium bezel
    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rectangle([0, 0, W - 1, H - 1], outline=(*AMBER, 90), width=2)
    fd.rectangle([3, 3, W - 4, H - 4], outline=(255, 255, 255, 10), width=1)
    # top amber beam
    for i in range(4):
        a = 140 - i * 30
        fd.rectangle([0, i, W, i], fill=(*AMBER_HOT, max(20, a)))
    img = Image.alpha_composite(img, frame)

    # Vignette
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i in range(70):
        a = int(i * 1.35)
        vd.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(0, 0, 0, min(160, a)))
    img = Image.alpha_composite(img, vig)

    img = film_grain(img, amount=12)
    draw = ImageDraw.Draw(img, "RGBA")

    f_kicker = load_font(15, bold=True)
    f_title = load_font(78, display=True, bold=True)
    f_sub = load_font(26, bold=False)
    f_sub2 = load_font(26, bold=False)
    f_chip = load_font(15, bold=True)
    f_url = load_font(20, bold=True)
    f_mono = load_font(13, mono=True)
    f_badge = load_font(22, bold=True)

    # LIVE pill with leading pulse (text fully readable)
    live_x, live_y = 78, 78
    live_label = "  LIVE"
    bbox_live = draw.textbbox((0, 0), live_label, font=f_kicker)
    lw = (bbox_live[2] - bbox_live[0]) + 36
    lh = (bbox_live[3] - bbox_live[1]) + 16
    draw.rounded_rectangle(
        [live_x, live_y, live_x + lw, live_y + lh],
        radius=lh // 2,
        fill=(*AMBER, 28),
        outline=(*AMBER_HOT, 200),
        width=1,
    )
    # pulse dot
    dy = live_y + lh // 2
    draw.ellipse([live_x + 14, dy - 5, live_x + 24, dy + 5], fill=(*AMBER_HOT, 255))
    draw.ellipse([live_x + 12, dy - 7, live_x + 26, dy + 7], outline=(*AMBER_HOT, 90), width=1)
    draw.text(
        (live_x + 30, live_y + (lh - (bbox_live[3] - bbox_live[1])) // 2 - bbox_live[1]),
        "LIVE",
        font=f_kicker,
        fill=(*AMBER_HOT, 255),
    )

    # GF monogram square (matches site header)
    mx, my = 540, 72
    # glow under monogram
    gmono = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(gmono).rounded_rectangle([mx - 8, my - 8, mx + 56, my + 56], radius=16, fill=(*AMBER, 50))
    gmono = gmono.filter(ImageFilter.GaussianBlur(12))
    img = Image.alpha_composite(img, gmono)
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rounded_rectangle([mx, my, mx + 48, my + 48], radius=12, fill=(*AMBER, 255))
    # optical-center GF monogram
    gf_bb = draw.textbbox((0, 0), "GF", font=f_badge)
    gfw, gfh = gf_bb[2] - gf_bb[0], gf_bb[3] - gf_bb[1]
    draw.text(
        (mx + (48 - gfw) // 2 - gf_bb[0], my + (48 - gfh) // 2 - gf_bb[1]),
        "GF",
        font=f_badge,
        fill=(0, 0, 0, 255),
    )

    # Title
    draw.text((78, 150), "GrokForge", font=f_title, fill=(*PEARL, 255))

    # Accent underline under title
    tb = draw.textbbox((78, 150), "GrokForge", font=f_title)
    underline_y = tb[3] + 10
    draw.rounded_rectangle([78, underline_y, 78 + 120, underline_y + 4], radius=2, fill=(*AMBER, 230))

    # Tagline - two lines, amber hierarchy
    draw.text((78, 270), "Crowdsource hierarchical", font=f_sub, fill=(*AMBER_HOT, 255))
    draw.text((78, 306), "multi-agent work for the greater good", font=f_sub2, fill=(*AMBER_SOFT, 255))

    # Builder-facing one-liner
    draw.text(
        (78, 360),
        "Open collab hub  ·  Public pots  ·  Your own Grok keys",
        font=f_mono,
        fill=(*MUTED, 230),
    )

    # Feature chips
    chips = ["Labor", "Capital", "Recognition", "Open license"]
    cx, cy = 78, 410
    for chip in chips:
        w = pill(
            draw,
            (cx, cy),
            chip,
            f_chip,
            fill=(18, 18, 18, 220),
            outline=(*AMBER, 120),
            text_fill=(*PEARL, 255),
            pad_x=14,
            pad_y=8,
        )
        cx += w + 10

    # URL + trust rail
    draw.text((78, 500), "grokforge.app", font=f_url, fill=(*AMBER, 255))
    draw.text(
        (78, 540),
        "Never stores user API keys  ·  Sign in with X",
        font=f_mono,
        fill=(*STONE, 240),
    )

    # Right-side caption for constellation (AI builder wink)
    f_cap = load_font(12, mono=True)
    draw.text((820, 560), "agent hierarchy  //  public goods", font=f_cap, fill=(*MUTED, 140))

    rgb = img.convert("RGB")
    jpg = OUT / "og.jpg"
    png = OUT / "og.png"
    rgb.save(jpg, "JPEG", quality=94, optimize=True, progressive=True)
    rgb.save(png, "PNG", optimize=True)

    # Desktop tweet-ready pack
    pack_jpg = DESKTOP / "tweet-card-1200x630.jpg"
    pack_png = DESKTOP / "tweet-card-1200x630.png"
    pack_og = DESKTOP / "og.jpg"
    rgb.save(pack_jpg, "JPEG", quality=94, optimize=True, progressive=True)
    rgb.save(pack_png, "PNG", optimize=True)
    rgb.save(pack_og, "JPEG", quality=94, optimize=True, progressive=True)

    # Square attach for X media reliability (center crop-ish of constellation + brand)
    sq = Image.new("RGB", (1080, 1080), VOID)
    # scale full card and center
    scaled = rgb.resize((1080, int(1080 * H / W)), Image.Resampling.LANCZOS)
    sy = (1080 - scaled.height) // 2
    sq.paste(scaled, (0, sy))
    # dark bars already VOID; add monogram center if letterbox large
    sq_path = DESKTOP / "tweet-attach-square-1080.jpg"
    sq.save(sq_path, "JPEG", quality=93, optimize=True)

    body = DESKTOP / "tweet-body.txt"
    if not body.exists():
        body.write_text(
            "GrokForge is live.\n\n"
            "Crowdsource hierarchical multi-agent work for the greater good.\n"
            "Open licenses. Public ledgers. Sign in with X.\n\n"
            "https://grokforge.app/\n",
            encoding="utf-8",
        )

    readme = DESKTOP / "README.txt"
    readme.write_text(
        "GrokForge tweet-ready pack (Obsidian Amber v2.1)\n"
        "- tweet-card-1200x630.jpg  primary OG / attach\n"
        "- tweet-card-1200x630.png  twin\n"
        "- tweet-attach-square-1080.jpg  optional square media\n"
        "- tweet-body.txt  draft copy\n"
        "Always attach the 1200x630 card as media in addition to the URL.\n"
        "Live meta: https://grokforge.app/og.jpg?v=2.2.0\n",
        encoding="utf-8",
    )

    print("ok", jpg, jpg.stat().st_size)
    print("png", png.stat().st_size)
    print("desktop", DESKTOP)


if __name__ == "__main__":
    main()
