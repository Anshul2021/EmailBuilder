"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizonal, FileCode, RefreshCw, Sparkles, Paperclip, X, Zap, ChevronsLeft, ChevronsRight, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./UI/Button";
import { TextArea } from "./UI/TextArea";
import { ImageUploader } from "./UI/ImageUploader";
import { Skeleton } from "primereact/skeleton";

import { Tooltip } from "./UI/Tooltip";
import { GEMINI_MODELS } from "@/lib/prompts";

interface Message {
    role: "user" | "model";
    text: string;
    isImage?: boolean;
}

interface PromptEditorProps {
    onGenerate: (prompt: string, imageBase64: string | null, mimeType: string | null, model: string) => void;
    isLoading: boolean;
    hasTemplate: boolean;
    credits: number;
    totalCredits: number;
    percentage: number;
    messages: Message[];
    onLoadSample?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
}

const STARTER_PROMPTS = [
    { icon: "✉️", label: "Welcome email", prompt: "A clean, modern welcome email with a large hero section and a CTA button" },
    { icon: "📰", label: "Newsletter", prompt: "A professional newsletter template with 3 product columns and featured article" },
    { icon: "🔑", label: "Password reset", prompt: "A minimalist password reset email with a prominent reset button and security note" },
    { icon: "🎉", label: "Promo blast", prompt: "A bold promotional email with a 30% discount offer, countdown timer feel, and CTA" },
    { icon: "📦", label: "Order confirm", prompt: "An order confirmation email with product summary, delivery info and support link" },
    { icon: "🤝", label: "Onboarding", prompt: "A 3-step onboarding email guide for a SaaS app with icons and clean layout" },
];

const QUICK_ACTIONS = [
    { label: "Change colors", prompt: "Change the color scheme to a more modern palette" },
    { label: "Add section", prompt: "Add a new content section with a heading and paragraph" },
    { label: "Update CTA", prompt: "Make the CTA button more prominent with a bold color" },
    { label: "Add footer", prompt: "Add a professional footer with social links and unsubscribe text" },
    { label: "Dark mode", prompt: "Convert this to a dark background theme with light text" },
    { label: "Add images", prompt: "Add placeholder images to make the layout more visual" },
];



