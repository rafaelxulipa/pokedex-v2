"""Tests for the PDF generator (offline: Pokémon icons are not downloaded)."""
import json

import pymupdf
import pytest
from PIL import Image

import make_pdf


@pytest.fixture()
def guide(tmp_path, monkeypatch):
    monkeypatch.setattr(make_pdf.Builder, "load_sprites", lambda self, ids: None)
    public = tmp_path / "public"
    src = public / "teste"
    (src / "img").mkdir(parents=True)
    (src / "chapters").mkdir()
    Image.new("RGB", (400, 225), (30, 120, 60)).save(src / "img" / "a.webp")
    Image.new("RGBA", (90, 90), (200, 0, 0, 255)).save(src / "img" / "p.webp")
    img = {"src": "img/a.webp", "w": 400, "h": 225, "fw": 0.5}
    chapters = [
        [
            {"t": "h2", "id": "um", "text": "Primeira Seção", "sub": "Subtítulo"},
            {"t": "p", "runs": [{"t": "Texto de "}, {"t": "exemplo", "b": 1}, {"t": " com acentuação: ação, coração."}]},
            {"t": "gallery", "imgs": [img, img]},
            {"t": "img", **img, "caption": "Legenda"},
            {"t": "team", "trainer": "Brock", "members": [{"name": "Geodude", "lv": 12}, {"name": "Onix", "lv": 14, "note": "(Rock Tomb)"}],
             "portrait": {"src": "img/p.webp", "w": 90, "h": 90, "natural": 1}},
            {"t": "callout", "kind": "note", "paras": [[{"t": "Uma nota."}]]},
            {"t": "table", "rows": [[{"t": "Níveis", "b": 1}, {"t": "Prêmios", "b": 1}], [{"t": "1"}, {"t": "Nenhum"}]]},
        ],
        [{"t": "h2", "id": "dois", "text": "Segunda Seção"}, {"t": "p", "runs": [{"t": "Outro capítulo."}]}],
    ]
    index_chapters = []
    for n, blocks in enumerate(chapters, start=1):
        (src / "chapters" / f"{n}.json").write_text(json.dumps({"title": f"Parte {n}", "blocks": blocks}), encoding="utf-8")
        index_chapters.append({"n": n, "title": f"Parte {n}: Teste", "part": "", "pages": [0, 0],
                               "sections": [{"id": b["id"], "text": b["text"]} for b in blocks if b["t"] == "h2"]})
    index = {"slug": "teste", "title": "Detonado Pokémon Teste", "subtitle": "Sub", "console": "Console", "description": "d",
             "credit": "Crédito", "disclaimer": "Aviso", "license": "", "accent": "#336699", "cover": "cover.webp",
             "downloads": [], "chapters": index_chapters, "pdfPages": 0}
    (src / "index.json").write_text(json.dumps(index), encoding="utf-8")
    config = {"slug": "teste", "accent": "#336699", "cover_sprites": [], "credit": "Crédito", "_tmp": str(tmp_path / "build")}
    return config, public, tmp_path


@pytest.mark.parametrize("variant", ["a4", "compact"])
def test_builds_a_pdf_with_cover_toc_and_chapters(guide, variant):
    config, public, tmp = guide
    out = tmp / f"{variant}.pdf"
    make_pdf.Builder(config, variant, public).build(out)
    doc = pymupdf.open(out)
    assert doc.page_count >= 5
    size = make_pdf.VARIANTS[variant]
    assert round(doc[0].rect.width) == round(size["w"])
    # letter-spaced labels are extracted with spaces between letters, so compare without spaces
    squeeze = lambda value: value.replace(" ", "").replace("\n", "").lower()
    text = squeeze("\n".join(page.get_text() for page in doc))
    for expected in ("DETONADO", "Sumário", "Antes de começar", "CAPÍTULO 1", "Primeira Seção", "Brock usa:", "Geodude", "Nv. 14", "Prêmios"):
        assert squeeze(expected) in text, expected
    # the table of contents shows real page numbers (not 0)
    toc_text = next(page.get_text() for page in doc if "Sumário" in page.get_text())
    lines = [l.strip() for l in toc_text.splitlines() if l.strip()]
    numbers = [int(l) for l in lines if l.isdigit() and int(l) > 3]
    assert numbers and all(n >= 4 for n in numbers)
    titles = [t[1] for t in doc.get_toc() if t[0] == 1]
    assert titles == ["Sumário", "Antes de começar", "Parte 1: Teste", "Parte 2: Teste"]


def test_file_stem_and_helpers():
    import build_pdfs
    assert build_pdfs.file_stem("Detonado Pokémon Let's Go, Pikachu! e Let's Go, Eevee!") == "Detonado-Pokemon-Let-s-Go-Pikachu-e-Let-s-Go-Eevee"
    assert make_pdf.darker("#ffffff").startswith("#") and make_pdf.lighter("#000000", 1.0) == "#ffffff"
