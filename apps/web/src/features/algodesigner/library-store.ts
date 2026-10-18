// Library Store - saved strategies in localStorage (with optional profile API sync)
// Mirrors honba-frontend core/designer/library-store.ts

import type { StrategyGraphShape } from './nodes/types';
import { graphHashSync } from './model';
import { toManifest } from './manifest';

export interface SavedStrategyManifest {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  tags: string[];
  author: string;
  graph: StrategyGraphShape;
  code: string;
  hash: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'honba.designer.library';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
}

export function uniqueId(base: string, taken: Set<string>): string {
  let id = slugify(base) || 'strategy';
  let counter = 1;
  while (taken.has(id)) {
    id = `${slugify(base)}_${counter++}`;
  }
  return id;
}

export function loadSaved(): SavedStrategyManifest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedStrategyManifest[];
  } catch {
    // ignore
  }
  return [];
}

export function persistSaved(list: SavedStrategyManifest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function upsertSaved(list: SavedStrategyManifest[], manifest: SavedStrategyManifest): SavedStrategyManifest[] {
  const idx = list.findIndex((m) => m.id === manifest.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = manifest;
    return next;
  }
  return [...list, manifest];
}

export function removeSaved(list: SavedStrategyManifest[], id: string): SavedStrategyManifest[] {
  return list.filter((m) => m.id !== id);
}

export function toSavedManifest(
  graph: StrategyGraphShape,
  code: string,
  meta: Partial<Pick<SavedStrategyManifest, 'id' | 'name' | 'version' | 'category' | 'description' | 'tags' | 'author'>>,
): SavedStrategyManifest {
  const now = Date.now();
  const hash = graphHashSync(graph);
  return {
    id: meta.id ?? slugify(graph.name),
    name: meta.name ?? graph.name,
    version: meta.version ?? '1.0.0',
    category: meta.category ?? 'custom',
    description: meta.description ?? '',
    tags: meta.tags ?? [],
    author: meta.author ?? 'local',
    graph,
    code,
    hash,
    createdAt: meta.id ? listFindById(loadSaved(), meta.id)?.createdAt ?? now : now,
    updatedAt: now,
  };
}

function listFindById(list: SavedStrategyManifest[], id: string): SavedStrategyManifest | undefined {
  return list.find((m) => m.id === id);
}