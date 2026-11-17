import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Seo from '../components/Seo';
import LetsGoLangToggle from '../components/LetsGoLangToggle';
import { LetsGoLang, readLetsGoLang, saveLetsGoLang } from '../utils/letsGo';
import { CATCH_COMBO_TABLES, CATCH_COMBO_TEXT, ComboRow } from '../utils/catchCombo';

interface ComboTableProps {
  headers: string[];
  rows: ComboRow[];
}

const ComboTable: React.FC<ComboTableProps> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card">
    <table className="w-full text-xs sm:text-sm text-left">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-gray-400">
          {headers.map((h) => (
            <th key={h} className="px-1.5 sm:px-4 py-3 font-bold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.combo} className="border-t border-gray-100 dark:border-gray-800">
            <td className="px-1.5 sm:px-4 py-2.5 font-mono font-semibold text-gray-800 dark:text-gray-100">{row.combo}</td>
            {row.values.map((value, i) => (
              <td key={i} className="px-1.5 sm:px-4 py-2.5 text-gray-600 dark:text-gray-300">{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Section: React.FC<{ title: string; text?: string; children?: React.ReactNode }> = ({ title, text, children }) => (
  <section className="mb-10">
    <h2 className="text-xl font-extrabold text-gray-800 dark:text-white mb-2">{title}</h2>
    {text && <p className="text-gray-600 dark:text-gray-300 mb-4">{text}</p>}
    {children}
  </section>
);

const List: React.FC<{ items: readonly string[] }> = ({ items }) => (
  <ul className="list-disc pl-6 space-y-1.5 text-gray-600 dark:text-gray-300">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const CatchCombo: React.FC = () => {
  const [lang, setLang] = useState<LetsGoLang>(readLetsGoLang);
  const text = CATCH_COMBO_TEXT[lang];
  const { cols, sections } = text;

  const changeLang = (next: LetsGoLang) => {
    setLang(next);
    saveLetsGoLang(next);
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Seo title={CATCH_COMBO_TEXT.pt.seoTitle} description={CATCH_COMBO_TEXT.pt.seoDescription} path="/lets-go/catch-combo" />

      <div className="flex items-center justify-between mb-6 gap-3">
        <Link to="/lets-go" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          <ArrowLeft size={16} /> {text.back}
        </Link>
        <LetsGoLangToggle value={lang} onChange={changeLang} />
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-white mb-3">{text.seoTitle}</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-10">{text.intro}</p>

      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 p-5">
          <h2 className="font-extrabold text-green-800 dark:text-green-300 mb-2">{text.howTitle}</h2>
          <List items={text.how} />
        </div>
        <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 p-5">
          <h2 className="font-extrabold text-red-800 dark:text-red-300 mb-2">{text.breaksTitle}</h2>
          <List items={text.breaks} />
        </div>
      </div>

      <Section title={sections.sameSpecies.title} text={sections.sameSpecies.text}>
        <ComboTable headers={[cols.combo, cols.sameSpecies]} rows={CATCH_COMBO_TABLES.sameSpecies} />
      </Section>
      <Section title={sections.maxIvs.title} text={sections.maxIvs.text}>
        <ComboTable headers={[cols.combo, cols.maxIvs]} rows={CATCH_COMBO_TABLES.maxIvs} />
      </Section>
      <Section title={sections.shiny.title} text={sections.shiny.text}>
        <ComboTable headers={[cols.combo, cols.normal, cols.lure, cols.charm, cols.both]} rows={CATCH_COMBO_TABLES.shiny} />
      </Section>
      <Section title={sections.rareSpawn.title} text={sections.rareSpawn.text}>
        <ComboTable headers={[cols.combo, cols.chance]} rows={CATCH_COMBO_TABLES.rareSpawn} />
      </Section>
      <Section title={text.rewardsTitle}>
        <List items={text.rewards} />
      </Section>

      <p className="text-xs text-gray-400">{text.source}</p>
    </div>
  );
};

export default CatchCombo;
