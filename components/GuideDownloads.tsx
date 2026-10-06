import React from 'react';
import { Download, FileText } from 'lucide-react';
import { GuideDownload } from '../types';
import { formatBytes, guideAsset } from '../services/guides';

interface GuideDownloadsProps {
  slug: string;
  downloads: GuideDownload[];
  accent: string;
}

// Free PDF download buttons (one per available format)
const GuideDownloads: React.FC<GuideDownloadsProps> = ({ slug, downloads, accent }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {downloads.map((d) => (
      <a
        key={d.file}
        href={guideAsset(slug, d.file)}
        download
        className="group flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        <span className="flex items-center justify-center w-12 h-12 rounded-xl text-white shrink-0" style={{ backgroundColor: accent }}>
          <FileText size={22} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-gray-900 dark:text-white">{d.label}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{d.hint}</span>
          <span className="block mt-0.5 text-xs font-medium text-gray-400">{d.pages} páginas · {formatBytes(d.bytes)}</span>
        </span>
        <Download size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
      </a>
    ))}
  </div>
);

export default GuideDownloads;
