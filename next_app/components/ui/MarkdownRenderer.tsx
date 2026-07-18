'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Zero-dependency inline markdown renderer.
 * Handles: **bold**, *italic*, ### headings, - bullets, 1. numbered lists, `code`, paragraph breaks.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let k = 0;

  const flushList = () => {
    if (!listBuffer) return;
    const { type, items } = listBuffer;
    const Tag = type === 'ul' ? 'ul' : 'ol';
    elements.push(
      React.createElement(Tag, {
        key: k++,
        className: `my-1.5 pl-4 space-y-0.5 ${type === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-amber-500`,
      },
        items.map((item, i) =>
          React.createElement('li', { key: i, className: 'text-[11px] leading-relaxed' }, renderInline(item))
        )
      )
    );
    listBuffer = null;
  };

  const renderInline = (text: string): React.ReactNode => {
    // Tokenise **bold**, *italic*, `code` in order of precedence
    const tokens: React.ReactNode[] = [];
    let rest = text;
    let tk = 0;

    while (rest.length > 0) {
      const bold = rest.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/);
      const italic = rest.match(/^([\s\S]*?)\*([\s\S]+?)\*/);
      const code = rest.match(/^([\s\S]*?)`([^`]+)`/);

      const bi = bold ? bold[1].length : Infinity;
      const ii = italic ? italic[1].length : Infinity;
      const ci = code ? code[1].length : Infinity;
      const min = Math.min(bi, ii, ci);

      if (min === Infinity) { tokens.push(rest); break; }

      if (min === bi && bold) {
        if (bold[1]) tokens.push(bold[1]);
        tokens.push(React.createElement('strong', { key: tk++, className: 'font-bold text-[#1f2937] dark:text-white' }, bold[2]));
        rest = rest.slice(bold[0].length);
      } else if (min === ii && italic) {
        if (italic[1]) tokens.push(italic[1]);
        tokens.push(React.createElement('em', { key: tk++, className: 'italic' }, italic[2]));
        rest = rest.slice(italic[0].length);
      } else if (min === ci && code) {
        if (code[1]) tokens.push(code[1]);
        tokens.push(React.createElement('code', { key: tk++, className: 'bg-amber-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 px-1 py-0.5 rounded text-[10px] font-mono' }, code[2]));
        rest = rest.slice(code[0].length);
      } else { tokens.push(rest); break; }
    }

    return tokens.length === 1 ? tokens[0] : React.createElement(React.Fragment, null, ...tokens);
  };

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    const ul = line.match(/^[-*]\s+(.*)/);
    const ol = line.match(/^\d+\.\s+(.*)/);
    const hr = /^---+$/.test(line.trim());

    if (h3) {
      flushList();
      elements.push(React.createElement('h3', { key: k++, className: 'text-xs font-black text-amber-600 dark:text-amber-400 mt-3 mb-0.5' }, renderInline(h3[1])));
    } else if (h2) {
      flushList();
      elements.push(React.createElement('h2', { key: k++, className: 'text-[11px] font-black text-[#1f2937] dark:text-white mt-3 mb-0.5' }, renderInline(h2[1])));
    } else if (h1) {
      flushList();
      elements.push(React.createElement('h1', { key: k++, className: 'text-xs font-black text-[#1f2937] dark:text-white mt-3 mb-0.5' }, renderInline(h1[1])));
    } else if (ul) {
      if (listBuffer?.type === 'ul') { listBuffer.items.push(ul[1]); }
      else { flushList(); listBuffer = { type: 'ul', items: [ul[1]] }; }
    } else if (ol) {
      if (listBuffer?.type === 'ol') { listBuffer.items.push(ol[1]); }
      else { flushList(); listBuffer = { type: 'ol', items: [ol[1]] }; }
    } else if (hr) {
      flushList();
      elements.push(React.createElement('hr', { key: k++, className: 'my-2 border-slate-200 dark:border-slate-700' }));
    } else if (line.trim() === '') {
      flushList();
      if (elements.length > 0) elements.push(React.createElement('div', { key: k++, className: 'h-1.5' }));
    } else {
      flushList();
      elements.push(React.createElement('p', { key: k++, className: 'text-[11px] leading-relaxed' }, renderInline(line)));
    }
  }

  flushList();

  return React.createElement('div', { className: `space-y-0.5 ${className}` }, ...elements);
}
