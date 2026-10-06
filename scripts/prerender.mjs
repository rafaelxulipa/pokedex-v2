// Runs after `vite build`. Writes static HTML (with real text and meta tags) for the pages that
// should be found by search engines and link previews, plus sitemap.xml.
//   dist/detonados/index.html
//   dist/detonados/<slug>/index.html
//   dist/detonados/<slug>/<n>/index.html
// The React app replaces this content as soon as it loads, so users see the normal interface.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const SITE_URL = 'https://pokedex.otaviorafael.com.br';
const SITE_NAME = 'Rotom Pokedex';
const MAX_POKEMON_ID = 1025;

const template = readFileSync(join(dist, 'index.html'), 'utf-8');

const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const runsHtml = (runs) =>
  runs
    .map((r) => {
      let html = esc(r.t);
      if (r.b) html = `<strong>${html}</strong>`;
      if (r.i) html = `<em>${html}</em>`;
      return html;
    })
    .join('');

const plain = (runs) => runs.map((r) => r.t).join('');

const CALLOUT_LABELS = { tip: 'Dica', warning: 'Atenção', reward: 'Recompensa', trivia: 'Curiosidade', note: 'Nota' };

const blocksHtml = (slug, blocks) =>
  blocks
    .map((b) => {
      const img = (i) => `<img src="/detonados/${slug}/${esc(i.src)}" alt="${esc(i.alt || b.caption || '')}" width="${i.w}" height="${i.h}" loading="lazy">`;
      switch (b.t) {
        case 'h2':
          return `<h2 id="${esc(b.id)}">${esc(b.text)}</h2>${b.sub ? `<p>${esc(b.sub)}</p>` : ''}`;
        case 'h3':
          return `<h3 id="${esc(b.id)}">${esc(b.text)}</h3>`;
        case 'p':
          return `<p>${runsHtml(b.runs)}</p>`;
        case 'callout':
          return `<aside><strong>${CALLOUT_LABELS[b.kind] ?? 'Nota'}</strong>${b.paras.map((p) => `<p>${runsHtml(p)}</p>`).join('')}</aside>`;
        case 'img':
        case 'card':
          return `<figure>${img(b)}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
        case 'gallery':
          return `<figure>${b.imgs.map(img).join('')}${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
        case 'team':
        case 'teams': {
          const teams = b.t === 'teams' ? b.teams : [b];
          return teams
            .map((team) => `<p><strong>${esc(team.trainer)} usa:</strong> ${team.members.map((m) => `${esc(m.name)} Nv. ${m.lv}`).join(', ')}</p>`)
            .join('');
        }
        case 'table':
          return `<table>${b.rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c.t)}</td>`).join('')}</tr>`).join('')}</table>`;
        case 'caption':
          return `<p>${esc(b.text)}</p>`;
        default:
          return '';
      }
    })
    .join('\n');

const truncate = (text, max = 155) => (text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text);

function page({ title, description, path, image = '/pokeball.png', type = 'website', body }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = `${SITE_URL}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;
  const meta = [
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:title" content="${esc(fullTitle)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:image" content="${imageUrl}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(fullTitle)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${imageUrl}">`,
  ].join('\n    ');

  let html = template.replace(/<title>.*?<\/title>/s, `<title>${esc(fullTitle)}</title>`);
  html = html.replace(/\s*<meta name="description"[^>]*>/g, '');
  html = html.replace('</head>', `    ${meta}\n  </head>`);
  // The text is for search engines and screen readers; sighted users get the React app, so the static copy is
  // kept out of sight (see the [data-prerender] rule in index.html) to avoid a flash of unstyled content.
  html = html.replace('<div id="root"></div>', `<div id="root">${body.replace('<main>', '<main data-prerender>')}</div>`);
  return html;
}

function write(path, html) {
  const dir = join(dist, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html, 'utf-8');
}

const urls = ['/', '/detonados', '/team', '/quiz', '/memory-game'];
const catalogPath = join(root, 'public', 'detonados', 'guides.json');
const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf-8')) : [];

