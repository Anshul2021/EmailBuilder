"use client";

import React from "react";

export function Message({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 items-start ${className}`}>
      {children}
    </div>
  );
}

import BotIcon from "@/Assets/Bot.webp";

export function MessageAvatar({
  src,
  alt,
  fallback,
}: {
  src?: string;
  alt?: string;
  fallback?: string;
}) {
  const avatarSrc = src || BotIcon.src;
  return (
    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center border border-purple-200 shrink-0 overflow-hidden">
      {avatarSrc ? (
        <img src={avatarSrc} alt={alt || "AI Bot"} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-purple-600">{fallback || "AI"}</span>
      )}
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
