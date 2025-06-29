
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FinalResearchData } from '../types';
import LiquidButton from './LiquidButton';


declare global {
  interface Window {
    mermaid?: any;
  }
}

interface FinalReportProps {
  data: FinalResearchData;
}

const FinalReport: React.FC<FinalReportProps> = ({ data }) => {
  const { report, citations, researchTimeMs, mermaidGraph } = data;
  const [copyButtonText, setCopyButtonText] = useState('Copy Report');

  useEffect(() => {
    if (mermaidGraph && window.mermaid) {
      // Use a timeout to ensure the DOM is updated before mermaid tries to render.
      const timer = setTimeout(() => {
        try {
          // Remove any existing rendered SVGs before re-running
          const mermaidDivs = document.querySelectorAll('.mermaid');
          mermaidDivs.forEach(div => {
            const svg = div.querySelector('svg');
            if(svg) {
                svg.remove();
            }
            div.removeAttribute('data-processed');
            // @ts-ignore
            div.innerHTML = div.textContent;
          });

          window.mermaid.run({
            nodes: document.querySelectorAll('.mermaid'),
          });
        } catch(e) {
          console.error("Error rendering mermaid graph:", e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mermaidGraph]);

  const handleCopy = () => {
    navigator.clipboard.writeText(report).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy Report'), 2000);
    }).catch(err => {
        console.error('Failed to copy report: ', err);
        setCopyButtonText('Copy Failed');
        setTimeout(() => setCopyButtonText('Copy Report'), 2000);
    });
  };


  return (
    <div className="w-full text-gray-800 dark:text-gray-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold">Final Report</h2>
        <LiquidButton onClick={handleCopy} className="px-4 py-2 text-sm shrink-0">
            {copyButtonText}
        </LiquidButton>
      </div>
      <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-500 hover:underline dark:text-blue-400" target="_blank" rel="noopener noreferrer" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
          }}
        >
          {report}
        </ReactMarkdown>
      </div>

      <div className="mt-12 border-t border-border-light dark:border-border-dark pt-6">
        <h3 className="text-2xl font-bold mb-4">Research Summary</h3>
        <div className="flex flex-col sm:flex-row gap-4 text-base">
            <div className="flex-1 text-center p-4 bg-glass-light dark:bg-glass-dark rounded-lg">
                <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">Research Time</div>
                <div className="text-2xl font-semibold">{(researchTimeMs / 1000).toFixed(2)}s</div>
            </div>
            <div className="flex-1 text-center p-4 bg-glass-light dark:bg-glass-dark rounded-lg">
                <div className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">Sources Found</div>
                <div className="text-2xl font-semibold">{citations.length}</div>
            </div>
        </div>
      </div>

      {mermaidGraph && (
        <div className="mt-8 border-t border-border-light dark:border-border-dark pt-6">
          <h3 className="text-2xl font-bold mb-4">Knowledge Graph</h3>
          <div className="p-4 bg-glass-light dark:bg-glass-dark rounded-lg flex justify-center items-center overflow-x-auto">
             <div key={mermaidGraph} className="mermaid" style={{ minWidth: '100%', textAlign: 'center' }}>
                {mermaidGraph}
             </div>
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-border-light dark:border-border-dark pt-6">
        <h3 className="text-2xl font-bold mb-4">Citations</h3>
        <ul className="list-none p-0 space-y-2">
            {citations.map((citation, index) => (
                <li key={index} className="text-sm p-3 bg-glass-light dark:bg-glass-dark rounded-lg hover:bg-opacity-50 transition-colors">
                    <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline transition-colors font-medium break-words">
                        {citation.title || citation.url}
                    </a>
                    <span className="text-gray-500 dark:text-gray-400 block text-xs mt-1 break-all">{citation.url}</span>
                </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default FinalReport;
