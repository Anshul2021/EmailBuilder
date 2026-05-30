"use client";

import React from "react";

export function ChatContainerRoot({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-y-auto flex-1 custom-scrollbar ${className}`}>
      {children}
    </div>
  );
}

export function ChatContainerContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {children}
    </div>
  );
}
