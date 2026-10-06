#!/usr/bin/env python3
"""
Builds a PDF of a converted walkthrough (public/detonados/<slug>) with the same visual standard as the
other guides: gradient cover with Pokémon badges, credits page, table of contents, chapter openers,
call-outs, trainer-team cards, running header and page number. Two formats: A4 and a compact one for phones.

Usage (needs `weasyprint` and `pillow`):
    python scripts/make_pdf.py scripts/guides/swsh.json --variant a4 --out build/guia-a4.pdf
    python scripts/make_pdf.py scripts/guides/swsh.json --variant compact --out build/guia.pdf

Pokémon icons are downloaded once from the PokéAPI sprites (cache in scripts/.cache/sprites).
Pictures are resized to the size they are printed at, so the PDF stays light.
"""
import argparse
import colorsys
import concurrent.futures as cf
import hashlib
import html
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "detonados"
FONTS = Path(__file__).resolve().parent / "fonts"
CACHE = Path(__file__).resolve().parent / ".cache" / "sprites"
SPRITE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png"

# page geometry in pt: (width, height, margin top, side, bottom, base font size)
VARIANTS = {
    "a4": {"w": 595.28, "h": 841.89, "mt": 62, "ms": 51, "mb": 58, "font": 10.8, "scale": 1.0, "team_cols": 3},
    "compact": {"w": 419.53, "h": 595.28, "mt": 46, "ms": 36, "mb": 44, "font": 9.4, "scale": 0.82, "team_cols": 2},
}

DEFAULT_LICENSE = "Distribuição livre, desde que sem alterações e com os créditos mantidos."
INTRO = (
    "Este guia acompanha toda a aventura em {game}. Use-o sempre que travar em alguma parte: ele segue a "
    "ordem natural do jogo, então é fácil achar onde você está pelo sumário."
)
INTRO_TEAMS = "As fichas de treinador mostram o time completo com os níveis de cada Pokémon."


def esc(text) -> str:
    return html.escape(str(text), quote=True)


