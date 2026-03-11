"use client";

import { useState, useRef, useCallback } from "react";
import { PromptEditor } from "@/components/PromptEditor";
import { LivePreview } from "@/components/LivePreview";
import { useCredits } from "@/hooks/useCredits";
import { X, AlertCircle } from "lucide-react";
import { SAMPLE_TEMPLATE } from "@/lib/sampleTemplate";
import { motion } from "framer-motion";
import { HistoryPanel } from "@/components/HistoryPanel";
import { saveTemplate, TemplateRecord } from "@/lib/supabaseService";
import { getSection, replaceMjmlSection, duplicateSection, removeSection, moveSection } from "@/lib/mjmlParser";

interface Message {
  role: "user" | "model";
  text: string;
  isImage?: boolean;
}

export default function Home() {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [mjml, setMjml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"generating" | "saving">("generating");
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isSectionEditing, setIsSectionEditing] = useState(false);
  const { credits, totalCredits, percentage, deductCredits } = useCredits();

  // Ref to track live-edited HTML from the preview editor (avoids iframe reload)
  const editedHtmlRef = useRef<string>("");

  const handleGenerate = async (
    prompt: string,
    imageBase64: string | null = null,
    mimeType: string | null = null,
    model: string = "gemini-2.5-flash"
  ) => {
    setLoadingType("generating");
    setLoading(true);
    setErrorMsg(null);
    editedHtmlRef.current = "";
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageBase64, mimeType, currentMjml: mjml, history: messages, model }),
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

  // ── Compile MJML → HTML (no AI call) ──
  const compileMjml = async (mjmlCode: string): Promise<{ html: string; mjml: string } | null> => {
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compileOnly: true, mjmlCode: mjmlCode }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.error("MJML compile failed:", err);
      return null;
    }
  };

  // ── Section-level AI editing ──
  const handleSectionEdit = useCallback(async (instruction: string, sectionIndex: number) => {
    const sectionMjml = getSection(mjml, sectionIndex);
    if (!sectionMjml) {
      setErrorMsg("Could not find that section. Try regenerating the template.");
      return;
    }

    setIsSectionEditing(true);
    setErrorMsg(null);

    try {
      // Call section-only AI endpoint
      const resp = await fetch("/api/generate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionMjml,
          instruction,
          model: "gemini-2.5-flash",
        }),
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      // Patch the section into the full MJML
      const updatedMjml = replaceMjmlSection(mjml, sectionIndex, data.sectionMjml);

      // Recompile full template
      const compiled = await compileMjml(updatedMjml);
      if (!compiled) throw new Error("Failed to recompile template after section edit.");

      setMjml(compiled.mjml);
      setHtmlContent(compiled.html);
      editedHtmlRef.current = "";

      // Track in messages for context
      setMessages(prev => [
        ...prev,
        { role: "user", text: `[Section ${sectionIndex + 1}] ${instruction}` } as Message,
        { role: "model", text: `Section ${sectionIndex + 1} updated.` } as Message,
      ]);

      // Section edits cost less (approx 20% of full generation)
      deductCredits(Math.floor(data.sectionMjml.length / 5));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Section edit failed.";
      console.error("Section edit failed:", message);
      setErrorMsg(message);
    } finally {
      setIsSectionEditing(false);
    }
  }, [mjml, deductCredits]);

  // ── Section-level structural operations ──
  const handleSectionDuplicate = useCallback(async (sectionIndex: number) => {
    const updatedMjml = duplicateSection(mjml, sectionIndex);
    const compiled = await compileMjml(updatedMjml);
    if (compiled) {
      setMjml(compiled.mjml);
      setHtmlContent(compiled.html);
      editedHtmlRef.current = "";
    }
  }, [mjml]);

  const handleSectionDelete = useCallback(async (sectionIndex: number) => {
    const updatedMjml = removeSection(mjml, sectionIndex);
    const compiled = await compileMjml(updatedMjml);
    if (compiled) {
      setMjml(compiled.mjml);
      setHtmlContent(compiled.html);
      editedHtmlRef.current = "";
    }
  }, [mjml]);

  const handleSectionMove = useCallback(async (fromIndex: number, toIndex: number) => {
    const updatedMjml = moveSection(mjml, fromIndex, toIndex);
    const compiled = await compileMjml(updatedMjml);
    if (compiled) {
      setMjml(compiled.mjml);
      setHtmlContent(compiled.html);
      editedHtmlRef.current = "";
    }
  }, [mjml]);

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

  const cleanHtmlForExport = (htmlStr: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, "text/html");

    // Remove injected editor handles and styles
    const elementsToRemove = [
      "ag-preview-styles",
      "ag-resize-handle",
      "ag-drag-handle",
      "ag-delete-handle",
      "ag-drop-indicator"
    ];
    elementsToRemove.forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.remove();
    });

    // Remove contenteditable attributes
    doc.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute("contenteditable");
    });

    // Remove editor-specific classes
    doc.querySelectorAll(".ag-selected, .ag-img-selected, .ag-ghost, .ag-section-highlight").forEach(el => {
      el.classList.remove("ag-selected", "ag-img-selected", "ag-ghost", "ag-section-highlight");
      if (el.className === "") el.removeAttribute("class");
    });

    // Remove data-section-index attributes
    doc.querySelectorAll("[data-section-index]").forEach(el => {
      el.removeAttribute("data-section-index");
    });

    // Return the cleaned HTML with standard doctype
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  };

  const handleExportHtml = () => {
    const content = editedHtmlRef.current || htmlContent;
    if (content) {
      const cleanedContent = cleanHtmlForExport(content);
      const blob = new Blob([cleanedContent], { type: "text/html" });
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

  const handleSaveToSupabase = async () => {
    const content = editedHtmlRef.current || htmlContent;
    if (!content || !mjml) {
      alert("No template to save. Generate one first!");
      return;
    }

    const title = prompt("Enter a name for this template:", "New Template");
    if (title === null) return; // cancelled

    setLoadingType("saving");
    setLoading(true);
    try {
      const cleanedContent = cleanHtmlForExport(content);
      await saveTemplate(title, mjml, cleanedContent);
      alert("Template saved successfully!");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Ensure Database is configured and RLS policies allow inserts.";
      alert(`Failed to save template: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (template: TemplateRecord) => {
    editedHtmlRef.current = "";
    setHtmlContent(template.html);
    setMjml(template.mjml);
    setMessages([{ role: "model", text: `Loaded template: ${template.template_name}` } as Message]);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f5f7fa]">
      {/* Main Content Area */}
      <main className="flex flex-1 min-h-0 w-full relative">
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
          loadingType={loadingType}
          onMjmlChange={handleMjmlChange}
          onCopyMjml={handleCopyMjml}
          onExportHtml={handleExportHtml}
          onSaveTemplate={handleSaveToSupabase}
          onOpenHistory={() => setShowHistory(true)}
          onSectionEdit={handleSectionEdit}
          onSectionDuplicate={handleSectionDuplicate}
          onSectionDelete={handleSectionDelete}
          onSectionMove={handleSectionMove}
          isSectionEditing={isSectionEditing}
        />
      </div>
      </main>

      {/* History Panel Modal */}
      {showHistory && (
        <HistoryPanel 
          onClose={() => setShowHistory(false)} 
          onSelect={handleSelectHistory} 
        />
      )}
    </div>
  );
}
