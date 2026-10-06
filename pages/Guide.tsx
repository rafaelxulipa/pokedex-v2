import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Gamepad2, List, X } from 'lucide-react';
import { fetchGuideChapter, fetchGuideIndex, guideAsset } from '../services/guides';
import { GuideBlock, GuideIndex } from '../types';
import GuideBlocks from '../components/GuideBlocks';
import GuideDownloads from '../components/GuideDownloads';
import Loader from '../components/Loader';
import { useGlobal } from '../context/GlobalContext';
import { readStorage, writeStorage } from '../utils/storage';
import Seo from '../components/Seo';

const PROGRESS_KEY = 'guideProgress';

type Progress = Record<string, number>;

const Guide: React.FC = () => {
  const { slug = '', n } = useParams<{ slug: string; n?: string }>();
  const { t } = useGlobal();
  const navigate = useNavigate();

  const [guide, setGuide] = useState<GuideIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [blocks, setBlocks] = useState<GuideBlock[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [progress, setProgress] = useState<Progress>(() => readStorage<Progress>(PROGRESS_KEY, {}));

  const chapterNumber = n ? parseInt(n, 10) : null;

  useEffect(() => {
    let cancelled = false;
    setGuide(null);
    setFailed(false);
    fetchGuideIndex(slug).then((data) => {
      if (cancelled) return;
      if (data) setGuide(data);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const chapter = useMemo(
    () => (guide && chapterNumber ? guide.chapters.find((c) => c.n === chapterNumber) ?? null : null),
    [guide, chapterNumber]
  );

  // Load the chapter content and remember where the reader is
  useEffect(() => {
    if (!guide || !chapter) {
      setBlocks(null);
      return;
    }
    let cancelled = false;
    setBlocks(null);
    window.scrollTo(0, 0);
    fetchGuideChapter(slug, chapter.n).then((data) => {
      if (!cancelled) setBlocks(data?.blocks ?? []);
    });
    const next = { ...readStorage<Progress>(PROGRESS_KEY, {}), [slug]: chapter.n };
    writeStorage(PROGRESS_KEY, next);
    setProgress(next);
    return () => {
      cancelled = true;
    };
  }, [guide, chapter, slug]);

  // Meta description of a chapter: its first paragraph
  const chapterDescription = useMemo(() => {
    const first = blocks?.find((b) => b.t === 'p');
    const text = first && first.t === 'p' ? first.runs.map((r) => r.t).join('') : '';
    return text.length > 155 ? `${text.slice(0, 152).trimEnd()}...` : text;
  }, [blocks]);

  // Reading progress bar
  useEffect(() => {
    if (!chapter) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [chapter, blocks]);

  if (failed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-gray-500 dark:text-gray-400">{t.guides.notFound}</p>
        <Link to="/detonados" className="text-blue-500 hover:underline">{t.guides.backToList}</Link>
      </div>
    );
  }
  if (!guide) return <div className="min-h-[60vh] flex items-center justify-center"><Loader /></div>;

  const accent = guide.accent;
  const parts = guide.chapters.reduce<Record<string, typeof guide.chapters>>((acc, c) => {
    (acc[c.part || ''] ||= []).push(c);
    return acc;
  }, {});

  const chapterList = (onPick?: () => void) => (
    <nav aria-label={t.guides.chapters}>
      {Object.entries(parts).map(([part, list]) => (
        <div key={part} className="mb-4">
          {part && <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">{part}</p>}
          <ul>
            {list.map((c) => {
              const active = c.n === chapterNumber;
              return (
                <li key={c.n}>
                  <Link
                    to={`/detonados/${slug}/${c.n}`}
                    onClick={onPick}
                    className={`flex gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'font-bold text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    style={active ? { backgroundColor: accent } : undefined}
                  >
                    <span className={`w-5 shrink-0 text-right tabular-nums ${active ? '' : 'text-gray-400'}`}>{c.n}</span>
                    <span>{c.title}</span>
                  </Link>
                  {active && c.sections.length > 1 && (
                    <ul className="ml-8 my-1 border-l border-gray-200 dark:border-gray-700">
                      {c.sections.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => {
                              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              onPick?.();
                            }}
                            className="block w-full text-left pl-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            {s.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  // ---------- Overview ----------
  if (!chapter) {
    const resume = progress[slug];
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <Seo
          title={guide.title}
          description={guide.description}
          path={`/detonados/${slug}`}
          image={`/detonados/${slug}/${guide.cover}`}
        />
        <Link to="/detonados" className="inline-flex items-center gap-2 mb-6 text-sm text-gray-500 hover:text-blue-500">
          <ArrowLeft size={16} /> {t.guides.backToList}
        </Link>

        <div className="grid gap-8 md:grid-cols-[260px_1fr] items-start mb-10">
          <img src={guideAsset(slug, guide.cover)} alt={guide.title} className="w-56 md:w-full mx-auto rounded-xl shadow-2xl" />
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full text-xs font-bold text-white" style={{ backgroundColor: accent }}>
              <Gamepad2 size={12} /> {guide.console}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">{guide.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{guide.subtitle}</p>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{guide.description}</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/detonados/${slug}/${resume && guide.chapters.some((c) => c.n === resume) ? resume : guide.chapters[0].n}`)}
                className="flex items-center gap-2 px-6 py-3 font-bold text-white rounded-xl shadow-lg hover:scale-105 transition-transform"
                style={{ backgroundColor: accent }}
              >
                <BookOpen size={18} /> {resume ? t.guides.continueReading : t.guides.startReading} <ArrowRight size={16} />
              </button>
              {resume && (
                <button
                  onClick={() => navigate(`/detonados/${slug}/${guide.chapters[0].n}`)}
                  className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {t.guides.fromStart}
                </button>
              )}
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">{t.guides.downloadTitle}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.guides.downloadHint}</p>
          <GuideDownloads slug={slug} downloads={guide.downloads} accent={accent} />
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-4">{t.guides.chapters}</h2>
          {Object.entries(parts).map(([part, list]) => (
            <div key={part} className="mb-6">
              {part && <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">{part}</h3>}
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((c) => (
                  <Link
                    key={c.n}
                    to={`/detonados/${slug}/${c.n}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 hover:border-blue-400 transition-colors"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold text-white shrink-0" style={{ backgroundColor: accent }}>{c.n}</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{c.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <footer className="text-xs text-gray-400 space-y-1 border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="font-semibold text-gray-500 dark:text-gray-400">{guide.credit}</p>
          <p>{guide.disclaimer}</p>
          <p>{guide.license}</p>
        </footer>
      </div>
    );
  }

  // ---------- Reader ----------
  const index = guide.chapters.findIndex((c) => c.n === chapter.n);
  const prev = guide.chapters[index - 1];
  const next = guide.chapters[index + 1];

  return (
    <div>
      <Seo
        title={`${chapter.title} - ${guide.title}`}
        description={chapterDescription || guide.description}
        path={`/detonados/${slug}/${chapter.n}`}
        image={`/detonados/${slug}/${guide.cover}`}
        type="article"
      />
      <div className="fixed top-16 left-0 right-0 z-40 h-1 bg-transparent pointer-events-none">
        <div className="h-full transition-[width] duration-100" style={{ width: `${scrollPct}%`, backgroundColor: accent }} />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
        <aside className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 no-scrollbar">
          <Link to={`/detonados/${slug}`} className="block mb-4 px-3 font-extrabold text-gray-900 dark:text-white hover:text-blue-500">
            {guide.title}
          </Link>
          {chapterList()}
        </aside>

        <main className="min-w-0 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link to={`/detonados/${slug}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-500">
              <ArrowLeft size={16} /> <span className="hidden sm:inline">{guide.title}</span><span className="sm:hidden">{t.guides.overview}</span>
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            >
              <List size={16} /> {t.guides.chapters}
            </button>
          </div>

          <header className="mb-8 pb-6 border-b-2" style={{ borderColor: accent }}>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
              {t.guides.chapter} {chapter.n}{chapter.part ? ` · ${chapter.part}` : ''}
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">{chapter.title}</h1>
          </header>

          {blocks === null ? (
            <div className="flex justify-center py-20"><Loader /></div>
          ) : (
            <GuideBlocks slug={slug} blocks={blocks} accent={accent} />
          )}

          <nav className="mt-14 grid grid-cols-2 gap-3">
            {prev ? (
              <Link to={`/detonados/${slug}/${prev.n}`} className="group flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 hover:border-blue-400 transition-colors">
                <ChevronLeft className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                <span className="min-w-0"><span className="block text-xs text-gray-400">{t.guides.previous}</span><span className="block font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{prev.title}</span></span>
              </Link>
            ) : <span />}
            {next ? (
              <Link to={`/detonados/${slug}/${next.n}`} className="group flex items-center justify-end gap-3 p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 hover:border-blue-400 transition-colors text-right">
                <span className="min-w-0"><span className="block text-xs text-gray-400">{t.guides.next}</span><span className="block font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{next.title}</span></span>
                <ChevronRight className="text-gray-400 group-hover:text-blue-500 shrink-0" />
              </Link>
            ) : <span />}
          </nav>

          <section className="mt-12">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">{t.guides.downloadTitle}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.guides.downloadHint}</p>
            <GuideDownloads slug={slug} downloads={guide.downloads} accent={accent} />
            <p className="mt-6 text-xs text-gray-400">{guide.credit}</p>
          </section>
        </main>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[9000] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-dark-card p-4 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <span className="font-extrabold text-gray-900 dark:text-white">{t.guides.chapters}</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Fechar" className="p-2 text-gray-500"><X size={20} /></button>
            </div>
            {chapterList(() => setMenuOpen(false))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Guide;
