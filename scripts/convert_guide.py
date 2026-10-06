#!/usr/bin/env python3
"""
Converts a walkthrough PDF (generated with WeasyPrint) into web content:

    public/detonados/<slug>/index.json          guide metadata + chapter list
    public/detonados/<slug>/chapters/<n>.json   blocks of each chapter
    public/detonados/<slug>/img/<hash>.webp     screenshots, maps and cards

Text, headings and call-outs become structured blocks. Photos/maps become images.
Trainer cards and tables (rich layouts) are cropped as images, with the text kept as `alt`.

Usage (needs `pymupdf` and `Pillow`):
    python scripts/convert_guide.py <pdf_dir> <config.json>

The config lists the PDF files (the first one is converted, all of them are offered for download).
"""
import hashlib
import io
import json
import re
import sys
import shutil
import unicodedata
from pathlib import Path

import pymupdf
from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / "public" / "detonados"

LABELS = {
    "DICA": "tip",
    "ATENÇÃO": "warning",
    "RECOMPENSA": "reward",
    "CURIOSIDADE": "trivia",
    "NOTA": "note",
}


def despace(text: str) -> str:
    """'D I C A' -> 'DICA' (letter-spaced labels)."""
    t = text.strip()
    if re.fullmatch(r"(?:\S ){2,}\S", t):
        return t.replace(" ", "")
    return t


def label_kind(text: str):
    return LABELS.get(despace(text).upper())


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("‐", "-")).strip().lower()


class Page:
    def __init__(self, doc, index, toc):
        self.doc = doc
        self.page = doc[index]
        self.index = index
        self.toc = [t for t in toc if t[2] == index + 1]
        self.height = self.page.rect.height
        self.lines = []
        self.images = []
        self.read()
        self.merge_image_layers()

    def merge_image_layers(self):
        merged = []
        for im in sorted(self.images, key=lambda i: -i["bbox"].get_area()):
            for m in merged:
                inter = m["bbox"] & im["bbox"]
                if not inter.is_empty and inter.get_area() > 0.6 * im["bbox"].get_area():
                    m["bbox"] |= im["bbox"]
                    m["w"] = max(m["w"], im["w"])
                    m["h"] = max(m["h"], im["h"])
                    break
            else:
                merged.append({"bbox": pymupdf.Rect(im["bbox"]), "w": im["w"], "h": im["h"]})
        self.images = merged

    def read(self):
        data = self.page.get_text("dict")
        for block in data["blocks"]:
            if block["type"] == 1:
                w, h = block["width"], block["height"]
                x0, y0, x1, y1 = block["bbox"]
                if (x1 - x0) >= 40 and (y1 - y0) >= 20 and w >= 60 and h >= 40:
                    self.images.append({"bbox": pymupdf.Rect(block["bbox"]), "w": w, "h": h})
            else:
                for line in block["lines"]:
                    spans = [s for s in line["spans"] if s["text"] != ""]
                    if not spans:
                        continue
                    text = "".join(s["text"] for s in spans)
                    if not text.strip():
                        continue
                    first = spans[0]
                    y0 = line["bbox"][1]
                    if y0 < 40 or y0 > 790:
                        continue  # running header and page number
                    self.lines.append({
                        "bbox": pymupdf.Rect(line["bbox"]),
                        "spans": spans,
                        "text": text,
                        "font": first["font"],
                        "size": round(first["size"], 1),
                        "color": f'{first["color"]:06x}',
                    })

    # -- containers (callouts, cards, tables) ---------------------------------
    def containers(self):
        rects = []
        for d in self.page.get_drawings():
            r = d["rect"]
            if d.get("fill") is None:
                continue
            if r.width >= 200 and r.height >= 28:
                rects.append(pymupdf.Rect(r))
        merged = []
        for r in sorted(rects, key=lambda r: (r.y0, r.x0)):
            for m in merged:
                inter = m & r
                if not inter.is_empty and inter.get_area() > 0.5 * min(m.get_area(), r.get_area()):
                    m |= r
                    break
            else:
                merged.append(pymupdf.Rect(r))
        # second pass: merge regions that ended up overlapping after growth
        changed = True
        while changed:
            changed = False
            for i in range(len(merged)):
                for j in range(i + 1, len(merged)):
                    inter = merged[i] & merged[j]
                    if not inter.is_empty and inter.get_area() > 0:
                        merged[i] |= merged[j]
                        merged.pop(j)
                        changed = True
                        break
                if changed:
                    break
        return merged


