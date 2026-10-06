#!/usr/bin/env python3
"""
Builds the downloadable PDFs of a converted guide: A4 + compact, with the watermark, copied to
public/detonados/<slug>/pdf and registered in index.json / guides.json.

    python scripts/build_pdfs.py scripts/guides/swsh.json [--no-watermark] [--cover-only]

Steps: make_pdf.py (WeasyPrint) -> watermark_pdf.py -> public/detonados/<slug>/pdf/*.pdf
The PDF file names follow the other guides: Detonado-Pokemon-<Name>-A4.pdf and Detonado-Pokemon-<Name>.pdf
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pymupdf  # noqa: E402

from make_pdf import PUBLIC, ROOT, Builder  # noqa: E402
from watermark_pdf import watermark  # noqa: E402


def file_stem(title: str) -> str:
    name = title.replace("Detonado Pokémon ", "")
    name = unicodedata.normalize("NFD", name).encode("ascii", "ignore").decode()
    name = re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-")
    return f"Detonado-Pokemon-{name}"


def render_cover(raw_pdf: Path, target: Path):
    """The site thumbnail is the first page (the cover) of the generated PDF, like in the other guides."""
    import io

    from PIL import Image

    with pymupdf.open(raw_pdf) as doc:
        pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(1.6, 1.6), alpha=False)
    Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB").save(target, "WEBP", quality=85, method=6)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    config = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    use_watermark = "--no-watermark" not in sys.argv
    slug = config["slug"]
    if "--cover-only" in sys.argv:
        render_cover(ROOT / "build" / f"{slug}-a4.pdf", PUBLIC / slug / "cover.webp")
        print("cover updated:", slug)
        return
    out_dir = PUBLIC / slug / "pdf"
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = file_stem(config["title"])
    entries = []
    for variant, suffix, label, hint in (
        ("a4", "-A4", "PDF em A4", "Ideal para imprimir ou ler no computador"),
        ("compact", "", "PDF compacto", "Formato menor, ótimo para celular e tablet"),
    ):
        raw = ROOT / "build" / f"{slug}-{variant}.pdf"
        Builder(config, variant).build(raw)
        target = out_dir / f"{stem}{suffix}.pdf"
        if use_watermark:
            watermark(str(raw), str(target), "pokedex.otaviorafael.com.br", 0.2, 35, 0.085, "Detonado gratuito - pokedex.otaviorafael.com.br")
        else:
            target.write_bytes(raw.read_bytes())
        with pymupdf.open(target) as doc:
            pages = len(doc)
        if variant == "a4":
            render_cover(raw, PUBLIC / slug / "cover.webp")
        entries.append({"label": label, "hint": hint, "file": f"pdf/{target.name}", "pages": pages, "bytes": target.stat().st_size})
        print(f"{target.name}: {pages} pages, {target.stat().st_size / 1e6:.1f} MB")

    index_path = PUBLIC / slug / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    index["downloads"] = entries
    index["pdfPages"] = entries[0]["pages"]
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    catalog_path = PUBLIC / "guides.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    for entry in catalog:
        if entry["slug"] == slug:
            entry["pdfPages"] = entries[0]["pages"]
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
