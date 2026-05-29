"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTemplateById, TemplateRecord } from "@/lib/supabaseService";
import { Monitor, Smartphone, MailOpen, AlertCircle, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { Tooltip } from "@/components/UI/Tooltip";

export default function PreviewPage() {
    const params = useParams();
    const id = params?.id ? Number(params.id) : null;

    const [template, setTemplate] = useState<TemplateRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

    useEffect(() => {
        if (!id) {
            setError("Invalid preview ID.");
            setLoading(false);
            return;
        }

        const fetchTemplate = async () => {
            try {
                const data = await getTemplateById(id);
                if (!data) {
                    setError("Template not found.");
                } else {
                    setTemplate(data);
                }
            } catch (err: unknown) {
                console.error("Failed to load preview template:", err);
                setError(err instanceof Error ? err.message : "Failed to load template.");
            } finally {
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
                <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                <span className="text-sm font-semibold text-slate-500">Loading preview...</span>
            </div>
        );
    }

    if (error || !template) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-base font-bold text-slate-800 mb-2">Failed to Load Preview</h1>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                        {error || "The requested email template does not exist or has been deleted."}
                    </p>
                    <a
                        href="/"
                        className="inline-flex justify-center items-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                    >
                        Go to Email Builder
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-100">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100">
                        <MailOpen className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-xs font-bold text-slate-900 leading-none truncate max-w-[200px] md:max-w-sm">
                            {template.template_name}
                        </h1>
                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">Shared Email Preview</span>
                    </div>
                </div>

                {/* Desktop/Mobile viewport switches */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg gap-0.5 border border-slate-200">
                    {(["desktop", "mobile"] as const).map((mode) => (
                        <Tooltip key={mode} content={mode === "desktop" ? "Desktop layout" : "Mobile layout"} position="bottom">
                            <button
                                onClick={() => setViewMode(mode)}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === mode
                                        ? "bg-white shadow-sm text-violet-600 font-semibold"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {mode === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                            </button>
                        </Tooltip>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href="/"
                        className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-all"
                    >
                        Builder
                    </a>
                </div>
            </header>

            {/* Viewport Frame */}
            <main className="flex-1 p-6 flex justify-center items-center overflow-auto min-h-0">
                <div
                    className={clsx(
                        "h-full transition-all duration-300 ease-in-out flex justify-center items-center",
                        viewMode === "desktop" ? "w-full" : "w-[375px]"
                    )}
                >
                    <div
                        className={clsx(
                            "w-full h-full bg-white overflow-hidden shadow-md transition-all duration-300",
                            viewMode === "mobile" && "border-[8px] border-slate-800 rounded-[32px] shadow-xl relative"
                        )}
                    >
                        {/* Mobile notch simulation */}
                        {viewMode === "mobile" && (
                            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-full z-20 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-700" />
                            </div>
                        )}

                        <iframe
                            srcDoc={template.html}
                            title="Shared Email Content"
                            className={clsx(
                                "w-full h-full border-0 bg-white",
                                viewMode === "mobile" && "pt-6"
                            )}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
