/* eslint-disable @next/next/no-img-element */
import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface ImageUploaderProps {
    onImageChange: (base64: string | null, mimeType: string | null) => void;
    className?: string;
    previewUrl?: string | null;
}

export function ImageUploader({ onImageChange, className, previewUrl: initialPreview }: ImageUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(initialPreview || null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync external previewUrl changes (e.g., when removing from parent)
    useEffect(() => {
        setPreview(initialPreview || null);
    }, [initialPreview]);

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFile = (file: File) => {
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setPreview(result);
            const base64Data = result.split(",")[1];
            onImageChange(base64Data, file.type);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onImageChange(null, null);
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className={cn("relative group", className)}>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />

            {preview ? (
                <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-card flex items-center justify-center" style={{ aspectRatio: "16/7" }}>
                    <img src={preview} alt="Upload preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-white transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleRemove}
                            className="p-2 bg-red-500/90 hover:bg-red-500 backdrop-blur-md rounded-lg text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        "w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all duration-200",
                        dragActive
                            ? "border-violet-400 bg-violet-50"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300"
                    )}
                    style={{ aspectRatio: "16/7" }}
                >
                    <div className={cn(
                        "w-10 h-10 rounded-xl mb-2.5 flex items-center justify-center transition-colors",
                        dragActive ? "bg-violet-100 text-violet-600" : "bg-white border border-slate-200 text-slate-400 shadow-sm"
                    )}>
                        {dragActive ? <Upload className="w-5 h-5 animate-bounce" /> : <ImageIcon className="w-5 h-5" />}
                    </div>
                    <h3 className="text-xs font-semibold text-slate-700 mb-0.5">
                        {dragActive ? "Drop image here" : "Upload Reference Image"}
                    </h3>
                    <p className="text-[11px] text-slate-400 max-w-[180px] leading-relaxed">
                        Drag & drop or click to select to guide AI generation
                    </p>
                </div>
            )}
        </div>
    );
}
