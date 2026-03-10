const fs = require('fs');
const file = 'src/components/LivePreview.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add icons
content = content.replace(
  'import { Monitor, Smartphone, MailOpen, AlignLeft, AlignCenter, AlignRight, Bold, Copy, Download, PencilLine, Check, ImageIcon, X, Upload } from "lucide-react";',
  'import { Monitor, Smartphone, MailOpen, AlignLeft, AlignCenter, AlignRight, Bold, Copy, Download, PencilLine, Check, ImageIcon, X, Upload, Undo2, Redo2, RotateCcw, Save, History } from "lucide-react";'
);

// 2. Add Props Support (Regex this time for robustness)
content = content.replace(/onExportHtml:\s*\(\)\s*=>\s*void;\s*}/, 'onExportHtml: () => void;\n    onSaveTemplate?: () => void;\n    onOpenHistory?: () => void;\n}');
content = content.replace(/export\s+function\s+LivePreview\s*\(\s*{\s*html,\s*mjml,\s*isLoading,\s*onMjmlChange,\s*onCopyMjml,\s*onExportHtml\s*}\s*:\s*LivePreviewProps\s*\)/, 'export function LivePreview({ html, mjml, isLoading, onMjmlChange, onCopyMjml, onExportHtml, onSaveTemplate, onOpenHistory }: LivePreviewProps)');

// 3. Add state and refs for Undo/Redo
const stateInjection = `
    // History (Undo/Redo)
    const [undoStack, setUndoStack] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);
    const initialHtmlRef = useRef<string>(html);

    useEffect(() => {
        if (html && !initialHtmlRef.current) {
            initialHtmlRef.current = html;
        }
    }, [html]);

    const saveVersion = useCallback((newHtml: string) => {
        setUndoStack(prev => {
            if (prev.length > 0 && prev[prev.length - 1] === newHtml) return prev;
            return [...prev, newHtml].slice(-50);
        });
        setRedoStack([]);
    }, []);
`;
content = content.replace(
  '    // Resizing state',
  stateInjection + '\\n    // Resizing state'
);

// 4. Update injectIframeStyles
const deleteHandleStyle = `
                .ag-delete-handle {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: #ef4444;
                    color: white;
                    border: 2px solid white;
                    border-radius: 4px;
                    cursor: pointer;
                    z-index: 1000;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    display: none;
                    text-align: center;
                    line-height: 16px;
                    font-size: 14px;
                    font-weight: bold;
                    user-select: none;
                    font-family: sans-serif;
                }
                .ag-delete-handle:hover { background: #dc2626; }
`;
content = content.replace(
  '                .ag-resize-handle {',
  deleteHandleStyle + '                .ag-resize-handle {'
);

const deleteHandleElement = `
        if (!doc.getElementById("ag-delete-handle")) {
            const handle = doc.createElement("div");
            handle.id = "ag-delete-handle";
            handle.className = "ag-delete-handle";
            handle.innerHTML = "×";
            handle.title = "Delete block";
            doc.body.appendChild(handle);
        }
`;
content = content.replace(
  '        if (!doc.getElementById("ag-drop-indicator")) {',
  deleteHandleElement + '        if (!doc.getElementById("ag-drop-indicator")) {'
);

// 5. ApplyHtml function and undo/redo functions
const undoRedoFns = `
    const applyHtmlToIframe = useCallback((newHtmlStr: string) => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(newHtmlStr, "text/html");
        doc.head.innerHTML = newDoc.head.innerHTML;
        doc.body.innerHTML = newDoc.body.innerHTML;
        injectIframeStyles(doc);
        selectedElementRef.current = null;
        setHasSelection(false);
        setSelectedProps(DEFAULT_PROPS);
        updateResizeHandlePosition();
    }, [injectIframeStyles, updateResizeHandlePosition]);

    const undo = useCallback(() => {
        if (undoStack.length === 0) return;
        const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || "";
        const previousHtml = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, currentHtml]);
        setUndoStack(prev => prev.slice(0, -1));
        applyHtmlToIframe(previousHtml);
        if (onMjmlChangeRef.current) onMjmlChangeRef.current(mjmlRef.current, previousHtml);
    }, [undoStack, applyHtmlToIframe]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || "";
        const nextHtml = redoStack[redoStack.length - 1];
        setUndoStack(prev => [...prev, currentHtml]);
        setRedoStack(prev => prev.slice(0, -1));
        applyHtmlToIframe(nextHtml);
        if (onMjmlChangeRef.current) onMjmlChangeRef.current(mjmlRef.current, nextHtml);
    }, [redoStack, applyHtmlToIframe]);

    const reset = useCallback(() => {
        if (!initialHtmlRef.current) return;
        if (window.confirm("Are you sure you want to reset all changes?")) {
            const currentHtml = iframeRef.current?.contentDocument?.documentElement.outerHTML || "";
            saveVersion(currentHtml);
            applyHtmlToIframe(initialHtmlRef.current);
            if (onMjmlChangeRef.current) onMjmlChangeRef.current(mjmlRef.current, initialHtmlRef.current);
        }
    }, [saveVersion, applyHtmlToIframe]);
`;
content = content.replace(
  '    // Refs to avoid stale closures in iframe event listeners',
  undoRedoFns + '\\n    // Refs to avoid stale closures in iframe event listeners'
);

