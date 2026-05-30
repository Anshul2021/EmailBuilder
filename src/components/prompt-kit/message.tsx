"use client";

import React from "react";

export function Message({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 items-start ${className}`}>
      {children}
    </div>
  );
}

export function MessageAvatar({
  src,
  alt,
  fallback,
}: {
  src?: string;
  alt?: string;
  fallback?: string;
}) {
  return (
    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-600 border border-purple-200 shrink-0">
      {fallback || "AI"}
    </div>
  );
}

export function MessageContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg p-2 text-xs leading-relaxed max-w-[95%] shadow-sm ${className}`}>
      {children}
    </div>
  );
}
