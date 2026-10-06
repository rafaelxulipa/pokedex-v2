import React from 'react';
import { PokemonStat } from '../types';
import { useGlobal } from '../context/GlobalContext';
import { TYPE_COLORS } from '../constants';

interface StatChartProps {
  stats: PokemonStat[];
  primaryType?: string;
}

export const SERIES_COLORS = [
  { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  { bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
];

interface MultiStatChartProps {
  series: { name: string; stats: PokemonStat[] }[];
}

// Grouped bars for comparing 2 to 4 Pokemon
export const MultiStatChart: React.FC<MultiStatChartProps> = ({ series }) => {
  const { t } = useGlobal();
  if (series.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      {series[0].stats.map((stat, index) => {
        const statName = stat.stat.name;
        const label = t.stats[statName as keyof typeof t.stats] || statName;
        return (
          <div key={statName} className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{label}</div>
            {series.map((item, i) => {
              const value = item.stats[index]?.base_stat ?? 0;
              const color = SERIES_COLORS[i % SERIES_COLORS.length];
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <div className={`w-12 text-xs font-bold text-right ${color.text}`}>{value}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${color.bar} rounded-full transition-all duration-700`} style={{ width: `${Math.min((value / 255) * 100, 100)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-xs font-bold">
        {series.map((item, i) => (
          <div key={item.name} className={`flex items-center gap-1.5 capitalize ${SERIES_COLORS[i % SERIES_COLORS.length].text}`}>
            <div className={`w-3 h-3 rounded-xs ${SERIES_COLORS[i % SERIES_COLORS.length].bar}`}></div>
            {item.name.replace('-', ' ')}
          </div>
        ))}
      </div>
    </div>
  );
};

const StatChart: React.FC<StatChartProps> = ({ stats, primaryType = 'normal' }) => {
  const { t } = useGlobal();

  // Single Pokemon Display
  const typeColor = TYPE_COLORS[primaryType] || 'bg-blue-500';

  return (
    <div className="w-full space-y-4">
      {stats.map((stat) => {
        const statName = stat.stat.name;
        const label = t.stats[statName as keyof typeof t.stats] || statName;
        const value = stat.base_stat;
        // Max base stat is usually around 255. 
        const percentage = Math.min((value / 255) * 100, 100);

        return (
          <div key={statName} className="flex items-center gap-3">
            <span className="w-20 text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {label}
            </span>
            <span className="w-8 text-sm font-bold text-gray-800 dark:text-gray-200 text-right">
              {value}
            </span>
            <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full ${typeColor} transition-all duration-1000 ease-out rounded-full relative`}
                style={{ width: `${percentage}%` }}
              >
                  <div className="absolute top-0 right-0 bottom-0 w-full bg-linear-to-l from-white/20 to-transparent"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatChart;