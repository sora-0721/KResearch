
import React, { useEffect, useRef } from 'react';

// Make global libraries available
declare var marked: any;
declare var mermaid: any;
declare var katex: any;
declare var renderMathInElement: any; // from KaTeX auto-render extension

const MarkdownRenderer: React.FC<{ text: string }> = React.memo(({ text }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const heavyProcessingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (contentRef.current && (text || text === '')) { // Ensure it runs even for empty text to clear content
      // 1. Convert Markdown to HTML using Marked (always run)
      if (typeof marked !== 'undefined') {
        contentRef.current.innerHTML = marked.parse(text);
      } else {
        contentRef.current.innerText = text; // Fallback
      }

      // Clear previous timeout for heavy processing
      if (heavyProcessingTimeoutRef.current) {
        clearTimeout(heavyProcessingTimeoutRef.current);
      }

      // Debounce heavy processing (KaTeX and Mermaid)
      // Only schedule if there's text to process, to avoid running on empty final clears.
      if (text.trim()) {
        heavyProcessingTimeoutRef.current = window.setTimeout(() => {
          if (!contentRef.current) return; // Check if component is still mounted

          // 2. Transform Mermaid code blocks from <pre><code> to <div class="mermaid">
          const preMermaidBlocks = contentRef.current.querySelectorAll('pre code.language-mermaid');
          preMermaidBlocks.forEach(codeBlock => {
            const preParent = codeBlock.parentElement as HTMLPreElement;
            if (preParent && preParent.parentNode) {
              const mermaidDiv = document.createElement('div');
              mermaidDiv.className = 'mermaid';
              const codeContent = codeBlock.textContent || '';
              mermaidDiv.textContent = codeContent; 
              mermaidDiv.setAttribute('data-mermaid-code', codeContent); 
              preParent.parentNode.replaceChild(mermaidDiv, preParent);
            }
          });
          
          // 3. Render KaTeX math expressions
          if (typeof katex !== 'undefined' && typeof renderMathInElement === 'function') {
            try {
              renderMathInElement(contentRef.current, {
                delimiters: [
                  { left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false },
                  { left: "\\(", right: "\\)", display: false }, { left: "\\[", right: "\\]", display: true }
                ],
                throwOnError: false
              });
            } catch(e) { console.error("KaTeX rendering error:", e); }
          }

          // 4. Render Mermaid diagrams
          if (typeof mermaid !== 'undefined') {
            const mermaidElements = Array.from(contentRef.current.querySelectorAll('div.mermaid'));
            if (mermaidElements.length > 0) {
              mermaidElements.forEach((el, i) => {
                const div = el as HTMLDivElement;
                const code = div.getAttribute('data-mermaid-code') || div.textContent || '';
                div.innerHTML = ''; 
                div.textContent = code; // Mermaid needs the raw code in textContent
                div.removeAttribute('data-processed'); 
                div.id = `mermaid-diag-${Date.now()}-${i}-${Math.random().toString(36).substring(2,7)}`; // Ensure more unique ID
              });
              try {
                mermaid.run({ nodes: mermaidElements.filter(el => el.textContent?.trim()) }); // Only run on non-empty
              } catch (e) {
                console.error("Mermaid rendering error in MarkdownRenderer:", e);
                mermaidElements.forEach(div => div.innerHTML = `<p style="color:red;">Mermaid Error: ${e instanceof Error ? e.message : String(e)}</p>`);
              }
            }
          }
        }, 300); // Debounce delay: 300ms. Adjust if needed.
      } else {
        // If text is empty, ensure no lingering timeout
        if (heavyProcessingTimeoutRef.current) {
            clearTimeout(heavyProcessingTimeoutRef.current);
        }
      }
    }
    
    return () => { // Cleanup timeout on unmount or if text changes before timeout
        if (heavyProcessingTimeoutRef.current) {
            clearTimeout(heavyProcessingTimeoutRef.current);
        }
    };
  }, [text]);

  return <div ref={contentRef} className="whitespace-pre-wrap break-words leading-relaxed" />;
});

export default MarkdownRenderer;
