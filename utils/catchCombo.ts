import type { LetsGoLang } from './letsGo';

// Numbers from Serebii.net (Let's Go Catch Combos). Each row: combo range and its values.
export interface ComboRow {
  combo: string;
  values: string[];
}

export const CATCH_COMBO_TABLES = {
  sameSpecies: [
    { combo: '1-5', values: ['5%'] },
    { combo: '6-10', values: ['15%'] },
    { combo: '11-20', values: ['30%'] },
    { combo: '21-30', values: ['40%'] },
    { combo: '31+', values: ['50%'] },
  ],
  maxIvs: [
    { combo: '0-5', values: ['0'] },
    { combo: '6-10', values: ['1'] },
    { combo: '11-20', values: ['2'] },
    { combo: '21-30', values: ['3'] },
    { combo: '31+', values: ['4'] },
  ],
  // normal, with Lure, with Shiny Charm, with both
  shiny: [
    { combo: '0-10', values: ['1/4096', '1/2048', '1/1365.3', '1/1024'] },
    { combo: '11-20', values: ['1/1024', '1/819.2', '1/682.6', '1/585.1'] },
    { combo: '21-30', values: ['1/512', '1/455.1', '1/409.6', '1/372.4'] },
    { combo: '31+', values: ['1/341.3', '1/315.1', '1/292.6', '1/273.1'] },
  ],
  rareSpawn: [
    { combo: '0-1', values: ['0.5%'] },
    { combo: '2-5', values: ['0.75%'] },
    { combo: '6-10', values: ['1%'] },
    { combo: '11+', values: ['50%'] },
  ],
} satisfies Record<string, ComboRow[]>;

export const CATCH_COMBO_TEXT = {
  en: {
    title: 'Catch Combo',
    seoTitle: "Catch Combo in Let's Go Pikachu & Eevee",
    seoDescription: "How the Catch Combo works in Pokémon Let's Go: what keeps and breaks it, and the bonuses for IVs, shiny rate, rare spawns, candy and experience.",
    back: "Back to the Let's Go Pokédex",
    intro: "The Catch Combo is exclusive to Pokémon Let's Go. Every time you catch the same species in a row, your combo grows, and a long combo brings better Pokémon and rewards.",
    howTitle: 'How it works',
    how: [
      'Catch the same species again and again. The combo goes up with each capture.',
      'Meeting more of that species and running away does not break the combo.',
      'Leaving the route to buy Poké Balls, or coming back later, keeps the streak.',
    ],
    breaksTitle: 'What breaks the combo',
    breaks: [
      'A Pokémon runs away from you.',
      'You catch a Pokémon of a different species.',
      'You save and quit the game (suspending the game is fine).',
    ],
    cols: { combo: 'Combo', sameSpecies: 'Same species', maxIvs: 'Guaranteed max IVs', normal: 'Normal', lure: 'With Lure', charm: 'Shiny Charm', both: 'Charm + Lure', chance: 'Chance' },
    sections: {
      sameSpecies: { title: 'Same species spawns', text: 'The higher the combo, the more likely the next Pokémon to appear is of the same species.' },
      maxIvs: { title: 'IVs', text: 'A long combo guarantees some perfect IVs (the stats are random). It only counts for the species of the combo, and there is no breeding in Let\'s Go, so this is the best way to get strong Pokémon.' },
      shiny: { title: 'Shiny Pokémon', text: 'The shiny rate rises with the combo. It only applies to the next spawn of the species, so keep the combo going.' },
      rareSpawn: { title: 'Rare spawns', text: 'Pokémon that are not in the route list, like Chansey, Lapras or a flying Charizard, show up much more often in a combo. You can keep the combo and go to another area, for example chain Caterpie in Viridian Forest and then head to Route 19 to look for Lapras. The legendary birds can also appear this way (base chance of 1 in 2000, with two tries when you use a Lure).' },
    },
    rewardsTitle: 'Items and experience',
    rewards: [
      'Captures in a combo give a better chance of Candy, mostly Candy L, Candy XL and the Candy of that species. With combos above 100 you can collect hundreds of them.',
      'Experience from captures gets a bonus: x1.1 at the start, x1.5 from combo 11, then +0.5 for every 10 more.',
    ],
    source: 'Source: Serebii.net. Values may change if the game is updated.',
  },
  pt: {
    title: 'Catch Combo',
    seoTitle: "Catch Combo em Let's Go Pikachu e Eevee",
    seoDescription: "Como funciona o Catch Combo em Pokémon Let's Go: o que mantém e o que quebra, e os bônus de IVs, shiny, spawns raros, Candy e experiência.",
    back: "Voltar para a Pokédex de Let's Go",
    intro: "O Catch Combo é exclusivo de Pokémon Let's Go. Cada vez que você captura a mesma espécie em sequência, o combo cresce, e um combo alto traz Pokémon melhores e mais recompensas.",
    howTitle: 'Como funciona',
    how: [
      'Capture a mesma espécie várias vezes seguidas. O combo sobe a cada captura.',
      'Encontrar mais Pokémon dessa espécie e fugir da batalha não quebra o combo.',
      'Sair da rota para comprar Poké Bolas, ou voltar mais tarde, mantém a sequência.',
    ],
    breaksTitle: 'O que quebra o combo',
    breaks: [
      'Um Pokémon fugir de você.',
      'Capturar um Pokémon de outra espécie.',
      'Salvar e sair do jogo (suspender o jogo não quebra).',
    ],
    cols: { combo: 'Combo', sameSpecies: 'Mesma espécie', maxIvs: 'IVs máximos garantidos', normal: 'Normal', lure: 'Com Lure', charm: 'Shiny Charm', both: 'Charm + Lure', chance: 'Chance' },
    sections: {
      sameSpecies: { title: 'Aparição da mesma espécie', text: 'Quanto maior o combo, maior a chance de o próximo Pokémon a aparecer ser da mesma espécie.' },
      maxIvs: { title: 'IVs', text: 'Um combo longo garante alguns IVs perfeitos (quais status é aleatório). Vale só para a espécie do combo e, como não há breeding em Let\'s Go, esse é o melhor jeito de conseguir Pokémon fortes.' },
      shiny: { title: 'Pokémon shiny', text: 'A taxa de shiny aumenta com o combo. Ela vale só para a próxima aparição da espécie, então mantenha o combo.' },
      rareSpawn: { title: 'Spawns raros', text: 'Pokémon que não estão na lista da rota, como Chansey, Lapras ou um Charizard voando, aparecem bem mais em um combo. Dá para manter o combo e ir para outra área, por exemplo juntar combo de Caterpie na Viridian Forest e depois ir à Route 19 atrás do Lapras. As aves lendárias também podem aparecer assim (chance base de 1 em 2000, com duas tentativas se você usar Lure).' },
    },
    rewardsTitle: 'Itens e experiência',
    rewards: [
      'Capturas em combo dão mais chance de Candy, principalmente Candy L, Candy XL e o Candy da própria espécie. Com combos acima de 100 dá para juntar centenas deles.',
      'A experiência das capturas recebe bônus: x1,1 no começo, x1,5 a partir do combo 11 e mais 0,5 a cada 10 capturas.',
    ],
    source: 'Fonte: Serebii.net. Os valores podem mudar se o jogo for atualizado.',
  },
} satisfies Record<LetsGoLang, unknown>;
