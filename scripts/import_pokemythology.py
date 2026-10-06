#!/usr/bin/env python3
"""
Imports a walkthrough published as a WordPress page (pokemythology.net) into the same web format
used by convert_guide.py (index.json, chapters/<n>.json, img/*.webp, cover.webp, search.json).

The page is read from an HTML file saved by the browser ("Save page as"). Images are downloaded from the
site (or taken from the saved "_files" folder when present) and converted to WebP. Pokémon icons are NOT
copied: they become `team` members with a Pokédex number, drawn from the PokéAPI sprites by the web app.

Usage (needs `beautifulsoup4`, `lxml`, `pymupdf` is not required):
    python scripts/import_pokemythology.py scripts/guides/<name>.json [--offline]

--offline never touches the network (images missing from the cache/"_files" are reported and skipped).
"""
import concurrent.futures as cf
import hashlib
import io
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path
from urllib.parse import unquote, urlsplit

from bs4 import BeautifulSoup, NavigableString, Tag
from PIL import Image, ImageDraw, ImageFile, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "detonados"
CACHE = Path(__file__).resolve().parent / ".cache" / "pokemythology"
SITE = "https://pokemythology.net"
COLUMN = 720  # css width of the reading column, used to size images relative to it
MAX_IMAGE_WIDTH = 900

LOWER_WORDS = {"de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "no", "na", "nos", "nas",
               "com", "para", "por", "um", "uma", "ao", "aos", "à", "às", "ou", "que", "se", "pelo", "pela", "pelos", "pelas", "sob", "sobre", "até"}
KEEP_UPPER = {"TM", "HM", "Z-A", "ZA", "XY", "GX", "BP", "II", "III", "IV", "VGC", "HP", "CEO", "IA", "AI"}


# --------------------------------------------------------------------------------------------------
# text helpers
# --------------------------------------------------------------------------------------------------

def clean_text(text: str) -> str:
    return re.sub(r"[ \t\r\n ]+", " ", text)


def is_acronym(word: str) -> bool:
    """Short all-caps words without vowels (SBC, TM, HM, BP) are kept as written."""
    letters = re.sub(r"[^A-Za-zÀ-ÿ]", "", word)
    return 2 <= len(letters) <= 4 and letters.isupper() and not re.search(r"[AEIOUÀ-ÿ]", letters.upper())


def title_case(text: str) -> str:
    """'DIGLETT’S CAVE' -> 'Diglett’s Cave' (Portuguese connectors stay lowercase, acronyms stay upper)."""
    words = clean_text(text).strip().split(" ")
    out = []
    for i, word in enumerate(words):
        previous = words[i - 1].upper() if i else ""
        if word in KEEP_UPPER or re.fullmatch(r"[0-9º°ª.,!?:–-]+", word) or is_acronym(word):
            out.append(word)
        elif len(word) == 1 and previous == "RANK":
            out.append(word)  # "RANK A"
        elif i > 0 and word.lower() in LOWER_WORDS:
            out.append(word.lower())
        else:
            pieces = re.split(r"([-/])", word)
            out.append("".join(p[:1].upper() + p[1:].lower() if p not in ("-", "/") and p not in KEEP_UPPER else p for p in pieces))
    return " ".join(out)


