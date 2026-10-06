"""Tests for the pokemythology.net importer (offline, with a small saved-page fixture)."""
import json

import pytest
from PIL import Image

import import_pokemythology as imp

HTML = """
<html><body><article><div class="entry-content">
<p><em><u>PALLET TOWN</u></em><br/> Assim que o jogo começar, escolha o <b>idioma</b>. Segunda linha<br/>com quebra.</p>
<p align="center"><img src="./page_files/shot1.png"/><img src="./page_files/shot2.png"/><br/>
<img src="./page_files/shot1.png"/><img src="./page_files/shot2.png"/></p>
<div class="code-block code-block-1"><ins class="adsbygoogle"></ins></div>
<p><img src="./page_files/vs1.png"/>Hop usa:<br/>
<img src="https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/831.png?w=640&amp;ssl=1"/>Wooloo lv.3<br/>
<img src="https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/810.png?w=640&amp;ssl=1"/><img src="https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/813.png?w=640&amp;ssl=1"/>Grookey/Scorbunny lv.5 (se escolheu o inicial)</p>
<p><em><u>DIGLETT’S CAVE – RANK A</u></em><br/>Texto da segunda seção.</p>
<table><tr><td style="border-width:10px">Caixa de dica com <strong>destaque</strong>.</td></tr></table>
<table><tr><td><strong>Níveis</strong></td><td><strong>Prêmios</strong></td></tr><tr><td rowspan="2">Beginner</td><td>Nenhum</td></tr><tr><td>3 BP</td></tr></table>
<table><tr>
<td><img src="https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/810.png?w=640"/><br/>Se você começou com Grookey<br/><img src="./page_files/vs1.png"/>Leon usa:<br/><img src="https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/681.png?w=640"/>Aegislash lv.62</td>
<td><img src="https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/813.png?w=640"/><br/>Se você começou com Scorbunny<br/><img src="./page_files/vs1.png"/>Leon usa:<br/><img src="https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/887.png?w=640"/>Dragapult lv.62</td>
</tr></table>
</div></article></body></html>
"""


@pytest.fixture()
def imported(tmp_path):
    assets = tmp_path / "page_files"
    assets.mkdir()
    Image.new("RGB", (600, 340), (30, 120, 60)).save(assets / "shot1.png")
    Image.new("RGB", (600, 340), (120, 30, 60)).save(assets / "shot2.png")
    Image.new("RGBA", (100, 100), (255, 0, 0, 255)).save(assets / "vs1.png")
    source = tmp_path / "page.html"
    source.write_text(HTML, encoding="utf-8")
    config = {
        "slug": "teste", "title": "Detonado Pokémon Teste", "subtitle": "Sub", "console": "Console", "description": "Desc",
        "accent": "#336699", "credit": "Crédito", "disclaimer": "Aviso", "license": "", "downloads": [],
        "source": str(source), "assets_dir": str(assets),
    }
    public = tmp_path / "public"
    imp.Importer(config, offline=True, public=public).run()
    out = public / "teste"
    chapters = json.loads((out / "chapters" / "1.json").read_text(encoding="utf-8"))["blocks"]
    return out, chapters, public


def test_title_case():
    assert imp.title_case("DIGLETT’S CAVE") == "Diglett’s Cave"
    assert imp.title_case("O ENCONTRO COM A TEAM STAR") == "O Encontro com a Team Star"
    assert imp.title_case("MAIN MISSION 26 – AN INVITATION FROM THE SBC") == "Main Mission 26 – An Invitation From The SBC"
    assert imp.title_case("REACHING RANK A") == "Reaching Rank A"
    assert imp.title_case("URBAIN/TAUNIE ESTAVA") == "Urbain/Taunie Estava"