// /detonados
write(
  'detonados',
  page({
    title: 'Detonados de Pokémon',
    description: 'Detonados completos de Pokémon em português, passo a passo, com mapas e imagens. Leia online ou baixe o PDF gratuitamente.',
    path: '/detonados',
    body: `<main><h1>Detonados de Pokémon</h1><ul>${catalog
      .map((g) => `<li><a href="/detonados/${g.slug}">${esc(g.title)}</a> - ${esc(g.description)}</li>`)
      .join('')}</ul></main>`,
  })
);

let chapterPages = 0;
for (const guide of catalog) {
  const index = JSON.parse(readFileSync(join(root, 'public', 'detonados', guide.slug, 'index.json'), 'utf-8'));
  const chapterLinks = `<nav><h2>Capítulos</h2><ol>${index.chapters
    .map((c) => `<li><a href="/detonados/${guide.slug}/${c.n}">${esc(c.title)}</a></li>`)
    .join('')}</ol></nav>`;
  const cover = `/detonados/${guide.slug}/${index.cover}`;

  urls.push(`/detonados/${guide.slug}`);
  write(
    `detonados/${guide.slug}`,
    page({
      title: index.title,
      description: index.description,
      path: `/detonados/${guide.slug}`,
      image: cover,
      body: `<main><h1>${esc(index.title)}</h1><p>${esc(index.subtitle)}</p><p>${esc(index.description)}</p>${chapterLinks}</main>`,
    })
  );

  for (const chapter of index.chapters) {
    const data = JSON.parse(readFileSync(join(root, 'public', 'detonados', guide.slug, 'chapters', `${chapter.n}.json`), 'utf-8'));
    const firstParagraph = data.blocks.find((b) => b.t === 'p');
    const description = truncate(firstParagraph ? plain(firstParagraph.runs) : index.description);
    urls.push(`/detonados/${guide.slug}/${chapter.n}`);
    write(
      `detonados/${guide.slug}/${chapter.n}`,
      page({
        title: `${chapter.title} - ${index.title}`,
        description,
        path: `/detonados/${guide.slug}/${chapter.n}`,
        image: cover,
        type: 'article',
        body: `<main><article><p><a href="/detonados/${guide.slug}">${esc(index.title)}</a></p><h1>${esc(chapter.title)}</h1>${blocksHtml(guide.slug, data.blocks)}</article>${chapterLinks}</main>`,
      })
    );
    chapterPages++;
  }
}

// Simple pages: only the meta tags and a short text are needed
const simple = {
  '': { title: '', description: 'Pokédex com todos os Pokémon: busca por nome ou número, filtros por tipo e geração, status, evoluções, fraquezas, comparação, time, quiz e detonados em português.', h1: 'Rotom Pokedex' },
  team: { title: 'Montador de Time Pokémon', description: 'Monte um time de até 6 Pokémon e veja as fraquezas e a cobertura de tipos. Compartilhe o time por link.', h1: 'Montador de Time Pokémon' },
  quiz: { title: 'Quiz: Quem é esse Pokémon?', description: 'Adivinhe o Pokémon pela silhueta. Modo livre por geração e desafio do dia com as mesmas perguntas para todos.', h1: 'Quiz: Quem é esse Pokémon?' },
  'memory-game': { title: 'Jogo da Memória Pokémon', description: 'Jogo da memória com Pokémon: três níveis, escolha de geração, modo shiny e recordes.', h1: 'Jogo da Memória Pokémon' },
};
for (const [path, p] of Object.entries(simple)) {
  const html = page({ title: p.title, description: p.description, path: `/${path}`, body: `<main><h1>${esc(p.h1)}</h1><p>${esc(p.description)}</p></main>` });
  if (path === '') writeFileSync(join(dist, 'index.html'), html, 'utf-8');
  else write(path, html);
}

// sitemap.xml and robots.txt
for (let id = 1; id <= MAX_POKEMON_ID; id++) urls.push(`/pokemon/${id}`);
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n')}\n</urlset>\n`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap, 'utf-8');

console.log(`prerender: ${chapterPages} chapters, ${catalog.length} guides, ${urls.length} urls in sitemap`);
