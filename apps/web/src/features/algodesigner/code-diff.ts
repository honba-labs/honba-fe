// Code Diff Utility - unified diff for code comparison
// Mirrors honba-frontend core/designer/code-diff.ts

export interface DiffRow {
  kind: 'same' | 'add' | 'del';
  oldLine: number | null;
  newLine: number | null;
  text: string;
}

export function unifiedLineDiff(before: string, after: string): DiffRow[] {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  // Simple LCS-based diff (Myers algorithm would be better but this works for our scale)
  const m = beforeLines.length;
  const n = afterLines.length;

  // Build LCS table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Reconstruct diff
  const result: DiffRow[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      result.unshift({ kind: 'same', oldLine: i, newLine: j, text: beforeLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ kind: 'add', oldLine: null, newLine: j, text: afterLines[j - 1] });
      j--;
    } else if (i > 0) {
      result.unshift({ kind: 'del', oldLine: i, newLine: null, text: beforeLines[i - 1] });
      i--;
    }
  }
  return result;
}

export function diffStats(rows: DiffRow[]): { added: number; removed: number } {
  return rows.reduce(
    (acc, row) => {
      if (row.kind === 'add') acc.added++;
      if (row.kind === 'del') acc.removed++;
      return acc;
    },
    { added: 0, removed: 0 },
  );
}

export function changedRows(rows: DiffRow[], context: number): DiffRow[] {
  const changed = new Set<number>();
  rows.forEach((row, idx) => {
    if (row.kind !== 'same') changed.add(idx);
  });
  if (changed.size === 0) return [];

  const indices = new Set<number>();
  changed.forEach((idx) => {
    for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) {
      indices.add(k);
    }
  });

  const sorted = Array.from(indices).sort((a, b) => a - b);
  const out: DiffRow[] = [];
  let lastIdx = -2;
  for (const idx of sorted) {
    if (idx > lastIdx + 1) {
      out.push({ kind: 'same', oldLine: null, newLine: null, text: '…' });
    }
    out.push(rows[idx]);
    lastIdx = idx;
  }
  return out;
}