def slugify(text: str) -> str:
    base = unicodedata.normalize("NFD", text.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", base).strip("-") or "secao"


# --------------------------------------------------------------------------------------------------
# tokens: a container (p, td) is flattened into text / image / line-break tokens
# --------------------------------------------------------------------------------------------------

def tokens(el, bold=False, italic=False):
    for child in el.children:
        if isinstance(child, NavigableString):
            text = str(child)
            if text:
                yield ("t", text, bold, italic)
        elif isinstance(child, Tag):
            name = child.name
            if name == "br":
                yield ("br",)
            elif name == "img":
                yield ("img", child.get("data-src") or child.get("src") or "", child)
            elif name in ("script", "style", "ins", "iframe", "noscript"):
                continue
            elif name in ("p", "div", "table", "tr"):
                yield ("br",)
                yield from tokens(child, bold, italic)
                yield ("br",)
            else:
                yield from tokens(child, bold or name in ("b", "strong"), italic or name in ("i", "em"))


def runs_from(text_tokens):
    runs = []
    for _kind, text, bold, italic in text_tokens:
        text = clean_text(text)
        if not text:
            continue
        run = {"t": text}
        if bold:
            run["b"] = 1
        if italic:
            run["i"] = 1
        if runs and runs[-1].get("b") == run.get("b") and runs[-1].get("i") == run.get("i"):
            runs[-1]["t"] += text
        else:
            runs.append(run)
    if runs:
        runs[0]["t"] = runs[0]["t"].lstrip()
        runs[-1]["t"] = runs[-1]["t"].rstrip()
    return [r for r in runs if r["t"]]


# --------------------------------------------------------------------------------------------------
# image classification
# --------------------------------------------------------------------------------------------------

SPRITE_RE = re.compile(r"^(\d{1,4})(?:-[a-z0-9()]+)*\.png$", re.I)


def classify(src: str):
    """-> ('sprite', dex_id) | ('image', source) | ('skip', None).  `source` is a url or a local file name."""
    if not src:
        return ("skip", None)
    path = unquote(urlsplit(src).path)
    file_name = path.rsplit("/", 1)[-1]
    host = urlsplit(src).netloc
    if "serebii" in path or "serebii" in host:
        m = SPRITE_RE.match(file_name)
        return ("sprite", int(m.group(1))) if m else ("skip", None)
    # saved-page local files: pokémon icons are plain "<dex>.png" (or "<dex>-form.png")
    if not host and "/" in src and "_files/" in src and SPRITE_RE.match(file_name):
        return ("sprite", int(SPRITE_RE.match(file_name).group(1)))
    if host == "i0.wp.com":
        rest = path.lstrip("/")
        return ("image", "https://" + rest)
    if not host:
        if "_files/" in src:
            return ("image", file_name)  # saved-page local file
        return ("image", SITE + path)
    return ("image", src.split("?")[0])


class ImageStore:
    """Downloads/reads images once, converts them to WebP in public/<slug>/img and remembers their size."""

    def __init__(self, out: Path, assets_dir: Path | None, offline: bool):
        self.out = out
        self.assets_dir = assets_dir
        self.offline = offline
        self.done: dict[str, dict | None] = {}
        self.missing: list[str] = []
        self.partial: list[str] = []
        (out / "img").mkdir(parents=True, exist_ok=True)
        CACHE.mkdir(parents=True, exist_ok=True)

    def _raw(self, source: str) -> bytes | None:
        if not source.startswith("http"):
            if self.assets_dir and (self.assets_dir / source).exists():
                return (self.assets_dir / source).read_bytes()
            return None
        cached = CACHE / hashlib.sha1(source.encode()).hexdigest()
        if cached.exists():
            return cached.read_bytes()
        if self.offline:
            return None
        for attempt in range(5):
            try:
                request = urllib.request.Request(source, headers={"User-Agent": "Mozilla/5.0 (guide importer)"})
                with urllib.request.urlopen(request, timeout=30) as response:
                    data = response.read()
                cached.write_bytes(data)
                return data
            except Exception:
                time.sleep(1 + 2 * attempt)
        return None

    @staticmethod
    def _decode(data):
        if data is None:
            return None
        try:
            image = Image.open(io.BytesIO(data))
            image.load()
            return image
        except Exception:
            return None

    def get(self, source: str):
        if source in self.done:
            return self.done[source]
        image = self._decode(self._raw(source))
        if image is None and source.startswith(SITE):
            # the site sometimes serves big files cut in half: the page itself loads them through the image proxy
            (CACHE / hashlib.sha1(source.encode()).hexdigest()).unlink(missing_ok=True)
            proxied = "https://i0.wp.com/" + source.split("://", 1)[1] + "?w=1000&ssl=1"
            image = self._decode(self._raw(proxied))
        if image is None:
            # the file itself is cut on the server: keep the part that exists
            ImageFile.LOAD_TRUNCATED_IMAGES = True
            image = self._decode(self._raw(source))
            ImageFile.LOAD_TRUNCATED_IMAGES = False
            if image is not None:
                self.partial.append(source)
        if image is None:
            self.missing.append(source)
            self.done[source] = None
            return None
        natural = image.width
        has_alpha = image.mode in ("RGBA", "LA", "P") and "transparency" in image.info or image.mode in ("RGBA", "LA")
        image = image.convert("RGBA" if has_alpha else "RGB")
        if image.width > MAX_IMAGE_WIDTH:
            image = image.resize((MAX_IMAGE_WIDTH, round(image.height * MAX_IMAGE_WIDTH / image.width)), Image.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=80, method=6)
        payload = buffer.getvalue()
        key = hashlib.sha1(payload).hexdigest()[:16]
        target = self.out / "img" / f"{key}.webp"
        if not target.exists():
            target.write_bytes(payload)
        result = {"src": f"img/{key}.webp", "w": image.width, "h": image.height, "nw": natural}
        self.done[source] = result
        return result

    def prefetch(self, sources):
        """Warm the cache with several downloads at once."""
        todo = [s for s in dict.fromkeys(sources) if s.startswith("http") and not (CACHE / hashlib.sha1(s.encode()).hexdigest()).exists()]
        if not todo or self.offline:
            return
        with cf.ThreadPoolExecutor(6) as pool:
            list(pool.map(self._raw, todo))


# --------------------------------------------------------------------------------------------------
# converter
# --------------------------------------------------------------------------------------------------

USA_RE = re.compile(r"^(?P<name>.+?)\s+usa\s*:?\s*$", re.I)
MEMBER_RE = re.compile(r"^(?P<names>[^()]+?)\s+lv\.?\s*(?P<lv>\d+)\s*(?P<note>.*)$", re.I)


class Importer:
    def __init__(self, config: dict, offline: bool, public: Path = PUBLIC):
        self.config = config
        self.slug = config["slug"]
        self.public = Path(public)
        self.out = self.public / self.slug
        self.out.mkdir(parents=True, exist_ok=True)
        (self.out / "chapters").mkdir(exist_ok=True)
        source = Path(config["source"]).expanduser()
        self.soup = BeautifulSoup(source.read_text(encoding="utf-8", errors="ignore"), "lxml")
        assets = config.get("assets_dir")
        self.images = ImageStore(self.out, Path(assets).expanduser() if assets else None, offline)
        self.unknown = []

    # -- pictures ------------------------------------------------------------------------------------
    def picture(self, src: str):
        kind, value = classify(src)
        if kind != "image":
            return None
        return self.images.get(value)

    @staticmethod
    def sized(pic, per_row=1):
        fw = min(1 / per_row, pic["nw"] / COLUMN)
        item = {"src": pic["src"], "w": pic["w"], "h": pic["h"], "fw": round(max(fw, 0.08), 3)}
        if pic["nw"] < 320:
            item["natural"] = 1
        return item

    # -- one container (p or td) -> blocks -----------------------------------------------------------
    def container_blocks(self, el) -> list[dict]:
        toks = list(tokens(el))
        blocks: list[dict] = []
        if any(t[0] == "t" and USA_RE.match(clean_text(t[1]).strip()) for t in toks):
            return self.team_blocks(toks)
        return self.flow_blocks(toks)

    def flow_blocks(self, toks) -> list[dict]:
        """Plain content: text lines become paragraphs, runs of images become galleries/figures."""
        blocks: list[dict] = []
        lines: list[list] = [[]]
        for t in toks:
            if t[0] == "br":
                if lines[-1]:
                    lines.append([])
            else:
                lines[-1].append(t)
        for line in [l for l in lines if l]:
            texts = [t for t in line if t[0] == "t"]
            pics = []
            for t in line:
                if t[0] == "img":
                    pic = self.picture(t[1])
                    if pic:
                        pics.append(pic)
            runs = runs_from(texts)
            if pics:
                if len(pics) == 1:
                    block = {"t": "img", **self.sized(pics[0])}
                    if runs and len("".join(r["t"] for r in runs)) < 160:
                        block["caption"] = "".join(r["t"] for r in runs)
                        runs = []
                    blocks.append(block)
                else:
                    blocks.append({"t": "gallery", "imgs": [self.sized(p, len(pics)) for p in pics]})
            if runs:
                blocks.append({"t": "p", "runs": runs})
        return blocks

    def team_blocks(self, toks) -> list[dict]:
        """`[portrait] Name usa: [icon] Species lv.N ...` -> team cards (several per container allowed)."""
        blocks: list[dict] = []
        pending_pics, pending_sprites, pending_text = [], [], []
        team = None

        def flush_pending_text():
            nonlocal pending_text
            runs = runs_from(pending_text)
            if runs and not team:
                blocks.append({"t": "p", "runs": runs})
            pending_text = []

        def close_team():
            nonlocal team
            if team:
                blocks.append(team)
            team = None

        label_text, label_sprite = [], None
        for t in toks:
            if t[0] == "br":
                if not team:
                    flush_pending_text()
                continue
            if t[0] == "img":
                kind, value = classify(t[1])
                if kind == "sprite":
                    pending_sprites.append(value)
                elif kind == "image":
                    pic = self.picture(t[1])
                    if pic:
                        pending_pics.append(pic)
                continue
            text = clean_text(t[1]).strip()
            if not text:
                continue
            m = USA_RE.match(text)
            if m:
                close_team()
                label = clean_text(" ".join(x[1] for x in label_text)).strip() if label_text else ""
                team = {"t": "team", "trainer": m.group("name").strip(), "members": []}
                if label:
                    team["label"] = label
                if label_sprite is not None:
                    team["starter"] = label_sprite
                if pending_pics:
                    portrait = self.sized(pending_pics[-1])
                    portrait.pop("fw", None)
                    team["portrait"] = portrait
                    # any extra pictures before the portrait are plain figures
                    extra = [{"t": "img", **self.sized(p)} for p in pending_pics[:-1]]
                    blocks.extend(extra)
                label_text, label_sprite, pending_pics, pending_sprites = [], None, [], []
                continue
            if team is not None:
                mm = MEMBER_RE.match(text)
                if mm:
                    names = [n.strip() for n in mm.group("names").split("/") if n.strip()]
                    note = mm.group("note").strip()
                    for i, name in enumerate(names):
                        member = {"name": name, "lv": int(mm.group("lv"))}
                        if i < len(pending_sprites):
                            member["id"] = pending_sprites[i]
                        elif pending_sprites and len(names) == 1:
                            member["id"] = pending_sprites[0]
                        if note and i == len(names) - 1:
                            member["note"] = note
                        team["members"].append(member)
                    pending_sprites = []
                else:
                    # free text inside a team: keep it as a note of the last member (or of the team)
                    target = team["members"][-1] if team["members"] else team
                    target["note"] = (target.get("note", "") + " " + text).strip()
            else:
                # before the first "usa:": the label of a starter-dependent team ("Se você começou com X")
                if pending_sprites:
                    label_sprite = pending_sprites[-1]
                    pending_sprites = []
                label_text.append(t)
        close_team()
        if pending_pics and not blocks:
            blocks.extend({"t": "img", **self.sized(p)} for p in pending_pics)
        return blocks

    # -- tables ---------------------------------------------------------------------------------------
    def table_blocks(self, table) -> list[dict]:
        rows = table.find_all("tr")
        cells = [td for tr in rows for td in tr.find_all(["td", "th"], recursive=False)]
        if not cells:
            return []
        has_images = table.find("img") is not None
        if has_images:
            cell_blocks = [self.container_blocks(td) for td in cells]
            teams = [b for blocks in cell_blocks for b in blocks if b["t"] == "team"]
            others = [b for blocks in cell_blocks for b in blocks if b["t"] != "team"]
            result = []
            if len(teams) > 1:
                result.append({"t": "teams", "teams": teams})
            else:
                result.extend(teams)
            result.extend(others)
            return result
        # no images: a text box (single cell) or a data table
        if len(cells) == 1:
            paras = [runs for runs in (runs_from([x for x in line if x[0] == "t"]) for line in self.lines(cells[0])) if runs]
            return [{"t": "callout", "kind": "note", "paras": paras}] if paras else []
        grid = []
        for tr in rows:
            row = []
            for td in tr.find_all(["td", "th"], recursive=False):
                text = clean_text(td.get_text(" ", strip=True))
                row.append({"t": text, **({"b": 1} if td.find(["strong", "b"]) else {}), **({"rs": int(td["rowspan"])} if td.get("rowspan") and td["rowspan"].isdigit() and int(td["rowspan"]) > 1 else {})})
            if row:
                grid.append(row)
        return [{"t": "table", "rows": grid}]

    @staticmethod
    def lines(el):
        lines = [[]]
        for t in tokens(el):
            if t[0] == "br":
                if lines[-1]:
                    lines.append([])
            else:
                lines[-1].append(t)
        return [l for l in lines if l]

    # -- whole document -------------------------------------------------------------------------------
    def collect_image_sources(self, content):
        sources = []
        for img in content.find_all("img"):
            kind, value = classify(img.get("data-src") or img.get("src") or "")
            if kind == "image" and value.startswith("http"):
                sources.append(value)
        return sources

    def sections(self):
        content = self.soup.select_one(".entry-content")
        self.images.prefetch(self.collect_image_sources(content))
        sections = []  # [{"title": str | None, "blocks": []}]
        current = {"title": None, "blocks": []}

        def start(title):
            nonlocal current
            if current["title"] is not None or current["blocks"]:
                sections.append(current)
            current = {"title": title, "blocks": []}

        for child in content.children:
            if not isinstance(child, Tag):
                continue
            if child.name == "div" or child.name in ("script", "style", "ins", "iframe"):
                continue  # ads and injected widgets
            if child.name == "table":
                current["blocks"].extend(self.table_blocks(child))
                continue
            if child.name in ("h1", "h2", "h3", "h4"):
                start(title_case(child.get_text(" ", strip=True)))
                continue
            if child.name != "p":
                continue
            first = next((x for x in child.children if isinstance(x, Tag) or str(x).strip()), None)
            if isinstance(first, Tag) and first.name in ("em", "u", "strong", "b") and 0 < len(first.get_text(strip=True)) < 90 \
                    and first.get_text(strip=True).upper() == first.get_text(strip=True) and not child.find("img"):
                start(title_case(first.get_text(" ", strip=True)))
                first.extract()
                rest = self.container_blocks(child)
                current["blocks"].extend(rest)
                continue
            current["blocks"].extend(self.container_blocks(child))
        start(None)
        return [s for s in sections if s["blocks"] or s["title"]]

    def run(self):
        cfg = self.config
        sections = self.sections()
        # blocks -> chapters (a chapter groups consecutive sections up to ~size characters)
        def weight(blocks):
            # text counts by length, every picture counts like a few lines of text
            total = 0
            for b in blocks:
                if b["t"] == "gallery":
                    total += 450 * len(b["imgs"])
                elif b["t"] in ("img", "card"):
                    total += 450
                else:
                    total += len(json.dumps(b, ensure_ascii=False))
            return total

        chapters, current, used = [], [], 0
        limit, max_sections = cfg.get("chapter_chars", 16000), cfg.get("chapter_sections", 10)
        for section in sections:
            w = weight(section["blocks"])
            if current and (used + w > limit or len(current) >= max_sections):
                chapters.append(current)
                current, used = [], 0
            current.append(section)
            used += w
        if current:
            chapters.append(current)

        for stale in (self.out / "chapters").glob("*.json"):
            stale.unlink()  # chapters of a previous run (the number of chapters can change)

        index_chapters = []
        for number, group in enumerate(chapters, start=1):
            blocks, seen = [], {}
            sections_meta = []
            for section in group:
                if section["title"]:
                    base = slugify(section["title"])
                    seen[base] = seen.get(base, 0) + 1
                    sid = base if seen[base] == 1 else f"{base}-{seen[base]}"
                    blocks.append({"t": "h2", "id": sid, "text": section["title"]})
                    sections_meta.append({"id": sid, "text": section["title"]})
                blocks.extend(section["blocks"])
            first_title = next((s["title"] for s in group if s["title"]), cfg["title"])
            title = f"Parte {number}: {first_title}"
            (self.out / "chapters" / f"{number}.json").write_text(
                json.dumps({"title": title, "blocks": blocks}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            index_chapters.append({"n": number, "title": title, "part": "", "pages": [0, 0], "sections": sections_meta})
            print(f"chapter {number}: {title} ({len(blocks)} blocks, {len(sections_meta)} sections)")

        index = {k: cfg[k] for k in ("slug", "title", "subtitle", "console", "description", "credit", "disclaimer", "license", "accent") if k in cfg}
        index["cover"] = self.make_cover()
        index["downloads"] = cfg.get("downloads", [])
        index["chapters"] = index_chapters
        index["pdfPages"] = 0
        previous = self.out / "index.json"
        if previous.exists() and not index["downloads"]:
            # keep the PDFs registered by build_pdfs.py
            old_index = json.loads(previous.read_text(encoding="utf-8"))
            index["downloads"] = old_index.get("downloads", [])
            index["pdfPages"] = old_index.get("pdfPages", 0)
        (self.out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
        self.update_catalog(index)
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from build_search_index import build as build_search_index
        build_search_index(self.slug, self.public)
        images = len(list((self.out / "img").glob("*.webp")))
        size = sum(f.stat().st_size for f in (self.out / "img").glob("*.webp")) / 1e6
        print(f"images: {images} files, {size:.1f} MB; missing: {len(set(self.images.missing))}; truncated at the source: {len(set(self.images.partial))}")
        for source in sorted(set(self.images.partial)):
            print("  truncated on the server (kept the visible part):", source)
        for source in sorted(set(self.images.missing))[:20]:
            print("  missing:", source)

    def update_catalog(self, index):
        path = self.public / "guides.json"
        catalog = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        entry = {k: index[k] for k in ("slug", "title", "subtitle", "console", "description", "accent", "cover")}
        entry["chapters"] = len(index["chapters"])
        entry["pdfPages"] = index["pdfPages"]
        catalog = [e for e in catalog if e["slug"] != entry["slug"]] + [entry]
        catalog.sort(key=lambda e: e["slug"])
        path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")

    # -- generated cover ----------------------------------------------------------------------------------
    def make_cover(self) -> str:
        cfg = self.config
        width, height = 640, 905
        accent = tuple(int(cfg["accent"].lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
        base = Image.new("RGB", (width, height), accent)
        # background: a blurred, darkened screenshot when available
        shot = cfg.get("cover_image")
        if shot:
            pic = self.images.get(shot) if shot.startswith("http") else None
            if pic:
                bg = Image.open(self.out / pic["src"]).convert("RGB")
                scale = height / bg.height
                bg = bg.resize((round(bg.width * scale), height)).crop((0, 0, width, height)).filter(ImageFilter.GaussianBlur(6))
                base = Image.blend(bg, Image.new("RGB", (width, height), accent), 0.55)
        draw = ImageDraw.Draw(base)
        for y in range(height):
            shade = int(120 * (y / height))
            draw.line([(0, y), (width, y)], fill=(0, 0, 0, shade) if False else tuple(max(0, c - shade // 2) for c in base.getpixel((0, y))))
        fonts = [Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"), Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf")]
        font_path = next((f for f in fonts if f.exists()), None)
        big = ImageFont.truetype(str(font_path), 54) if font_path else ImageFont.load_default()
        small = ImageFont.truetype(str(font_path), 26) if font_path else ImageFont.load_default()
        label = cfg.get("cover_label", cfg["title"].replace("Detonado Pokémon ", ""))
        draw.text((48, 70), "DETONADO", font=small, fill=(255, 255, 255))
        y = 150
        for line in self.wrap(draw, label, big, width - 96):
            draw.text((48, y), line, font=big, fill=(255, 255, 255))
            y += 68
        draw.text((48, height - 90), cfg.get("console", ""), font=small, fill=(255, 255, 255))
        draw.text((48, height - 52), "pokemythology.net", font=small, fill=(255, 255, 255))
        base.save(self.out / "cover.webp", "WEBP", quality=85)
        return "cover.webp"

    @staticmethod
    def wrap(draw, text, font, max_width):
        lines, line = [], ""
        for word in text.split():
            trial = f"{line} {word}".strip()
            if draw.textlength(trial, font=font) <= max_width:
                line = trial
            else:
                lines.append(line)
                line = word
        if line:
            lines.append(line)
        return lines


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    config = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    Importer(config, offline="--offline" in sys.argv).run()
