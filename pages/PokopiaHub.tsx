import React from 'react';
import { Link } from 'react-router-dom';
import { artworkUrl } from '../utils/pokemon';

interface Tool {
  to?: string;
  title: string;
  description: string;
  tag: string;
  mon: number; // Pokédex number of the Pokémon that pops out of the card
  accent: string; // tailwind text color for the tag
}

const TOOLS: Tool[] = [
  { to: '/pokopia/habitats', title: 'Habitats', description: 'Os 252 habitats com os itens para montar e os Pokémon que cada um atrai, incluindo Bubbly Basin e eventos.', tag: 'Ferramenta', mon: 132, accent: 'text-green-600 dark:text-green-400' },
  { to: '/pokopia/pokemon', title: 'Lista de Pokémon', description: 'Todos os Pokémon encontrados nos habitats e onde atraí-los.', tag: 'Ferramenta', mon: 25, accent: 'text-green-600 dark:text-green-400' },
  { to: '/detonados/pokopia', title: 'Detonado', description: 'Passo a passo em português: cinco cidades, desafio de recrutamento e pós-game.', tag: 'Guia', mon: 1, accent: 'text-orange-500' },
  { title: 'Calculadora de moradia', description: 'Agrupa Pokémon com gostos em comum para a mesma casa.', tag: 'Em breve', mon: 7, accent: 'text-gray-400' },
  { title: 'Colegas de casa', description: 'Os colegas mais compatíveis para cada Pokémon.', tag: 'Em breve', mon: 4, accent: 'text-gray-400' },
  { title: 'Onde encontrar', description: 'Local e horário para atrair cada Pokémon.', tag: 'Em breve', mon: 465, accent: 'text-gray-400' },
  { title: 'Receitas de culinária', description: 'Ingredientes, sabor e o movimento que cada prato fortalece.', tag: 'Em breve', mon: 820, accent: 'text-gray-400' },
  { title: 'Receitas de craft', description: 'Materiais e onde conseguir cada receita.', tag: 'Em breve', mon: 534, accent: 'text-gray-400' },
  { title: 'Mapa interativo', description: 'Receitas, bancadas e itens de cada área.', tag: 'Em breve', mon: 52, accent: 'text-gray-400' },
];

const Card: React.FC<{ tool: Tool }> = ({ tool }) => {
  const active = !!tool.to;
  const body = (
    <>
      <img
        src={artworkUrl(tool.mon)}
        alt=""
        loading="lazy"
        width={112}
        height={112}
        className={`absolute -top-12 right-3 h-28 w-28 object-contain drop-shadow-lg transition-transform duration-300 ${active ? 'group-hover:-translate-y-2 group-hover:scale-110' : 'opacity-60 grayscale'}`}
      />
      <div className="px-5 pt-16 pb-5">
        <h2 className="text-lg font-extrabold leading-snug text-gray-900 dark:text-white">{tool.title}</h2>
        <p className={`mt-1 text-sm font-bold ${tool.accent}`}>{tool.tag}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{tool.description}</p>
      </div>
    </>
  );
  const base = 'group relative block rounded-2xl border bg-white dark:bg-dark-card';
  return active ? (
    <Link to={tool.to!} className={`${base} border-gray-200 dark:border-gray-800 shadow-xs hover:border-green-500 hover:shadow-lg hover:-translate-y-1 transition-all`}>
      {body}
    </Link>
  ) : (
    <div className={`${base} border-dashed border-gray-300 dark:border-gray-700`}>{body}</div>
  );
};

const PokopiaHub: React.FC = () => (
  <div>
    <div className="relative overflow-hidden bg-linear-to-br from-green-600 via-emerald-600 to-teal-700">
      <img
        src={artworkUrl(150)}
        alt=""
        className="pointer-events-none absolute -right-4 -bottom-6 h-64 w-64 sm:h-80 sm:w-80 object-contain opacity-25 mix-blend-luminosity"
      />
      <div className="relative container mx-auto px-4 py-12 max-w-6xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-100/80">Início / Pokopia</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
          Pokopia <span className="text-green-200">Tools</span>
        </h1>
        <p className="mt-3 max-w-xl text-green-50/90">Habitats, Pokémon e detonado em português para reconstruir as cidades de Pokémon Pokopia.</p>
      </div>
    </div>

    <div className="container mx-auto px-4 pt-20 pb-10 max-w-6xl">
      <div className="grid gap-x-5 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Card key={tool.title} tool={tool} />
        ))}
      </div>

      <p className="mt-16 text-xs text-center text-gray-400">
        Dados de habitats reunidos de guias da comunidade (
        <a className="underline" href="https://pokopiaguide.com/habitat" target="_blank" rel="noopener noreferrer">Pokopia Guide</a>,{' '}
        <a className="underline" href="https://serebii.net/pokemonpokopia/habitats.shtml" target="_blank" rel="noopener noreferrer">Serebii</a>,{' '}
        <a className="underline" href="https://www.pockettactics.com/pokemon-pokopia/habitats" target="_blank" rel="noopener noreferrer">Pocket Tactics</a> e{' '}
        <a className="underline" href="https://www.poketools.com/pokopia-habitats" target="_blank" rel="noopener noreferrer">PokeTools</a>
        ). Alguns valores podem variar conforme a versão do jogo.
      </p>
    </div>
  </div>
);

export default PokopiaHub;
