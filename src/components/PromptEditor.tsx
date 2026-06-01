"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    SendHorizonal, FileCode, RefreshCw, Sparkles, Paperclip, X,
    ChevronsLeft, ChevronsRight, Check, ChevronDown, AlertCircle,
    Zap, Clock, RotateCcw, Image as ImageIcon, Plus, SlidersHorizontal,
    ArrowUp, ArrowRight, FileText, Video, Music, Archive, UploadCloud, Copy, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Skeleton } from "primereact/skeleton";
import { Tooltip } from "./UI/Tooltip";
import { GEMINI_MODELS } from "@/lib/prompts";
import { Button } from "./UI/Button";
import { BorderGlow } from "./UI/BorderGlow";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "./prompt-kit/chain-of-thought";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "./prompt-kit/chat-container";
import { Markdown } from "./prompt-kit/markdown";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "./prompt-kit/message";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Types
export interface FileWithPreview {
    id: string;
    file: File;
    preview?: string;
    type: string;
    uploadStatus: "pending" | "uploading" | "complete" | "error";
    uploadProgress?: number;
    textContent?: string;
    base64Data?: string;
    mimeType?: string;
}

export interface PastedContent {
    id: string;
    content: string;
    timestamp: Date;
    wordCount: number;
}

interface Message {
    role: "user" | "model";
    text: string;
    isImage?: boolean;
}

interface PromptEditorProps {
    onGenerate: (prompt: string, imageBase64: string | null, mimeType: string | null, model: string, isFresh?: boolean) => void;
    isLoading: boolean;
    hasTemplate: boolean;
    messages: Message[];
    onLoadSample?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    usage: { 
        used: number; 
        limit: number; 
        remaining: number; 
        modelCounts?: Record<string, { used: number; limit: number; remaining: number }>;
    } | null;
    onResetUsage: () => void;
    onRestart?: () => void;
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

// Helper constants
const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PASTE_THRESHOLD = 200; // character threshold to create pasted text block

// Helper: generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper: check if textual
const isTextualFile = (file: File): boolean => {
    const textualTypes = [
        "text/",
        "application/json",
        "application/xml",
        "application/javascript",
        "application/typescript",
    ];

    const textualExtensions = [
        "txt", "md", "py", "js", "ts", "jsx", "tsx", "html", "htm", "css",
        "scss", "sass", "json", "xml", "yaml", "yml", "csv", "sql", "sh",
        "bash", "php", "rb", "go", "java", "c", "cpp", "h", "hpp", "cs",
        "rs", "swift", "kt", "scala", "r", "vue", "svelte", "astro",
        "config", "conf", "ini", "toml", "log", "gitignore", "dockerfile",
        "makefile", "readme"
    ];

    const isTextualMimeType = textualTypes.some((type) =>
        file.type.toLowerCase().startsWith(type)
    );

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const isTextualExtension =
        textualExtensions.includes(extension) ||
        file.name.toLowerCase().includes("readme") ||
        file.name.toLowerCase().includes("dockerfile") ||
        file.name.toLowerCase().includes("makefile");

    return isTextualMimeType || isTextualExtension;
};

// Helper: read file as text
const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};

// Helper: read image as base64 data and compress it client-side to prevent payload size issues on Vercel
const readImageAsBase64 = (file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            const MAX_DIM = 1200;
            if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                    height = Math.round((height * MAX_DIM) / width);
                    width = MAX_DIM;
                } else {
                    width = Math.round((width * MAX_DIM) / height);
                    height = MAX_DIM;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Compress as JPEG to keep the payload size extremely small (~100-150KB)
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                const base64 = dataUrl.split(",")[1] || "";
                resolve({ base64, mimeType: "image/jpeg", dataUrl });
            } else {
                reject(new Error("Failed to create canvas context for compression"));
            }
        };
        img.onerror = (e) => reject(e);
    });
};


// Helper: size formatter
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper: type label formatter
const getFileTypeLabel = (type: string): string => {
    const parts = type.split("/");
    let label = parts[parts.length - 1].toUpperCase();
    if (label.length > 7 && label.includes("-")) {
        label = label.substring(0, label.indexOf("-"));
    }
    if (label.length > 10) {
        label = label.substring(0, 10) + "...";
    }
    return label;
};

// Helper: file extension getter
const getFileExtension = (filename: string): string => {
    const extension = filename.split(".").pop()?.toUpperCase() || "FILE";
    return extension.length > 8 ? extension.substring(0, 8) + "..." : extension;
};

