"""Genera le icone dell'app (manubrio bianco su blu cobalto).
Uso: python3 tools/make-icons.py  (richiede Pillow)"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
S = 1024  # disegno in alta risoluzione, poi ridimensiono
BG_TOP, BG_BOTTOM = (52, 86, 240), (28, 54, 200)
WHITE = (255, 255, 255)


def draw():
    img = Image.new("RGB", (S, S))
    px = ImageDraw.Draw(img)
    for y in range(S):  # leggero gradiente verticale
        t = y / (S - 1)
        px.line([(0, y), (S, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM)))
    d = ImageDraw.Draw(img)
    c = S // 2
    # Il disegno resta nel 60% centrale: va bene anche come icona "maskable".
    d.rounded_rectangle([c - 190, c - 26, c + 190, c + 26], 14, fill=WHITE)           # barra
    for side in (-1, 1):
        x_in, x_out = c + side * 150, c + side * 222                                     # dischi grandi
        d.rounded_rectangle([min(x_in, x_out), c - 170, max(x_in, x_out), c + 170], 26, fill=WHITE)
        x_in2, x_out2 = c + side * 236, c + side * 292                                   # dischi piccoli
        d.rounded_rectangle([min(x_in2, x_out2), c - 110, max(x_in2, x_out2), c + 110], 22, fill=WHITE)
    return img


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    big = draw()
    for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png"), (32, "favicon-32.png")]:
        big.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
    print("Icone create in", OUT)
