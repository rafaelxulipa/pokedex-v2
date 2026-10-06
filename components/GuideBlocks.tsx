import React, { useEffect, useState } from 'react';
import { Lightbulb, TriangleAlert, Gift, Sparkles, StickyNote, X } from 'lucide-react';
import { GuideBlock, GuideImage, GuideRun } from '../types';
import { guideAsset } from '../services/guides';
import AdSense from './AdSense';
import { useGlobal } from '../context/GlobalContext';

const Runs: React.FC<{ runs: GuideRun[] }> = ({ runs }) => (
  <>
    {runs.map((run, i) => {
      let node: React.ReactNode = run.t;
      if (run.b) node = <strong className="font-bold text-gray-900 dark:text-white">{node}</strong>;
      if (run.i) node = <em>{node}</em>;
      return <React.Fragment key={i}>{node}</React.Fragment>;
    })}
  </>
);

const CALLOUTS = {
  tip: { label: 'Dica', icon: Lightbulb, box: 'bg-green-50 dark:bg-green-900/20 border-green-500', text: 'text-green-700 dark:text-green-300' },
  warning: { label: 'Atenção', icon: TriangleAlert, box: 'bg-orange-50 dark:bg-orange-900/20 border-orange-500', text: 'text-orange-700 dark:text-orange-300' },
  reward: { label: 'Recompensa', icon: Gift, box: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500', text: 'text-yellow-700 dark:text-yellow-300' },
  trivia: { label: 'Curiosidade', icon: Sparkles, box: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  note: { label: 'Nota', icon: StickyNote, box: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
} as const;

interface GuideBlocksProps {
  slug: string;
  blocks: GuideBlock[];
  accent: string;
  adBefore?: number; // index of the block that an ad is placed before
}

const GuideBlocks: React.FC<GuideBlocksProps> = ({ slug, blocks, accent, adBefore }) => {
  const { t } = useGlobal();
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  // One picture. Cards (cropped trainer cards/tables) sit on a white panel like in the PDF.
  const picture = (img: GuideImage, alt: string, card = false) => {
    const image = (
      <img
        src={guideAsset(slug, img.src)}
        alt={alt}
        width={img.w}
        height={img.h}
        loading="lazy"
        decoding="async"
        className={`w-full h-auto ${card ? 'rounded-xl' : 'rounded-xl shadow-sm'}`}
      />
    );
    return (
      <button
        type="button"
        onClick={() => setZoom({ src: guideAsset(slug, img.src), alt })}
        className={`block w-full cursor-zoom-in text-left ${card ? 'bg-white p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs' : ''}`}
        aria-label={alt || t.guides.zoomImage}
      >
        {image}
      </button>
    );
  };

  // Width of a single picture, following its size in the original layout (but never tiny on phones)
  const singleWidth = (img: GuideImage): React.CSSProperties => {
    const fw = img.fw ?? 1;
    return { width: `max(${fw * 100}%, min(100%, 280px))`, maxWidth: Math.max(img.w, 320) };
  };

  return (
    <div className="guide-content">
      {blocks.map((block, index) => {
        const element = (() => {
        switch (block.t) {
          case 'h2':
            return (
              <div key={index} id={block.id} className="scroll-mt-24 mt-12 mb-4 first:mt-0">
                <h2 className="flex items-center gap-3 text-2xl font-extrabold text-gray-900 dark:text-white">
                  <span className="inline-block w-1.5 h-7 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                  {block.text}
                </h2>
                {block.sub && <p className="mt-1 ml-[18px] text-sm font-medium text-gray-500 dark:text-gray-400">{block.sub}</p>}
              </div>
            );
          case 'h3':
            return (
              <h3 key={index} id={block.id} className="scroll-mt-24 mt-8 mb-2 text-lg font-bold text-gray-800 dark:text-gray-100">
                {block.text}
              </h3>
            );
          case 'p':
            return (
              <p key={index} className="mb-4 text-[17px] leading-8 text-gray-700 dark:text-gray-300">
                <Runs runs={block.runs} />
              </p>
            );
          case 'callout': {
            const style = CALLOUTS[block.kind] ?? CALLOUTS.note;
            const Icon = style.icon;
            return (
              <aside key={index} className={`my-6 rounded-2xl border-l-4 p-4 ${style.box}`}>
                <p className={`flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-widest ${style.text}`}>
                  <Icon size={14} /> {style.label}
                </p>
                {block.paras.map((runs, i) => (
                  <p key={i} className="text-[15px] leading-7 text-gray-700 dark:text-gray-200">
                    <Runs runs={runs} />
                  </p>
                ))}
              </aside>
            );
          }
          case 'img':
          case 'card': {
            const alt = block.t === 'card' ? block.alt : block.caption ?? '';
            return (
              <figure key={index} className="my-6 flex flex-col items-center">
                <div style={singleWidth(block)}>{picture(block, alt, block.t === 'card')}</div>
                {block.t === 'img' && block.caption && (
                  <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">{block.caption}</figcaption>
                )}
              </figure>
            );
          }
          case 'gallery': {
            const total = Math.min(1, block.imgs.reduce((sum, img) => sum + (img.fw ?? 0.5), 0));
            return (
              <figure key={index} className="my-6 flex flex-col items-center">
                <div className="flex flex-wrap justify-center items-start gap-2" style={{ width: `${Math.max(total, 0.3) * 100}%`, minWidth: 'min(100%, 260px)' }}>
                  {block.imgs.map((img, i) => (
                    <div key={i} style={{ flex: `${img.fw ?? 0.5} 1 0%`, minWidth: 72 }}>
                      {picture(img, img.alt ?? block.caption ?? '', !!img.card)}
                    </div>
                  ))}
                </div>
                {block.caption && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">{block.caption}</figcaption>}
              </figure>
            );
          }
          case 'caption':
            return <p key={index} className="mb-4 text-sm text-gray-500 dark:text-gray-400 text-center">{block.text}</p>;
          default:
            return null;
        }
        })();
        return (
          <React.Fragment key={index}>
            {index === adBefore && (
              <div className="my-10">
                <span className="block mb-2 text-center text-[10px] uppercase tracking-widest text-gray-400">{t.advertisement}</span>
                <AdSense format="horizontal" className="min-h-[100px]" slot="7629704157" />
              </div>
            )}
            {element}
          </React.Fragment>
        );
      })}

      {zoom && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={t.close}>
            <X size={24} />
          </button>
          <img src={zoom.src} alt={zoom.alt} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default GuideBlocks;
