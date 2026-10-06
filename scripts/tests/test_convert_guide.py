"""Tests for the PDF -> web converter. Run from the repo root:  .venv-guides/bin/python -m pytest scripts/tests -q"""
import io
import json

import pymupdf
import pytest
from PIL import Image

import convert_guide as cg


# --- pure helpers -------------------------------------------------------------------------------

def span(text, font="Lora"):
    return {"text": text, "font": font}


def test_despace_and_label_kind():
    assert cg.despace("D I C A") == "DICA"
    assert cg.despace("A T E N Ç Ã O") == "ATENÇÃO"
    assert cg.despace("Normal text") == "Normal text"
    assert cg.label_kind("D I C A") == "tip"
    assert cg.label_kind("C U R I O S I D A D E") == "trivia"
    assert cg.label_kind("Qualquer coisa") is None


def test_norm():
    assert cg.norm("  Olá   Mundo‐ ") == "olá mundo-"


def test_runs_join_soft_hyphen_without_space():
    runs = cg.runs_from_spans([[span("a pa‐")], [span("lavra quebrada.")]])
    assert "".join(r["t"] for r in runs) == "a palavra quebrada."


def test_runs_keep_real_hyphen_and_join_without_space():
    runs = cg.runs_from_spans([[span("super-")], [span("efetivo")]])
    assert "".join(r["t"] for r in runs) == "super-efetivo"


def test_runs_add_space_between_lines_and_keep_bold_italic():
    runs = cg.runs_from_spans([[span("Olá "), span("mundo", "Lora-Bold")], [span("de novo", "Lora-Italic")]])
    assert [r["t"] for r in runs] == ["Olá ", "mundo ", "de novo"]
    assert runs[1].get("b") == 1 and runs[2].get("i") == 1


# --- end to end with a synthetic PDF ----------------------------------------------------------------

def color(hex_value):
    return tuple(int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4))


def make_pdf(path):
    doc = pymupdf.open()
    page = doc.new_page(width=595.28, height=841.89)
    ink = color("1e1f24")
    page.insert_text((51, 100), "C A P I T U L O 1", fontname="cobo", fontsize=8.6, color=color("c8102e"))
    page.insert_text((51, 125), "Capítulo Um", fontname="cobo", fontsize=19, color=ink)
    page.insert_text((51, 180), "Seção A", fontname="cobo", fontsize=14.4, color=color("c8102e"))
    page.insert_text((51, 210), "Este é um texto de exemplo com uma pa-", fontname="helv", fontsize=10.8, color=ink)
    page.insert_text((51, 226), "lavra quebrada na linha.", fontname="helv", fontsize=10.8, color=ink)
    # call-out box with its label
    page.draw_rect(pymupdf.Rect(51, 260, 511, 306), fill=color("eef5ee"), color=None)
    page.insert_text((65, 278), "D I C A", fontname="cobo", fontsize=7.6, color=color("3c8a2c"))
    page.insert_text((65, 294), "Salve o jogo antes da luta.", fontname="helv", fontsize=10.0, color=ink)
    # picture with caption
    buffer = io.BytesIO()
    Image.linear_gradient("L").resize((300, 200)).convert("RGB").save(buffer, "PNG")
    page.insert_image(pymupdf.Rect(100, 340, 400, 540), stream=buffer.getvalue())
    page.insert_text((200, 560), "Legenda da imagem de teste", fontname="cour", fontsize=7.8, color=(107 / 255, 110 / 255, 120 / 255))
    doc.set_toc([[1, "Capítulo Um", 1], [2, "Seção A", 1]])
    doc.save(path)


@pytest.fixture()
def converted(tmp_path):
    pdf_dir = tmp_path / "pdfs"
    pdf_dir.mkdir()
    make_pdf(pdf_dir / "teste.pdf")
    config = {
        "slug": "teste", "title": "Guia de Teste", "subtitle": "Sub", "console": "Console", "description": "Descrição",
        "accent": "#123456", "credit": "Crédito", "disclaimer": "Aviso", "license": "Licença", "skip_chapters": [],
        "fonts": {"body": "Helvetica", "ui": "Courier", "h2": ["Courier-Bold", 14.4], "h3": ["Courier-Bold", 11.0]},
        "pdfs": [{"file": "teste.pdf", "label": "PDF", "hint": "dica"}],
    }
    public = tmp_path / "public"
    converter = cg.Converter(str(pdf_dir), "teste", config, public=public)
    converter.run()
    yield public / "teste", converter, config, pdf_dir, public
    # restore the default fonts for the other tests
    cg.BODY_FONT, cg.UI_FONT = "Lora", "Poppins"


def test_converts_structure(converted):
    out, converter, *_ = converted
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    assert index["title"] == "Guia de Teste"
    assert [c["title"] for c in index["chapters"]] == ["Capítulo Um"]
    assert [s["text"] for s in index["chapters"][0]["sections"]] == ["Seção A"]
    assert index["downloads"][0]["pages"] == 1
    assert (out / "cover.webp").exists() and (out / "pdf" / "teste.pdf").exists()
    assert converter.unknown == {}

    blocks = json.loads((out / "chapters" / "1.json").read_text(encoding="utf-8"))["blocks"]
    assert [b["t"] for b in blocks] == ["h2", "p", "callout", "img"]
    assert blocks[0]["text"] == "Seção A" and blocks[0]["id"] == "secao-a"
    # the hyphen at the end of the line is kept and the word is joined
    assert "".join(r["t"] for r in blocks[1]["runs"]) == "Este é um texto de exemplo com uma pa-lavra quebrada na linha."
    assert blocks[2]["kind"] == "tip"
    assert "".join(r["t"] for r in blocks[2]["paras"][0]) == "Salve o jogo antes da luta."
    assert blocks[3]["caption"] == "Legenda da imagem de teste"
    assert (out / blocks[3]["src"]).exists()


def test_catalog_and_search_index(converted):
    out, _converter, _config, _pdf_dir, public = converted
    catalog = json.loads((public / "guides.json").read_text(encoding="utf-8"))
    assert [g["slug"] for g in catalog] == ["teste"] and catalog[0]["chapters"] == 1
    search = json.loads((out / "search.json").read_text(encoding="utf-8"))
    assert search[0]["st"] == "Seção A" and "Salve o jogo" in search[0]["x"]


def test_keep_pdfs_does_not_overwrite_the_existing_file(converted):
    out, _converter, config, pdf_dir, public = converted
    custom = out / "pdf" / "teste.pdf"
    doc = pymupdf.open(custom)
    doc[0].insert_text((51, 800), "marca", fontsize=8)
    marked = custom.with_name("marcado.pdf")
    doc.save(marked)
    doc.close()
    marked.replace(custom)
    marked_size = custom.stat().st_size
    cg.Converter(str(pdf_dir), "teste", config, public=public, keep_pdfs=True).run()
    assert custom.stat().st_size == marked_size
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    assert index["downloads"][0]["bytes"] == marked_size