def is_cardish(line):
    """Small UI-style text used inside cards/tables (not body prose, headings or callouts)."""
    font, size = line["font"], line["size"]
    if font.startswith("Poppins"):
        return size < 14
    if font.startswith("Lora") and size <= 9.6:
        return True
    return False


def inside(rect, bbox, pad=2):
    cx, cy = (bbox.x0 + bbox.x1) / 2, (bbox.y0 + bbox.y1) / 2
    return rect.x0 - pad <= cx <= rect.x1 + pad and rect.y0 - pad <= cy <= rect.y1 + pad


def runs_from_spans(spans_list):
    """Spans (possibly from several lines) -> merged runs [{t, b?, i?}] with hyphen joins."""
    runs = []

    def add(text, bold, italic):
        if not text:
            return
        if runs and runs[-1].get("b", 0) == bold and runs[-1].get("i", 0) == italic:
            runs[-1]["t"] += text
        else:
            run = {"t": text}
            if bold:
                run["b"] = 1
            if italic:
                run["i"] = 1
            runs.append(run)

    for index, spans in enumerate(spans_list):
        if index > 0:
            # soft hyphen produced by the line breaker joins words without a space
            if runs:
                tail = runs[-1]["t"].rstrip()
                if tail.endswith("\u2010"):
                    runs[-1]["t"] = tail[:-1]  # soft hyphen from the line breaker: join the word
                elif re.search(r"[^\W\d_]-$", tail):
                    runs[-1]["t"] = tail  # a real hyphen at the end of the line: join without a space
                else:
                    runs[-1]["t"] += " "
        for s in spans:
            font = s["font"]
            bold = 1 if "Bold" in font else 0
            italic = 1 if "Italic" in font else 0
            add(s["text"], bold, italic)
    # tidy: collapse double spaces, trim edges
    for run in runs:
        # a leftover soft hyphen (U+2010) only comes from the line breaker: join the word
        run["t"] = re.sub(r"\u2010\s*", "", run["t"])
        run["t"] = re.sub(r" {2,}", " ", run["t"])
    if runs:
        runs[0]["t"] = runs[0]["t"].lstrip()
        runs[-1]["t"] = runs[-1]["t"].rstrip()
    return [r for r in runs if r["t"]]


