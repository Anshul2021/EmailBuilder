"use client";

import React from "react";
import dynamic from "next/dynamic";
import { EditorProps } from "primereact/editor";

import { Skeleton } from "primereact/skeleton";

// Dynamically import the PrimeReact Editor component with SSR disabled
// This is critical because Quill (which PrimeReact Editor wraps) relies on the 'document' and 'window' objects
// which do not exist during server-side rendering, leading to "document is not defined" crashes.
const Editor = dynamic(() => import("primereact/editor").then((mod) => mod.Editor), {
    ssr: false,
    loading: () => (
        <div className="w-full bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <Skeleton width="2rem" height="1.5rem" />
                <Skeleton width="2rem" height="1.5rem" />
                <Skeleton width="2rem" height="1.5rem" />
                <div className="w-px h-4 bg-slate-100 mx-1" />
                <Skeleton width="4rem" height="1.5rem" />
            </div>
            <Skeleton width="100%" height="1rem" />
            <Skeleton width="90%" height="1rem" />
            <Skeleton width="95%" height="1rem" />
            <Skeleton width="40%" height="1rem" />
        </div>
    )
});

export interface RichTextEditorProps extends Omit<EditorProps, 'value' | 'onTextChange' | 'onChange'> {
    value: string;
    onChange: (htmlValue: string | null) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className, ...rest }: RichTextEditorProps) {
    return (
        <div className={`p-fluid modern-quill-editor ${className || ''}`}>
            <Editor
                value={value}
                onTextChange={(e) => onChange(e.htmlValue)}
                placeholder={placeholder}
                style={{ height: '320px' }}
                {...rest}
            />
        </div>
    );
}
