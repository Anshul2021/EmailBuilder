"use client";

import { useState } from "react";
import { PromptEditor } from "@/components/PromptEditor";
import { LivePreview } from "@/components/LivePreview";
import { useCredits } from "@/hooks/useCredits";

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
  const { credits, totalCredits, percentage, deductCredits } = useCredits();

  const handleGenerate = async (
    prompt: string,
    imageBase64: string | null = null,
    mimeType: string | null = null,
    model: string = "gemini-2.5-flash"
  ) => {
    setLoading(true);
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageBase64, mimeType, history: messages, model }),
      });

      const data = await resp.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      setHtmlContent(data.html);
      setMjml(data.mjml);

      // Append to conversation history
      const userMessageText = imageBase64 ? `${prompt}` : prompt;
      setMessages(prev => [
        ...prev,
        { role: "user", parts: [{ text: userMessageText }], isImage: !!imageBase64, text: userMessageText } as unknown as Message,
        { role: "model", text: data.mjml } as Message,
      ]);

      deductCredits(data.mjml.length + (imageBase64 ? 500 : 0));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      console.error("Failed to generate template:", message);
      alert(`Failed to generate template: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMjmlChange = (_newMjml: string, newHtml: string) => {
    // When user edits text in the preview panel, update the HTML
    // (We keep mjml unchanged since we're only doing DOM-level edits)
    setHtmlContent(newHtml);
  };

  const handleCopyMjml = () => {
    if (mjml) {
      navigator.clipboard.writeText(mjml);
      alert("MJML copied to clipboard!");
    }
  };

  const handleExportHtml = () => {
    const content = htmlContent;
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
      {/* Left Panel - Prompt Sidebar */}
      <div className="w-[340px] lg:w-[380px] shrink-0 h-full shadow-panel">
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
        />
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 h-full min-w-0">
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
