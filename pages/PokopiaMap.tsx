import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Map as MapIcon, Minus, Plus, Maximize, Search, X, Hammer } from 'lucide-react';
import Loader from '../components/Loader';

interface MapPin {
  c: string;
  x: number;
  y: number;
  n: string;
  t?: string;
}
interface MapArea {
  key: string;
  name: string;
  img: string;
  w: number;
  h: number;
  pins: MapPin[];
}
interface MapCategory {
  key: string;
  label: string;
  group: string;
  color: string;
}
interface MapData {
  groups: { key: string; label: string }[];
  categories: MapCategory[];
  areas: MapArea[];
}

interface View {
  s: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const COST_RE = /^(Repair|Construction) Cost/;

const PokopiaMap: React.FC = () => {
  const [data, setData] = useState<MapData | null>(null);
  const [failed, setFailed] = useState(false);
  const [areaKey, setAreaKey] = useState('withered-wasteland');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragInfo = useRef({ moved: 0, startDist: 0, startScale: 1 });

  useEffect(() => {
    let cancelled = false;
    fetch('/pokopia/map.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MapData) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const area = data?.areas.find((a) => a.key === areaKey) ?? null;
  const catByKey = useMemo(() => new Map((data?.categories ?? []).map((c) => [c.key, c])), [data]);

  // Size of the map at scale 1: as wide as the viewport
  const mapW = box.w;
  const mapH = area && box.w ? (box.w * area.h) / area.w : 0;

  const fit = useCallback(() => {
    if (!area || !box.w || !box.h) return;
    const mh = (box.w * area.h) / area.w;
    const s = Math.min(1, box.h / mh);
    setView({ s, x: (box.w - box.w * s) / 2, y: (box.h - mh * s) / 2 });
  }, [area, box.w, box.h]);

  // Viewport size
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  // Refit on area change
  useEffect(() => {
    setSelected(null);
    setSearch('');
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaKey, box.w, box.h === 0]);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.s * factor));
      const k = s / v.s;
      return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }, []);

