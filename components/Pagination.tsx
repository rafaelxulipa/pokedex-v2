import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const { t } = useGlobal();

  if (totalPages <= 1) return null;

  // Logic to show limited page numbers (e.g., 1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-12 mb-8 animate-fade-in">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
      >
        <ChevronLeft size={18} />
        <span className="hidden sm:inline font-medium">{t.prev}</span>
      </button>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[60vw] sm:max-w-none px-2">
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="flex items-center justify-center w-8 h-10 text-gray-400">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl font-medium transition-all duration-200 ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
      >
        <span className="hidden sm:inline font-medium">{t.next}</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default Pagination;