export function PromptEditor({
    onGenerate,
    isLoading,
    hasTemplate,
    credits,
    totalCredits,
    percentage,
    messages,
    onLoadSample,
    isCollapsed = false,
    onToggleCollapse,
    selectedModel,
    onModelChange,
}: PromptEditorProps) {
    const [prompt, setPrompt] = useState("");
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showImageUploader, setShowImageUploader] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);
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
            setPreviewUrl(null);
            setShowImageUploader(false);
        }
    };

    const canSubmit = (prompt.trim().length > 0 || !!imageBase64) && !isLoading;

    // Get the latest user message and model response for command-mode view
    const latestUserMessage = [...messages].reverse().find(m => m.role === "user");
    const latestModelMessage = [...messages].reverse().find(m => m.role === "model");

    return (
        <div className="relative flex h-full">
            {/* ── Main Panel ── */}
            <motion.div
                initial={false}
                animate={{ width: isCollapsed ? 0 : "100%", opacity: isCollapsed ? 0 : 1 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                className="flex flex-col h-full bg-white border-r border-slate-100 overflow-hidden"
                style={{ minWidth: 0 }}
            >
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

                {/* ── Scroll area: command view or starters ── */}
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

                    {/* ── Command Mode: Show only latest exchange ── */}
                    {hasTemplate && messages.length > 0 && !showFullHistory && (
                        <div className="space-y-3">
                            {/* Status indicator */}
                            <div className="flex items-center gap-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Command</span>
                                {messages.length > 2 && (
                                    <button
                                        onClick={() => setShowFullHistory(true)}
                                        className="ml-auto text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors"
                                    >
                                        Show history ({Math.floor(messages.length / 2)})
                                    </button>
                                )}
                            </div>

                            {/* Latest user command */}
                            {latestUserMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-end"
                                >
                                    <div className="bg-primary-600 text-white text-xs rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[90%] leading-relaxed shadow-sm">
                                        {latestUserMessage.isImage && <span className="opacity-70 block text-[10px] mb-0.5">📎 Image attached</span>}
                                        {latestUserMessage.text || "(image only)"}
                                    </div>
                                </motion.div>
                            )}

                            {/* Latest AI response */}
                            {latestModelMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-2"
                                >
                                    <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl rounded-tl-sm px-3.5 py-2.5 leading-relaxed">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                            <span className="font-semibold text-emerald-600 text-[10px] uppercase tracking-wider">Done</span>
                                        </div>
                                        {latestModelMessage.text.startsWith("<mjml>")
                                            ? "Template updated successfully."
                                            : latestModelMessage.text}
                                    </div>
                                </motion.div>
                            )}

                            {/* Quick actions */}
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-0.5 mb-2">Quick actions</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_ACTIONS.map((qa) => (
                                        <button
                                            key={qa.label}
                                            onClick={() => {
                                                setPrompt(qa.prompt);
                                                textareaRef.current?.focus();
                                            }}
                                            className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
                                        >
                                            {qa.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Full History Mode ── */}
                    {showFullHistory && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full History</span>
                                <button
                                    onClick={() => setShowFullHistory(false)}
                                    className="ml-auto text-[10px] font-semibold text-violet-500 hover:text-violet-700 transition-colors"
                                >
                                    Show latest
                                </button>
                            </div>

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
                        </div>
                    )}

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
                            <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-tl-sm px-3.5 py-3 flex flex-col gap-2 min-w-[140px]">
                                <Skeleton width="100%" height="0.6rem" />
                                <Skeleton width="80%" height="0.6rem" />
                                <Skeleton width="40%" height="0.6rem" />
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ── Action bar (copy/export) ── */}


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
                                    previewUrl={previewUrl}
                                    onImageChange={(base64, mime, dataUrl) => {
                                        setImageBase64(base64);
                                        setMimeType(mime);
                                        setPreviewUrl(dataUrl || null);
                                        if (base64) {
                                            setPrompt(prev => prev.trim() === "" ? "generate this exact email template as it is and use DM sans font." : prev);
                                        }
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Load sample button */}
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
                            <div className="relative">
                                <Tooltip content="Choose which Gemini model should generate this email." position="bottom" className="w-full">
                                    <div 
                                        onClick={() => setShowModelDropdown(prev => !prev)}
                                        className="flex items-center w-full gap-1.5 px-3 pt-2.5 pb-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                    >
                                        <Zap className="w-3 h-3 text-violet-500 shrink-0" />
                                        <span className="text-[11px] font-semibold text-slate-700 select-none">
                                            {GEMINI_MODELS.find(m => m.value === selectedModel)?.label || selectedModel}
                                        </span>
                                        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showModelDropdown ? "rotate-180" : ""}`} />
                                        {hasTemplate && (
                                            <span className="ml-auto text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                Edit mode
                                            </span>
                                        )}
                                    </div>
                                </Tooltip>

                                <AnimatePresence>
                                    {showModelDropdown && (
                                        <>
                                            {/* Backdrop overlay to close dropdown */}
                                            <div 
                                                className="fixed inset-0 z-40" 
                                                onClick={() => setShowModelDropdown(false)} 
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute left-3 right-3 top-full mt-1.5 z-50 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-xl p-1.5 overflow-hidden"
                                                style={{ boxShadow: "0 10px 25px -5px rgba(15,23,42,0.12), 0 8px 16px -6px rgba(15,23,42,0.08)" }}
                                            >
                                                {GEMINI_MODELS.map((m) => (
                                                    <button
                                                        key={m.value}
                                                        type="button"
                                                        onClick={() => {
                                                            onModelChange(m.value);
                                                            setShowModelDropdown(false);
                                                        }}
                                                        className={`w-full flex flex-col items-start text-left px-3 py-2 rounded-lg transition-colors ${selectedModel === m.value ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-700"}`}
                                                    >
                                                        <div className="flex items-center w-full justify-between">
                                                            <span className="text-xs font-semibold text-slate-800">{m.label}</span>
                                                            {selectedModel === m.value && <Check className="w-3 h-3 text-violet-600" />}
                                                        </div>
                                                        <span className={`text-[10px] ${selectedModel === m.value ? "text-violet-500/80" : "text-slate-400"}`}>{m.description}</span>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Text input */}
                            <TextArea
                                ref={textareaRef}
                                value={prompt}
                                autoResize
                                onChange={e => setPrompt(e.target.value)}
                                placeholder={hasTemplate ? "Describe changes to your email..." : "Describe the email you want to generate..."}
                                className="w-full min-h-[80px] max-h-[180px] border-none shadow-none ring-0 ring-offset-0 focus-visible:ring-0 px-3 py-2.5 text-sm resize-none bg-white outline-none placeholder:text-slate-400 text-slate-800 rounded-none"
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                onPaste={e => {
                                    const items = e.clipboardData?.items;
                                    if (!items) return;
                                    for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf("image") !== -1) {
                                            const file = items[i].getAsFile();
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const result = ev.target?.result as string;
                                                    if (result) {
                                                        const base64Data = result.split(",")[1];
                                                        setImageBase64(base64Data);
                                                        setMimeType(file.type);
                                                        setPreviewUrl(result);
                                                        setShowImageUploader(true);
                                                        setPrompt(prev => prev.trim() === "" ? "generate this exact email template as it is and use DM sans font." : prev);
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                                e.preventDefault();
                                                break;
                                            }
                                        }
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
                                        ? <X className="w-4 h-4" onClick={(e) => { e.stopPropagation(); setImageBase64(null); setMimeType(null); }} />
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
            </motion.div>

            {/* ── Collapse / Expand Toggle Button ── */}
            {onToggleCollapse && (
                <motion.button
                    onClick={onToggleCollapse}
                    className="absolute -right-4 top-1/2 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-violet-600 hover:border-violet-300 hover:shadow-violet-100 transition-all"
                    style={{ transform: "translateY(-50%)" }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.94 }}
                    title={isCollapsed ? "Expand panel" : "Collapse panel"}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={isCollapsed ? "expand" : "collapse"}
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.18 }}
                        >
                            {isCollapsed
                                ? <ChevronsRight className="w-4 h-4" />
                                : <ChevronsLeft className="w-4 h-4" />
                            }
                        </motion.span>
                    </AnimatePresence>
                </motion.button>
            )}
        </div>
    );
}
