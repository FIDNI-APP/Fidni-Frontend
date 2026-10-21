"""Images des e-mails de l'équipe (21/10/2026) : public/emails/*.png, servies par https://fidni.fr/emails/….

    ~/.fidni-outils/bin/python scripts/generer-images-email.py

Dessins plats dans la palette du site (encre, vert, or, crème), sans dégradé : les clients mail les rendent mal.
Un e-mail ne peut pas charger les polices du site : les textes dessinés ici sont donc évités (seul le « 1 » du badge).
"""
import os

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyBboxPatch, Polygon, Rectangle, Wedge

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, '..', 'public', 'emails')
VERT, VERT_CLAIR, VERT_PALE = '#1a7a4a', '#2f9a64', '#e6f2ea'
OR, OR_CLAIR = '#c0892f', '#f3dfae'
ENCRE, CREME, BLANC, GRIS = '#1a1a1a', '#faf9f7', '#ffffff', '#e7e3dc'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'mathtext.fontset': 'cm'})
os.makedirs(SORTIE, exist_ok=True)


def toile(l, h, fond):
    fig = plt.figure(figsize=(l / 100, h / 100), dpi=200)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, l)
    ax.set_ylim(0, h)
    ax.axis('off')
    fig.patch.set_facecolor(fond)
    return fig, ax


def etoile(ax, cx, cy, r, couleur, z=5):
    import math
    pts = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.42
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    ax.add_patch(Polygon(pts, closed=True, fc=couleur, ec='none', zorder=z))


def symbole(ax, x, y, s, taille, alpha=0.5):
    ax.text(x, y, s, fontsize=taille, color=VERT, alpha=alpha, ha='center', va='center', zorder=1)


# ---------------------------------------------------------------- 1. bandeau d'accueil : un lycée, un badge « 1 »
L, H = 600, 250
fig, ax = toile(L, H, VERT_PALE)
for x, y, s, t in ((55, 195, r'$\pi$', 30), (95, 105, r'$\sum$', 26), (420, 215, r'$\sqrt{x}$', 26), (572, 95, r'$\int$', 30),
                   (230, 222, r'$\infty$', 22), (140, 165, r'$x^2$', 22)):
    symbole(ax, x, y, s, t)
ax.add_patch(Rectangle((0, 0), L, 38, fc=VERT, ec='none', zorder=2))                       # sol
# lycée
bx, by, bw, bh = 175, 38, 250, 105
ax.add_patch(Rectangle((bx, by), bw, bh, fc=BLANC, ec=GRIS, lw=1.5, zorder=3))
ax.add_patch(Polygon([(bx - 12, by + bh), (bx + bw / 2, by + bh + 52), (bx + bw + 12, by + bh)], closed=True,
                     fc=VERT, ec='none', zorder=3))
ax.add_patch(Rectangle((bx + bw / 2 - 17, by), 34, 52, fc=OR, ec='none', zorder=4))         # porte
for fx in (bx + 28, bx + 72, bx + bw - 72 - 26, bx + bw - 28 - 26):
    ax.add_patch(Rectangle((fx, by + 62), 26, 30, fc=VERT_PALE, ec=GRIS, lw=1, zorder=4))
    ax.add_patch(Rectangle((fx + 12, by + 62), 2, 30, fc=GRIS, ec='none', zorder=5))
# drapeau
ax.plot([bx + bw / 2, bx + bw / 2], [by + bh + 52, by + bh + 88], color=ENCRE, lw=2, zorder=3)
ax.add_patch(Polygon([(bx + bw / 2, by + bh + 88), (bx + bw / 2 + 30, by + bh + 80), (bx + bw / 2, by + bh + 72)],
                     closed=True, fc=OR, ec='none', zorder=3))
# badge « 1 »
cx, cy = 505, 150
ax.add_patch(Polygon([(cx - 20, cy - 30), (cx - 6, cy - 78), (cx + 4, cy - 40)], closed=True, fc=VERT, ec='none', zorder=4))
ax.add_patch(Polygon([(cx + 20, cy - 30), (cx + 6, cy - 78), (cx - 4, cy - 40)], closed=True, fc=VERT_CLAIR, ec='none', zorder=4))
ax.add_patch(Circle((cx, cy), 46, fc=OR, ec='none', zorder=5))
ax.add_patch(Circle((cx, cy), 38, fc=OR_CLAIR, ec='none', zorder=6))
ax.text(cx, cy - 2, '1', fontsize=44, fontweight='bold', color=OR, ha='center', va='center', zorder=7)
etoile(ax, cx, cy + 62, 11, OR)
etoile(ax, cx - 26, cy + 52, 7, OR_CLAIR)
etoile(ax, cx + 26, cy + 52, 7, OR_CLAIR)
fig.savefig(os.path.join(SORTIE, 'bienvenue.png'), facecolor=VERT_PALE)
plt.close(fig)

# ---------------------------------------------------------------- 2. partage : toi + des camarades reliés
L, H = 600, 150
fig, ax = toile(L, H, BLANC)
ax.add_patch(FancyBboxPatch((8, 8), L - 16, H - 16, boxstyle='round,pad=0,rounding_size=18', fc=CREME, ec=GRIS, lw=1.5, zorder=1))
points = [(110, 75, VERT, 30), (250, 75, OR, 24), (350, 75, VERT_CLAIR, 24), (450, 75, OR, 24), (535, 75, VERT, 22)]
for (x1, y1, *_), (x2, y2, *_r) in zip(points, points[1:]):
    ax.plot([x1, x2], [y1, y2], color=GRIS, lw=3, zorder=2, solid_capstyle='round')
ax.plot([110, 250], [75, 75], color=VERT, lw=3, zorder=3, linestyle=(0, (1, 2.4)), solid_capstyle='round')
for x, y, c, r in points:
    ax.add_patch(Circle((x, y), r, fc=c, ec=BLANC, lw=3, zorder=4))
    ax.add_patch(Circle((x, y + r * 0.22), r * 0.3, fc=BLANC, ec='none', zorder=5))            # tête
    ax.add_patch(Wedge((x, y - r * 0.62), r * 0.55, 0, 180, fc=BLANC, ec='none', zorder=5))        # épaules
fig.savefig(os.path.join(SORTIE, 'partage.png'), transparent=True)
plt.close(fig)
print('images écrites dans', os.path.normpath(SORTIE))
