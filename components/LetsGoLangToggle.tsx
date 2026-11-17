import React from 'react';
import { LetsGoLang } from '../utils/letsGo';

interface LetsGoLangToggleProps {
  value: LetsGoLang;
  onChange: (lang: LetsGoLang) => void;
}

const OPTIONS: { value: LetsGoLang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'pt', label: 'PT-BR' },
];

// Two-button switch between English and Brazilian Portuguese for the Let's Go pages.
const LetsGoLangToggle: React.FC<LetsGoLangToggleProps> = ({ value, onChange }) => (
  <div role="group" aria-label="Language" className="inline-flex shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
    {OPTIONS.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        aria-pressed={value === option.value}
        className={`px-3 sm:px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
          value === option.value
            ? 'bg-red-500 text-white shadow-xs'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default LetsGoLangToggle;
