"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronDown, Eye, EyeOff, Trash2, Copy,
  Sparkles, GripVertical, Loader2, Check, AlertCircle, Pencil
} from "lucide-react";
import type { MjmlNode, MjmlNodeType } from "@/lib/mjmlTree";
import { getNodeIcon } from "@/lib/mjmlTree";

// ── Types ────────────────────────────────────────────────────────────────────

export type SectionEditState = "idle" | "processing" | "success" | "error";

interface LayerPanelProps {
  tree: MjmlNode | null;
  selectedNodeId: string | null;
  sectionEditStates: Map<string, SectionEditState>;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  onToggleExpand: (nodeId: string) => void;
  onToggleHidden: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onMove: (nodeId: string, targetId: string, position: "before" | "after" | "inside") => void;
  onAiEdit: (nodeId: string) => void;
}

// Filter out head-level nodes from display
const HIDDEN_TYPES = new Set<MjmlNodeType>(["mjml", "head", "attributes", "style", "font", "preview", "title", "all", "unknown"]);

// ── Layer Node Component ─────────────────────────────────────────────────────

interface LayerNodeProps {
  node: MjmlNode;
  depth: number;
  selectedNodeId: string | null;
  sectionEditStates: Map<string, SectionEditState>;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  onToggleExpand: (nodeId: string) => void;
  onToggleHidden: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onMove: (nodeId: string, targetId: string, position: "before" | "after" | "inside") => void;
  onAiEdit: (nodeId: string) => void;
  draggedNodeId: string | null;
  setDraggedNodeId: (id: string | null) => void;
  dropTargetId: string | null;
  dropPosition: "before" | "after" | "inside" | null;
  setDropTarget: (id: string | null, position: "before" | "after" | "inside" | null) => void;
}

