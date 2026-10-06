#!/usr/bin/env python3
"""
Builds public/detonados/<slug>/search.json from the converted chapters (one entry per section).
Runs automatically at the end of convert_guide.py, and can be run alone (no PDF needed):

    python scripts/build_search_index.py <slug> [<slug> ...]
    python scripts/build_search_index.py --all
"""
import json
import re
import sys
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public" / "detonados"


def runs_text(runs):
    return "".join(r["t"] for r in runs)


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def block_text(block):
    kind = block["t"]
    if kind == "p":
        return runs_text(block["runs"])
    if kind == "h3":
        return block["text"]
    if kind == "callout":
        return " ".join(runs_text(p) for p in block["paras"])
    if kind == "card":
        return block.get("alt", "")
    if kind == "gallery":
        return " ".join(i.get("alt", "") for i in block["imgs"] if i.get("card")) + " " + block.get("caption", "")
    if kind == "img":
        return block.get("caption", "")
    if kind == "caption":
        return block["text"]
    return ""


def build(slug):
    guide_dir = PUBLIC / slug
    index = json.loads((guide_dir / "index.json").read_text(encoding="utf-8"))
    entries = []
    for chapter in index["chapters"]:
        data = json.loads((guide_dir / "chapters" / f"{chapter['n']}.json").read_text(encoding="utf-8"))
        current = {"c": chapter["n"], "ct": chapter["title"], "s": "", "st": "", "parts": []}

        def flush():
            text = clean(" ".join(p for p in current["parts"] if p))
            if text:
                entries.append({"c": current["c"], "ct": current["ct"], "s": current["s"], "st": current["st"], "x": text})

        for block in data["blocks"]:
            if block["t"] == "h2":
                flush()
                current = {"c": chapter["n"], "ct": chapter["title"], "s": block["id"], "st": block["text"],
                           "parts": [block["text"], block.get("sub", "")]}
            else:
                current["parts"].append(block_text(block))
        flush()
    (guide_dir / "search.json").write_text(json.dumps(entries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"search index for {slug}: {len(entries)} sections, {(guide_dir / 'search.json').stat().st_size // 1024} KB")


if __name__ == "__main__":
    args = sys.argv[1:]
    slugs = [p.name for p in PUBLIC.iterdir() if (p / "index.json").exists()] if args == ["--all"] else args
    for slug in slugs:
        build(slug)
