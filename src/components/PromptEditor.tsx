"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizonal, FileCode, FileImage, RefreshCw, Sparkles, Paperclip, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./UI/Button";
import { TextArea } from "./UI/TextArea";
import { ImageUploader } from "./UI/ImageUploader";

interface Message {
    role: "user" | "model";
    text: string;
    isImage?: boolean;
}

interface PromptEditorProps {
    onGenerate: (prompt: string, imageBase64: string | null, mimeType: string | null, model: string) => void;
    isLoading: boolean;
    hasTemplate: boolean;
    onCopyMjml: () => void;
    onExportHtml: () => void;
    credits: number;
    totalCredits: number;
    percentage: number;
    messages: Message[];
    onLoadSample?: () => void;
}

const STARTER_PROMPTS = [
    { icon: "✉️", label: "Welcome email", prompt: "A clean, modern welcome email with a large hero section and a CTA button" },
    { icon: "📰", label: "Newsletter", prompt: "A professional newsletter template with 3 product columns and featured article" },
    { icon: "🔑", label: "Password reset", prompt: "A minimalist password reset email with a prominent reset button and security note" },
    { icon: "🎉", label: "Promo blast", prompt: "A bold promotional email with a 30% discount offer, countdown timer feel, and CTA" },
    { icon: "📦", label: "Order confirm", prompt: "An order confirmation email with product summary, delivery info and support link" },
    { icon: "🤝", label: "Onboarding", prompt: "A 3-step onboarding email guide for a SaaS app with icons and clean layout" },
];

const ACTIVE_MODEL = "gemini-2.5-flash";
const ACTIVE_MODEL_LABEL = "Gemini 2.5 Flash";

export function PromptEditor({
    onGenerate,
    isLoading,
    hasTemplate,
    onCopyMjml,
    onExportHtml,
    credits,
    totalCredits,
    percentage,
    messages,
    onLoadSample,
}: PromptEditorProps) {
    const [prompt, setPrompt] = useState("");
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string | null>(null);
    const selectedModel = ACTIVE_MODEL;
    const [showImageUploader, setShowImageUploader] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((prompt.trim() || imageBase64) && !isLoading) {
            onGenerate(prompt.trim(), imageBase64, mimeType, selectedModel);
            setPrompt("");
            setImageBase64(null);
            setMimeType(null);
            setShowImageUploader(false);
        }
    };

    const canSubmit = (prompt.trim().length > 0 || !!imageBase64) && !isLoading;

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-100 relative">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 leading-tight">Email Builder</h1>
                        <p className="text-xs text-slate-400 font-medium">Powered by Gemini</p>
                    </div>
                </div>

                {/* Credits badge */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-xs font-semibold text-slate-600">{credits.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400">/ {totalCredits.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Credits progress */}
            <div className="px-5 py-2 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary-500 to-violet-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">AI Credits</span>
                </div>
            </div>

            {/* ── Scroll area: chat or starters ── */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">

                {/* Starter prompts – only when no conversation */}
                {!hasTemplate && messages.length === 0 && (
                    <div className="animate-fade-in space-y-2.5 pt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5">Quick start</p>
                        <div className="grid grid-cols-2 gap-2">
                            {STARTER_PROMPTS.map((sp) => (
                                <button
                                    key={sp.label}
                                    onClick={() => {
                                        setPrompt(sp.prompt);
                                        textareaRef.current?.focus();
                                    }}
                                    className="starter-card"
                                >
                                    <span className="text-lg block mb-1">{sp.icon}</span>
                                    <span className="text-xs font-semibold text-slate-700">{sp.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat history */}
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {msg.role === "model" && (
                                <div className="flex items-start gap-2 max-w-[85%]">
                                    <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl rounded-tl-sm px-3.5 py-2.5 leading-relaxed">
                                        <span className="font-semibold text-primary-600 text-[10px] block mb-0.5 uppercase tracking-wider">AI</span>
                                        {msg.text.startsWith("<mjml>")
                                            ? "✅ Email template generated successfully."
                                            : msg.text}
                                    </div>
                                </div>
                            )}
                            {msg.role === "user" && (
                                <div className="bg-primary-600 text-white text-xs rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[80%] leading-relaxed shadow-sm">
                                    {msg.isImage && <span className="opacity-70 block text-[10px] mb-0.5">📎 Image attached</span>}
                                    {msg.text || "(image only)"}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Loading indicator */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2"
                    >
                        <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce-subtle" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Action bar (copy/export) ── */}
            <AnimatePresence>
                {hasTemplate && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="px-4 pt-2 pb-0 shrink-0 flex gap-2"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            leftIcon={<FileCode className="w-3.5 h-3.5" />}
                            onClick={onCopyMjml}
                        >
                            Copy MJML
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            leftIcon={<FileImage className="w-3.5 h-3.5" />}
                            onClick={onExportHtml}
                        >
                            Export HTML
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Prompt bar ── */}
            <div className="shrink-0 p-4">
                {/* Image uploader (collapsible) */}
                <AnimatePresence>
                    {showImageUploader && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 overflow-hidden"
                        >
                            <ImageUploader
                                onImageChange={(base64, mime) => {
                                    setImageBase64(base64);
                                    setMimeType(mime);
                                    if (!base64) setShowImageUploader(false);
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating prompt input box */}
                {onLoadSample && (
                    <div className="mb-3">
                        <Button
                            variant="primary"
                            className="w-full text-xs font-semibold py-2.5 bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 shadow-sm"
                            onClick={onLoadSample}
                            leftIcon={<FileCode className="w-4 h-4" />}
                        >
                            Load Sample Template (Free)
                        </Button>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="prompt-glow rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all" style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.07), 0 8px 28px rgba(15,23,42,0.05)" }}>
                        {/* Model indicator row */}
                        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 border-b border-slate-100">
                            <Zap className="w-3 h-3 text-violet-500 shrink-0" />
                            <span className="text-[11px] font-semibold text-slate-500 select-none">{ACTIVE_MODEL_LABEL}</span>
                        </div>

                        {/* Text input */}
                        <TextArea
                            ref={textareaRef}
                            value={prompt}
                            autoResize
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Describe the email you want to generate..."
                            className="w-full min-h-[80px] max-h-[180px] border-none shadow-none ring-0 ring-offset-0 focus-visible:ring-0 px-3 py-2.5 text-sm resize-none bg-white outline-none placeholder:text-slate-400 text-slate-800 rounded-none"
                            onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />

                        {/* Bottom bar */}
                        <div className="flex items-center justify-between px-2.5 py-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowImageUploader(v => !v)}
                                className={`p-1.5 rounded-lg transition-colors ${showImageUploader || imageBase64 ? "bg-primary-100 text-primary-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                                title="Attach image reference"
                            >
                                {imageBase64
                                    ? <X className="w-4 h-4" onClick={() => { setImageBase64(null); setMimeType(null); }} />
                                    : <Paperclip className="w-4 h-4" />
                                }
                            </button>

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className="flex items-center gap-1.5 bg-primary-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-primary-700 transition-all"
                            >
                                {isLoading
                                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    : <><SendHorizonal className="w-3.5 h-3.5" />{hasTemplate ? "Update" : "Generate"}</>
                                }
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