// 6. Update Resize Handles Logic
const handlePos = `
            const deleteHandle = doc.getElementById("ag-delete-handle");
            if (dragHandle && !isBlockDraggingRef.current) {
                dragHandle.style.left = \\\`\\\${rect.left + scrollX - 12}px\\\`;
                dragHandle.style.top = \\\`\\\${rect.top + scrollY - 12}px\\\`;
                dragHandle.style.display = "block";
            }
            if (deleteHandle && !isBlockDraggingRef.current) {
                deleteHandle.style.left = \\\`\\\${rect.right + scrollX - 8}px\\\`;
                deleteHandle.style.top = \\\`\\\${rect.top + scrollY - 12}px\\\`;
                deleteHandle.style.display = "block";
            }
`;
content = content.replace(
  /            if \(dragHandle && !isBlockDraggingRef\.current\) {[\s\S]*?            }/,
  handlePos.trim()
);
content = content.replace(
  '            if (deleteHandle) deleteHandle.style.display = "none";',
  ''
).replace(
  '            if (dragHandle) dragHandle.style.display = "none";',
  '            if (dragHandle) dragHandle.style.display = "none";\\n            const deleteHandle = doc.getElementById("ag-delete-handle");\\n            if (deleteHandle) deleteHandle.style.display = "none";'
);


// 7. Keyboard & Click listeners
const keydownLogic = `
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
                e.preventDefault();
                redo();
            } else if ((e.key === "Delete" || e.key === "Backspace") && selectedElementRef.current && selectedElementRef.current.contentEditable !== "true") {
                e.preventDefault();
                saveVersion(iframeRef.current?.contentDocument?.documentElement.outerHTML || "");
                selectedElementRef.current.remove();
                propagateChanges();
                clearSelection();
            }
        };
        win.addEventListener("keydown", handleGlobalKeyDown);
`;
content = content.replace(
  '        doc.addEventListener("mousedown", (e) => {',
  keydownLogic + '\\n        doc.addEventListener("mousedown", (e) => {'
);

const mouseDelLogic = `
            const deleteHandle = doc.getElementById("ag-delete-handle");
            if (target === deleteHandle && selectedElementRef.current) {
                e.preventDefault();
                e.stopPropagation();
                saveVersion(doc.documentElement.outerHTML);
                selectedElementRef.current.remove();
                propagateChanges();
                clearSelection();
                return;
            }
`;
content = content.replace(
  '            const resizeHandle = doc.getElementById("ag-resize-handle");',
  '            const resizeHandle = doc.getElementById("ag-resize-handle");' + mouseDelLogic
);


// 8. Toolbar Buttons
const toolbarButtons = `
                    <div className="flex items-center gap-1">
                        <Tooltip content="Undo (Ctrl+Z)">
                            <button onClick={undo} disabled={undoStack.length === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <Undo2 className="w-4 h-4" />
                            </button>
                        </Tooltip>
                        <Tooltip content="Redo (Ctrl+Shift+Z)">
                            <button onClick={redo} disabled={redoStack.length === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <Redo2 className="w-4 h-4" />
                            </button>
                        </Tooltip>
                        <Tooltip content="Reset All">
                            <button onClick={reset} disabled={!html} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </Tooltip>
                    </div>

                    <div className="w-px h-5 bg-slate-200" />

                    <Tooltip content="Copy MJML">
                        <button onClick={handleCopyMjml} disabled={!html} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40">
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </Tooltip>
                    
                    <div className="w-px h-5 bg-slate-200" />
                    
                    <Tooltip content="View History">
                        <button onClick={onOpenHistory} className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors shadow-sm">
                            <History className="w-3.5 h-3.5" />
                            History
                        </button>
                    </Tooltip>
                    
                    <Tooltip content="Save to Supabase">
                        <button onClick={onSaveTemplate} disabled={!html} className="flex items-center gap-1.5 text-xs font-semibold bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <Save className="w-3.5 h-3.5" />
                            Save
                        </button>
                    </Tooltip>

                    <Tooltip content="Export HTML file">
                        <button onClick={onExportHtml} disabled={!html} className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </Tooltip>
`;
content = content.replace(
  /                    <Tooltip content="Copy MJML">[\s\S]*?<\/Tooltip>/,
  toolbarButtons.trim()
);

content = content.replace(/if \(doc\) propagateChanges\(\);/g, 'if (doc) {\\n            saveVersion(doc.documentElement.outerHTML);\\n            propagateChanges();\\n        }');

fs.writeFileSync(file, content);
console.log('Fixed LivePreview.tsx!');
