#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1024, 500
BG = (11, 61, 46)
CARD = (19, 79, 61)
WHITE = (255, 255, 255)
ACCENT = (79, 191, 144)
MUTED = (210, 235, 225)


def font(size: int, bold: bool = False):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--language', choices=('fr', 'en'), default='fr')
    parser.add_argument('--out', default='playstore/assets/feature-graphic-1024x500.png')
    args = parser.parse_args()
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)

    image = Image.new('RGB', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((650, 70, 930, 430), radius=42, fill=CARD)
    base_y = 370
    bar_width, gap = 50, 30
    for index, height in enumerate((90, 160, 235)):
        x0 = 700 + index * (bar_width + gap)
        draw.rounded_rectangle((x0, base_y - height, x0 + bar_width, base_y), radius=14, fill=ACCENT if index == 2 else WHITE)
    draw.rounded_rectangle((690, base_y + 18, 900, base_y + 32), radius=7, fill=ACCENT)
    draw.text((70, 120), 'Mon Budget Familial', font=font(54, True), fill=WHITE)

    if args.language == 'en':
        tagline = ('Know what you can', 'safely spend.')
        text_size = 35
        start_y = 225
        line_gap = 50
    else:
        tagline = ('Pilotez votre budget et sachez', 'combien vous pouvez encore dépenser', 'en toute sécurité.')
        text_size = 29
        start_y = 215
        line_gap = 43

    y = start_y
    for line in tagline:
        draw.text((72, y), line, font=font(text_size), fill=MUTED)
        y += line_gap

    image.save(out, format='PNG', optimize=True)
    with Image.open(out) as check:
        if check.size != (1024, 500) or check.mode != 'RGB':
            raise RuntimeError(f'Invalid feature graphic: {check.size} {check.mode}')
    print(out)


if __name__ == '__main__':
    main()
