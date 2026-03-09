"use client";

import { useState } from "react";
import { SendHorizonal, FileCode, FileImage, RefreshCw, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

interface PromptEditorProps {
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
    hasTemplate: boolean;
    onCopyMjml: () => void;
    onExportHtml: () => void;
    credits: number;
    totalCredits: number;
    percentage: number;
}

export function PromptEditor({
    onGenerate,
    isLoading,
    hasTemplate,
    onCopyMjml,
    onExportHtml,
    credits,
    totalCredits,
    percentage
}: PromptEditorProps) {
    const [prompt, setPrompt] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !isLoading) {
            onGenerate(prompt.trim());
        }
    };

    const getStarterPrompts = () => [
        "A clean welcome email with huge hero image and CTA",
        "A newsletter template with 3 product columns",
        "A minimalist password reset email"
    ];

    return (
        <div className="flex flex-col h-full p-6 w-full max-w-xl mx-auto border-r border-border bg-white dark:bg-slate-900 shadow-sm relative z-10">

            <div className="flex-1 overflow-y-auto mb-6 scrollbar-hide">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-primary-500/10 p-2 rounded-xl text-primary-600">
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">AI Email Builder</h1>
                    </div>

                    {/* Credits Bar */}
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-700/50">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Credits Left</span>
                            <span className="text-sm font-bold text-primary-600">{credits.toLocaleString()} / {totalCredits.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-primary-500 to-indigo-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>
                    </div>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 px-1">
                    Describe the email template you want, and our AI will generate professional MJML code and compile it instantly.
                </p>

                {!hasTemplate && (
                    <div className="space-y-3 mb-6 animate-fade-in">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Try these prompts:</h3>
                        <div className="flex flex-col gap-2">
                            {getStarterPrompts().map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPrompt(p)}
                                    className="text-left text-sm p-3 rounded-lg bg-slate-50 hover:bg-primary-50 text-slate-600 hover:text-primary-700 border border-transparent hover:border-primary-200 transition-all text-balance"
                                >
                                    &quot;{p}&quot;
                                </button>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            <div className="mt-auto space-y-4">
                {hasTemplate && (
                    <div className="flex gap-2 w-full animate-slide-up">
                        <button
                            onClick={onCopyMjml}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            <FileCode className="w-4 h-4" /> Copy MJML
                        </button>
                        <button
                            onClick={onExportHtml}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            <FileImage className="w-4 h-4" /> Export HTML
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-400 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A promotional email for a summer sale with 3 products..."
                            className="w-full min-h-[60px] max-h-[120px] p-4 pr-14 text-sm resize-none bg-transparent outline-none placeholder:text-slate-400 dark:text-slate-100"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !prompt.trim()}
                            className="absolute right-3 bottom-3 p-2 rounded-xl bg-primary-600 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-primary-700 transition-colors"
                        >
                            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
