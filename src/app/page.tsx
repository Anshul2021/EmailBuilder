"use client";

import { useState } from "react";
import { PromptEditor } from "@/components/PromptEditor";
import { LivePreview } from "@/components/LivePreview";
import { useCredits } from "@/hooks/useCredits";

export default function Home() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [mjml, setMjml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { credits, totalCredits, percentage, deductCredits } = useCredits();

  const handleGenerate = async (prompt: string) => {
    setLoading(true);
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await resp.json();

      if (data.error) {
        throw new Error(data.details || data.error);
      }

      setHtmlContent(data.html);
      setMjml(data.mjml);

      // Deduct credits based on the length of the MJML code
      deductCredits(data.mjml.length);
    } catch (error: any) {
      console.error("Failed to generate template:", error.message || error);
      alert(`Failed to generate template: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMjml = () => {
    if (mjml) {
      navigator.clipboard.writeText(mjml);
      alert("MJML copied to clipboard!");
    }
  };

  const handleExportHtml = () => {
    if (htmlContent) {
      const blob = new Blob([htmlContent], { type: "text/html" });
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
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Left Pane - Chat Area */}
      <div className="w-full md:w-[400px] lg:w-[500px] shrink-0 h-full">
        <PromptEditor
          onGenerate={handleGenerate}
          isLoading={loading}
          hasTemplate={!!mjml}
          onCopyMjml={handleCopyMjml}
          onExportHtml={handleExportHtml}
          credits={credits}
          totalCredits={totalCredits}
          percentage={percentage}
        />
      </div>

      {/* Right Pane - Preview Area */}
      <div className="hidden md:flex flex-1 h-full relative">
        <LivePreview html={htmlContent} isLoading={loading} />
      </div>
    </main>
  );
}
