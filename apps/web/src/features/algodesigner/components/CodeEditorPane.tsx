import React, { useEffect, useRef, useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Copy, Check, Wand2 } from 'lucide-react';

import { setupMonaco, type EditorMarker, type EditorReveal } from './monaco-setup';

export type { EditorReveal };

interface CodeEditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  markers: EditorMarker[];
  hash: string;
  syncStatus: 'idle' | 'pending' | 'synced' | 'invalid';
  reveal?: EditorReveal | null;
  onLineClick?: (line: number) => void;
}

export const CodeEditorPane: React.FC<CodeEditorPaneProps> = ({
  value,
  onChange,
  markers,
  hash,
  syncStatus,
  reveal,
  onLineClick,
}) => {
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const mountedRef = useRef(false);
  const markersRef = useRef(markers);
  const hashRef = useRef(hash);
  const syncStatusRef = useRef(syncStatus);

  markersRef.current = markers;
  hashRef.current = hash;
  syncStatusRef.current = syncStatus;

  // Initialize Monaco on first mount
  useEffect(() => {
    setupMonaco();
    mountedRef.current = true;
  }, []);

  // Convert EditorMarker to monaco IMarkerData
  const toMarkerData = (marker: EditorMarker) => ({
    startLineNumber: marker.startLineNumber,
    endLineNumber: marker.endLineNumber,
    startColumn: 1,
    endColumn: 100,
    severity: marker.severity,
    message: marker.message,
  });

  // Update markers when they change
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(model, 'honba', markersRef.current.map(toMarkerData));
  }, [markers]);

  // Handle reveal (scroll to line)
  useEffect(() => {
    if (!reveal || !editorRef.current) return;
    const editor = editorRef.current;
    if (!editor) return;

    editor.revealLineInCenter(reveal.line);
    editor.setPosition({ lineNumber: reveal.line, column: 1 });
  }, [reveal]);

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;

    // Click on line number or gutter to select node
    editor.onMouseDown((e) => {
      if (e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
          e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber;
        if (line && onLineClick) onLineClick(line);
      }
    });

    // Set initial markers
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'honba', markersRef.current.map(toMarkerData));
    }
  }, [onLineClick]);

  const handleChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) onChange(newValue);
  }, [onChange]);

  const statusColors = {
    idle: 'var(--text-muted)',
    pending: 'var(--accent-gold, #f7a600)',
    synced: 'var(--bullish, #089981)',
    invalid: 'var(--bearish, #f23645)',
  };

  const statusText = {
    idle: 'Flow: idle',
    pending: 'Pending valid syntax…',
    synced: 'Graph synced (clean)',
    invalid: 'Last valid graph held',
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFormat = () => {
    if (!editorRef.current) return;
    editorRef.current.getAction('editor.action.formatDocument')?.run();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Editor Toolbar */}
      <div className="code-editor-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="code-editor-tab">
            <span className="code-editor-tab__lang">Python 3.12</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>strategy.py</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--text-muted)',
              fontSize: 10,
            }}
          >
            {hashRef.current.slice(0, 10)}…
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleFormat}
            title="Auto-format Python code"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              fontSize: 10,
              background: 'transparent',
              border: '1px solid var(--border-subtle, #2a2e39)',
              borderRadius: 4,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Wand2 size={11} />
            <span>Format</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            title="Copy Python code to clipboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              fontSize: 10,
              background: 'transparent',
              border: '1px solid var(--border-subtle, #2a2e39)',
              borderRadius: 4,
              color: copied ? 'var(--bullish, #089981)' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <div
            className="code-editor-status"
            style={{
              color: statusColors[syncStatusRef.current],
              paddingLeft: 6,
              borderLeft: '1px solid var(--border-subtle, #2a2e39)',
            }}
          >
            <span
              className="code-editor-status__dot"
              style={{
                background: statusColors[syncStatusRef.current],
                animation: syncStatusRef.current === 'pending' ? 'pulse 1s infinite' : 'none',
              }}
            />
            <span>{statusText[syncStatusRef.current]}</span>
          </div>
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="honba-dark"
          value={value}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 12,
            fontFamily: 'var(--font-family-mono, "JetBrains Mono", "Fira Code", monospace)',
            lineHeight: 1.6,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'off',
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            renderLineHighlight: 'all',
            selectionHighlight: true,
            matchBrackets: 'always',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            codeLens: false,
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
            },
            overviewRulerLanes: 3,
            overviewRulerBorder: false,
          }}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};