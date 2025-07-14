import React from 'react';

interface ReportSummaryProps {
  researchTimeMs: number;
  citationCount: number;
}

const ReportSummary: React.FC<ReportSummaryProps> = ({ researchTimeMs, citationCount }) => {
  return (
    <div className="mt-12 border-t border-border-light dark:border-border-dark pt-6">
      <h3 className="text-2xl font-bold mb-4">Research Summary</h3>
      <div className="flex flex-col sm:flex-row gap-4 text-base">
          <div className="flex-1 text-center p-4 bg-glass-light dark:bg-glass-dark rounded-2xl">
              <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">Research Time</div>
              <div className="text-2xl font-semibold">{(researchTimeMs / 1000).toFixed(2)}s</div>
          </div>
          <div className="flex-1 text-center p-4 bg-glass-light dark:bg-glass-dark rounded-2xl">
              <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">Sources Found</div>
              <div className="text-2xl font-semibold">{citationCount}</div>
          </div>
      </div>
    </div>
  );
};

export default ReportSummary;