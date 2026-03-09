import React from 'react';
import dynamic from 'next/dynamic';
import { EditorProps } from 'primereact/editor';

// Dynamically import the PrimeReact Editor component with SSR disabled
// This is critical because Quill (which PrimeReact Editor wraps) relies on the 'document' and 'window' objects
// which do not exist during server-side rendering, leading to "document is not defined" crashes.
const Editor = dynamic(() => import('primereact/editor').then((mod) => mod.Editor), {
    ssr: false,
    loading: () => (
        <div className="w-full h-40 bg-slate-50 border border-slate-200 rounded-lg animate-pulse flex items-center justify-center">
            <span className="text-xs text-slate-400 font-medium">Loading rich text editor...</span>
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
                style={{ height: '220px' }}
                {...rest}
            />
        </div>
    );
}
