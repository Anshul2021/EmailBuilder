"use client";

import { useState } from "react";
import { Monitor, Smartphone, MailOpen } from "lucide-react";
import { clsx } from "clsx";

interface LivePreviewProps {
    html: string;
    isLoading: boolean;
}

export function LivePreview({ html, isLoading }: LivePreviewProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

    return (
        <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950/50">

            {/* Toolbar */}
            <div className="h-14 border-b border-border bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <MailOpen className="w-4 h-4" /> Live Preview
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode("desktop")}
                        className={clsx(
                            "p-1.5 rounded-md transition-all",
                            viewMode === "desktop"
                                ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400"
                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                        title="Desktop View"
                    >
                        <Monitor className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("mobile")}
                        className={clsx(
                            "p-1.5 rounded-md transition-all",
                            viewMode === "mobile"
                                ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400"
                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                        title="Mobile View"
                    >
                        <Smartphone className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex items-center justify-center relative">

                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                        <div className="flex items-center space-x-2 text-primary-600">
                            <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce"></div>
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">Generating Template...</p>
                    </div>
                )}

                {/* Iframe Container */}
                <div
                    className={clsx(
                        "bg-white h-full max-h-[850px] shadow-2xl rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-out",
                        viewMode === "desktop" ? "w-full max-w-4xl" : "w-[375px]"
                    )}
                >
                    {html ? (
                        <iframe
                            title="Email Preview"
                            srcDoc={html}
                            className="w-full h-full border-0 bg-white"
                            sandbox="allow-same-origin"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                            <MailOpen className="w-16 h-16 mb-4 opacity-50" />
                            <p>Your generated template will appear here</p>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}
