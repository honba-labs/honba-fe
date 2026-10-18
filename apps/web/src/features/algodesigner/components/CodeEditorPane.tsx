// Monaco Python Editor Component
// Mirrors honba-frontend apps/algodesigner/monaco-python-editor.tsx

import React, { useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Editor Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          background: 'var(--bg-surface-elevated, #2a2e39)',
          borderBottom: '1px solid var(--border-subtle, #2a2e39)',
          fontSize: 11,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Python</span>
          <span
            style={{
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--text-muted)',
              fontSize: 10,
            }}
          >
            {hashRef.current.slice(0, 12)}…
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: statusColors[syncStatusRef.current],
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColors[syncStatusRef.current],
                animation: syncStatusRef.current === 'pending' ? 'pulse 1s infinite' : 'none',
              }}
            />
            <span>{statusText[syncStatusRef.current]}</span>
          </span>
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