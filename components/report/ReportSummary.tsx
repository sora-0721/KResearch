
import React from 'react';
import { useLanguage } from '../../contextx/LanguageContext';

interface ReportSummaryProps {
  researchTimeMs: number;
  citationCount: number;
  searchCycleCount: number;
}

const formatDuration = (ms: number) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const padded = (num: number) => String(num).padStart(2, '0');

    return `${padded(hours)}:${padded(minutes)}:${padded(seconds)}`;
}

const ReportSummary: React.FC<ReportSummaryProps> = ({ researchTimeMs, citationCount, searchCycleCount }) => {
  const { t } = useLanguage();
  return (
    <div className="mt-12 border-t border-border-light dark:border-border-dark pt-6">
      <h3 className="text-2xl font-bold mb-4">{t('researchSummary')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-base">
          <div className="flex-1 text-center p-4 bg-glass-light dark:bg-glass-dark rounded-2xl">
              <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('researchTime')}</div>
              <div className="text-2xl font-semibold">{formatDuration(researchTimeMs)}</div>
          </div>
          <div className="flex-1 text-center p-4 bg-glass-light dark:bg-glass-dark rounded-2xl">
              <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('sourcesFound')}</div>
              <div className="text-2xl font-semibold">{citationCount}</div>
          </div>
          <div className="flex-1 text-center p-4 bg-glass-light dark:bg-glass-dark rounded-2xl">
              <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('searchCycles')}</div>
              <div className="text-2xl font-semibold">{searchCycleCount}</div>
          </div>
      </div>
    </div>
  );
};

export default ReportSummary;
