import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

declare global {
  interface Window {
    mermaid?: any;
  }
}

interface MarkdownRendererProps {
  report: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ report }) => {
  useEffect(() => {
    if (report && window.mermaid) {
      const timer = setTimeout(async () => {
        try {
          const mermaidElements = document.querySelectorAll('.mermaid');
          if (mermaidElements.length) {
            mermaidElements.forEach(el => el.removeAttribute('data-processed'));
            // The mermaid.run() function can return a promise that rejects on parse error.
            // Awaiting it inside a try/catch prevents an unhandled rejection.
            await window.mermaid.run({ nodes: mermaidElements });
          }
        } catch(e) {
          // Now we catch the error properly. We can log it for debugging.
          // This prevents the [object Object] from appearing if some global handler was picking it up.
          console.error("Error rendering Mermaid graphs:", e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [report]);

  return (
    <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...props} />,
          a: ({node, ...props}) => <a className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 hover:brightness-125 transition-all duration-300" target="_blank" rel="noopener noreferrer" {...props} />,
          strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-gray-100" {...props} />,
          pre: ({ node, children, ...props }) => {
            const codeNode = node?.children[0];
            if (codeNode && codeNode.type === 'element' && codeNode.tagName === 'code') {
              const className = (codeNode.properties?.className || []) as string[];
              const match = /language-(\w+)/.exec(className[0] || '');
              if (match && match[1] === 'mermaid') {
                const textNode = codeNode.children?.[0];
                if (textNode && textNode.type === 'text') {
                  return (
                    <div className="p-4 my-4 bg-glass-light dark:bg-glass-dark rounded-2xl flex justify-center items-center overflow-x-auto">
                      <div key={textNode.value} className="mermaid" style={{ minWidth: '100%', textAlign: 'center' }}>
                        {textNode.value}
                      </div>
                    </div>
                  );
                }
              }
            }
            return (
              <div className="my-4 bg-black/20 dark:bg-black/40 backdrop-blur-[25px] border border-border-light/50 dark:border-border-dark/50 rounded-2xl overflow-x-auto">
                  <pre className="!bg-transparent !p-4" {...props}>{children}</pre>
              </div>
            );
          },
        }}
      >
        {report}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
