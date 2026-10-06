# Conversor de detonados (PDF para web)

O script `convert_guide.py` transforma um detonado em PDF (gerado com WeasyPrint, mesmo
padrão visual dos guias atuais) em conteúdo para a página `/detonados`:

```
public/detonados/<slug>/index.json         metadados, capítulos e downloads
public/detonados/<slug>/chapters/<n>.json  conteúdo de cada capítulo
public/detonados/<slug>/img/*.webp         mapas, capturas de tela e cartões
public/detonados/<slug>/cover.webp         capa
public/detonados/<slug>/pdf/*.pdf          PDFs para download gratuito
public/detonados/guides.json               catálogo (atualizado automaticamente)
```

Textos, títulos e avisos (Dica, Atenção, Recompensa, Curiosidade, Nota) viram blocos
estruturados. Imagens viram figuras. Cartões de treinadores e tabelas são recortados como
imagem (o texto fica no `alt`), para manter o layout original.

## Requisitos

```bash
python3 -m venv .venv-guides
.venv-guides/bin/pip install -r scripts/requirements.txt
```

## Converter um detonado

```bash
.venv-guides/bin/python scripts/convert_guide.py "/pasta/com/os/pdfs" scripts/guides/<nome>.json
```

Os guias atuais:

```bash
.venv-guides/bin/python scripts/convert_guide.py "/home/otavio/Documentos/Pokemon detonados" scripts/guides/frlg.json
.venv-guides/bin/python scripts/convert_guide.py "/home/otavio/Documentos/Pokemon detonados" scripts/guides/bdsp.json
```

## Adicionar um novo detonado

1. Copie `scripts/guides/frlg.json` para `scripts/guides/<novo>.json` e ajuste:
   - `slug` (usado na URL, ex.: `emerald`), `title`, `subtitle`, `console`, `description`, `accent` (cor).
   - `credit`, `disclaimer` e `license` (rodapé da página).
   - `pdfs`: lista de arquivos. **O primeiro é o que será convertido** (use o A4, que tem
     as páginas mais largas); todos ficam disponíveis para download.
   - `fonts`: assinatura (fonte, tamanho) dos títulos de seção (`h2`) e subseção (`h3`).
     Se o PDF novo usar outros tamanhos, descubra com PyMuPDF (`page.get_text("dict")`).
2. O PDF precisa ter **marcadores (sumário em níveis)**: o nível 1 vira capítulo, e os
   níveis 2 e 3 ajudam a identificar títulos. O capítulo "Sumário" é ignorado (`skip_chapters`).
3. Rode o comando acima. O script imprime os estilos de texto que não soube tratar
   (`UNHANDLED TEXT STYLES`). Confira essas páginas no navegador e, se preciso, ajuste as
   regras em `convert_guide.py` (`is_cardish`, `containers`, `page_blocks`).
4. Abra `http://localhost:3000/#/detonados` e revise os capítulos lado a lado com o PDF.

## Observações

- As imagens têm nome por hash (sem duplicatas). Rodar de novo não apaga imagens antigas que
  deixaram de ser usadas: para uma conversão limpa, apague `public/detonados/<slug>` antes.
- Os arquivos gerados somam dezenas de MB (os PDFs sozinhos passam de 55 MB). Se o
  repositório ficar pesado, hospede os PDFs fora do git e ajuste `downloads` no `index.json`.
