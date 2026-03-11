"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PromptEditor } from "@/components/PromptEditor";
import { LivePreview } from "@/components/LivePreview";
import { useCredits } from "@/hooks/useCredits";
import { X, AlertCircle } from "lucide-react";
import { SAMPLE_TEMPLATE } from "@/lib/sampleTemplate";
import { motion } from "framer-motion";
import { HistoryPanel } from "@/components/HistoryPanel";
import { saveTemplate, TemplateRecord } from "@/lib/supabaseService";
import { getSection, replaceMjmlSection } from "@/lib/mjmlParser";
import {
  parseMjmlToTree, treeToMjml,
  toggleHidden, toggleExpanded, deleteNode, duplicateNode, renameNode, moveNode,
  getVisibleSections, getBodyNode,
  type MjmlNode,
} from "@/lib/mjmlTree";
import type { SectionEditState } from "@/components/LayerPanel";

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

  // ── MJML Tree State ──
  const [mjmlTree, setMjmlTree] = useState<MjmlNode | null>(null);
  const [selectedLayerNodeId, setSelectedLayerNodeId] = useState<string | null>(null);
  const [hoveredLayerNodeId, setHoveredLayerNodeId] = useState<string | null>(null);
  const [sectionEditStates, setSectionEditStates] = useState<Map<string, SectionEditState>>(new Map());

  // Ref to track live-edited HTML from the preview editor (avoids iframe reload)
  const editedHtmlRef = useRef<string>("");

  // ── Build tree whenever MJML changes ──
  useEffect(() => {
    if (mjml) {
      const tree = parseMjmlToTree(mjml);
      setMjmlTree(tree);
    } else {
      setMjmlTree(null);
    }
  }, [mjml]);

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

  // ── Helper: apply tree mutation → recompile ──
  const applyTreeMutation = useCallback(async (newTree: MjmlNode) => {
    const newMjml = treeToMjml(newTree);
    const compiled = await compileMjml(newMjml);
    if (compiled) {
      setMjml(compiled.mjml);
      setHtmlContent(compiled.html);
      editedHtmlRef.current = "";
    }
  }, []);

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

  // ── Section-level AI editing (from preview controls) ──
  const handleSectionEdit = useCallback(async (instruction: string, sectionIndex: number) => {
    const sectionMjml = getSection(mjml, sectionIndex);
    if (!sectionMjml) {
      setErrorMsg("Could not find that section. Try regenerating the template.");
      return;
    }

    setIsSectionEditing(true);
    setErrorMsg(null);

    // Set section edit state
    const sections = mjmlTree ? getVisibleSections(mjmlTree) : [];
    const sectionNode = sections[sectionIndex];
    if (sectionNode) {
      setSectionEditStates(prev => new Map(prev).set(sectionNode.id, "processing"));
    }

    try {
      const resp = await fetch("/api/generate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionMjml, instruction, model: "gemini-2.5-flash" }),
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      const updatedMjml = replaceMjmlSection(mjml, sectionIndex, data.sectionMjml);
      const compiled = await compileMjml(updatedMjml);
      if (!compiled) throw new Error("Failed to recompile template after section edit.");

      setMjml(compiled.mjml);
      setHtmlContent(compiled.html);
      editedHtmlRef.current = "";

      setMessages(prev => [
        ...prev,
        { role: "user", text: `[Section ${sectionIndex + 1}] ${instruction}` } as Message,
        { role: "model", text: `Section ${sectionIndex + 1} updated.` } as Message,
      ]);

      deductCredits(Math.floor(data.sectionMjml.length / 5));

      if (sectionNode) {
        setSectionEditStates(prev => new Map(prev).set(sectionNode.id, "success"));
        setTimeout(() => setSectionEditStates(prev => { const m = new Map(prev); m.delete(sectionNode.id); return m; }), 2000);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Section edit failed.";
      console.error("Section edit failed:", message);
      setErrorMsg(message);
      if (sectionNode) {
        setSectionEditStates(prev => new Map(prev).set(sectionNode.id, "error"));
        setTimeout(() => setSectionEditStates(prev => { const m = new Map(prev); m.delete(sectionNode.id); return m; }), 3000);
      }
    } finally {
      setIsSectionEditing(false);
    }
  }, [mjml, mjmlTree, deductCredits]);

  // ── Section structural operations (from preview) ──
  const handleSectionDuplicate = useCallback(async (sectionIndex: number) => {
    if (!mjmlTree) return;
    const sections = getVisibleSections(mjmlTree);
    const sectionNode = sections[sectionIndex];
    if (sectionNode) {
      const newTree = duplicateNode(mjmlTree, sectionNode.id);
      await applyTreeMutation(newTree);
    }
  }, [mjmlTree, applyTreeMutation]);

  const handleSectionDelete = useCallback(async (sectionIndex: number) => {
    if (!mjmlTree) return;
    const sections = getVisibleSections(mjmlTree);
    const sectionNode = sections[sectionIndex];
    if (sectionNode) {
      const newTree = deleteNode(mjmlTree, sectionNode.id);
      await applyTreeMutation(newTree);
    }
  }, [mjmlTree, applyTreeMutation]);

  const handleSectionMove = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!mjmlTree) return;
    const body = getBodyNode(mjmlTree);
    if (!body) return;
    const sections = getVisibleSections(mjmlTree);
    const sourceNode = sections[fromIndex];
    const targetNode = sections[toIndex];
    if (sourceNode && targetNode) {
      const position = toIndex > fromIndex ? "after" : "before";
      const newTree = moveNode(mjmlTree, sourceNode.id, targetNode.id, position);
      await applyTreeMutation(newTree);
    }
  }, [mjmlTree, applyTreeMutation]);

  // ── Layer Panel Callbacks ──
  const handleLayerSelect = useCallback((nodeId: string) => {
    setSelectedLayerNodeId(nodeId);
  }, []);

  const handleLayerHover = useCallback((nodeId: string | null) => {
    setHoveredLayerNodeId(nodeId);
  }, []);

  const handleLayerToggleExpand = useCallback((nodeId: string) => {
    if (!mjmlTree) return;
    setMjmlTree(toggleExpanded(mjmlTree, nodeId));
  }, [mjmlTree]);

  const handleLayerToggleHidden = useCallback(async (nodeId: string) => {
    if (!mjmlTree) return;
    const newTree = toggleHidden(mjmlTree, nodeId);
    await applyTreeMutation(newTree);
  }, [mjmlTree, applyTreeMutation]);

  const handleLayerDelete = useCallback(async (nodeId: string) => {
    if (!mjmlTree) return;
    const newTree = deleteNode(mjmlTree, nodeId);
    await applyTreeMutation(newTree);
  }, [mjmlTree, applyTreeMutation]);

  const handleLayerDuplicate = useCallback(async (nodeId: string) => {
    if (!mjmlTree) return;
    const newTree = duplicateNode(mjmlTree, nodeId);
    await applyTreeMutation(newTree);
  }, [mjmlTree, applyTreeMutation]);

  const handleLayerRename = useCallback((nodeId: string, newName: string) => {
    if (!mjmlTree) return;
    setMjmlTree(renameNode(mjmlTree, nodeId, newName));
  }, [mjmlTree]);

  const handleLayerMove = useCallback(async (nodeId: string, targetId: string, position: "before" | "after" | "inside") => {
    if (!mjmlTree) return;
    const newTree = moveNode(mjmlTree, nodeId, targetId, position);
    await applyTreeMutation(newTree);
  }, [mjmlTree, applyTreeMutation]);

  const handleLayerAiEdit = useCallback((nodeId: string) => {
    if (!mjmlTree) return;
    // Find which section index this node belongs to
    const sections = getVisibleSections(mjmlTree);
    const sectionIdx = sections.findIndex(s => s.id === nodeId);
    if (sectionIdx === -1) return;

    // Open the section edit prompt
    const instruction = window.prompt(`Edit Section "${sections[sectionIdx].name}":\nDescribe what changes to make:`);
    if (!instruction) return;

    handleSectionEdit(instruction, sectionIdx);
  }, [mjmlTree, handleSectionEdit]);

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

    const elementsToRemove = [
      "ag-preview-styles", "ag-resize-handle", "ag-drag-handle",
      "ag-delete-handle", "ag-drop-indicator"
    ];
    elementsToRemove.forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.remove();
    });

    doc.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute("contenteditable");
    });

    doc.querySelectorAll(".ag-selected, .ag-img-selected, .ag-ghost, .ag-section-highlight").forEach(el => {
      el.classList.remove("ag-selected", "ag-img-selected", "ag-ghost", "ag-section-highlight");
      if (el.className === "") el.removeAttribute("class");
    });

    doc.querySelectorAll("[data-section-index]").forEach(el => {
      el.removeAttribute("data-section-index");
    });

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
    if (title === null) return;

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
          // Layer panel props
          mjmlTree={mjmlTree}
          selectedLayerNodeId={selectedLayerNodeId}
          sectionEditStates={sectionEditStates}
          onLayerSelect={handleLayerSelect}
          onLayerHover={handleLayerHover}
          onLayerToggleExpand={handleLayerToggleExpand}
          onLayerToggleHidden={handleLayerToggleHidden}
          onLayerDelete={handleLayerDelete}
          onLayerDuplicate={handleLayerDuplicate}
          onLayerRename={handleLayerRename}
          onLayerMove={handleLayerMove}
          onLayerAiEdit={handleLayerAiEdit}
          hoveredLayerNodeId={hoveredLayerNodeId}
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
