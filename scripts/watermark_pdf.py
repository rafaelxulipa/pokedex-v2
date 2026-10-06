#!/usr/bin/env python3
"""
Adds a discreet diagonal text watermark (and optional footer line) to every page of a PDF.

Usage (needs `pymupdf`):
    python scripts/watermark_pdf.py <input.pdf> <output.pdf> [--text "pokedex.otaviorafael.com.br"] [--opacity 0.2]
                                    [--angle 35] [--size 0.085] [--footer "Texto do rodape"]

--size is the font size as a fraction of the page width (0.085 = 8.5%). Bookmarks (table of contents)
are kept. The watermark is drawn on top of the page content with low opacity.
"""
import argparse

import pymupdf


COLOR = (0.35, 0.35, 0.4)


def watermark(src: str, dst: str, text: str, opacity: float, angle: float, size: float, footer: str | None):
    doc = pymupdf.open(src)
    font = pymupdf.Font("hebo")  # built-in Helvetica Bold
    for page in doc:
        page.wrap_contents()  # isolate the original content so its transform/colour state is not inherited
        rect = page.rect
        font_size = rect.width * size
        center = pymupdf.Point(rect.width / 2, rect.height / 2)
        width = font.text_length(text, fontsize=font_size)
        # keep the text inside the page after rotation
        max_width = rect.width * 1.0
        if width > max_width:
            font_size *= max_width / width
            width = font.text_length(text, fontsize=font_size)

        page.insert_text(
            pymupdf.Point(center.x - width / 2, center.y + font_size / 3),
            text,
            fontname="hebo",
            fontsize=font_size,
            color=COLOR,
            fill_opacity=opacity,
            morph=(center, pymupdf.Matrix(angle)),
            overlay=True,
        )

        if footer:
            footer_size = 7
            footer_width = font.text_length(footer, fontsize=footer_size)
            page.insert_text(
                pymupdf.Point((rect.width - footer_width) / 2, rect.height - 14),
                footer,
                fontname="hebo",
                fontsize=footer_size,
                color=COLOR,
                fill_opacity=min(1.0, opacity * 3),
                overlay=True,
            )
    doc.save(dst, garbage=4, deflate=True, use_objstms=1)
    doc.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("src")
    parser.add_argument("dst")
    parser.add_argument("--text", default="pokedex.otaviorafael.com.br")
    parser.add_argument("--opacity", type=float, default=0.2)
    parser.add_argument("--angle", type=float, default=35)
    parser.add_argument("--size", type=float, default=0.085)
    parser.add_argument("--footer", default="Detonado gratuito - pokedex.otaviorafael.com.br")
    args = parser.parse_args()
    watermark(args.src, args.dst, args.text, args.opacity, args.angle, args.size, args.footer)