// ── Preview Components (Strict Light Mode) ──

const FilePreviewCard: React.FC<{
    file: FileWithPreview;
    onRemove: (id: string) => void;
    onPreviewClick?: (url: string) => void;
}> = ({ file, onRemove, onPreviewClick }) => {
    const isImage = file.type.startsWith("image/");
    const isTextual = isTextualFile(file.file);

    return isTextual ? (
        <TextualFilePreviewCard file={file} onRemove={onRemove} />
    ) : (
        <div
            className={cn(
                "relative group bg-slate-50 border border-slate-200 rounded-xl p-3 size-[115px] shadow-sm flex-shrink-0 overflow-hidden transition-all",
                isImage ? "p-0" : "p-3"
            )}
        >
            <div className="flex items-start gap-3 size-full overflow-hidden">
                {isImage && file.preview ? (
                    <div 
                        className="relative size-full rounded-lg overflow-hidden bg-slate-100 cursor-pointer"
                        onClick={() => onPreviewClick?.(file.preview!)}
                        title="Click to view full screen"
                    >
                        <img
                            src={file.preview}
                            alt={file.file.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : null}
                {!isImage && (
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-slate-100/90 from-transparent overflow-hidden">
                                <p className="absolute bottom-2 left-2 capitalize text-slate-700 text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                                    {getFileTypeLabel(file.type)}
                                </p>
                            </div>
                            {file.uploadStatus === "uploading" && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                            )}
                            {file.uploadStatus === "error" && (
                                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                        </div>

                        <p className="max-w-[90%] text-xs font-semibold text-slate-800 truncate" title={file.file.name}>
                            {file.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {formatFileSize(file.file.size)}
                        </p>
                    </div>
                )}
            </div>
            <button
                type="button"
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all z-10"
                onClick={() => onRemove(file.id)}
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
};

const PastedContentCard: React.FC<{
    content: PastedContent;
    onRemove: (id: string) => void;
}> = ({ content, onRemove }) => {
    const [isExpanded] = useState(false);
    const previewText = content.content.slice(0, 150);
    const needsTruncation = content.content.length > 150;

    return (
        <div className="bg-slate-50 border border-slate-200 relative rounded-xl p-3 size-[115px] shadow-sm flex-shrink-0 overflow-hidden transition-all">
            <div className="text-[9px] text-slate-600 whitespace-pre-wrap break-words max-h-20 overflow-y-auto custom-scrollbar font-mono leading-tight">
                {isExpanded || !needsTruncation ? content.content : previewText}
                {!isExpanded && needsTruncation && "..."}
            </div>
            <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-slate-100/95 from-transparent overflow-hidden">
                <p className="capitalize text-slate-700 text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                    PASTED
                </p>
                <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-200 flex items-center gap-1 absolute top-1.5 right-1.5 z-10">
                    <button
                        type="button"
                        className="size-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
                        onClick={() => navigator.clipboard.writeText(content.content)}
                        title="Copy content"
                    >
                        <Copy className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        className="size-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
                        onClick={() => onRemove(content.id)}
                        title="Remove content"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const TextualFilePreviewCard: React.FC<{
    file: FileWithPreview;
    onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
    const [isExpanded] = useState(false);
    const previewText = file.textContent?.slice(0, 150) || "";
    const needsTruncation = (file.textContent?.length || 0) > 150;
    const fileExtension = getFileExtension(file.file.name);

    return (
        <div className="bg-slate-50 border border-slate-200 relative rounded-xl p-3 size-[115px] shadow-sm flex-shrink-0 overflow-hidden transition-all">
            <div className="text-[9px] text-slate-600 whitespace-pre-wrap break-words max-h-20 overflow-y-auto custom-scrollbar font-mono leading-tight">
                {file.textContent ? (
                    <>
                        {isExpanded || !needsTruncation ? file.textContent : previewText}
                        {!isExpanded && needsTruncation && "..."}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                    </div>
                )}
            </div>
            <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-slate-100/95 from-transparent overflow-hidden">
                <p className="capitalize text-slate-700 text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                    {fileExtension}
                </p>
                {file.uploadStatus === "uploading" && (
                    <div className="absolute top-2 left-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                    </div>
                )}
                {file.uploadStatus === "error" && (
                    <div className="absolute top-2 left-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    </div>
                )}
                <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-200 flex items-center gap-1 absolute top-1.5 right-1.5 z-10">
                    {file.textContent && (
                        <button
                            type="button"
                            className="size-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
                            onClick={() => navigator.clipboard.writeText(file.textContent || "")}
                            title="Copy content"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                    )}
                    <button
                        type="button"
                        className="size-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
                        onClick={() => onRemove(file.id)}
                        title="Remove file"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ModelSelectorDropdown: React.FC<{
    models: typeof GEMINI_MODELS;
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    hasTemplate: boolean;
    usage: { used: number; limit: number; remaining: number; modelCounts?: Record<string, { used: number; limit: number; remaining: number }> } | null;
    size?: 'sm' | 'md';
}> = ({ models, selectedModel, onModelChange, hasTemplate, usage, size = 'sm' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedModelData = models.find((m) => m.value === selectedModel) || models[0];
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                className={cn(
                    "text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors select-none",
                    size === 'md' ? "h-9 px-3.5" : "h-9 px-3 md:h-7 md:px-2"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Zap className="w-3 h-3 text-violet-500 shrink-0" />
                <span className="truncate max-w-[100px] select-none">
                    {selectedModelData?.label}
                </span>
                <ChevronDown
                    className={cn(
                        "h-3 w-3 text-slate-400 transition-transform",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 overflow-hidden">
                    {models.map((model) => {
                        const modelUsage = usage?.modelCounts?.[model.value];
                        const isLimitReached = modelUsage ? modelUsage.remaining <= 0 : false;
                        
                        return (
                            <button
                                key={model.value}
                                type="button"
                                disabled={isLimitReached}
                                className={cn(
                                    "w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between relative",
                                    isLimitReached ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400" :
                                    model.value === selectedModel ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-700"
                                )}
                                onClick={() => {
                                    if (!isLimitReached) {
                                        onModelChange(model.value);
                                        setIsOpen(false);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className={cn("text-xs font-semibold", 
                                        isLimitReached ? "text-slate-400 font-medium" : 
                                        model.value === selectedModel ? "text-violet-700 font-semibold" : "text-slate-800 font-medium"
                                    )}>
                                        {model.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {isLimitReached ? (
                                        <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">Limit reached</span>
                                    ) : model.badge ? (
                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border",
                                            model.value === "gemini-3.1-flash-lite" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        )}>
                                            {model.badge}
                                        </span>
                                    ) : null}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

function ChainOfThoughtThinking() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < 3 ? s + 1 : s));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-3xl bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-2.5">
      <div className="text-[11px] font-bold text-slate-400 tracking-wide flex items-center gap-1.5 px-2">
        <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
        thinking process
      </div>
      <ChainOfThought>
        <ChainOfThoughtStep status={step > 0 ? "completed" : "thinking"} initialOpen={step === 0}>
          <ChainOfThoughtTrigger>
            analyzing prompt requirements
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>detecting layout intent and styling context</ChainOfThoughtItem>
            <ChainOfThoughtItem>selecting appropriate color scheme and typography</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>

        <ChainOfThoughtStep status={step > 1 ? "completed" : step === 1 ? "thinking" : "pending"} initialOpen={step === 1}>
          <ChainOfThoughtTrigger>
            structuring email layout & sections
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>generating responsive MJML container coordinates</ChainOfThoughtItem>
            <ChainOfThoughtItem>positioning content blocks, CTAs, and images</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>

        <ChainOfThoughtStep status={step > 2 ? "completed" : step === 2 ? "thinking" : "pending"} initialOpen={step === 2}>
          <ChainOfThoughtTrigger>
            applying styling & typography tokens
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>integrating DM Sans font values</ChainOfThoughtItem>
            <ChainOfThoughtItem>configuring text alignments, margins, and border-radii</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>

        <ChainOfThoughtStep status={step === 3 ? "thinking" : "pending"} initialOpen={step === 3}>
          <ChainOfThoughtTrigger>
            synthesizing code output
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>compiling final responsive MJML code</ChainOfThoughtItem>
            <ChainOfThoughtItem>validating code structure prior to render</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
      </ChainOfThought>
    </div>
  );
}

// ── Main Component ──

export function PromptEditor({
    onGenerate,
    isLoading,
    hasTemplate,
    messages,
    onLoadSample,
    isCollapsed = false,
    onToggleCollapse,
    selectedModel,
    onModelChange,
    usage,
    onResetUsage,
    onRestart,
}: PromptEditorProps) {
    const [prompt, setPrompt] = useState("");
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
    const [hasPasted, setHasPasted] = useState(false);

    const currentModelUsage = usage?.modelCounts?.[selectedModel] || { used: 0, limit: 3, remaining: 3 };
    const limitReached = usage !== null && currentModelUsage.remaining <= 0;
    const [placeholder, setPlaceholder] = useState("");

    useEffect(() => {
        if (limitReached) {
            setPlaceholder("Limit reached. Try again tomorrow.");
            return;
        }
        if (hasTemplate) {
            setPlaceholder("Describe changes to your email...");
            return;
        }

        const phrases = [
            "Describe your template Idea and we will build it...",
            "Attach any email template and make it editable..."
        ];

        let phraseIdx = 0;
        let charIdx = 0;
        let isDeleting = false;
        let timeoutId: NodeJS.Timeout;

        const tick = () => {
            const currentPhrase = phrases[phraseIdx];
            if (!isDeleting) {
                setPlaceholder(currentPhrase.substring(0, charIdx + 1));
                charIdx++;

                if (charIdx === currentPhrase.length) {
                    isDeleting = true;
                    timeoutId = setTimeout(tick, 1500);
                    return;
                }
                timeoutId = setTimeout(tick, 25);
            } else {
                setPlaceholder(currentPhrase.substring(0, charIdx - 1));
                charIdx--;

                if (charIdx === 0) {
                    isDeleting = false;
                    phraseIdx = (phraseIdx + 1) % phrases.length;
                    timeoutId = setTimeout(tick, 300);
                    return;
                }
                timeoutId = setTimeout(tick, 10);
            }
        };

        tick();

        return () => {
            clearTimeout(timeoutId);
        };
    }, [limitReached, hasTemplate]);

    const handleCancelPaste = useCallback(() => {
        setHasPasted(false);
        setPrompt("");
        setPastedContent([]);
        setFiles([]);
    }, []);

    const processPastedText = useCallback((textData: string) => {
        setPrompt("Generate this exact email template in a nice professional looking way, make sure nothing is missed everything should be exactly as it is, but for images only use text placeholders, and use DM Sans font");
        const pastedItem: PastedContent = {
            id: generateId(),
            content: textData,
            timestamp: new Date(),
            wordCount: textData.split(/\s+/).filter(Boolean).length,
        };
        setPastedContent([pastedItem]);
        setHasPasted(true);
    }, []);



    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Textarea autosize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const maxH = 140;
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxH)}px`;
        }
    }, [prompt]);

    // File processing handlers
    const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        // Revoke URLs for existing files to prevent memory leaks, then clear them to enforce a single-file limit
        setFiles((prev) => {
            prev.forEach((f) => {
                if (f.preview && f.preview.startsWith("blob:")) {
                    URL.revokeObjectURL(f.preview);
                }
            });
            return [];
        });

        // Take only the first file
        const fileToAdd = selectedFiles[0];
        if (!fileToAdd) return;

        if (fileToAdd.size > MAX_FILE_SIZE) {
            alert(`File ${fileToAdd.name} exceeds the 50MB size limit.`);
            return;
        }

        const newFile = {
            id: generateId(),
            file: fileToAdd,
            preview: fileToAdd.type.startsWith("image/") ? URL.createObjectURL(fileToAdd) : undefined,
            type: fileToAdd.type || "application/octet-stream",
            uploadStatus: "pending" as const,
            uploadProgress: 0,
        };

        // Initialize state with the new file
        setFiles([newFile]);
        setHasPasted(true);

        // Process textual file reading
        if (isTextualFile(newFile.file)) {
            readFileAsText(newFile.file)
                .then((textContent) => {
                    setFiles((prev) =>
                        prev.map((f) => (f.id === newFile.id ? { ...f, textContent } : f))
                    );
                })
                .catch((err) => {
                    console.error("Error reading file text:", err);
                    setFiles((prev) =>
                        prev.map((f) => (f.id === newFile.id ? { ...f, uploadStatus: "error" } : f))
                    );
                });
        }

        // Process image file reading (base64)
        if (newFile.file.type.startsWith("image/")) {
            readImageAsBase64(newFile.file)
                .then(({ base64, mimeType, dataUrl }) => {
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === newFile.id
                                ? { ...f, base64Data: base64, mimeType, preview: dataUrl }
                                : f
                        )
                    );
                })
                .catch((err) => {
                    console.error("Error converting image:", err);
                    setFiles((prev) =>
                        prev.map((f) => (f.id === newFile.id ? { ...f, uploadStatus: "error" } : f))
                    );
                });
        }

        // Simulate uploading
        setFiles((prev) =>
            prev.map((f) => (f.id === newFile.id ? { ...f, uploadStatus: "uploading" } : f))
        );

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 25 + 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === newFile.id
                            ? { ...f, uploadStatus: "complete", uploadProgress: 100 }
                            : f
                    )
                );
            } else {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === newFile.id ? { ...f, uploadProgress: progress } : f
                    )
                );
            }
        }, 100);
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => {
            const fileToRemove = prev.find((f) => f.id === id);
            if (fileToRemove?.preview && fileToRemove.preview.startsWith("blob:")) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            const updated = prev.filter((f) => f.id !== id);
            if (updated.length === 0 && pastedContent.length === 0) {
                setHasPasted(false);
                setPrompt((p) => {
                    const defaultPrompt = "Generate this exact email template in a nice professional looking way, make sure nothing is missed everything should be exactly as it is, but for images only use text placeholders, and use DM Sans font";
                    return p.trim() === defaultPrompt.trim() ? "" : p;
                });
            }
            return updated;
        });
    }, [pastedContent]);

    // Clipboard paste interceptor
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const clipboardData = e.clipboardData;
        const items = clipboardData.items;

        const fileItems = Array.from(items).filter((item) => item.kind === "file");
        if (fileItems.length > 0 && files.length < MAX_FILES) {
            e.preventDefault();
            const pastedFiles = fileItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
            const dataTransfer = new DataTransfer();
            pastedFiles.forEach((file) => dataTransfer.items.add(file));
            handleFileSelect(dataTransfer.files);
            setHasPasted(true);
        }
    }, [handleFileSelect, files.length]);

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (
                target.tagName === "INPUT" || 
                target.tagName === "TEXTAREA" || 
                target.hasAttribute("contenteditable") || 
                target.closest('[contenteditable="true"]') ||
                target.closest('.ql-editor')
            )) {
                return;
            }

            const clipboardData = e.clipboardData;
            if (!clipboardData) return;

            const fileItems = Array.from(clipboardData.items).filter((item) => item.kind === "file");
            if (fileItems.length > 0 && files.length < MAX_FILES) {
                e.preventDefault();
                const pastedFiles = fileItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
                const dataTransfer = new DataTransfer();
                pastedFiles.forEach((file) => dataTransfer.items.add(file));
                handleFileSelect(dataTransfer.files);
                setHasPasted(true);
            }
        };

        window.addEventListener("paste", handleGlobalPaste);
        return () => {
            window.removeEventListener("paste", handleGlobalPaste);
        };
    }, [handleFileSelect, files.length]);

    // Drag-and-drop callbacks
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [handleFileSelect]);

    // Submission handler
    const handleSend = useCallback(() => {
        const limitReached = usage !== null && usage.remaining <= 0;
        const hasContent = prompt.trim() || files.length > 0 || pastedContent.length > 0;
        const canSend = hasContent && !isLoading && !limitReached && !files.some((f) => f.uploadStatus === "uploading");

        if (!canSend) return;

        // Concatenate prompt messages
        let finalPrompt = prompt.trim();
        if (pastedContent.length > 0) {
            finalPrompt += "\n\n--- Pasted Context ---\n" + pastedContent.map((c, idx) => `[Pasted Text #${idx + 1}]:\n${c.content}`).join("\n\n");
        }

        const textualFiles = files.filter(f => isTextualFile(f.file));
        if (textualFiles.length > 0) {
            finalPrompt += "\n\n--- Referenced Files ---\n" + textualFiles.map((f) => `[File: ${f.file.name}]:\n${f.textContent || ""}`).join("\n\n");
        }

        // Extract first image reference
        const imageFile = files.find(f => f.file.type.startsWith("image/"));
        const base64Data = imageFile?.base64Data || null;
        const mimeType = imageFile?.mimeType || null;

        onGenerate(finalPrompt, base64Data, mimeType, selectedModel, hasPasted);

        // Reset input card state
        setPrompt("");
        files.forEach((f) => {
            if (f.preview && f.preview.startsWith("blob:")) {
                URL.revokeObjectURL(f.preview);
            }
        });
        setFiles([]);
        setPastedContent([]);
        setHasPasted(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    }, [prompt, files, pastedContent, isLoading, usage, selectedModel, onGenerate, hasPasted]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    // Starter prompts & actions helper
    const handleQuickAction = (text: string) => {
        setPrompt(text);
        textareaRef.current?.focus();
    };

    const hasContent = prompt.trim() || files.length > 0 || pastedContent.length > 0;
    const canSend = hasContent && !isLoading && !limitReached && !files.some((f) => f.uploadStatus === "uploading");

    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const latestModelMessage = [...messages].reverse().find((m) => m.role === "model");

    const activeModelUsage = usage?.modelCounts?.[selectedModel] || { used: 0, limit: 3, remaining: 3 };
    const usageFraction = usage ? usage.remaining / usage.limit : 1;
    const usagePillColor = usageFraction > 0.5
        ? "bg-purple-50 text-purple-700 border-purple-200"
        : usageFraction > 0
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-600 border-red-200";

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
                <div className="flex items-center justify-between px-5 pt-6 pb-2 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 leading-tight">AI Email Builder</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {usage && (
                            <Tooltip content="3 per model per day limit" position="bottom">
                                <div className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-semibold cursor-help ${usagePillColor}`}>
                                    <Clock className="w-3 h-3" />
                                    <span>{usage.remaining}/{usage.limit} today</span>
                                </div>
                            </Tooltip>
                        )}
                        <button
                            onClick={onResetUsage}
                            className="text-[10px] font-bold text-violet-600 hover:text-white border border-violet-200 hover:border-violet-600 hover:bg-violet-600 px-2 py-1 rounded-lg transition-all"
                            title="Reset daily model generation limits"
                        >
                            Reset Limits
                        </button>
                    </div>
                </div>



                {/* ── Scroll Area ── */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                    {/* Empty State / Starter Prompts */}
                    {!hasTemplate && messages.length === 0 && !isLoading && (
                        <div className="animate-fade-in space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {STARTER_PROMPTS.map((sp) => (
                                    <button
                                        key={sp.label}
                                        onClick={() => handleQuickAction(sp.prompt)}
                                        className="starter-card text-left p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/20 transition-all shadow-sm bg-white"
                                    >
                                        <span className="text-lg block mb-1">{sp.icon}</span>
                                        <span className="text-xs font-semibold text-slate-700">{sp.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unified Premium Chat Feed using ChatContainer */}
                    {messages.length > 0 && (
                        <ChatContainerRoot className="flex-grow min-h-0">
                            <ChatContainerContent className="p-1 space-y-4">
                                {messages.map((message, i) => {
                                    const isAssistant = message.role === "model";

                                    return (
                                        <Message
                                            key={i}
                                            className={
                                                message.role === "user" ? "justify-end" : "justify-start"
                                            }
                                        >
                                            {isAssistant && (
                                                <MessageAvatar
                                                    fallback="ai"
                                                />
                                            )}
                                            <div className="max-w-[95%] flex-1 sm:max-w-[95%]">
                                                {isAssistant ? (
                                                    <div className="bg-slate-100 border border-slate-100 text-slate-800 rounded-lg p-2 leading-relaxed shadow-sm flex flex-col items-start gap-1">
                                                        <Markdown>{message.text.startsWith("<mjml>") ? "template updated successfully." : message.text}</Markdown>
                                                        {message.text.includes("AI Email Template Builder") && onRestart && (
                                                            <button
                                                                onClick={onRestart}
                                                                className="mt-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                                                            >
                                                                Start from Scratch
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <MessageContent className="bg-gray-700 text-white font-medium">
                                                        {message.isImage && (
                                                            <span className="opacity-70 flex items-center gap-1 text-[10px] mb-1 font-semibold">
                                                                <ImageIcon className="w-3.5 h-3.5" /> image attached
                                                            </span>
                                                        )}
                                                        {message.text || "(image only)"}
                                                    </MessageContent>
                                                )}
                                            </div>
                                        </Message>
                                    );
                                })}
                            </ChatContainerContent>
                        </ChatContainerRoot>
                    )}

                    {/* Skeletons while generating */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2 w-full"
                        >
                            <ChainOfThoughtThinking />
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ── Premium Claude-Inspired Chat Input Container ── */}
                <div className="shrink-0 p-4 space-y-3">
                    <style dangerouslySetInnerHTML={{__html: `
                        .hide-scroll-bar::-webkit-scrollbar {
                            display: none !important;
                        }
                        .hide-scroll-bar {
                            -ms-overflow-style: none !important;
                            scrollbar-width: none !important;
                        }
                    `}} />

                    {/* Quick Modification Tags / Suggestion Chips as a scrollable strip */}
                    {!limitReached && !isLoading && (
                        <div className="flex gap-2 overflow-x-auto hide-scroll-bar py-1 px-0.5 scroll-smooth">
                            {QUICK_ACTIONS.map((qa) => (
                                <button
                                    key={qa.label}
                                    type="button"
                                    onClick={() => handleQuickAction(qa.prompt)}
                                    className="text-xs font-medium text-slate-600 bg-white border border-slate-200/80 rounded-lg px-3 py-1 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all shrink-0 shadow-sm"
                                >
                                    {qa.label.toLowerCase()}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Warning message if quota is exceeded */}
                    {limitReached && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 flex items-start gap-2.5 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-800">daily limit reached</p>
                                <p className="text-red-600 mt-0.5 leading-relaxed font-medium">you've used all generations for today. limits reset at midnight.</p>
                            </div>
                        </div>
                    )}

                    {/* Start from Scratch Option */}
                    {hasTemplate && onRestart && (
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={onRestart}
                                className="text-xs font-bold text-violet-600 hover:text-white border border-violet-200 hover:border-violet-600 hover:bg-violet-600 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                                title="Reset workspace and start from scratch"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Start from scratch
                            </button>
                        </div>
                    )}

                    {/* Intercept-based File Upload + Chat Box */}
                    <motion.div
                        layout
                        className="relative w-full"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 38
                        }}
                    >
                        {isDragging && (
                            <div className="absolute inset-0 z-50 bg-violet-50/95 border-2 border-dashed border-violet-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none transition-all">
                                <UploadCloud className="size-8 text-violet-500 mb-2 animate-bounce" />
                                <p className="text-xs font-semibold text-violet-600 flex items-center gap-1.5">
                                    Drop files here to add references
                                </p>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {hasPasted ? (
                                <motion.div
                                    key="generate-button"
                                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: -10 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="flex flex-col gap-2.5 w-full"
                                >
                                    {/* Horizontal scroll list of preview cards (images or text) */}
                                    {(files.length > 0 || pastedContent.length > 0) && (
                                        <div className="overflow-x-auto border border-slate-200/60 p-3 w-full bg-slate-50/50 hide-scroll-bar rounded-2xl">
                                            <div className="flex gap-3">
                                                {pastedContent.map((content) => (
                                                    <PastedContentCard
                                                        key={content.id}
                                                        content={content}
                                                        onRemove={(id) => {
                                                            setPastedContent((prev) => {
                                                                const updated = prev.filter((c) => c.id !== id);
                                                                if (updated.length === 0 && files.length === 0) {
                                                                    setHasPasted(false);
                                                                }
                                                                return updated;
                                                            });
                                                        }}
                                                    />
                                                ))}
                                                {files.map((file) => (
                                                    <FilePreviewCard
                                                        key={file.id}
                                                        file={file}
                                                        onRemove={removeFile}
                                                        onPreviewClick={setFullscreenImageUrl}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                     <div className="flex gap-2 items-center w-full">
                                         <button
                                             type="button"
                                             onClick={handleSend}
                                             disabled={isLoading}
                                             className="flex-1 h-9 bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 group text-xs relative overflow-hidden disabled:opacity-75 disabled:cursor-not-allowed"
                                         >
                                             {isLoading ? (
                                                 <>
                                                     <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                     <span>Generating...</span>
                                                 </>
                                             ) : (
                                                 <>
                                                     <span>Generate Template</span>
                                                     <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                 </>
                                             )}
                                         </button>

                                         <ModelSelectorDropdown
                                             models={GEMINI_MODELS}
                                             selectedModel={selectedModel}
                                             onModelChange={onModelChange}
                                             hasTemplate={hasTemplate}
                                             usage={usage}
                                             size="md"
                                         />
                                     </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="prompt-bar"
                                    initial={{ opacity: 0, scale: 0.98, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98, y: -5 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="w-full"
                                >
                                    <BorderGlow
                                        glowColor="262 80% 80%"
                                        backgroundColor="#ffffff"
                                        borderRadius={16}
                                        glowRadius={30}
                                        glowIntensity={1.0}
                                        fillOpacity={0.05}
                                        colors={['#8b5cf6', '#a855f7', '#d8b4fe']}
                                        className="w-full"
                                    >
                                        <div className="w-full bg-transparent focus-within:ring-2 focus-within:ring-violet-500/10 rounded-2xl items-end gap-1 flex flex-col relative transition-all">
                                            {/* Horizontal scroll list of preview cards */}
                                            {(files.length > 0 || pastedContent.length > 0) && (
                                                <div className="overflow-x-auto border-b border-slate-100 p-3 w-full bg-slate-50/50 hide-scroll-bar rounded-t-2xl">
                                                    <div className="flex gap-3">
                                                        {pastedContent.map((content) => (
                                                            <PastedContentCard
                                                                key={content.id}
                                                                content={content}
                                                                onRemove={(id) => {
                                                                    setPastedContent((prev) => {
                                                                        const updated = prev.filter((c) => c.id !== id);
                                                                        if (updated.length === 0 && files.length === 0) {
                                                                            setHasPasted(false);
                                                                            setPrompt((p) => {
                                                                                const defaultPrompt1 = "Generate this exact email template in a nice professional looking way, make sure nothing is missed everything should be exactly as it is, but for images only use text placeholders, and use DM Sans font";
                                                                                const defaultPrompt2 = "Generate this exact email template in a nice professional looking way, make sure nothing is missed everything should be exactly as it is, but for images only use text placeholders, and use DM Sans font";
                                                                                const trimmed = p.trim();
                                                                                return (trimmed === defaultPrompt1.trim() || trimmed === defaultPrompt2.trim()) ? "" : p;
                                                                            });
                                                                        }
                                                                        return updated;
                                                                    });
                                                                }}
                                                            />
                                                        ))}
                                                        {files.map((file) => (
                                                            <FilePreviewCard
                                                                key={file.id}
                                                                file={file}
                                                                onRemove={removeFile}
                                                                onPreviewClick={setFullscreenImageUrl}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Prompt Input Textarea */}
                                            <textarea
                                                ref={textareaRef}
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                onPaste={handlePaste}
                                                onKeyDown={handleKeyDown}
                                                placeholder={placeholder}
                                                disabled={isLoading || limitReached}
                                                className="flex-1 min-h-[100px] w-full px-4 pt-3.5 pb-1 focus:outline-none border-none outline-none focus-within:ring-0 max-h-[140px] resize-none bg-transparent text-slate-800 placeholder:text-slate-400 text-sm leading-relaxed custom-scrollbar disabled:cursor-not-allowed disabled:text-slate-400"
                                                rows={1}
                                            />

                                            {/* Toolbar actions bar */}
                                            <div className="flex items-center gap-2 justify-between w-full px-3 pb-2">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        className="h-9 w-9 md:h-7 md:w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex-shrink-0 transition-colors"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isLoading || limitReached || files.length >= MAX_FILES}
                                                        title={
                                                            files.length >= MAX_FILES
                                                                ? `Max ${MAX_FILES} images reached`
                                                                : "Attach image"
                                                        }
                                                    >
                                                        <ImageIcon className="h-5 w-5 md:h-4 md:w-4" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <ModelSelectorDropdown
                                                        models={GEMINI_MODELS}
                                                        selectedModel={selectedModel}
                                                        onModelChange={onModelChange}
                                                        hasTemplate={hasTemplate}
                                                        usage={usage}
                                                    />

                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "h-9 w-9 md:h-7 md:w-7 flex items-center justify-center flex-shrink-0 rounded-lg transition-all shadow-sm",
                                                            canSend
                                                                ? "bg-violet-600 hover:bg-violet-700 text-white hover:scale-[1.02] active:scale-[0.98]"
                                                                : "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                                                        )}
                                                        onClick={handleSend}
                                                        disabled={!canSend}
                                                        title="Send message"
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="h-4 w-4 md:h-3.5 md:w-3.5 animate-spin" />
                                                        ) : (
                                                            <ArrowUp className="h-4.5 w-4.5 md:h-3.5 md:w-3.5 stroke-[2.5]" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </BorderGlow>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                handleFileSelect(e.target.files);
                                if (e.target) e.target.value = "";
                            }}
                        />
                    </motion.div>
                </div>
            </motion.div>

            {/* ── Collapse / Expand Toggle Button ── */}
            {onToggleCollapse && (
                <motion.button
                    onClick={onToggleCollapse}
                    className="absolute -right-4 top-1/2 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
                    style={{ transform: "translateY(-50%)" }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    title={isCollapsed ? "Expand panel" : "Collapse panel"}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={isCollapsed ? "expand" : "collapse"}
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.16 }}
                        >
                            {isCollapsed
                                ? <ChevronsRight className="w-4 h-4" />
                                : <ChevronsLeft className="w-4 h-4" />
                            }
                        </motion.span>
                    </AnimatePresence>
                </motion.button>
            )}

            {fullscreenImageUrl && (
                <div 
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setFullscreenImageUrl(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white hover:text-slate-300 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenImageUrl(null);
                        }}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img 
                        src={fullscreenImageUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}
