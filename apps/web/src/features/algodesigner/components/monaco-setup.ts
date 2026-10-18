// Monaco Editor Setup
// Mirrors honba-frontend apps/algodesigner/monaco-setup.ts

import * as monaco from 'monaco-editor';

// Configure Monaco for Python
export function setupMonaco(): void {
  // Register Python language if not already registered
  if (!monaco.languages.getLanguages().some((l) => l.id === 'python')) {
    monaco.languages.register({ id: 'python' });
  }

  // Set up Python language configuration
  monaco.languages.setLanguageConfiguration('python', {
    comments: {
      lineComment: '#',
      blockComment: ['"""', '"""'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '"""', close: '"""' },
      { open: "'''", close: "'''" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*#region\\b'),
        end: new RegExp('^\\s*#endregion\\b'),
      },
    },
  });

  // Define Python monarch tokenizer for basic highlighting
  monaco.languages.setMonarchTokensProvider('python', {
    keywords: [
      'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
      'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import',
      'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
      'True', 'try', 'while', 'with', 'yield',
    ],
    operators: ['=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-', '*', '/', '%', '**', '//', '<<', '>>', '&', '|', '^', '+=', '-=', '*=', '/=', '%=', '**=', '//=', '&=', '|=', '^=', '>>=', '<<='],
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
      root: [
        [/[a-z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/[A-Z][\w\$]*/, 'type.identifier'],
        { include: '@whitespace' },
        [/[{}()\[\]]/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        [/[;,.]/, 'delimiter'],
        [/"""/, 'string', '@string_double'],
        [/'''/, 'string', '@string_single'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
        [/#.*/, 'comment'],
      ],
      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],
      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/#.*/, 'comment'],
      ],
    },
  });

  // Define a custom theme matching honba-fe's design tokens
  monaco.editor.defineTheme('honba-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a7282' },
      { token: 'keyword', foreground: 'c678dd', fontStyle: 'bold' },
      { token: 'identifier', foreground: 'e06c75' },
      { token: 'type.identifier', foreground: 'e5c07b' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'string', foreground: '98c379' },
      { token: 'operator', foreground: '56b6c2' },
      { token: 'delimiter', foreground: 'abb2bf' },
    ],
    colors: {
      'editor.background': '#131722',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#1e222d',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#214283',
      'editorCursor.foreground': '#58a6ff',
      'editor.lineNumbers': '#484f58',
      'editorLineNumber.activeForeground': '#c9d1d9',
      'editorIndentGuide.background': '#21262d',
      'editorIndentGuide.activeBackground': '#30363d',
    },
  });
}

// Marker data for editor (errors, warnings, etc.)
export interface EditorMarker {
  startLineNumber: number;
  endLineNumber: number;
  severity: 8 | 4 | 2 | 1; // 8=error, 4=warning, 2=info, 1=hint
  message: string;
}

export interface EditorReveal {
  line: number;
  nonce: number;
}