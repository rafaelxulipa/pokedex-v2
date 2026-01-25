import React from 'react';
import { PokemonStat } from '../types';
import { useGlobal } from '../context/GlobalContext';
import { TYPE_COLORS } from '../constants';

interface StatChartProps {
  stats: PokemonStat[];
  compareStats?: PokemonStat[];
  name1?: string;
  name2?: string;
  primaryType?: string;
}

const StatChart: React.FC<StatChartProps> = ({ stats, compareStats, name1, name2, primaryType = 'normal' }) => {
  const { t } = useGlobal();

  // If we are comparing, we use a simpler layout to show two bars
  if (compareStats) {
      return (
        <div className="w-full space-y-4">
            {stats.map((stat, index) => {
                const statName = stat.stat.name;
                const label = t.stats[statName as keyof typeof t.stats] || statName;
                const val1 = stat.base_stat;
                const val2 = compareStats[index].base_stat;
                // Base calculation on max 255 (typical max stat)
                const pct1 = Math.min((val1 / 255) * 100, 100);
                const pct2 = Math.min((val2 / 255) * 100, 100);

                return (
                    <div key={statName} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                            <span>{label}</span>
                        </div>
                        
                        {/* P1 Bar */}
                        <div className="flex items-center gap-2">
                             <div className="w-12 text-xs font-bold text-blue-600 dark:text-blue-400 text-right">{val1}</div>
                             <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 rounded-full transition-all duration-700" 
                                    style={{ width: `${pct1}%` }}
                                ></div>
                             </div>
                        </div>

                        {/* P2 Bar */}
                         <div className="flex items-center gap-2">
                             <div className="w-12 text-xs font-bold text-red-600 dark:text-red-400 text-right">{val2}</div>
                             <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-red-500 rounded-full transition-all duration-700" 
                                    style={{ width: `${pct2}%` }}
                                ></div>
                             </div>
                        </div>
                    </div>
                );
            })}
             <div className="flex justify-center gap-6 mt-4 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                    {name1}
                </div>
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                    {name2}
                </div>
            </div>
        </div>
      );
  }

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
                  <div className="absolute top-0 right-0 bottom-0 w-full bg-gradient-to-l from-white/20 to-transparent"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatChart;