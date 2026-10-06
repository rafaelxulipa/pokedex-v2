# Rotom Pokedex

Pokédex feita com React, TypeScript e Vite, usando a [PokéAPI](https://pokeapi.co/).

## Recursos

- Lista com busca (nome ou número), filtro por geração e por até 2 tipos, favoritos e modo shiny
- Detalhes: status, fraquezas, resistências, imunidades, habilidades e golpes com descrição, evoluções, formas alternativas
- Comparação de 2 a 4 Pokémon
- Montador de time (6 Pokémon) com análise de cobertura de tipos e link para compartilhar
- Jogo da memória (níveis, geração, modo shiny, recordes)
- Quiz "Quem é esse Pokémon?" com desafio do dia (mesmas perguntas para todos)
- Detonados completos (FireRed/LeafGreen e Brilliant Diamond/Shining Pearl) para ler online, com imagens, e PDF gratuito para download. Veja `scripts/README.md` para converter novos detonados
- 6 idiomas (pt, en, es, de, zh, ja) e tema claro/escuro

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm test        # testes unitários (vitest)
```

## SEO

- O app usa URLs limpas (`/detonados/fire-red-leaf-green/2`). Links antigos com `#/` são redirecionados.
- Cada página define título, descrição, canonical e tags de redes sociais (`components/Seo.tsx`).
- `npm run build` roda o Vite e depois `scripts/prerender.mjs`, que gera HTML estático com o texto dos
  detonados (capítulo a capítulo), `sitemap.xml` e usa `public/robots.txt`. O React assume a página quando carrega.
- Após o primeiro deploy, confira se `/detonados/<guia>/<n>` abre direto e se
  `https://pokedex.otaviorafael.com.br/sitemap.xml` responde. Depois, envie o sitemap no Google Search Console.

