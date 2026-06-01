"use client";

import { useState } from "react";
import { X, Send, AlertCircle, CheckCircle2, Loader2, Bug } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { reportBug } from "@/lib/supabaseService";

interface BugReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
    const [personName, setPersonName] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!personName.trim() || !description.trim()) {
            setErrorMsg("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);

        try {
            await reportBug(personName.trim(), description.trim());
            setIsSubmitted(true);
            setPersonName("");
            setDescription("");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to submit bug report.";
            setErrorMsg(msg + "\n\nTip: Make sure RLS insert policies are configured on the 'Bugs' table in Supabase.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
                        className="relative w-full max-w-sm bg-white rounded-lg shadow-2xl border border-slate-100 overflow-hidden z-10"
                    >

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="p-6">
                            {!isSubmitted ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                            <Bug className="w-4 h-4 text-rose-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">Report a Bug</h3>
                                            <p className="text-xs text-slate-400">Help us make the template builder better</p>
                                        </div>
                                    </div>

                                    {errorMsg && (
                                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-medium whitespace-pre-line">
                                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                                            <span>{errorMsg}</span>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label htmlFor="person-name" className="text-sm font-medium text-slate-600">
                                            Contact Info (Name, Email or Phone)
                                        </label>
                                        <input
                                            id="person-name"
                                            type="text"
                                            value={personName}
                                            onChange={(e) => setPersonName(e.target.value)}
                                            placeholder="Enter name, email, contact..."
                                            disabled={isLoading}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50/50 transition-all placeholder:text-slate-400 text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="bug-description" className="text-sm font-medium text-slate-600">
                                            Describe the issue
                                        </label>
                                        <textarea
                                            id="bug-description"
                                            rows={4}
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="What happened? Please describe the issue..."
                                            disabled={isLoading}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50/50 transition-all placeholder:text-slate-400 text-slate-800 resize-none custom-scrollbar"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isLoading}
                                            className="flex-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading || !personName.trim() || !description.trim()}
                                            className="flex-1 py-2 text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Submitting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-3.5 h-3.5" />
                                                    <span>Submit Bug</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex flex-col items-center text-center py-2 space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-800">Thank you!</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed max-w-[280px]">
                                            Your bug report has been successfully recorded
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSubmitted(false);
                                            onClose();
                                        }}
                                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200/50"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
