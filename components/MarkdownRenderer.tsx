
import React, { useEffect, useRef } from 'react';

// Make global libraries available
declare var marked: any;
declare var mermaid: any;
declare var katex: any;
declare var renderMathInElement: any; // from KaTeX auto-render extension

const MarkdownRenderer: React.FC<{ text: string }> = React.memo(({ text }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && text) {
      // 1. Convert Markdown to HTML using Marked
      if (typeof marked !== 'undefined') {
        contentRef.current.innerHTML = marked.parse(text);
      } else {
        contentRef.current.innerText = text; // Fallback
      }

      // 2. Transform Mermaid code blocks
      const preMermaidBlocks = contentRef.current.querySelectorAll('pre code.language-mermaid');
      preMermaidBlocks.forEach(codeBlock => {
        const preParent = codeBlock.parentElement as HTMLPreElement;
        if (preParent) {
          const mermaidDiv = document.createElement('div');
          mermaidDiv.className = 'mermaid';
          const codeContent = codeBlock.textContent || '';
          mermaidDiv.textContent = codeContent; // Set textContent for mermaid to parse
          mermaidDiv.setAttribute('data-mermaid-code', codeContent); // Store original for re-runs
          preParent.parentNode?.replaceChild(mermaidDiv, preParent);
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
            // It's important mermaid has the raw code.
            // Ensure mermaid div is empty before re-processing, and textContent is set
            div.innerHTML = ''; 
            div.textContent = code;
            div.removeAttribute('data-processed'); // mermaid adds this, remove for potential re-runs
            div.id = `mermaid-diag-${Date.now()}-${i}`; // Unique ID for mermaid.run
          });
          try {
            // mermaid.contentLoaded(); // For older versions or specific setups
            mermaid.run({ nodes: mermaidElements });
          } catch (e) {
            console.error("Mermaid rendering error in MarkdownRenderer:", e);
            mermaidElements.forEach(div => div.innerHTML = `<p style="color:red;">Mermaid Error: ${e instanceof Error ? e.message : String(e)}</p>`);
          }
        }
      }
    }
  }, [text]); // Rerun when text changes

  return <div ref={contentRef} className="whitespace-pre-wrap break-words leading-relaxed" />;
});

export default MarkdownRenderer;
