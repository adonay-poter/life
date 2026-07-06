'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  text: string;
  invert?: boolean;
}

export default function MarkdownMessage({ text, invert = false }: MarkdownMessageProps) {
  const proseClass = invert ? 'text-on-primary' : 'text-primary';
  const subtleClass = invert ? 'text-on-primary/80' : 'text-secondary';
  const borderClass = invert ? 'border-white/20' : 'border-border';
  const codeBgClass = invert ? 'bg-black/15' : 'bg-neutral-bg';
  const quoteBgClass = invert ? 'bg-black/10' : 'bg-neutral-bg/60';
  const tableStripeClass = invert ? 'even:bg-black/8' : 'even:bg-neutral-bg/40';

  return (
    <div className="space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className={`font-display text-2xl font-bold tracking-tight ${proseClass}`}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={`font-display text-xl font-bold tracking-tight ${proseClass}`}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={`font-display text-lg font-bold tracking-tight ${proseClass}`}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className={`font-display text-base font-bold tracking-tight ${proseClass}`}>{children}</h4>
          ),
          p: ({ children }) => <p className={`leading-7 ${proseClass}`}>{children}</p>,
          ul: ({ children }) => <ul className={`list-disc space-y-2 pl-6 ${proseClass}`}>{children}</ul>,
          ol: ({ children }) => <ol className={`list-decimal space-y-2 pl-6 ${proseClass}`}>{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className={`border-l-2 ${borderClass} ${quoteBgClass} px-4 py-3 italic ${subtleClass}`}>
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`underline underline-offset-4 ${invert ? 'text-on-primary' : 'text-accent'}`}
            >
              {children}
            </a>
          ),
          code: (props: any) =>
            props.inline ? (
              <code className={`rounded-sm px-1.5 py-0.5 font-label text-[0.9em] ${codeBgClass} ${proseClass}`}>
                {props.children}
              </code>
            ) : (
              <code className={`block overflow-x-auto whitespace-pre p-4 font-label text-xs leading-6 ${proseClass}`}>
                {props.children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className={`overflow-x-auto border ${borderClass} ${codeBgClass} p-0`}>{children}</pre>
          ),
          hr: () => <hr className={`my-2 border-0 border-t ${borderClass}`} />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className={`min-w-full border-collapse text-left text-sm ${proseClass}`}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={`${codeBgClass}`}>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className={`border-b ${borderClass} ${tableStripeClass}`}>{children}</tr>,
          th: ({ children }) => (
            <th className={`border-b ${borderClass} px-3 py-2 font-label text-[10px] uppercase tracking-[0.2em] ${subtleClass}`}>
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-3 py-2 align-top leading-6">{children}</td>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