class Converter:
    def __init__(self, pdf_dir, slug, config):
        self.pdf_dir = pdf_dir
        self.doc = pymupdf.open(Path(pdf_dir) / config["pdfs"][0]["file"])
        self.slug = slug
        self.config = config
        self.toc = self.doc.get_toc()
        self.out = PUBLIC / slug
        (self.out / "img").mkdir(parents=True, exist_ok=True)
        (self.out / "chapters").mkdir(parents=True, exist_ok=True)
        self.saved = {}
        self.unknown = {}
        h = config.get("fonts", {})
        self.h2_sig = tuple(h.get("h2", ["Poppins-Bold", 14.4]))
        self.h3_sig = tuple(h.get("h3", ["Poppins-Bold", 11.0]))

    # -- images ----------------------------------------------------------------
    def save_region(self, page, rect, native_width=None, max_width=1400, min_scale=1.0):
        rect = pymupdf.Rect(rect) & page.page.rect
        if native_width:
            scale = max(min_scale, min(native_width / rect.width, 3.0))
        else:
            scale = 2.5
        if rect.width * scale > max_width:
            scale = max_width / rect.width
        pix = page.page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=rect, alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        buffer = io.BytesIO()
        img.save(buffer, "WEBP", quality=82, method=6)
        data = buffer.getvalue()
        key = hashlib.sha1(data).hexdigest()[:16]
        if key not in self.saved:
            (self.out / "img" / f"{key}.webp").write_bytes(data)
            self.saved[key] = (img.width, img.height)
        w, h = self.saved[key]
        return {"src": f"img/{key}.webp", "w": w, "h": h}

    # -- one page -> blocks ------------------------------------------------------
    def page_blocks(self, page, is_opener=False):
        if is_opener:
            # chapter label, big title and subtitle are rendered by the web page itself
            toc_titles = {norm(t[1]) for t in page.toc if t[0] > 1}
            page.lines = [
                l for l in page.lines
                if not (l["bbox"].y0 < 150 and l["font"].startswith("Poppins") and norm(l["text"]) not in toc_titles)
            ]
        containers = page.containers()
        items = []  # (y, x, kind, payload)
        pictures = []  # images and cards; grouped into rows afterwards
        used_lines = set()
        used_images = set()

        # Cards with a coloured header rect keep their body outside any rect: grow the region downward
        extended = []
        for region in containers:
            region = pymupdf.Rect(region)
            header_lines = [l for l in page.lines if inside(region, l["bbox"])]
            has_white_title = any(l["font"].startswith("Poppins") and l["color"] == "ffffff" for l in header_lines)
            has_label = any(label_kind(l["text"]) for l in header_lines)
            if has_white_title and not has_label and region.width >= 400:
                below = [l for l in page.lines if l["bbox"].y0 >= region.y1 - 2 and is_cardish(l)]
                below_images = [im for im in page.images if im["bbox"].y0 >= region.y1 - 2 and im["bbox"].width < 90]
                elements = sorted(
                    [(l["bbox"].y0, l["bbox"].y1, l["bbox"].x0, l["bbox"].x1) for l in below]
                    + [(im["bbox"].y0, im["bbox"].y1, im["bbox"].x0, im["bbox"].x1) for im in below_images]
                )
                bottom = region.y1
                for y0, y1, x0, x1 in elements:
                    if y0 - bottom > 20:
                        break
                    if x0 < region.x0 - 6 or x1 > region.x1 + 6:
                        continue
                    bottom = max(bottom, y1)
                region.y1 = min(bottom + 6, region.y1 + 400)
            extended.append(region)
        containers = extended

        for region in containers:
            lines_in = [i for i, l in enumerate(page.lines) if inside(region, l["bbox"])]
            images_in = [i for i, im in enumerate(page.images) if inside(region, im["bbox"])]
            if not lines_in and not images_in:
                continue
            region_lines = [page.lines[i] for i in lines_in]
            if not lines_in:
                continue  # pictures with a frame/shadow are handled as standalone images
            if any((l["font"], l["size"]) == self.h2_sig for l in region_lines) and not any(
                l["color"] == "ffffff" for l in region_lines
            ):
                continue  # section heading with a coloured marker: let the text flow handle it
            first_label = next((label_kind(l["text"]) for l in region_lines if l["font"].startswith("Poppins-Bold")), None)
            looks_like_card = bool(images_in) or any(
                re.match(r"^Nv\.", l["text"].strip()) or l["font"] == "Poppins-Medium" and l["color"] == "ffffff"
                for l in region_lines
            ) or len({round(l["bbox"].x0 / 40) for l in region_lines}) > 3 and not first_label
            if first_label and not looks_like_card:
                paragraphs = []
                current = []
                prev = None
                body = [l for l in region_lines if label_kind(l["text"]) is None]
                for l in sorted(body, key=lambda l: (l["bbox"].y0, l["bbox"].x0)):
                    if prev is not None and l["bbox"].y0 - prev["bbox"].y1 > 6:
                        paragraphs.append(current)
                        current = []
                    current.append(l["spans"])
                    prev = l
                if current:
                    paragraphs.append(current)
                block = {"t": "callout", "kind": first_label,
                         "paras": [runs_from_spans(p) for p in paragraphs]}
                items.append((region.y0, region.x0, "block", block))
            else:
                alt = " ".join(l["text"].strip() for l in sorted(region_lines, key=lambda l: (round(l["bbox"].y0 / 4), l["bbox"].x0)))
                alt = re.sub(r"\s+", " ", despace(alt)).replace("\u2010 ", "")
                pictures.append({"rect": pymupdf.Rect(region), "kind": "card", "alt": alt[:600],
                                 "pic": self.save_region(page, region, max_width=1500)})
            used_lines.update(lines_in)
            used_images.update(images_in)

        # standalone images (maps, screenshots)
        standalone = [im for i, im in enumerate(page.images) if i not in used_images]
        standalone.sort(key=lambda im: (im["bbox"].y0, im["bbox"].x0))
        for im in standalone:
            pictures.append({"rect": pymupdf.Rect(im["bbox"]), "kind": "img", "alt": "",
                             "pic": self.save_region(page, im["bbox"], native_width=im["w"])})

        # text drawn on top of a standalone image (numbered map markers) is part of the picture
        for im in standalone:
            for i, l in enumerate(page.lines):
                if i not in used_lines and inside(im["bbox"], l["bbox"], pad=0):
                    used_lines.add(i)

        # leftover cardish lines (plain tables, legends): crop each contiguous cluster
        free = sorted(
            [i for i, l in enumerate(page.lines) if i not in used_lines and is_cardish(l) and not self.is_caption(l)],
            key=lambda i: (page.lines[i]["bbox"].y0, page.lines[i]["bbox"].x0),
        )
        clusters, current = [], []
        for i in free:
            line = page.lines[i]
            if current and line["bbox"].y0 - max(page.lines[j]["bbox"].y1 for j in current) > 14:
                clusters.append(current)
                current = []
            current.append(i)
        if current:
            clusters.append(current)
        for cluster in clusters:
            if len(cluster) < 2:
                continue
            cluster_lines = [page.lines[i] for i in cluster]
            box = pymupdf.Rect(cluster_lines[0]["bbox"])
            for l in cluster_lines[1:]:
                box |= l["bbox"]
            # include small images (sprites/icons) that sit inside the cluster
            for k, im in enumerate(page.images):
                if k not in used_images and im["bbox"].width < 90 and inside(box + (-8, -8, 8, 8), im["bbox"]):
                    box |= im["bbox"]
                    used_images.add(k)
            box = pymupdf.Rect(box.x0 - 8, box.y0 - 8, box.x1 + 8, box.y1 + 8)
            alt = " ".join(l["text"].strip() for l in sorted(cluster_lines, key=lambda l: (round(l["bbox"].y0 / 4), l["bbox"].x0)))
            pictures.append({"rect": box, "kind": "card", "alt": re.sub(r"\s+", " ", alt)[:600],
                             "pic": self.save_region(page, box, max_width=1500)})
            used_lines.update(cluster)

        # group pictures that share a row (side by side in the PDF) into one block
        content_w = page.page.rect.width - 2 * 51
        pictures.sort(key=lambda pc: (pc["rect"].y0, pc["rect"].x0))
        rows = []
        for pc in pictures:
            for row in rows:
                ry0 = min(x["rect"].y0 for x in row)
                ry1 = max(x["rect"].y1 for x in row)
                overlap = min(ry1, pc["rect"].y1) - max(ry0, pc["rect"].y0)
                if overlap > 0.5 * min(ry1 - ry0, pc["rect"].height):
                    row.append(pc)
                    break
            else:
                rows.append([pc])
        for row in rows:
            row.sort(key=lambda pc: pc["rect"].x0)

            def entry(pc):
                e = dict(pc["pic"])
                e["fw"] = round(min(1.0, pc["rect"].width / content_w), 3)
                if pc["kind"] == "card":
                    e["card"] = 1
                    e["alt"] = pc["alt"]
                return e

            y0 = min(pc["rect"].y0 for pc in row)
            x0 = min(pc["rect"].x0 for pc in row)
            if len(row) == 1:
                block = {"t": "card" if row[0]["kind"] == "card" else "img", **entry(row[0])}
                block.pop("card", None)
            else:
                block = {"t": "gallery", "imgs": [entry(pc) for pc in row]}
            items.append((y0, x0, "block", block))

        # flow text
        flow = [
            l for i, l in enumerate(page.lines)
            if i not in used_lines and not (l["color"] == "ffffff" and re.fullmatch(r"\d{1,2}", l["text"].strip()))
        ]
        flow.sort(key=lambda l: (round(l["bbox"].y0), l["bbox"].x0))
        body_buffer = []
        last_body = None

        def flush_body():
            nonlocal body_buffer, last_body
            if body_buffer:
                runs = runs_from_spans([l["spans"] for l in body_buffer])
                if runs:
                    items.append((body_buffer[0]["bbox"].y0, body_buffer[0]["bbox"].x0, "block", {"t": "p", "runs": runs}))
            body_buffer = []
            last_body = None

        toc_titles = {norm(t[1]): t[0] for t in page.toc}
        for l in flow:
            text = l["text"].strip()
            sig = (l["font"], l["size"])
            level = toc_titles.get(norm(text))
            is_h2 = sig == self.h2_sig or (level == 2 and l["font"].startswith("Poppins-Bold"))
            is_h3 = sig == self.h3_sig or (level == 3 and l["font"].startswith("Poppins-Bold"))
            if is_h2 and level != 3:
                flush_body()
                items.append((l["bbox"].y0, l["bbox"].x0, "block", {"t": "h2", "text": text}))
            elif is_h3 or (level == 3):
                flush_body()
                items.append((l["bbox"].y0, l["bbox"].x0, "block", {"t": "h3", "text": text}))
            elif l["font"].startswith("Lora") and l["size"] >= 10.0 and l["color"] != "6b6e78":
                if last_body is not None and l["bbox"].y0 - last_body["bbox"].y1 > 6.5:
                    flush_body()
                body_buffer.append(l)
                last_body = l
            elif (l["font"].startswith("Poppins") and l["color"] == "6b6e78" and 8.4 <= l["size"] <= 9.2
                  and items and isinstance(items[-1][3], dict) and items[-1][3].get("t") == "h2" and "sub" not in items[-1][3]
                  and l["bbox"].y0 - items[-1][0] < 40):
                items[-1][3]["sub"] = text
            elif l["font"].startswith("Poppins") and l["color"] in ("6b6e78", "7a7d86") and l["size"] <= 8.4:
                flush_body()
                items.append((l["bbox"].y0, l["bbox"].x0, "caption", text))
            else:
                flush_body()
                key = (l["font"], l["size"], l["color"])
                self.unknown.setdefault(key, []).append(f'p{page.index + 1}:{text[:40]}')
                items.append((l["bbox"].y0, l["bbox"].x0, "block", {"t": "p", "runs": [{"t": text}]}))
        flush_body()

        items.sort(key=lambda it: (round(it[0]), it[1]))
        blocks = []
        for _y, _x, kind, payload in items:
            if kind == "caption":
                if blocks and blocks[-1]["t"] in ("img", "gallery") and "caption" not in blocks[-1]:
                    blocks[-1]["caption"] = payload
                else:
                    blocks.append({"t": "caption", "text": payload})
            else:
                blocks.append(payload)
        for b in blocks:
            b.pop("_y1", None)
        return blocks

    @staticmethod
    def is_caption(line):
        return line["font"].startswith("Poppins") and line["color"] in ("6b6e78", "7a7d86") and line["size"] in (7.8, 8.0) and len(line["text"]) > 12

    # -- whole document -------------------------------------------------------------
    def run(self):
        cfg = self.config
        chapters_toc = [t for t in self.toc if t[0] == 1]
        pdf_pages = len(self.doc)
        chapters = []
        for idx, (_lvl, title, start) in enumerate(chapters_toc):
            end = (chapters_toc[idx + 1][2] - 1) if idx + 1 < len(chapters_toc) else pdf_pages
            chapters.append({"title": title, "start": start, "end": end})

        # part divider pages ("PARTE I" + title)
        part_pages = {}
        for pno in range(pdf_pages):
            lines = [l for l in Page(self.doc, pno, self.toc).lines if l["font"].startswith("Poppins")]
            texts = [l["text"].strip() for l in lines]
            if texts and re.fullmatch(r"PARTE [IVX]+", texts[0]) and len(texts) <= 4:
                part_pages[pno + 1] = f"{texts[0].title().replace('Parte', 'Parte')} · {' '.join(texts[1:])}".strip(" ·")
        self.part_pages = part_pages

        index_chapters = []
        for number, ch in enumerate(chapters):
            if ch["title"] in cfg.get("skip_chapters", []):
                continue
            blocks = []
            for pno in range(ch["start"] - 1, ch["end"]):
                if (pno + 1) in self.part_pages:
                    continue
                page = Page(self.doc, pno, self.toc)
                page_blocks = self.page_blocks(page, is_opener=(pno == ch["start"] - 1))
                page_blocks = self.strip_page_chrome(page, page_blocks, pno == ch["start"] - 1, ch["title"])
                if (page_blocks and blocks and blocks[-1]["t"] == "p" and page_blocks[0]["t"] == "p"
                        and not re.search(r"[.!?:…»\")\]]\s*$", blocks[-1]["runs"][-1]["t"])
                        and page_blocks[0]["runs"][0]["t"][:1].islower()):
                    last = blocks[-1]["runs"][-1]
                    tail = last["t"].rstrip()
                    if tail.endswith("\u2010"):
                        last["t"] = tail[:-1]
                    elif re.search(r"[^\W\d_]-$", tail):
                        last["t"] = tail
                    else:
                        last["t"] += " "
                    blocks[-1]["runs"].extend(page_blocks[0]["runs"])
                    page_blocks = page_blocks[1:]
                blocks.extend(page_blocks)
            blocks = self.add_ids(blocks)
            slug_id = len(index_chapters) + 1
            sections = [{"id": b["id"], "text": b["text"], "level": 2 if b["t"] == "h2" else 3}
                        for b in blocks if b["t"] in ("h2", "h3")]
            (self.out / "chapters" / f"{slug_id}.json").write_text(
                json.dumps({"title": ch["title"], "blocks": blocks}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            index_chapters.append({"n": slug_id, "title": ch["title"], "pages": [ch["start"], ch["end"]],
                                   "sections": [s for s in sections if s["level"] == 2],
                                   "part": next((name for pg, name in sorted(self.part_pages.items(), reverse=True) if pg <= ch["start"]), "")})
            print(f'chapter {slug_id}: {ch["title"]} ({len(blocks)} blocks)')

        index = {k: v for k, v in cfg.items() if k in ("slug", "title", "subtitle", "console", "description", "credit", "disclaimer", "license", "accent")}
        index["cover"] = self.render_cover()
        index["downloads"] = self.copy_pdfs()
        index["chapters"] = index_chapters
        index["pdfPages"] = pdf_pages
        (self.out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
        self.update_catalog(index)
        from build_search_index import build as build_search_index

        build_search_index(self.slug)
        print("images saved:", len(self.saved))
        if self.unknown:
            print("UNHANDLED TEXT STYLES:")
            for key, samples in sorted(self.unknown.items(), key=lambda kv: -len(kv[1])):
                print("  ", key, len(samples), samples[:3])

    def update_catalog(self, index):
        catalog_path = PUBLIC / "guides.json"
        catalog = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else []
        entry = {k: index[k] for k in ("slug", "title", "subtitle", "console", "description", "accent", "cover")}
        entry["chapters"] = len(index["chapters"])
        entry["pdfPages"] = index["pdfPages"]
        catalog = [e for e in catalog if e["slug"] != entry["slug"]] + [entry]
        catalog.sort(key=lambda e: e["slug"])
        catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")

    def render_cover(self):
        page = self.doc[0]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        img.save(self.out / "cover.webp", "WEBP", quality=85, method=6)
        return "cover.webp"

    def copy_pdfs(self):
        pdf_out = self.out / "pdf"
        pdf_out.mkdir(exist_ok=True)
        downloads = []
        for entry in self.config["pdfs"]:
            source = Path(self.pdf_dir) / entry["file"]
            shutil.copyfile(source, pdf_out / entry["file"])
            with pymupdf.open(source) as doc:
                pages = len(doc)
            downloads.append({
                "label": entry["label"],
                "hint": entry.get("hint", ""),
                "file": f"pdf/{entry['file']}",
                "pages": pages,
                "bytes": source.stat().st_size,
            })
        return downloads

    def strip_page_chrome(self, page, blocks, is_opener, title):
        cleaned = []
        for b in blocks:
            if b["t"] == "caption" and (b["text"].strip().isdigit() or norm(b["text"]) in self.running_headers(page)):
                continue
            cleaned.append(b)
        return cleaned

    def running_headers(self, page):
        return {norm(l["text"]) for l in page.lines if l["bbox"].y0 < 40}

    def add_ids(self, blocks):
        seen = {}
        for b in blocks:
            if b["t"] in ("h2", "h3"):
                base = re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFD", norm(b["text"])).encode("ascii", "ignore").decode()).strip("-") or "secao"
                n = seen.get(base, 0)
                seen[base] = n + 1
                b["id"] = base if n == 0 else f"{base}-{n + 1}"
        return blocks


if __name__ == "__main__":
    pdf_dir, config_path = sys.argv[1:3]
    config = json.load(open(config_path, encoding="utf-8"))
    Converter(pdf_dir, config["slug"], config).run()
