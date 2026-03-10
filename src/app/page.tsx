"use client";

import { useState, useRef, useCallback } from "react";
import { PromptEditor } from "@/components/PromptEditor";
import { LivePreview } from "@/components/LivePreview";
import { useCredits } from "@/hooks/useCredits";
import { X, AlertCircle } from "lucide-react";
import { SAMPLE_TEMPLATE } from "@/lib/sampleTemplate";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "model";
  text: string;
  isImage?: boolean;
}

export default function Home() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [mjml, setMjml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const { credits, totalCredits, percentage, deductCredits } = useCredits();

  // Ref to track live-edited HTML from the preview editor (avoids iframe reload)
  const editedHtmlRef = useRef<string>("");

  const handleGenerate = async (
    prompt: string,
    imageBase64: string | null = null,
    mimeType: string | null = null,
    model: string = "gemini-2.5-flash"
  ) => {
    setLoading(true);
    setErrorMsg(null);
    editedHtmlRef.current = "";
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageBase64, mimeType, history: messages, model }),
      });

      const data = await resp.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setHtmlContent(data.html);
      setMjml(data.mjml);

      const userMessageText = prompt || "Image reference";
      setMessages(prev => [
        ...prev,
        { role: "user", parts: [{ text: userMessageText }], isImage: !!imageBase64, text: userMessageText } as unknown as Message,
        { role: "model", text: data.mjml } as Message,
      ]);

      deductCredits(data.mjml.length + (imageBase64 ? 500 : 0));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error("Generation failed:", message);
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    editedHtmlRef.current = "";
    setHtmlContent(SAMPLE_TEMPLATE.html);
    setMjml(SAMPLE_TEMPLATE.mjml);
    setMessages([{ role: "model", text: "Here is your sample template. Try selecting text in the live preview to edit inline properties and text!" } as Message]);
    setErrorMsg(null);
  };

  const handleMjmlChange = useCallback((_newMjml: string, newHtml: string) => {
    editedHtmlRef.current = newHtml;
  }, []);

  const handleCopyMjml = () => {
    if (mjml) {
      navigator.clipboard.writeText(mjml);
      alert("MJML copied to clipboard!");
    }
  };

  const handleExportHtml = () => {
    const content = editedHtmlRef.current || htmlContent;
    if (content) {
      const blob = new Blob([content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "email-template.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f7fa]">
      {/* Left Panel - Prompt Sidebar (collapsible) */}
      <motion.div
        initial={false}
        animate={{
          width: isPromptCollapsed ? 0 : "clamp(320px, 30vw, 380px)",
          minWidth: isPromptCollapsed ? 0 : "320px",
        }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="relative shrink-0 h-full shadow-panel overflow-visible"
      >
        <PromptEditor
          onGenerate={handleGenerate}
          isLoading={loading}
          hasTemplate={!!mjml}
          onCopyMjml={handleCopyMjml}
          onExportHtml={handleExportHtml}
          credits={credits}
          totalCredits={totalCredits}
          percentage={percentage}
          messages={messages}
          onLoadSample={handleLoadSample}
          isCollapsed={isPromptCollapsed}
          onToggleCollapse={() => setIsPromptCollapsed(v => !v)}
        />
      </motion.div>

      {/* Right Panel - Preview */}
      <div className="flex-1 h-full min-w-0 relative">
        {/* Error Banner */}
        {errorMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-3 rounded-xl shadow-lg max-w-[540px] animate-slide-up">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
            <span className="flex-1 leading-relaxed">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="shrink-0 -mt-0.5 p-0.5 rounded hover:bg-red-100 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <LivePreview
          html={htmlContent}
          mjml={mjml}
          isLoading={loading}
          onMjmlChange={handleMjmlChange}
          onCopyMjml={handleCopyMjml}
          onExportHtml={handleExportHtml}
        />
      </div>
    </main>
  );
}
