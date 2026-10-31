import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allLabel: string;
  capitalize?: boolean;
}

// Dropdown with checkboxes. An empty selection means "all".
const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, allLabel, capitalize }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const summary = selected.length === 0
    ? allLabel
    : options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ');

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-dark-card text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${capitalize ? 'capitalize' : ''}`}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-multiselectable="true"
          className={`absolute z-30 mt-1 w-full max-h-64 overflow-y-auto text-left bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg ${capitalize ? 'capitalize' : ''}`}
        >
          <li>
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
            >
              {allLabel}
              {selected.length === 0 && <Check size={16} className="text-purple-500" />}
            </button>
          </li>
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={selected.includes(o.value)}>
              <button
                type="button"
                onClick={() => toggle(o.value)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                {o.label}
                {selected.includes(o.value) && <Check size={16} className="text-purple-500" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MultiSelect;
