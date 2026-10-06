import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, Gamepad2 } from 'lucide-react';
import { fetchGuideCatalog, guideAsset } from '../services/guides';
import { GuideSummary } from '../types';
import Loader from '../components/Loader';
import { useGlobal } from '../context/GlobalContext';
import Seo from '../components/Seo';
import GuideSearch from '../components/GuideSearch';

const Guides: React.FC = () => {
  const { t } = useGlobal();
  const [guides, setGuides] = useState<GuideSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuideCatalog().then((list) => {
      if (!cancelled) setGuides(list ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Seo
        title="Detonados de Pokémon"
        description="Detonados completos de Pokémon em português, passo a passo, com mapas e imagens. Leia online ou baixe o PDF gratuitamente."
        path="/detonados"
      />
      <div className="text-center mb-10">
        <BookOpen className="mx-auto h-16 w-16 mb-4 text-red-500" />
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-2">{t.guides.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{t.guides.subtitle}</p>
        {t.guides.ptOnly && <p className="mt-3 text-sm text-gray-400">{t.guides.ptOnly}</p>}
        <GuideSearch className="mt-6 max-w-xl mx-auto text-left" />
      </div>

      {guides === null ? (
        <div className="flex justify-center py-20"><Loader /></div>
      ) : guides.length === 0 ? (
        <p className="text-center text-gray-400 py-20">{t.guides.empty}</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              to={`/detonados/${guide.slug}`}
              className="group flex flex-col bg-white dark:bg-dark-card rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative flex items-center justify-center py-8" style={{ background: `linear-gradient(135deg, ${guide.accent}22, ${guide.accent}08)` }}>
                <img
                  src={guideAsset(guide.slug, guide.cover)}
                  alt={guide.title}
                  loading="lazy"
                  className="h-64 w-auto rounded-lg shadow-xl group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-xs">
                  <Gamepad2 size={12} /> {guide.console}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">{guide.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">{guide.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{guide.chapters} {t.guides.chapters.toLowerCase()} · {guide.pdfPages} {t.guides.pages}</span>
                  <span className="flex items-center gap-1.5 font-bold" style={{ color: guide.accent }}>
                    <Download size={14} /> {t.guides.freePdf}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Guides;
