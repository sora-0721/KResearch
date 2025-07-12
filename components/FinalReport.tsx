import React, { useState, useRef, useEffect } from 'react';
import { FinalResearchData } from '../types';
import ReportHeader from './report/ReportHeader';
import MarkdownRenderer from './report/MarkdownRenderer';
import ReportCitations from './report/ReportCitations';
import ReportSummary from './report/ReportSummary';

interface FinalReportProps {
  data: FinalResearchData;
  onVisualize: (reportMarkdown: string) => void;
  isVisualizing: boolean;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

const FinalReport: React.FC<FinalReportProps> = ({ data, onVisualize, isVisualizing, onRegenerate, isRegenerating }) => {
  const { report, citations, researchTimeMs } = data;
  
  return (
    <div className="w-full text-gray-800 dark:text-gray-300">
      <ReportHeader
        report={report}
        citations={citations}
        onVisualize={onVisualize}
        isVisualizing={isVisualizing}
        onRegenerate={onRegenerate}
        isRegenerating={isRegenerating}
      />
      
      <MarkdownRenderer report={report} />

      <ReportSummary researchTimeMs={researchTimeMs} citationCount={citations.length} />

      <ReportCitations citations={citations} />
    </div>
  );
};

export default FinalReport;