function LayerNode({
  node,
  depth,
  selectedNodeId,
  sectionEditStates,
  onSelectNode,
  onHoverNode,
  onToggleExpand,
  onToggleHidden,
  onDelete,
  onDuplicate,
  onRename,
  onMove,
  onAiEdit,
  draggedNodeId,
  setDraggedNodeId,
  dropTargetId,
  dropPosition,
  setDropTarget,
}: LayerNodeProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [isHovered, setIsHovered] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isSelected = selectedNodeId === node.id;
  const isDragged = draggedNodeId === node.id;
  const isDropTarget = dropTargetId === node.id;
  const hasChildren = node.children.filter(c => !HIDDEN_TYPES.has(c.type)).length > 0;
  const editState = sectionEditStates.get(node.id) || "idle";

  // Can this node type be modified?
  const canDelete = node.type !== "body";
  const canDuplicate = node.type === "section" || node.type === "column" || node.type === "text" || node.type === "image" || node.type === "button";
  const canAiEdit = node.type === "section";
  const canDrag = node.type !== "body";

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== node.name) {
      onRename(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!canDrag) return;
    e.stopPropagation();
    setDraggedNodeId(node.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", node.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggedNodeId || draggedNodeId === node.id) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (y < height * 0.25) {
      setDropTarget(node.id, "before");
    } else if (y > height * 0.75) {
      setDropTarget(node.id, "after");
    } else if (hasChildren || node.type === "section" || node.type === "column" || node.type === "body") {
      setDropTarget(node.id, "inside");
    } else {
      setDropTarget(node.id, "after");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedNodeId && dropPosition) {
      onMove(draggedNodeId, node.id, dropPosition);
    }
    setDraggedNodeId(null);
    setDropTarget(null, null);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDropTarget(null, null);
  };

  // AI edit state indicator
  const renderEditState = () => {
    if (editState === "processing") return <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />;
    if (editState === "success") return <Check className="w-3 h-3 text-emerald-500" />;
    if (editState === "error") return <AlertCircle className="w-3 h-3 text-red-500" />;
    return null;
  };

  return (
    <div className="select-none">
      {/* Drop indicator line - before */}
      {isDropTarget && dropPosition === "before" && (
        <div className="h-0.5 bg-violet-500 rounded-full mx-2" style={{ marginLeft: `${depth * 16 + 8}px` }} />
      )}

      {/* Node row */}
      <div
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => { setIsHovered(true); onHoverNode(node.id); }}
        onMouseLeave={() => { setIsHovered(false); onHoverNode(null); }}
        onClick={() => onSelectNode(node.id)}
        onDoubleClick={() => {
          setIsRenaming(true);
          setRenameValue(node.name);
          setTimeout(() => renameInputRef.current?.focus(), 50);
        }}
        className={`
          group flex items-center gap-1 py-1 px-2 mx-1 rounded-lg cursor-pointer text-xs transition-all
          ${isSelected ? "bg-violet-50 border border-violet-200 text-violet-900" : "hover:bg-slate-50 border border-transparent"}
          ${isDragged ? "opacity-40" : ""}
          ${node.isHidden ? "opacity-40" : ""}
          ${isDropTarget && dropPosition === "inside" ? "bg-violet-50 border-violet-200 border-dashed" : ""}
        `}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {/* Drag handle */}
        {canDrag && isHovered && (
          <GripVertical className="w-3 h-3 text-slate-300 cursor-grab shrink-0" />
        )}

        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(node.id);
          }}
          className="w-4 h-4 flex items-center justify-center shrink-0"
        >
          {hasChildren ? (
            node.isExpanded
              ? <ChevronDown className="w-3 h-3 text-slate-400" />
              : <ChevronRight className="w-3 h-3 text-slate-400" />
          ) : (
            <span className="w-3" />
          )}
        </button>

        {/* Icon */}
        <span className="text-xs shrink-0" title={node.type}>{getNodeIcon(node.type)}</span>

        {/* Name */}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="flex-1 text-xs bg-white border border-violet-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-violet-400 min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={`flex-1 truncate font-medium ${
              isSelected ? "text-violet-800" : node.isHidden ? "text-slate-400 line-through" : "text-slate-700"
            }`}
            title={node.name}
          >
            {node.name}
          </span>
        )}

        {/* AI Edit state indicator */}
        {editState !== "idle" && renderEditState()}

        {/* Hover controls */}
        <AnimatePresence>
          {isHovered && !isRenaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex items-center gap-0.5 shrink-0"
            >
              {canAiEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAiEdit(node.id); }}
                  className="p-0.5 rounded hover:bg-violet-100 text-violet-500 transition-colors"
                  title="AI Edit"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setRenameValue(node.name); setTimeout(() => renameInputRef.current?.focus(), 50); }}
                className="p-0.5 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                title="Rename"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleHidden(node.id); }}
                className="p-0.5 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                title={node.isHidden ? "Show" : "Hide"}
              >
                {node.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              {canDuplicate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDuplicate(node.id); }}
                  className="p-0.5 rounded hover:bg-slate-100 text-slate-400 transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                  className="p-0.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drop indicator line - after */}
      {isDropTarget && dropPosition === "after" && (
        <div className="h-0.5 bg-violet-500 rounded-full mx-2" style={{ marginLeft: `${depth * 16 + 8}px` }} />
      )}

      {/* Children (expanded) */}
      <AnimatePresence>
        {node.isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: "hidden" }}
          >
            {node.children
              .filter(c => !HIDDEN_TYPES.has(c.type))
              .map(child => (
                <LayerNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  selectedNodeId={selectedNodeId}
                  sectionEditStates={sectionEditStates}
                  onSelectNode={onSelectNode}
                  onHoverNode={onHoverNode}
                  onToggleExpand={onToggleExpand}
                  onToggleHidden={onToggleHidden}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onRename={onRename}
                  onMove={onMove}
                  onAiEdit={onAiEdit}
                  draggedNodeId={draggedNodeId}
                  setDraggedNodeId={setDraggedNodeId}
                  dropTargetId={dropTargetId}
                  dropPosition={dropPosition}
                  setDropTarget={setDropTarget}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main LayerPanel ──────────────────────────────────────────────────────────

export function LayerPanel({
  tree,
  selectedNodeId,
  sectionEditStates,
  onSelectNode,
  onHoverNode,
  onToggleExpand,
  onToggleHidden,
  onDelete,
  onDuplicate,
  onRename,
  onMove,
  onAiEdit,
}: LayerPanelProps) {
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside" | null>(null);

  const setDropTarget = useCallback((id: string | null, pos: "before" | "after" | "inside" | null) => {
    setDropTargetId(id);
    setDropPosition(pos);
  }, []);

  if (!tree) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
          <span className="text-xl">📦</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">No template loaded</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Generate or load a template to see its layer structure
          </p>
        </div>
      </div>
    );
  }

  // Start from the body node (skip mjml wrapper and head)
  const bodyNode = tree.children.find(c => c.type === "body") || tree;

  return (
    <div
      className="flex-1 overflow-y-auto py-2"
      onDragOver={(e) => e.preventDefault()}
    >
      <LayerNode
        node={bodyNode}
        depth={0}
        selectedNodeId={selectedNodeId}
        sectionEditStates={sectionEditStates}
        onSelectNode={onSelectNode}
        onHoverNode={onHoverNode}
        onToggleExpand={onToggleExpand}
        onToggleHidden={onToggleHidden}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onRename={onRename}
        onMove={onMove}
        onAiEdit={onAiEdit}
        draggedNodeId={draggedNodeId}
        setDraggedNodeId={setDraggedNodeId}
        dropTargetId={dropTargetId}
        dropPosition={dropPosition}
        setDropTarget={setDropTarget}
      />
    </div>
  );
}