  // Wheel zoom needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, data]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragInfo.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      dragInfo.current.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      dragInfo.current.startScale = view.s;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = viewportRef.current!.getBoundingClientRect();
      const factor = (dist / dragInfo.current.startDist) * (dragInfo.current.startScale / view.s);
      zoomAt(factor, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      dragInfo.current.moved = 99;
      return;
    }
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    dragInfo.current.moved += Math.abs(dx) + Math.abs(dy);
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };

  const focusPin = (i: number) => {
    if (!area) return;
    const p = area.pins[i];
    setSelected(i);
    const s = Math.max(view.s, 1.5);
    setView({ s, x: box.w / 2 - p.x * mapW * s, y: box.h / 2 - p.y * mapH * s });
  };

  const term = search.trim().toLowerCase();
  const visibleIdx = useMemo(() => {
    if (!area) return [];
    return area.pins.map((p, i) => i).filter((i) => {
      const p = area.pins[i];
      if (hidden.has(p.c)) return false;
      if (term && !(p.n.toLowerCase().includes(term) || (p.t ?? '').toLowerCase().includes(term))) return false;
      return true;
    });
  }, [area, hidden, term]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    area?.pins.forEach((p) => m.set(p.c, (m.get(p.c) ?? 0) + 1));
    return m;
  }, [area]);

  const toggleCat = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const costs = useMemo(() => {
    if (!data) return [];
    return data.areas.flatMap((a) => a.pins.filter((p) => p.t && COST_RE.test(p.t)).map((p) => ({ area: a.name, name: p.n, text: p.t! })));
  }, [data]);

  const pin = area && selected !== null ? area.pins[selected] : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/pokopia" className="inline-flex items-center gap-1 mb-4 text-sm font-semibold text-gray-500 hover:text-teal-600">
        <ChevronLeft size={16} /> Pokopia
      </Link>
      <div className="mb-6">
        <div className="inline-flex items-center justify-center h-14 w-14 mb-3 rounded-2xl bg-linear-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
          <MapIcon size={28} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white">Mapa do Pokopia</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
          {data ? `${data.areas.length} áreas e ${data.areas.reduce((n, a) => n + a.pins.length, 0)} pontos` : 'Carregando...'}: receitas, bancadas, Centros
          Pokémon, diários, revistas e itens colecionáveis. Escolha uma área e toque em um ponto para ver onde ele fica e como chegar.
        </p>
      </div>

      {failed && <p className="text-red-500">Não foi possível carregar o mapa.</p>}
      {!data && !failed && <Loader />}

      {data && area && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {data.areas.map((a) => (
              <button
                key={a.key}
                onClick={() => setAreaKey(a.key)}
                className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                  a.key === areaKey
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-teal-500'
                }`}
              >
                {a.name} <span className="opacity-70">{a.pins.length}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
            {/* Map */}
            <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-900">
              <div
                ref={viewportRef}
                className="relative h-[60vh] min-h-[360px] lg:h-[72vh] touch-none cursor-grab active:cursor-grabbing select-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {mapW > 0 && (
                  <div
                    className="absolute left-0 top-0 origin-top-left"
                    style={{ width: mapW, height: mapH, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
                  >
                    <img src={area.img} alt={`Mapa de ${area.name}`} draggable={false} className="block w-full h-full [image-rendering:pixelated]" />
                    {visibleIdx.map((i) => {
                      const p = area.pins[i];
                      const cat = catByKey.get(p.c);
                      const active = i === selected;
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-label={`${p.n} (${cat?.label ?? p.c})`}
                          title={p.n}
                          onClick={() => {
                            if (dragInfo.current.moved < 6) setSelected(i);
                          }}
                          className={`absolute rounded-full border-2 shadow-md ${active ? 'border-white ring-4 ring-white/60 z-20' : 'border-white/90 z-10 hover:z-20'}`}
                          style={{
                            left: `${p.x * 100}%`,
                            top: `${p.y * 100}%`,
                            width: active ? 22 : 16,
                            height: active ? 22 : 16,
                            backgroundColor: cat?.color ?? '#888',
                            transform: `translate(-50%, -50%) scale(${1 / view.s})`,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="absolute top-3 right-3 flex flex-col gap-2">
                <button onClick={() => zoomAt(1.4, box.w / 2, box.h / 2)} className="h-9 w-9 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 shadow flex items-center justify-center" aria-label="Aproximar"><Plus size={18} /></button>
                <button onClick={() => zoomAt(1 / 1.4, box.w / 2, box.h / 2)} className="h-9 w-9 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 shadow flex items-center justify-center" aria-label="Afastar"><Minus size={18} /></button>
                <button onClick={fit} className="h-9 w-9 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 shadow flex items-center justify-center" aria-label="Ajustar ao mapa"><Maximize size={16} /></button>
              </div>
              <p className="absolute bottom-2 left-3 text-[10px] text-white/70">Arraste para mover, role ou pince para dar zoom. Mapa: poketools.com</p>
            </div>

            {/* Side panel */}
            <aside className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar neste mapa..."
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>

              {pin ? (
                <div className="rounded-2xl border-2 border-teal-500 bg-white dark:bg-dark-card p-4 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className="inline-block px-2 py-0.5 mb-1 text-[11px] font-extrabold uppercase tracking-wide rounded-full text-white"
                        style={{ backgroundColor: catByKey.get(pin.c)?.color ?? '#888' }}
                      >
                        {catByKey.get(pin.c)?.label ?? pin.c}
                      </span>
                      <h2 className="font-extrabold text-gray-800 dark:text-white leading-snug">{pin.n}</h2>
                    </div>
                    <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Fechar"><X size={16} /></button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                    {pin.t ? pin.t.split(' / ').join('\n') : 'Sem observações para este ponto.'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Toque em um ponto do mapa ou da lista para ver os detalhes.</p>
              )}

              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-4">
                {data.groups.map((g) => {
                  const cats = data.categories.filter((c) => c.group === g.key && counts.has(c.key));
                  if (!cats.length) return null;
                  return (
                    <div key={g.key} className="mb-3 last:mb-0">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">{g.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cats.map((c) => {
                          const off = hidden.has(c.key);
                          return (
                            <button
                              key={c.key}
                              onClick={() => toggleCat(c.key)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-opacity ${
                                off ? 'opacity-40 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'
                              } text-gray-700 dark:text-gray-200`}
                            >
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                              {c.label}
                              <span className="text-gray-400">{counts.get(c.key)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {term && (
                <ul className="max-h-72 overflow-y-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card divide-y divide-gray-100 dark:divide-gray-800">
                  {visibleIdx.length === 0 && <li className="p-3 text-sm text-gray-400">Nada encontrado.</li>}
                  {visibleIdx.slice(0, 60).map((i) => (
                    <li key={i}>
                      <button onClick={() => focusPin(i)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: catByKey.get(area.pins[i].c)?.color }} />
                        <span className="text-gray-700 dark:text-gray-200">{area.pins[i].n}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>

          {costs.length > 0 && (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-800 dark:text-white mb-1">
                <Hammer size={20} /> Custos de reparo e construção
              </h2>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                O kit de reconstrução aparece na loja do PC quando a área chega ao ambiente nível 3 (veja o detonado).
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {costs.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-dark-card p-4">
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400">{c.area}</div>
                    <div className="font-extrabold text-gray-800 dark:text-white mb-1">{c.name}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{c.text.split(' / ').slice(1).join('\n')}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="mt-10 text-xs text-center text-gray-400">
            Mapas e posições dos pontos:{' '}
            <a className="underline" href="https://www.poketools.com/pokopia-map" target="_blank" rel="noopener noreferrer">poketools.com</a>. Nomes e observações em inglês, como no jogo.
          </p>
        </>
      )}
    </div>
  );
};

export default PokopiaMap;
