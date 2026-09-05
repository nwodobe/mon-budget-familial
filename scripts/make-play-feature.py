#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'playstore' / 'assets' / 'feature-graphic-1024x500.png'
OUT.parent.mkdir(parents=True, exist_ok=True)

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


image = Image.new('RGB', (WIDTH, HEIGHT), BG)
draw = ImageDraw.Draw(image)

# Motif budgétaire de marque uniquement : aucune capture, aucun montant fictif.
draw.rounded_rectangle((650, 70, 930, 430), radius=42, fill=CARD)
base_y = 370
bar_width, gap = 50, 30
for index, height in enumerate((90, 160, 235)):
    x0 = 700 + index * (bar_width + gap)
    draw.rounded_rectangle(
        (x0, base_y - height, x0 + bar_width, base_y),
        radius=14,
        fill=ACCENT if index == 2 else WHITE,
    )
draw.rounded_rectangle((690, base_y + 18, 900, base_y + 32), radius=7, fill=ACCENT)

draw.text((70, 120), 'Mon Budget Familial', font=font(54, True), fill=WHITE)
tagline = (
    'Pilotez votre budget et sachez',
    'combien vous pouvez encore dépenser',
    'en toute sécurité.',
)
y = 215
for line in tagline:
    draw.text((72, y), line, font=font(29), fill=MUTED)
    y += 43

image.save(OUT, format='PNG', optimize=True)
print(OUT)
