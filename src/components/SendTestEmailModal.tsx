"use client";

import { useState, useEffect } from "react";
import { X, Mail, Send, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface TestEmailUsage {
  used: number;
  limit: number;
  remaining: number;
}

interface SendTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  isLoading: boolean;
}

export function SendTestEmailModal({
  isOpen,
  onClose,
  onSend,
  isLoading
}: SendTestEmailModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TestEmailUsage | null>(null);
  const [fetchingUsage, setFetchingUsage] = useState(false);

  // Fetch usage on mount or open
  useEffect(() => {
    if (isOpen) {
      setFetchingUsage(true);
      fetch("/api/send-test-email")
        .then((res) => res.json())
        .then((data) => {
          if (data.usage) {
            setUsage(data.usage);
          }
        })
        .catch((err) => console.error("Error fetching weekly email usage:", err))
        .finally(() => setFetchingUsage(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter an email address.");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (usage && usage.remaining <= 0) {
      setError(`You have reached your weekly limit of ${usage.limit} test emails.`);
      return;
    }

    onSend(trimmedEmail);
  };

  const remaining = usage ? usage.remaining : 3;
  const limit = usage ? usage.limit : 3;
  const used = usage ? usage.used : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-w-md w-full border border-slate-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-800">Send Test Email</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">Recipient Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. you@example.com"
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all font-medium text-slate-700"
                autoFocus
                disabled={isLoading}
              />
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Weekly Limits Info */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Weekly Rate Limit</span>
            </div>
            <div className="text-xs font-bold text-slate-700">
              {fetchingUsage ? (
                <span className="text-slate-400 font-normal">Checking...</span>
              ) : (
                <span>
                  {used}/{limit} sent
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || fetchingUsage || (usage !== null && usage.remaining <= 0)}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Test
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