def darker(hex_color: str, factor=0.55) -> str:
    r, g, b = (int(hex_color.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    r, g, b = colorsys.hsv_to_rgb(h, min(1, s * 1.05), v * factor)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def lighter(hex_color: str, mix=0.9) -> str:
    r, g, b = (int(hex_color.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    return "#%02x%02x%02x" % tuple(round(c + (255 - c) * mix) for c in (r, g, b))


class Builder:
    def __init__(self, config: dict, variant: str, public: Path = PUBLIC):
        self.config = config
        self.v = VARIANTS[variant]
        self.slug = config["slug"]
        self.src = Path(public) / self.slug
        self.index = json.loads((self.src / "index.json").read_text(encoding="utf-8"))
        self.accent = config.get("accent", "#c8102e")
        self.tmp = Path(config.get("_tmp", ROOT / "build" / f"{self.slug}-{variant}"))
        (self.tmp / "img").mkdir(parents=True, exist_ok=True)
        CACHE.mkdir(parents=True, exist_ok=True)
        self.content_w = self.v["w"] - 2 * self.v["ms"]
        self.sprites: dict[int, Path | None] = {}

    # -- images ------------------------------------------------------------------------------------------
    def picture(self, src: str, display_pt: float) -> str:
        """Resized copy of a guide image (JPEG, or PNG when it has transparency); returns a file:// url."""
        source = self.src / src
        target_px = max(48, int(display_pt * 1.5))  # ~108 dpi when printed
        key = hashlib.sha1(f"{src}:{target_px}".encode()).hexdigest()[:16]
        for ext in ("jpg", "png"):
            existing = self.tmp / "img" / f"{key}.{ext}"
            if existing.exists():
                return existing.as_uri()
        image = Image.open(source)
        image.load()
        has_alpha = image.mode in ("RGBA", "LA") or "transparency" in image.info
        if image.width > target_px:
            image = image.resize((target_px, round(image.height * target_px / image.width)), Image.LANCZOS)
        if has_alpha:
            path = self.tmp / "img" / f"{key}.png"
            image.convert("RGBA").save(path, "PNG", optimize=True)
        else:
            path = self.tmp / "img" / f"{key}.jpg"
            image.convert("RGB").save(path, "JPEG", quality=64, optimize=True)
        return path.as_uri()

    def sprite(self, dex: int) -> str | None:
        path = self.sprites.get(dex)
        return path.as_uri() if path else None

    def load_sprites(self, ids):
        def fetch(dex):
            target = CACHE / f"{dex}.png"
            if not target.exists():
                try:
                    request = urllib.request.Request(SPRITE_URL.format(id=dex), headers={"User-Agent": "guide-pdf"})
                    with urllib.request.urlopen(request, timeout=30) as response:
                        target.write_bytes(response.read())
                except Exception:
                    return dex, None
            return dex, target

        with cf.ThreadPoolExecutor(8) as pool:
            for dex, path in pool.map(fetch, sorted(set(ids))):
                self.sprites[dex] = path

    # -- block rendering ------------------------------------------------------------------------------------
    @staticmethod
    def runs(runs) -> str:
        out = []
        for r in runs:
            text = esc(r["t"])
            if r.get("b"):
                text = f"<b>{text}</b>"
            if r.get("i"):
                text = f"<i>{text}</i>"
            out.append(text)
        return "".join(out)

    def size_pt(self, img: dict, fraction: float | None = None) -> float:
        if img.get("natural"):
            return min(self.content_w, img["w"] * 0.55 * self.v["scale"])
        return self.content_w * min(1.0, fraction if fraction is not None else img.get("fw", 1.0))

    def team(self, team: dict) -> str:
        head = []
        if team.get("portrait"):
            p = team["portrait"]
            head.append(f'<img class="portrait" src="{self.picture(p["src"], 60)}">')
        label = ""
        if team.get("label"):
            starter = self.sprite(team["starter"]) if team.get("starter") else None
            label = f'<span class="label">{f"<img src=\"{starter}\">" if starter else ""}{esc(team["label"])}</span>'
        rows = []
        for m in team["members"]:
            sprite = self.sprite(m["id"]) if m.get("id") else None
            icon = f'<img src="{sprite}">' if sprite else ""
            note = f'<span class="note">{esc(m["note"])}</span>' if m.get("note") else ""
            rows.append(f'<tr><td class="icon">{icon}</td><td class="name">{esc(m["name"])}{note}</td><td class="lv">Nv. {m["lv"]}</td></tr>')
        return (
            '<div class="team">'
            f'<div class="head">{"".join(head)}<div>{label}<span class="who">{esc(team["trainer"])} usa:</span></div></div>'
            f'<table>{"".join(rows)}</table></div>'
        )

    def block(self, b: dict) -> str:
        kind = b["t"]
        if kind == "h2":
            sub = f'<p class="sub">{esc(b["sub"])}</p>' if b.get("sub") else ""
            return f'<h2 id="{esc(b["id"])}">{esc(b["text"])}</h2>{sub}'
        if kind == "h3":
            return f'<h3 id="{esc(b["id"])}">{esc(b["text"])}</h3>'
        if kind == "p":
            return f'<p class="body">{self.runs(b["runs"])}</p>'
        if kind == "callout":
            label = {"tip": "Dica", "warning": "Atenção", "reward": "Recompensa", "trivia": "Curiosidade", "note": "Nota"}[b["kind"]]
            paras = "".join(f"<p>{self.runs(p)}</p>" for p in b["paras"])
            return f'<aside class="callout {b["kind"]}"><span class="tag">{label}</span>{paras}</aside>'
        if kind in ("img", "card"):
            pt = self.size_pt(b)
            caption = f'<figcaption>{esc(b["caption"])}</figcaption>' if b.get("caption") else ""
            return f'<figure><img style="width:{pt:.1f}pt" src="{self.picture(b["src"], pt)}">{caption}</figure>'
        if kind == "gallery":
            fws = [i.get("fw", 0.5) for i in b["imgs"]]
            total = sum(fws) or 1
            usable = self.content_w * min(1.0, total)
            cells = []
            for img, fw in zip(b["imgs"], fws):
                pt = img["w"] * 0.55 * self.v["scale"] if img.get("natural") else usable * fw / total
                cells.append(f'<img style="width:{pt:.1f}pt" src="{self.picture(img["src"], pt)}">')
            caption = f'<figcaption>{esc(b["caption"])}</figcaption>' if b.get("caption") else ""
            return f'<figure><div class="gallery">{"".join(cells)}</div>{caption}</figure>'
        if kind == "team":
            return f'<div class="teams single">{self.team(b)}</div>'
        if kind == "teams":
            return f'<div class="teams">{"".join(self.team(t) for t in b["teams"])}</div>'
        if kind == "table":
            rows = []
            for r, row in enumerate(b["rows"]):
                cells = "".join(
                    f'<{"th" if c.get("b") else "td"}{f" rowspan={c["rs"]}" if c.get("rs") else ""}>{esc(c["t"])}</{"th" if c.get("b") else "td"}>'
                    for c in row
                )
                rows.append(f"<tr>{cells}</tr>")
            return f'<table class="data">{"".join(rows)}</table>'
        if kind == "caption":
            return f'<p class="caption">{esc(b["text"])}</p>'
        return ""

    # -- document -----------------------------------------------------------------------------------------------
    def css(self) -> str:
        v, a = self.v, self.accent
        fonts = ""
        for w in (400, 500, 600, 700):
            fonts += f'@font-face {{ font-family: Poppins; font-weight: {w}; src: url("{(FONTS / f"poppins-latin-{w}-normal.woff2").as_uri()}"); }}\n'
        for style in ("normal", "italic"):
            for w in (400, 700):
                fonts += f'@font-face {{ font-family: Lora; font-weight: {w}; font-style: {style}; src: url("{(FONTS / f"lora-latin-{w}-{style}.woff2").as_uri()}"); }}\n'
        s = v["scale"]
        return fonts + f"""
:root {{ --accent: {a}; --dark: {darker(a)}; --soft: {lighter(a, 0.92)}; --ink: #1e1f24; --muted: #6b6e78; }}
@page {{
  size: {v['w']}pt {v['h']}pt;
  margin: {v['mt']}pt {v['ms']}pt {v['mb']}pt;
  @top-center {{ content: string(runhead); font: 500 {6.6 * s:.1f}pt Poppins; letter-spacing: .14em; text-transform: uppercase; color: #9a9da6; padding-top: {14 * s:.0f}pt; }}
  @bottom-center {{ content: counter(page); font: 500 {7.5 * s:.1f}pt Poppins; color: var(--accent); }}
}}
@page cover {{ margin: 0; @top-center {{ content: none; }} @bottom-center {{ content: none; }} }}
@page plain {{ @top-center {{ content: none; }} @bottom-center {{ content: none; }} }}
html {{ font-family: Lora, serif; font-size: {v['font']}pt; color: var(--ink); line-height: 1.5; }}
body {{ margin: 0; }}
.cover {{ page: cover; height: {v['h']}pt; box-sizing: border-box; padding: {70 * s:.0f}pt {52 * s:.0f}pt {50 * s:.0f}pt;
  background: linear-gradient(160deg, var(--accent) 0%, var(--dark) 100%); color: #fff; position: relative; }}
.cover .kicker {{ font: 500 {6.8 * s:.1f}pt Poppins; letter-spacing: .22em; text-transform: uppercase; opacity: .85; }}
.cover .label {{ margin-top: {120 * s:.0f}pt; font: 500 {11 * s:.1f}pt Poppins; letter-spacing: .3em; }}
.cover h1 {{ bookmark-level: none; margin: {10 * s:.0f}pt 0 {14 * s:.0f}pt; font: 700 {34 * s:.1f}pt/1.12 Poppins; color: #fff; }}
.cover .subtitle {{ font: italic 400 {11.5 * s:.1f}pt/1.5 Lora; max-width: {330 * s:.0f}pt; opacity: .95; }}
.cover .badges {{ position: absolute; left: {52 * s:.0f}pt; bottom: {150 * s:.0f}pt; }}
.cover .badges span {{ display: inline-block; width: {84 * s:.0f}pt; height: {84 * s:.0f}pt; margin-right: {14 * s:.0f}pt; border-radius: 50%; background: rgba(255,255,255,.92); text-align: center; }}
.cover .badges img {{ width: {62 * s:.0f}pt; height: {62 * s:.0f}pt; margin-top: {11 * s:.0f}pt; }}
.cover .credit {{ position: absolute; left: {52 * s:.0f}pt; right: {52 * s:.0f}pt; bottom: {50 * s:.0f}pt; border-top: .6pt solid rgba(255,255,255,.55); padding-top: {10 * s:.0f}pt; }}
.cover .credit b {{ display: block; font: 600 {9.5 * s:.1f}pt Poppins; }}
.cover .credit span {{ font: 400 {7.2 * s:.1f}pt Poppins; opacity: .9; }}
.colophon {{ page: plain; break-before: page; height: {v['h'] - v['mt'] - v['mb'] - 6}pt; display: flex; flex-direction: column; justify-content: flex-end; font-size: {8.2 * s:.1f}pt; color: var(--muted); }}
.colophon b {{ color: #4b4e57; }}
.colophon p {{ margin: 0 0 {5 * s:.0f}pt; }}
.toc {{ page: plain; break-before: page; }}
h1.page-title {{ font: 700 {20 * s:.1f}pt Poppins; color: var(--accent); margin: 0 0 {16 * s:.0f}pt; string-set: runhead ""; }}
.toc ol {{ list-style: none; margin: 0; padding: 0; }}
.toc li {{ margin: 0 0 {5.5 * s:.1f}pt; font: 400 {8.2 * s:.1f}pt Poppins; }}
.toc a {{ display: block; color: var(--ink); text-decoration: none; }}
.toc .n {{ display: inline-block; width: {24 * s:.0f}pt; font-weight: 700; color: var(--accent); }}
.toc a::before {{ content: target-counter(attr(href url), page); float: right; font-weight: 500; color: var(--accent); }}
.intro {{ page: plain; break-before: page; }}
.chapter {{ break-before: page; }}
.opener {{ margin: 0 0 {16 * s:.0f}pt; padding-bottom: {12 * s:.0f}pt; border-bottom: 1.6pt solid var(--accent); }}
.opener .label {{ font: 700 {8.2 * s:.1f}pt Poppins; letter-spacing: .26em; text-transform: uppercase; color: var(--accent); margin: 0; }}
.opener h1 {{ font: 700 {19 * s:.1f}pt/1.2 Poppins; margin: {4 * s:.0f}pt 0 {4 * s:.0f}pt; string-set: runhead content(); bookmark-level: 1; bookmark-label: content(); }}
.opener .sub {{ font: 400 {8.4 * s:.1f}pt Poppins; color: var(--muted); margin: 0; }}
h2 {{ font: 700 {14.4 * s:.1f}pt/1.25 Poppins; color: var(--accent); margin: {20 * s:.0f}pt 0 {6 * s:.0f}pt; padding-left: {8 * s:.0f}pt; border-left: 3pt solid var(--accent); break-after: avoid; bookmark-level: 2; bookmark-label: content(); }}
h2 + .sub {{ margin: -{3 * s:.0f}pt 0 {6 * s:.0f}pt {11 * s:.0f}pt; font: 500 {8 * s:.1f}pt Poppins; color: var(--muted); break-after: avoid; }}
h3 {{ font: 700 {11 * s:.1f}pt Poppins; margin: {12 * s:.0f}pt 0 {4 * s:.0f}pt; break-after: avoid; }}
p.body {{ margin: 0 0 {7 * s:.1f}pt; text-align: justify; hyphens: auto; widows: 2; orphans: 2; }}
p.caption, figcaption {{ font: 400 {7.8 * s:.1f}pt Poppins; color: var(--muted); text-align: center; margin: {3 * s:.0f}pt 0 {8 * s:.0f}pt; }}
figure {{ margin: {8 * s:.0f}pt 0; text-align: center; break-inside: avoid; }}
figure img {{ border-radius: {4 * s:.1f}pt; }}
.gallery {{ display: flex; justify-content: center; gap: {5 * s:.1f}pt; }}
.callout {{ margin: {9 * s:.0f}pt 0; padding: {7 * s:.0f}pt {10 * s:.0f}pt; border-left: 3pt solid #4a7ad9; background: #eef2fb; border-radius: {3 * s:.0f}pt; break-inside: avoid; }}
.callout .tag {{ display: block; font: 700 {6.8 * s:.1f}pt Poppins; letter-spacing: .2em; text-transform: uppercase; color: #3561b5; margin-bottom: 2pt; }}
.callout p {{ margin: 0; font-size: {9.6 * s:.1f}pt; }}
.callout p + p {{ margin-top: {4 * s:.0f}pt; }}
.callout.tip {{ border-color: #4aa23c; background: #edf6ec; }} .callout.tip .tag {{ color: #3c8a2c; }}
.callout.warning {{ border-color: #e8701a; background: #fdf0e6; }} .callout.warning .tag {{ color: #c2570d; }}
.callout.reward {{ border-color: #d9a400; background: #fff6d9; }} .callout.reward .tag {{ color: #a57c00; }}
.teams {{ display: flex; flex-wrap: wrap; gap: {7 * s:.0f}pt; margin: {9 * s:.0f}pt 0; justify-content: center; }}
.teams .team {{ width: {(self.content_w - 7 * s * (v['team_cols'] - 1)) / v['team_cols'] - 0.5:.1f}pt; }}
.teams.single .team {{ width: {min(self.content_w, 190 * s * 1.15):.0f}pt; }}
.team {{ border: .6pt solid #e4e5ea; border-radius: {6 * s:.0f}pt; overflow: hidden; break-inside: avoid; background: #fff; }}
.team .head {{ display: flex; align-items: center; gap: {6 * s:.0f}pt; padding: {5 * s:.0f}pt {8 * s:.0f}pt; background: var(--accent); color: #fff; }}
.team .portrait {{ height: {24 * s:.0f}pt; width: auto; border-radius: 3pt; background: rgba(255,255,255,.25); }}
.team .who {{ display: block; font: 700 {8.4 * s:.1f}pt Poppins; }}
.team .label {{ display: block; font: 500 {6.6 * s:.1f}pt Poppins; opacity: .85; }}
.team .label img {{ height: {10 * s:.0f}pt; width: {10 * s:.0f}pt; vertical-align: middle; margin-right: 3pt; }}
.team table {{ width: 100%; border-collapse: collapse; }}
.team td {{ padding: {1.5 * s:.1f}pt {6 * s:.0f}pt; border-top: .4pt solid #eceef2; font-family: Poppins; vertical-align: middle; }}
.team td.icon {{ width: {24 * s:.0f}pt; padding-right: 0; }}
.team td.icon img {{ height: {22 * s:.0f}pt; width: {22 * s:.0f}pt; }}
.team td.name {{ font-weight: 500; font-size: {7.6 * s:.1f}pt; }}
.team .note {{ display: block; font-weight: 400; font-size: {6.4 * s:.1f}pt; color: var(--muted); }}
.team td.lv {{ text-align: right; font-weight: 700; font-size: {7.2 * s:.1f}pt; color: var(--accent); white-space: nowrap; }}
table.data {{ width: 100%; border-collapse: collapse; margin: {9 * s:.0f}pt 0; font: 400 {8.2 * s:.1f}pt Poppins; break-inside: avoid; }}
table.data th, table.data td {{ border: .5pt solid #dcdde3; padding: {3 * s:.0f}pt {6 * s:.0f}pt; text-align: left; }}
table.data th {{ background: var(--soft); font-weight: 600; }}
"""

    def html(self) -> str:
        cfg, idx = self.config, self.index
        sprite_ids = list(cfg.get("cover_sprites", []))
        chapters = []
        for ch in idx["chapters"]:
            data = json.loads((self.src / "chapters" / f"{ch['n']}.json").read_text(encoding="utf-8"))
            chapters.append((ch, data["blocks"]))
            for b in data["blocks"]:
                for t in ([b] if b["t"] == "team" else b["teams"] if b["t"] == "teams" else []):
                    sprite_ids += [m["id"] for m in t["members"] if m.get("id")]
                    if t.get("starter"):
                        sprite_ids.append(t["starter"])
        self.load_sprites(sprite_ids)

        title_plain = idx["title"].replace("Detonado Pokémon ", "")
        game_parts = [p.strip() for p in re.split(r"\s+&\s+|\s+e\s+(?=Let)", title_plain)]
        title_html = "<br><span style=\"font-weight:500;font-size:.62em\">&amp;</span><br>".join(esc(p) for p in game_parts) if len(game_parts) == 2 else esc(title_plain)
        badges = "".join(f'<span><img src="{self.sprite(i)}"></span>' for i in cfg.get("cover_sprites", []) if self.sprite(i))
        author = cfg.get("author", "Otávio Rafael")
        site = cfg.get("credit", "").replace("Texto original e organização: ", "") or "pokemythology.net"
        license_text = idx.get("license") or DEFAULT_LICENSE

        toc = "".join(
            f'<li><a href="#ch{ch["n"]}"><span class="n">{ch["n"]:02d}</span><span class="t">{esc(ch["title"])}</span></a></li>'
            for ch, _ in chapters
        )
        body = []
        for ch, blocks in chapters:
            sections = " · ".join(s["text"] for s in ch["sections"][:4])
            body.append(
                f'<section class="chapter" id="ch{ch["n"]}"><header class="opener"><p class="label">Capítulo {ch["n"]}</p>'
                f'<h1>{esc(ch["title"])}</h1><p class="sub">{esc(sections)}</p></header>'
                + "\n".join(self.block(b) for b in blocks)
                + "</section>"
            )

        has_teams = any(b["t"] in ("team", "teams") for _, bl in chapters for b in bl)
        intro = f'<p class="body">{esc(INTRO.format(game=title_plain))}</p>' + (f'<p class="body">{esc(INTRO_TEAMS)}</p>' if has_teams else "")
        return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{esc(idx['title'])}</title>
<meta name="author" content="{esc(author)}"><style>{self.css()}</style></head><body>
<section class="cover"><div class="kicker">Guia completo · {esc(idx['console'])}</div><div class="label">DETONADO</div>
<h1>{title_html}</h1><p class="subtitle">{esc(idx['subtitle'])}</p><div class="badges">{badges}</div>
<div class="credit"><b>{esc(author)}</b><span>{esc(site)}</span></div></section>
<section class="colophon"><p><b>{esc(idx['title'])}</b></p><p>Edição em PDF, revisada e diagramada.</p>
<p>{esc(idx['credit'])}</p><p>{esc(idx['disclaimer'])}</p><p>{esc(license_text)}</p></section>
<section class="toc"><h1 class="page-title">Sumário</h1><ol>{toc}</ol></section>
<section class="intro"><h1 class="page-title">Antes de começar</h1>{intro}<p class="body" style="color:var(--accent);font-style:italic">Boa jornada!</p></section>
{''.join(body)}</body></html>"""

    def build(self, out: Path):
        from weasyprint import HTML

        document = self.html()
        (self.tmp / "guide.html").write_text(document, encoding="utf-8")
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        HTML(string=document, base_url=str(self.tmp)).write_pdf(str(out), optimize_images=True, jpeg_quality=64)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("config")
    parser.add_argument("--variant", choices=list(VARIANTS), default="a4")
    parser.add_argument("--out", required=True)
    parser.add_argument("--public", default=str(PUBLIC))
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    Builder(config, args.variant, Path(args.public)).build(Path(args.out))
    print("pdf:", args.out, round(Path(args.out).stat().st_size / 1e6, 1), "MB")
