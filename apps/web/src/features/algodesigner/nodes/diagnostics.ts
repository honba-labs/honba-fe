// Diagnostics - mapping between code lines and graph nodes
// Mirrors honba-frontend core/designer/diagnostics.ts

import type { StrategyGraphShape, GraphNode } from './types';

export interface CodeSpan {
  start_line: number;
  end_line: number;
  reason?: string;
}

/** Map node IDs to their generated source line numbers for editor<->canvas navigation. */
export function mapNodeLines(code: string, nodeIds: string[]): Record<string, number> {
  const lines = code.split('\n');
  const result: Record<string, number> = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const id of nodeIds) {
      // Match self._id or self.id or just the identifier in various contexts
      const patterns = [
        `_${id}`,
        `${id}_`,
        ` ${id} `,
        ` ${id}=`,
        ` ${id}:`,
        `(${id}`,
        `[${id}`,
        `.${id}`,
        `_${id}`,
      ];
      if (patterns.some((p) => line.includes(p))) {
        if (!result[id]) result[id] = i + 1;
      }
    }
  }
  return result;
}

/** Find which node is at a given line (for click-to-select). */
export function nodeAtLine(sourceLines: Record<string, number>, line: number): string | null {
  for (const [nodeId, nodeLine] of Object.entries(sourceLines)) {
    if (nodeLine === line) return nodeId;
  }
  return null;
}

/** Convert verify issues to editor markers. */
export function verifyIssuesToMarkers(
  verify: { issues: Array<{ code: string; message: string; nodeId: string | null; lineno: number | null }> } | null,
  code: string,
): Array<{
  startLineNumber: number;
  endLineNumber: number;
  severity: 8 | 4 | 2 | 1;
  message: string;
}> {
  if (!verify || verify.issues.length === 0) return [];
  return verify.issues
    .filter((issue) => issue.lineno !== null)
    .map((issue) => ({
      startLineNumber: issue.lineno!,
      endLineNumber: issue.lineno!,
      severity: 8 as const, // error
      message: `[${issue.code}] ${issue.message}`,
    }));
}

/** Convert recognition spans to editor markers. */
export function spansToMarkers(spans: CodeSpan[]): Array<{
  startLineNumber: number;
  endLineNumber: number;
  severity: 8 | 4 | 2 | 1;
  message: string;
}> {
  return spans
    .filter((span) => span.start_line > 0)
    .map((span) => ({
      startLineNumber: span.start_line,
      endLineNumber: span.end_line,
      severity: 4 as const, // warning
      message: span.reason ?? 'not captured by graph',
    }));
}