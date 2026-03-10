"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Edit2, Check, Clock } from "lucide-react";
import { getTemplates, deleteTemplate, updateTemplate, TemplateRecord } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabaseClient";

interface HistoryPanelProps {
  onClose: () => void;
  onSelect: (template: TemplateRecord) => void;
}

export function HistoryPanel({ onClose, onSelect }: HistoryPanelProps) {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();

    const channel = supabase
      .channel("public:MJML_HTML")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "MJML_HTML" },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this template?")) {
      await deleteTemplate(id);
    }
  };

  const handleEditClick = (e: React.MouseEvent, t: TemplateRecord) => {
    e.stopPropagation();
    setEditingId(t.id);
    setEditName(t.template_name || "");
  };

  const handleSaveEdit = async (e: React.MouseEvent, t: TemplateRecord) => {
    e.stopPropagation();
    if (editName.trim() && editName !== t.template_name) {
      await updateTemplate(t.id, editName.trim(), t.mjml, t.html);
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[400px] h-full bg-white shadow-2xl flex flex-col animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-500" />
            Template History
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-slate-500 py-10 text-sm">Loading history...</div>
          ) : templates.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-sm">No templates saved yet.</div>
          ) : (
            templates.map((t) => (
              <div 
                key={t.id} 
                className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => onSelect(t)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingId === t.id ? (
                      <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 text-sm border border-violet-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-violet-200"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(e as any, t)}
                        />
                        <button onClick={(e) => handleSaveEdit(e, t)} className="p-1.5 bg-violet-100 text-violet-700 rounded hover:bg-violet-200">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-medium text-slate-800 truncate mb-1 pr-6">{t.template_name || "Untitled Template"}</h3>
                    )}
                    <div className="text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3">
                    <button 
                      onClick={(e) => handleEditClick(e, t)}
                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(e, t.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