def test_classify():
    assert imp.classify("https://i0.wp.com/www.serebii.net/swordshield/pokemon/small/810.png?w=640") == ("sprite", 810)
    assert imp.classify("https://i0.wp.com/serebii.net/scarletviolet/pokemon/small/745-a.png") == ("sprite", 745)
    assert imp.classify("./Guia_files/460.png") == ("sprite", 460)
    assert imp.classify("./Guia_files/talk04.png") == ("image", "talk04.png")
    assert imp.classify("/conteudo/imgs/screenlgpe/001.jpg") == ("image", "https://pokemythology.net/conteudo/imgs/screenlgpe/001.jpg")
    assert imp.classify("https://i0.wp.com/pokemythology.net/conteudo/imgs/screensv/vs05.png?w=640") == ("image", "https://pokemythology.net/conteudo/imgs/screensv/vs05.png")


def test_sections_paragraphs_and_galleries(imported):
    out, blocks, _public = imported
    types = [b["t"] for b in blocks]
    assert types[:3] == ["h2", "p", "p"] or types[:4] == ["h2", "p", "p", "gallery"]
    assert blocks[0] == {"t": "h2", "id": "pallet-town", "text": "Pallet Town"}
    assert "".join(r["t"] for r in blocks[1]["runs"]).startswith("Assim que o jogo começar")
    assert {"t": "idioma", "b": 1} in [dict(r, t=r["t"]) for r in blocks[1]["runs"]] or any(r.get("b") for r in blocks[1]["runs"])
    galleries = [b for b in blocks if b["t"] == "gallery"]
    assert len(galleries) == 2 and all(len(g["imgs"]) == 2 for g in galleries)
    assert all((out / i["src"]).exists() for g in galleries for i in g["imgs"])
    # the advertisement block is ignored
    assert "adsbygoogle" not in json.dumps(blocks)


def test_team_blocks(imported):
    _out, blocks, _public = imported
    teams = [b for b in blocks if b["t"] == "team"]
    assert len(teams) == 1
    team = teams[0]
    assert team["trainer"] == "Hop" and "portrait" in team
    assert team["members"][0] == {"name": "Wooloo", "lv": 3, "id": 831}
    # "A/B lv.5 (note)" becomes two members that share the level; the note goes on the last one
    assert [m["name"] for m in team["members"][1:]] == ["Grookey", "Scorbunny"]
    assert team["members"][1]["id"] == 810 and team["members"][2]["id"] == 813
    assert team["members"][2]["note"] == "(se escolheu o inicial)"


def test_tables(imported):
    _out, blocks, _public = imported
    assert any(b["t"] == "h2" and b["id"] == imp.slugify("Diglett’s Cave – Rank A") for b in blocks)
    note = next(b for b in blocks if b["t"] == "callout")
    assert note["kind"] == "note" and "destaque" in "".join(r["t"] for r in note["paras"][0])
    table = next(b for b in blocks if b["t"] == "table")
    assert table["rows"][0][0] == {"t": "Níveis", "b": 1}
    assert table["rows"][1][0]["rs"] == 2
    teams = next(b for b in blocks if b["t"] == "teams")
    assert [t["label"] for t in teams["teams"]] == ["Se você começou com Grookey", "Se você começou com Scorbunny"]
    assert teams["teams"][0]["starter"] == 810 and teams["teams"][1]["members"][0]["name"] == "Dragapult"


def test_index_catalog_and_search(imported):
    out, _blocks, public = imported
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    assert index["downloads"] == [] and index["pdfPages"] == 0 and (out / "cover.webp").exists()
    assert [s["text"] for s in index["chapters"][0]["sections"]] == ["Pallet Town", "Diglett’s Cave – Rank A"]
    catalog = json.loads((public / "guides.json").read_text(encoding="utf-8"))
    assert catalog[0]["slug"] == "teste" and catalog[0]["pdfPages"] == 0
    search = json.loads((out / "search.json").read_text(encoding="utf-8"))
    assert any("Hop usa" in e["x"] and "Wooloo" in e["x"] for e in search)
