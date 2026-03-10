const fs = require('fs');

const file = 'src/components/LivePreview.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the exact location of the end of the PreviewToolbar tag
const startPoint = content.indexOf('            {/* ── Content row ── */}');

if (startPoint !== -1) {
    const newContentRow = `            {/* ── Content row ── */}
            <div className="flex flex-1 min-h-0">
                <div className="flex-1 overflow-auto p-6 flex items-start justify-center relative scrollbar-hide">
                    {isLoading && (
                        <div className="absolute inset-x-6 top-6 bottom-6 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] animate-fade-in rounded-xl overflow-hidden border border-slate-200/50">
                            <div className="w-full max-w-md bg-white p-8 flex flex-col gap-6 scale-95 opacity-80 pointer-events-none">
                                <div className="flex items-center justify-between">
                                    <Skeleton width="5rem" height="1.5rem" />
                                    <div className="flex gap-2">
                                        <Skeleton width="2rem" height="0.5rem" />
                                        <Skeleton width="2rem" height="0.5rem" />
                                    </div>
                                </div>
                                <Skeleton width="100%" height="160px" borderRadius="12px" />
                                <div className="space-y-3">
                                    <Skeleton width="100%" height="0.8rem" />
                                    <Skeleton width="90%" height="0.8rem" />
                                </div>
                                <div className="flex justify-center pt-2">
                                    <Skeleton width="8rem" height="2.5rem" borderRadius="8px" />
                                </div>
                                <div className="flex flex-col items-center gap-1.5 pt-4">
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-violet-600 rounded-full animate-pulse" />
                                        <p className="text-sm font-bold text-slate-800 tracking-tight">Gemini is crafting your email</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div
                        className={clsx(
                            "bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 transition-all duration-500 ease-out scrollbar-hide",
                            viewMode === "desktop" ? "w-full max-w-3xl min-h-[600px]" : "w-[390px] min-h-[700px]"
                        )}
                        style={{ height: "calc(100vh - 100px)", maxHeight: 800 }}
                    >
                        {html ? (
                            <iframe
                                ref={iframeRef}
                                title="Email Preview"
                                srcDoc={html}
                                onLoad={handleIframeLoad}
                                className="w-full h-full border-0 bg-white scrollbar-hide"
                                sandbox="allow-same-origin allow-scripts"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <MailOpen className="w-7 h-7 text-slate-300" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-slate-500">Your email preview will appear here</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {showEditPanel && html && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: panelWidth, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="shrink-0 relative border-l border-slate-200 bg-white h-full overflow-hidden"
                            style={{ width: panelWidth }}
                        >
                            <div
                                onMouseDown={handleDragStart}
                                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group flex items-center justify-center hover:bg-violet-100 transition-colors"
                                title="Drag to resize"
                            >
                                <div className="w-0.5 h-8 bg-slate-300 group-hover:bg-violet-400 rounded-full transition-colors" />
                            </div>

                            <div className="pl-1.5 h-full" style={{ width: panelWidth }}>
                                <PropertiesPanel
                                    hasSelection={hasSelection}
                                    selectedProps={selectedProps}
                                    onContentChange={handleContentChange}
                                    onApplyStyle={applyStyle}
                                    onEnableTextEdit={enableTextEdit}
                                    onReplaceImage={handleReplaceImage}
                                    onClose={() => setShowEditPanel(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
`;
    
    const finalContent = content.substring(0, startPoint) + newContentRow;
    fs.writeFileSync(file, finalContent);
    console.log("Successfully rebuilt LivePreview JSX tree!");
} else {
    console.log("Could not find insertion point.");
}
