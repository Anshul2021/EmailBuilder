"use client";

import React from "react";

export function Markdown({ children }: { children: string }) {
  if (!children) return null;

  // Split by markdown code blocks if any
  const parts = children.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed whitespace-pre-wrap font-sans">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          let lang = "";
          let code = part.slice(3, -3).trim();
          if (lines[0] && lines[0].length < 10 && !lines[0].includes(" ") && !lines[0].includes("{")) {
            lang = lines[0];
            code = lines.slice(1).join("\n");
          }
          return (
            <pre key={index} className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[10px] overflow-x-auto my-2 border border-slate-800">
              {lang && <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 select-none font-sans font-bold">{lang}</div>}
              <code>{code}</code>
            </pre>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}
