"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PromptEditor } from "@/components/PromptEditor";
import { LivePreview } from "@/components/LivePreview";
import { useCredits } from "@/hooks/useCredits";
import { track } from "@vercel/analytics";
import { X, AlertCircle, Sparkles, Check, Bug, MessageSquare, Eye, Monitor } from "lucide-react";
import { SAMPLE_TEMPLATE } from "@/lib/sampleTemplate";
import { motion } from "framer-motion";
import { HistoryPanel } from "@/components/HistoryPanel";
import { PreviewModal } from "@/components/PreviewModal";
import { SaveTemplateModal } from "@/components/SaveTemplateModal";
import { BugReportModal } from "@/components/BugReportModal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { Tooltip } from "@/components/UI/Tooltip";
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

const getClientSessionId = (): string => {
  if (typeof window === "undefined") return "";
  const key = "ai_email_builder_client_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(key, id);
  }
  return id;
};

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
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const { credits, totalCredits, percentage, deductCredits } = useCredits();
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isLibraryHighlighted, setIsLibraryHighlighted] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  const triggerMobileHaptic = () => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show onboarding modal on mount if not onboarded yet
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem("ai_email_builder_onboarded");
      if (onboarded !== "true") {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Restore editor state from sessionStorage on initial load
  useEffect(() => {
    try {
      const isSample = sessionStorage.getItem("ai_email_builder_is_sample");
      if (isSample === "true") {
        sessionStorage.removeItem("ai_email_builder_mjml");
        sessionStorage.removeItem("ai_email_builder_html");
        sessionStorage.removeItem("ai_email_builder_messages");
        sessionStorage.removeItem("ai_email_builder_is_sample");
        return;
      }

      const cachedMjml = sessionStorage.getItem("ai_email_builder_mjml");
      const cachedHtml = sessionStorage.getItem("ai_email_builder_html");
      const cachedMessages = sessionStorage.getItem("ai_email_builder_messages");

      if (cachedMjml) setMjml(cachedMjml);
      if (cachedHtml) setHtmlContent(cachedHtml);
      if (cachedMessages) {
        setMessages(JSON.parse(cachedMessages));
      }
    } catch (e) {
      console.warn("Failed to load cached template state:", e);
    }
  }, []);

  // Update sessionStorage cache when template changes
  useEffect(() => {
    try {
      if (mjml) {
        sessionStorage.setItem("ai_email_builder_mjml", mjml);
      } else {
        sessionStorage.removeItem("ai_email_builder_mjml");
      }
    } catch (e) {
      console.warn(e);
    }
  }, [mjml]);

  useEffect(() => {
    try {
      if (htmlContent) {
        sessionStorage.setItem("ai_email_builder_html", htmlContent);
      } else {
        sessionStorage.removeItem("ai_email_builder_html");
      }
    } catch (e) {
      console.warn(e);
    }
  }, [htmlContent]);

  useEffect(() => {
    try {
      if (messages && messages.length > 0) {
        sessionStorage.setItem("ai_email_builder_messages", JSON.stringify(messages));
      } else {
        sessionStorage.removeItem("ai_email_builder_messages");
      }
    } catch (e) {
      console.warn(e);
    }
  }, [messages]);

  // Fetch initial usage count on mount
  useEffect(() => {
    fetch("/api/usage", {
      headers: { "x-client-session-id": getClientSessionId() }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.usage) {
          setUsage(data.usage);
        }
      })
      .catch((err) => console.error("Error fetching usage:", err));
  }, []);

  const handleResetUsage = async () => {
    try {
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "x-client-session-id": getClientSessionId() }
      });
      const data = await res.json();
      if (data.usage) {
        setUsage(data.usage);
        setSuccessMsg("Beta usage count reset successfully!");
      }
    } catch (err) {
      console.error("Error resetting usage:", err);
    }
  };

  // Auto-clear success messages after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

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

  const isPromptIrrelevant = (prompt: string): { isIrrelevant: boolean; response?: string } => {
    const clean = prompt.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");

    // 1. Simple greetings
    const greetings = ["hi", "hello", "hey", "hola", "yo", "greetings", "good morning", "good afternoon", "good evening", "sup"];
    if (greetings.includes(clean)) {
      return {
        isIrrelevant: true,
        response: `I am an AI Email Template Builder, so I can only understand prompts related to designing, structuring, or editing email templates.

Please describe the email you want. Suggestions:
- *"Create a minimalist welcome email"*
- *"Design a promotional newsletter"*
- *"Build a standard password reset email"*`
      };
    }

    // 2. Generic short/unrelated test strings
    const simpleTests = ["test", "demo", "asdf", "hello world", "help", "hey there", "xyz"];
    if (simpleTests.includes(clean)) {
      return {
        isIrrelevant: true,
        response: `I am an AI Email Template Builder, so I can only understand prompts related to designing, structuring, or editing email templates.

Please describe the email you want. Suggestions:
- *"Create a welcome email template"*
- *"Design a Thanksgiving newsletter"*
- *"Build a clean receipt/invoice email"*`
      };
    }

    // 3. Irrelevant questions/tasks
    const irrelevantPatterns = [
      /^(who|what|how) are you/i,
      /your name/i,
      /weather/i,
      /joke/i,
      /poem/i,
      /song/i,
      /recipe/i,
      /capital of/i,
      /how to cook/i,
      /math/i,
      /calculate/i,
      /translate/i,
      /write an essay/i,
      /write a story/i,
      /coding questions/i,
      /javascript/i,
      /python/i,
      /rust/i,
      /react/i,
      /angular/i,
      /sql/i
    ];

    const emailKeywords = ["email", "newsletter", "template", "mjml", "html", "subscriber", "campaign", "promo", "marketing", "transactional", "receipt", "welcome", "card", "footer", "header", "hero", "layout", "button", "logo", "text", "image"];
    const hasEmailKeywords = emailKeywords.some(keyword => clean.includes(keyword));

    if (!hasEmailKeywords) {
      for (const pattern of irrelevantPatterns) {
        if (pattern.test(clean)) {
          return {
            isIrrelevant: true,
            response: `I am an AI Email Template Builder, so I can only understand prompts related to designing, structuring, or editing email templates.

Please describe the email you want. Suggestions:
- *"Create a monthly newsletter template"*
- *"Build a black friday sale email"*
- *"Generate a sleek product launch email"*`
          };
        }
      }

      // If the prompt is too short (e.g. less than 10 characters) and has no email keywords
      if (clean.length < 8) {
        return {
          isIrrelevant: true,
          response: `I am an AI Email Template Builder, so I can only understand prompts related to designing, structuring, or editing email templates.

Please describe the email you want. Suggestions:
- *"Build a classic ecommerce newsletter"*
- *"Create a professional product update email"*
- *"Design a minimal notification template"*`
        };
      }
    }

    return { isIrrelevant: false };
  };

  const handleGenerate = async (
    prompt: string,
    imageBase64: string | null = null,
    mimeType: string | null = null,
    model: string = "gemini-2.5-flash",
    isFresh: boolean = false
  ) => {
    try {
      sessionStorage.removeItem("ai_email_builder_is_sample");
    } catch (e) { }

    // Check if prompt is vague or irrelevant (only if no image is uploaded)
    const check = imageBase64 ? { isIrrelevant: false, response: "" } : isPromptIrrelevant(prompt);
    if (check.isIrrelevant) {
      const userMessageText = prompt || "Image reference";
      setMessages(prev => {
        const newMsgs: Message[] = [
          { role: "user", text: userMessageText, isImage: !!imageBase64 },
          { role: "model", text: check.response || "" },
        ];
        return isFresh ? newMsgs : [...prev, ...newMsgs];
      });
      return;
    }

    track("Generate Email", { model });
    setLoadingType("generating");
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    editedHtmlRef.current = "";
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-session-id": getClientSessionId()
        },
        body: JSON.stringify({ prompt, imageBase64, mimeType, currentMjml: isFresh ? "" : mjml, history: isFresh ? [] : messages, model }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        let errMsg = "Generation failed.";
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || errMsg;
        } catch {
          errMsg = text.includes("<pre>")
            ? text.substring(text.indexOf("<pre>") + 5, text.indexOf("</pre>")).trim()
            : text.substring(0, 150);
        }
        throw new Error(errMsg);
      }

      const data = await resp.json();

      setHtmlContent(data.html);
      setMjml(data.mjml);

      if (data.usage) {
        setUsage(data.usage);
      }
      track("Template Generated", { model: data.modelUsed || model });

      // Check if a fallback model was used
      if (data.modelUsed && data.modelUsed !== model) {
        const modelLabels: Record<string, string> = {
          "gemini-3.5-flash": "Gemini 3.5 Flash",
          "gemini-2.5-flash": "Gemini 2.5 Flash",
          "gemini-2.0-flash": "Gemini 2.0 Flash",
          "gemini-1.5-pro": "Gemini 1.5 Pro",
          "gemini-1.5-flash": "Gemini 1.5 Flash"
        };
        const requestedLabel = modelLabels[model] || model;
        const usedLabel = modelLabels[data.modelUsed] || data.modelUsed;
        const failReason = data.failedModels?.[model] ? ` (${data.failedModels[model]})` : "";
        setInfoMsg(`"${requestedLabel}" was bypassed${failReason}. Automatically fell back to "${usedLabel}" to complete your request.`);
      }

      const userMessageText = prompt || "Image reference";
      setMessages(prev => {
        const newMsgs = [
          { role: "user", parts: [{ text: userMessageText }], isImage: !!imageBase64, text: userMessageText } as unknown as Message,
          { role: "model", parts: [{ text: data.mjml }], text: data.mjml } as unknown as Message,
        ];
        return isFresh ? newMsgs : [...prev, ...newMsgs];
      });

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
  const handleSectionEdit = useCallback(async (instruction: string, sectionIndex: number, model: string = "gemini-3.1-flash-lite") => {
    try {
      sessionStorage.removeItem("ai_email_builder_is_sample");
    } catch (e) { }

    const sectionMjml = getSection(mjml, sectionIndex);
    if (!sectionMjml) {
      setErrorMsg("Could not find that section. Try regenerating the template.");
      return;
    }

    setIsSectionEditing(true);
    setErrorMsg(null);
    setInfoMsg(null);

    // Set section edit state
    const sections = mjmlTree ? getVisibleSections(mjmlTree) : [];
    const sectionNode = sections[sectionIndex];
    if (sectionNode) {
      setSectionEditStates(prev => new Map(prev).set(sectionNode.id, "processing"));
    }

    try {
      const resp = await fetch("/api/generate-section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-session-id": getClientSessionId()
        },
        body: JSON.stringify({ sectionMjml, instruction, model }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        let errMsg = "Section edit failed.";
        try {
          const parsed = JSON.parse(text);
          errMsg = parsed.error || errMsg;
        } catch {
          errMsg = text.includes("<pre>")
            ? text.substring(text.indexOf("<pre>") + 5, text.indexOf("</pre>")).trim()
            : text.substring(0, 150);
        }
        throw new Error(errMsg);
      }

      const data = await resp.json();

      // Check if a fallback model was used
      if (data.modelUsed && data.modelUsed !== model) {
        const modelLabels: Record<string, string> = {
          "gemini-3.5-flash": "Gemini 3.5 Flash",
          "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite",
          "gemini-2.5-flash": "Gemini 2.5 Flash",
          "gemini-2.0-flash": "Gemini 2.0 Flash",
          "gemini-1.5-pro": "Gemini 1.5 Pro",
          "gemini-1.5-flash": "Gemini 1.5 Flash"
        };
        const requestedLabel = modelLabels[model] || model;
        const usedLabel = modelLabels[data.modelUsed] || data.modelUsed;
        const failReason = data.failedModels?.[model] ? ` (${data.failedModels[model]})` : "";
        setInfoMsg(`"${requestedLabel}" was bypassed${failReason}. Automatically fell back to "${usedLabel}" for section edit.`);
      }

      const updatedMjml = replaceMjmlSection(mjml, sectionIndex, data.sectionMjml);
      const compiled = await compileMjml(updatedMjml);
      if (!compiled) throw new Error("Failed to recompile template after section edit.");

      setMjml(compiled.mjml);
      setHtmlContent(compiled.html);
      editedHtmlRef.current = "";

      setMessages(prev => [
        ...prev,
        { role: "user", parts: [{ text: `[Section ${sectionIndex + 1}] ${instruction}` }], text: `[Section ${sectionIndex + 1}] ${instruction}` } as unknown as Message,
        { role: "model", parts: [{ text: `Section ${sectionIndex + 1} updated.` }], text: `Section ${sectionIndex + 1} updated.` } as unknown as Message,
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
    setMjml((SAMPLE_TEMPLATE as any).mjml || "");
    setMessages([{ role: "model", text: "Here is your sample template. Try selecting text in the live preview to edit inline properties and text!" } as Message]);
    setErrorMsg(null);
    try {
      sessionStorage.setItem("ai_email_builder_is_sample", "true");
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRestart = () => {
    editedHtmlRef.current = "";
    setHtmlContent("");
    setMjml("");
    setMessages([]);
    setErrorMsg(null);
    setInfoMsg(null);
    setSuccessMsg(null);
    try {
      sessionStorage.removeItem("ai_email_builder_mjml");
      sessionStorage.removeItem("ai_email_builder_html");
      sessionStorage.removeItem("ai_email_builder_messages");
      sessionStorage.removeItem("ai_email_builder_is_sample");
    } catch (e) {
      console.warn(e);
    }
  };

  const handleMjmlChange = useCallback((_newMjml: string, newHtml: string) => {
    editedHtmlRef.current = newHtml;
  }, []);

  const handleCopyMjml = () => {
    if (mjml) {
      track("Export Clicked", { type: "MJML" });
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

    // 1. Rewrite inline style attributes to include Poppins/Inter/Roboto/sans-serif fallbacks
    doc.querySelectorAll("*").forEach(el => {
      const style = el.getAttribute("style");
      if (style && style.toLowerCase().includes("font-family")) {
        let updatedStyle = style.replace(/font-family\s*:\s*([^;]+)/gi, (match, val) => {
          let cleanVal = val.trim().replace(/['"]/g, "");
          const fonts = cleanVal.split(",").map((f: string) => f.trim().replace(/['"]/g, ""));

          // Force fallback font list to always include Poppins, Inter, Roboto (Gmail safe), and system fallbacks
          const fallbacks = ["Poppins", "Inter", "Roboto", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"];

          const newFonts: string[] = [];
          fonts.forEach((f: string) => {
            if (f && !newFonts.includes(f)) {
              newFonts.push(f);
            }
          });
          fallbacks.forEach((f: string) => {
            if (f && !newFonts.includes(f) && !newFonts.some((existing: string) => existing.toLowerCase() === f.toLowerCase())) {
              newFonts.push(f);
            }
          });

          const formattedFonts = newFonts.map((f: string) => {
            if (f.includes(" ") && !f.startsWith("'") && !f.startsWith('"')) {
              return `'${f}'`;
            }
            return f;
          });

          return `font-family: ${formattedFonts.join(", ")}`;
        });
        el.setAttribute("style", updatedStyle);
      }
    });

    // 2. Rewrite <style> blocks in the head to include the same fallbacks
    doc.querySelectorAll("style").forEach(styleEl => {
      let css = styleEl.innerHTML;
      css = css.replace(/font-family\s*:\s*([^;}]+)/gi, (match, val) => {
        let cleanVal = val.trim().replace(/['"]/g, "");
        const fonts = cleanVal.split(",").map((f: string) => f.trim().replace(/['"]/g, ""));
        const fallbacks = ["Poppins", "Inter", "Roboto", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"];
        const newFonts: string[] = [];
        fonts.forEach((f: string) => {
          if (f && !newFonts.includes(f)) newFonts.push(f);
        });
        fallbacks.forEach((f: string) => {
          if (f && !newFonts.includes(f) && !newFonts.some((existing: string) => existing.toLowerCase() === f.toLowerCase())) {
            newFonts.push(f);
          }
        });
        const formattedFonts = newFonts.map((f: string) => {
          if (f.includes(" ") && !f.startsWith("'") && !f.startsWith('"')) return `'${f}'`;
          return f;
        });
        return `font-family: ${formattedFonts.join(", ")}`;
      });
      styleEl.innerHTML = css;
    });

    // Resolve Image Dimensions to prevent stretch/aspect-ratio breaks in Gmail
    doc.querySelectorAll("img").forEach(img => {
      let widthStyle = img.style.width || img.getAttribute("width") || "";
      let heightStyle = img.style.height || img.getAttribute("height") || "";

      let resolvedWidthPx: number | null = null;
      let resolvedHeightPx: number | null = null;

      // 1. Resolve Width
      if (widthStyle.endsWith("px")) {
        resolvedWidthPx = parseFloat(widthStyle);
      } else if (widthStyle.endsWith("%")) {
        const pct = parseFloat(widthStyle) / 100;
        let parent = img.parentElement;
        let parentWidthPx = 600; // default MJML body width fallback
        while (parent) {
          const pWidthAttr = parent.getAttribute("width");
          const pStyleWidth = parent.style.width;
          if (pWidthAttr && pWidthAttr.endsWith("px")) {
            parentWidthPx = parseFloat(pWidthAttr);
            break;
          } else if (pWidthAttr && !isNaN(Number(pWidthAttr)) && !pWidthAttr.includes("%")) {
            parentWidthPx = parseFloat(pWidthAttr);
            break;
          } else if (pStyleWidth && pStyleWidth.endsWith("px")) {
            parentWidthPx = parseFloat(pStyleWidth);
            break;
          }
          parent = parent.parentElement;
        }
        resolvedWidthPx = Math.round(parentWidthPx * pct);
      } else if (!isNaN(Number(widthStyle)) && widthStyle !== "") {
        resolvedWidthPx = parseFloat(widthStyle);
      }

      // 2. Resolve Height
      if (heightStyle.endsWith("px")) {
        resolvedHeightPx = parseFloat(heightStyle);
      } else if (heightStyle.endsWith("%")) {
        const pct = parseFloat(heightStyle) / 100;
        let parent = img.parentElement;
        let parentHeightPx: number | null = null;
        while (parent) {
          const pHeightAttr = parent.getAttribute("height");
          const pStyleHeight = parent.style.height;
          if (pHeightAttr && pHeightAttr.endsWith("px")) {
            parentHeightPx = parseFloat(pHeightAttr);
            break;
          } else if (pHeightAttr && !isNaN(Number(pHeightAttr)) && !pHeightAttr.includes("%")) {
            parentHeightPx = parseFloat(pHeightAttr);
            break;
          } else if (pStyleHeight && pStyleHeight.endsWith("px")) {
            parentHeightPx = parseFloat(pStyleHeight);
            break;
          }
          parent = parent.parentElement;
        }
        if (parentHeightPx !== null) {
          resolvedHeightPx = Math.round(parentHeightPx * pct);
        }
      } else if (!isNaN(Number(heightStyle)) && heightStyle !== "") {
        resolvedHeightPx = parseFloat(heightStyle);
      }

      // 3. Aspect Ratio Math
      const aspectRatioStyle = img.style.aspectRatio;
      if (aspectRatioStyle && aspectRatioStyle !== "auto") {
        let ratio = 1;
        if (aspectRatioStyle.includes("/")) {
          const [wRatio, hRatio] = aspectRatioStyle.split("/").map(Number);
          if (wRatio && hRatio) ratio = wRatio / hRatio;
        } else {
          ratio = parseFloat(aspectRatioStyle) || 1;
        }

        if (resolvedWidthPx && !resolvedHeightPx) {
          resolvedHeightPx = Math.round(resolvedWidthPx / ratio);
        } else if (resolvedHeightPx && !resolvedWidthPx) {
          resolvedWidthPx = Math.round(resolvedHeightPx * ratio);
        }
      }

      // Apply changes to attributes (standard HTML email structure)
      if (resolvedWidthPx) {
        img.setAttribute("width", String(resolvedWidthPx));
        img.style.width = `${resolvedWidthPx}px`;
        img.style.maxWidth = "100%";
      } else {
        img.removeAttribute("width");
        img.style.width = "100%";
      }

      if (resolvedHeightPx) {
        img.setAttribute("height", String(resolvedHeightPx));
        img.style.height = `${resolvedHeightPx}px`;
      } else {
        img.removeAttribute("height");
        img.style.height = "auto";
      }

      img.style.aspectRatio = "";
      img.style.objectFit = "";
    });

    // Inject Google Fonts via @import inside <style> tags and fallback links
    const fontMapping: { [key: string]: string } = {
      "DM Sans": "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap",
      "Poppins": "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap",
      "Plus Jakarta Sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap",
      "Inter": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
      "Instrument Sans": "https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
      "Crimson Text": "https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&display=swap"
    };

    // Inject Google Font Links dynamically for any referenced font, and also make sure Poppins/Inter are loaded as fallbacks
    const referencedFonts = Object.keys(fontMapping).filter(fontName =>
      htmlStr.includes(fontName) || fontName === "Poppins" || fontName === "Inter"
    );

    if (referencedFonts.length > 0) {
      // Find or create a style element at the beginning of head
      let styleEl = doc.head?.querySelector("style");
      if (!styleEl) {
        styleEl = doc.createElement("style");
        if (doc.head) {
          doc.head.insertBefore(styleEl, doc.head.firstChild);
        } else {
          doc.documentElement.appendChild(styleEl);
        }
      }
      const importRules = referencedFonts
        .map(fontName => `@import url('${fontMapping[fontName]}');`)
        .join("\n");
      styleEl.innerHTML = importRules + "\n" + styleEl.innerHTML;

      // Also append link tags for extra reliability
      referencedFonts.forEach(fontName => {
        const linkPattern = fontName.replace(/\s+/g, "+");
        const exists = doc.querySelector(`link[href*="${linkPattern}"]`);
        if (!exists) {
          const link = doc.createElement("link");
          link.rel = "stylesheet";
          link.href = fontMapping[fontName];
          doc.head?.appendChild(link);
        }
      });
    }

    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  };

  const cleanHtmlForExportAsync = async (htmlStr: string): Promise<string> => {
    // 1. Perform synchronous cleaning first
    const syncCleaned = cleanHtmlForExport(htmlStr);

    const parser = new DOMParser();
    const doc = parser.parseFromString(syncCleaned, "text/html");

    const iframe = document.querySelector("iframe");
    const iframeDoc = iframe?.contentDocument;

    // 2. Perform async image dimension calculation using natural aspect ratio
    const images = Array.from(doc.querySelectorAll("img"));
    for (const img of images) {
      let src = img.getAttribute("src") || "";
      if (!src) continue;

      let resolvedWidthPx: number | null = null;
      let resolvedHeightPx: number | null = null;

      // Try to determine the width in pixels first
      let widthStyle = img.style.width || img.getAttribute("width") || "";
      if (widthStyle.endsWith("px")) {
        resolvedWidthPx = parseFloat(widthStyle);
      } else if (widthStyle.endsWith("%")) {
        const pct = parseFloat(widthStyle) / 100;
        let parent = img.parentElement;
        let parentWidthPx = 600; // default MJML body width fallback
        while (parent) {
          const pWidthAttr = parent.getAttribute("width");
          const pStyleWidth = parent.style.width;
          if (pWidthAttr && pWidthAttr.endsWith("px")) {
            parentWidthPx = parseFloat(pWidthAttr);
            break;
          } else if (pWidthAttr && !isNaN(Number(pWidthAttr)) && !pWidthAttr.includes("%")) {
            parentWidthPx = parseFloat(pWidthAttr);
            break;
          } else if (pStyleWidth && pStyleWidth.endsWith("px")) {
            parentWidthPx = parseFloat(pStyleWidth);
            break;
          }
          parent = parent.parentElement;
        }
        resolvedWidthPx = Math.round(parentWidthPx * pct);
      } else if (!isNaN(Number(widthStyle)) && widthStyle !== "") {
        resolvedWidthPx = parseFloat(widthStyle);
      }

      // Default fallback width
      if (!resolvedWidthPx || resolvedWidthPx <= 0) {
        resolvedWidthPx = 520;
      }

      // Get natural dimensions
      let naturalWidth = 0;
      let naturalHeight = 0;

      // a. Find it in the active iframe
      if (iframeDoc) {
        const iframeImg = Array.from(iframeDoc.querySelectorAll("img")).find(i => i.src === src || i.getAttribute("src") === src);
        if (iframeImg) {
          naturalWidth = iframeImg.naturalWidth;
          naturalHeight = iframeImg.naturalHeight;
        }
      }

      // b. Or load it dynamically
      if (!naturalWidth || !naturalHeight) {
        await new Promise<void>((resolve) => {
          const tempImg = new Image();
          tempImg.onload = () => {
            naturalWidth = tempImg.naturalWidth;
            naturalHeight = tempImg.naturalHeight;
            resolve();
          };
          tempImg.onerror = () => resolve();
          tempImg.src = src;
        });
      }

      if (naturalWidth && naturalHeight) {
        const ratio = naturalWidth / naturalHeight;
        resolvedHeightPx = Math.round(resolvedWidthPx / ratio);
      }

      if (resolvedWidthPx) {
        img.setAttribute("width", String(resolvedWidthPx));
        img.style.width = `${resolvedWidthPx}px`;
        img.style.maxWidth = "100%";
      }

      if (resolvedHeightPx) {
        img.setAttribute("height", String(resolvedHeightPx));
        img.style.height = `${resolvedHeightPx}px`;
      } else {
        img.removeAttribute("height");
        img.style.height = "auto";
      }

      img.style.aspectRatio = "";
      img.style.objectFit = "";
    }

    // 3. Perform async SVG -> PNG conversion
    for (const img of images) {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("data:image/svg+xml") || src.includes(".svg")) {
        try {
          let svgText = "";

          if (src.startsWith("data:image/svg+xml")) {
            const headerEnd = src.indexOf(",");
            if (headerEnd !== -1) {
              const data = src.substring(headerEnd + 1);
              if (src.includes(";base64")) {
                svgText = atob(data);
              } else {
                svgText = decodeURIComponent(data);
              }
            }
          } else {
            const res = await fetch(src);
            if (res.ok) {
              svgText = await res.text();
            }
          }

          if (svgText) {
            let width = parseInt(img.getAttribute("width") || img.style.width || "52", 10);
            let height = parseInt(img.getAttribute("height") || img.style.height || "52", 10);
            if (isNaN(width) || width <= 0) width = 52;
            if (isNaN(height) || height <= 0) height = 52;

            const cleanedSvg = svgText.includes("xmlns") ? svgText : svgText.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
            const svgBlob = new Blob([cleanedSvg], { type: "image/svg+xml;charset=utf-8" });
            const blobUrl = URL.createObjectURL(svgBlob);

            const pngDataUrl = await new Promise<string>((resolve, reject) => {
              const tempImg = new Image();
              tempImg.crossOrigin = "anonymous";
              tempImg.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(tempImg, 0, 0, width, height);
                  resolve(canvas.toDataURL("image/png"));
                } else {
                  reject(new Error("Canvas context is null"));
                }
                URL.revokeObjectURL(blobUrl);
              };
              tempImg.onerror = (err) => {
                reject(err);
                URL.revokeObjectURL(blobUrl);
              };
              tempImg.src = blobUrl;
            });

            img.setAttribute("src", pngDataUrl);
          }
        } catch (err) {
          console.error("Failed to convert SVG to PNG during export:", src, err);
        }
      }
    }

    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  };

  const handleExportHtml = async () => {
    const content = editedHtmlRef.current || htmlContent;
    if (content) {
      track("Download HTML");
      track("Export Clicked", { type: "HTML" });
      const cleanedContent = await cleanHtmlForExportAsync(content);
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

  const handleSaveToSupabase = async (title: string) => {
    const content = editedHtmlRef.current || htmlContent;
    if (!content || !mjml) {
      alert("No template to save. Generate one first!");
      return;
    }

    track("Export Clicked", { type: "Supabase" });
    setLoadingType("saving");
    setLoading(true);
    try {
      const cleanedContent = await cleanHtmlForExportAsync(content);
      await saveTemplate(title, mjml, cleanedContent);
      setShowSaveModal(false);

      // Highlight the library button for 3 seconds
      setIsLibraryHighlighted(true);
      setTimeout(() => {
        setIsLibraryHighlighted(false);
      }, 3000);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Ensure Database is configured and RLS policies allow inserts.";
      alert(`Failed to save template: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.warn("navigator.clipboard failed, trying fallback:", e);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback clipboard copy failed:", err);
      return false;
    }
  };

  const handleSharePreview = async () => {
    const content = editedHtmlRef.current || htmlContent;
    if (!content || !mjml) {
      setErrorMsg("No template to share. Generate one first!");
      return;
    }

    track("Export Clicked", { type: "Share" });
    setIsSharing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanedContent = await cleanHtmlForExportAsync(content);
      const match = typeof mjml === "string" ? mjml.match(/<mj-title>([^<]+)<\/mj-title>/i) : null;
      const title = match ? match[1].trim() : "Shared Preview";

      const record = await saveTemplate(title, mjml, cleanedContent);
      if (!record) throw new Error("Failed to save template for sharing.");

      const shareUrl = `${window.location.origin}/preview/${record.id}`;
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        setSuccessMsg("Preview link copied.");
      } else {
        setErrorMsg(`Failed to copy automatically. Link: ${shareUrl}`);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate shareable preview link.");
    } finally {
      setIsSharing(false);
    }
  };


  const handleDownloadEml = async () => {
    const content = editedHtmlRef.current || htmlContent;
    if (!content) {
      setErrorMsg("No template content to download.");
      return;
    }

    try {
      track("Download EML");
      track("Export Clicked", { type: "EML" });
      const match = typeof mjml === "string" ? mjml.match(/<mj-title>([^<]+)<\/mj-title>/i) : null;
      const subject = match ? match[1].trim() : "Test Email";
      const cleanedContent = await cleanHtmlForExportAsync(content);

      const emlLines = [
        "From: Email Builder <noreply@example.com>",
        "To: recipient@example.com",
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        'Content-Type: text/html; charset="utf-8"',
        "Content-Transfer-Encoding: 7bit",
        "",
        cleanedContent
      ];

      const emlString = emlLines.join("\r\n");
      const blob = new Blob([emlString], { type: "message/rfc822" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "test-email.eml";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg("EML download started.");
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg("Failed to generate EML file.");
    }
  };

  const handleSendTestEmail = async () => {
    const content = editedHtmlRef.current || htmlContent;
    if (!content) {
      setErrorMsg("No template content to send.");
      return;
    }

    setIsSendingTestEmail(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanedContent = await cleanHtmlForExportAsync(content);
      const res = await fetch("/api/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: cleanedContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSuccessMsg("Test email sent successfully to organdy69@gmail.com!");
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to send test email.");
    } finally {
      setIsSendingTestEmail(false);
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
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#f5f7fa]">
      {/* Mobile Tab Switcher */}
      {isMobile && (
        <div className="bg-white border-b border-slate-200 h-12 flex shrink-0 z-[90] shadow-sm w-full">
          <button
            onClick={() => {
              triggerMobileHaptic();
              setActiveTab("editor");
            }}
            className={`flex-1 flex items-center justify-center text-xs font-bold transition-all border-r border-slate-100 uppercase tracking-wider ${activeTab === "editor"
                ? "text-violet-600 bg-violet-50/40 font-bold border-b-2 border-b-violet-600"
                : "text-slate-500 hover:text-slate-800 bg-white"
              }`}
          >
            Prompt Bar
          </button>
          <button
            onClick={() => {
              triggerMobileHaptic();
              setActiveTab("preview");
            }}
            className={`flex-1 flex items-center justify-center text-xs font-bold transition-all uppercase tracking-wider ${activeTab === "preview"
                ? "text-violet-600 bg-violet-50/40 font-bold border-b-2 border-b-violet-600"
                : "text-slate-500 hover:text-slate-800 bg-white"
              }`}
          >
            Preview
          </button>
        </div>
      )}

      {/* Mobile Desktop Warning Banner */}
      {isMobile && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 shrink-0">
          <Monitor className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] font-medium text-amber-800 text-center leading-normal">
            For the best experience, please use a desktop device.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex flex-1 min-h-0 w-full relative flex-col md:flex-row">
        {/* Left Panel - Prompt Sidebar (collapsible) */}
        {(!isMobile || activeTab === "editor") && (
          <motion.div
            initial={false}
            animate={{
              width: isMobile ? "100%" : isPromptCollapsed ? 0 : "clamp(320px, 30vw, 380px)",
              minWidth: isMobile ? "100%" : isPromptCollapsed ? 0 : "320px",
            }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className={`relative shrink-0 h-full shadow-panel overflow-visible ${isMobile ? "flex-1 w-full" : ""}`}
          >
            <PromptEditor
              onGenerate={(p, img, mime, model, isFresh) => {
                const check = img ? { isIrrelevant: false } : isPromptIrrelevant(p);
                handleGenerate(p, img, mime, model, isFresh);
                if (isMobile && !check.isIrrelevant) {
                  setActiveTab("preview");
                }
              }}
              isLoading={loading}
              hasTemplate={!!mjml}
              messages={messages}
              isCollapsed={isMobile ? false : isPromptCollapsed}
              onToggleCollapse={() => setIsPromptCollapsed(v => !v)}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              usage={usage}
              onResetUsage={handleResetUsage}
              onRestart={handleRestart}
            />
          </motion.div>
        )}

        {/* Right Panel - Preview */}
        {(!isMobile || activeTab === "preview") && (
          <div className="flex-1 h-full min-w-0 relative">
            {/* Error Banner */}
            {errorMsg && (
              <div className={`absolute right-6 z-50 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-3 rounded-xl shadow-lg max-w-[calc(100vw-3rem)] md:max-w-[540px] animate-slide-up ${isMobile ? "bottom-32" : "bottom-20"
                }`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                <span className="flex-1 leading-relaxed">{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="shrink-0 -mt-0.5 p-0.5 rounded hover:bg-red-100 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* Info/Fallback Banner */}
            {infoMsg && (
              <div className={`absolute right-6 z-50 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-3 rounded-xl shadow-lg max-w-[calc(100vw-3rem)] md:max-w-[540px] animate-slide-up ${isMobile ? "bottom-32" : "bottom-20"
                }`}>
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span className="flex-1 leading-relaxed">{infoMsg}</span>
                <button onClick={() => setInfoMsg(null)} className="shrink-0 -mt-0.5 p-0.5 rounded hover:bg-amber-100 transition-colors">
                  <X className="w-3.5 h-3.5 text-amber-500" />
                </button>
              </div>
            )}
            {/* Success Banner */}
            {successMsg && (
              <div className={`absolute right-6 z-50 flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-4 py-3 rounded-xl shadow-lg max-w-[calc(100vw-3rem)] md:max-w-[540px] animate-slide-up ${isMobile ? "bottom-32" : "bottom-20"
                }`}>
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                <span className="flex-1 leading-relaxed">{successMsg}</span>
                <button onClick={() => setSuccessMsg(null)} className="shrink-0 -mt-0.5 p-0.5 rounded hover:bg-emerald-100 transition-colors">
                  <X className="w-3.5 h-3.5 text-emerald-500" />
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
              onSaveTemplate={() => setShowSaveModal(true)}
              onPreview={() => setShowPreviewModal(true)}
              onSharePreview={handleSharePreview}
              onDownloadHtml={handleExportHtml}
              onDownloadEml={handleDownloadEml}
              onLoadSample={handleLoadSample}
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
              isSharing={isSharing}
              isLibraryHighlighted={isLibraryHighlighted}
              onOpenTutorial={() => setShowOnboarding(true)}
              onSendTestEmail={handleSendTestEmail}
              isSendingTestEmail={isSendingTestEmail}
            />
          </div>
        )}
      </main>

      {/* History Panel Modal */}
      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onSelect={handleSelectHistory}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <PreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          html={cleanHtmlForExport(editedHtmlRef.current || htmlContent)}
          title={(() => {
            const match = typeof mjml === "string" ? mjml.match(/<mj-title>([^<]+)<\/mj-title>/i) : null;
            return match ? match[1].trim() : "Email Preview";
          })()}
        />
      )}
      {/* Save Template Modal */}
      {showSaveModal && (
        <SaveTemplateModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSaveToSupabase}
          isLoading={loading && loadingType === "saving"}
        />
      )}

      {/* Floating Action Button (FAB) for Bug Reporting */}
      {!isMobile && (
        <Tooltip content="Report a bug" position="left">
          <button
            onClick={() => setShowBugModal(true)}
            className="fixed z-[80] w-12 h-12 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 group hover:rotate-6 border border-rose-200 right-6 bottom-6"
            style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          >
            <Bug className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
          </button>
        </Tooltip>
      )}

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={showBugModal}
        onClose={() => setShowBugModal(false)}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
