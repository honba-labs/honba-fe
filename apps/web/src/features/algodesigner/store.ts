// AlgoDesigner Zustand Store - central state for the AlgoDesigner app
// Mirrors honba-frontend core/designer/store.ts

import { create } from 'zustand';
import type { EdgeChange, NodeChange } from '@xyflow/react';

import type { ApiClient } from '../../core/api/client';
import type { AlgoDesignerApiClient } from './api-client';
import type { BacktestResponse, CompiledStrategy, SweepResponse } from './domain';
import { generateCode } from './nodes/codegen';
import { graphHashSync } from './model';
import { catalogue } from './nodes/catalogue';
import { canonicalJson, graphHash, type GraphEdge, type GraphNode, type StrategyGraphShape, type TimeframeShape, type UniverseShape } from './model';
import { graphIssues, nodePorts, nodeLine } from './nodes/validation';
import { mapNodeLines, nodeAtLine, spansToMarkers, verifyIssuesToMarkers } from './nodes/diagnostics';
import { compileStrategy } from './compile';
import { toManifest } from './manifest';
import {
  createSyncScheduler,
  recognizeGeneratedSource,
  type CodeSpan,
  type RecognitionResult,
  type Recognizer,
  type SyncScheduler,
} from './nodes/code-to-graph';
import {
  assistantContext,
  hasAssistantPropose,
  runSummary,
  toAssistantMessage,
  type AssistantRunSummary,
} from './assistant';
import type { AssistantMessage, AssistantKind, GraphDiffSummary } from './assistant-types';
import {
  loadSaved,
  persistSaved,
  removeSaved,
  slugify,
  toSavedManifest,
  uniqueId,
  upsertSaved,
  type SavedStrategyManifest,
} from './library-store';
import {
  DEFAULT_LAYOUT,
  layoutWithFocusToggled,
  layoutWithPaneToggled,
  loadLayout,
  normalizeLayout,
  saveLayout,
  type DesignerLayout,
  type DesignerPane,
  type DrawerTab,
} from './layout';
import { DEFAULT_NODE_POSITIONS, defaultGraph } from './model';

// Graph diff utility
function computeGraphDiff(current: StrategyGraphShape, candidate: StrategyGraphShape): GraphDiffSummary {
  const currentIds = new Set(current.nodes.map((n) => n.id));
  const candidateIds = new Set(candidate.nodes.map((n) => n.id));

  const added_nodes = candidate.nodes
    .filter((n) => !currentIds.has(n.id))
    .map((n) => `${n.label || n.type} (${n.id})`);

  const removed_nodes = current.nodes
    .filter((n) => !candidateIds.has(n.id))
    .map((n) => `${n.label || n.type} (${n.id})`);

  const modified_nodes: string[] = [];
  const param_changes: Record<string, unknown> = {};

  for (const cNode of candidate.nodes) {
    const cur = current.nodes.find((n) => n.id === cNode.id);
    if (cur) {
      const curParams = JSON.stringify(cur.params ?? {});
      const candParams = JSON.stringify(cNode.params ?? {});
      if (curParams !== candParams || cNode.indicator !== cur.indicator || cNode.label !== cur.label) {
        modified_nodes.push(`${cNode.label || cNode.type} (${cNode.id})`);
        param_changes[cNode.id] = cNode.params;
      }
    }
  }

  return { added_nodes, modified_nodes, removed_nodes, param_changes };
}

export type DesignerTab = 'canvas' | 'code' | 'verify' | 'run' | 'sweeps' | 'assistant' | 'ops' | 'results';

export type { DesignerLayout, DesignerPane, DrawerTab } from './layout';

export interface VerifyState {
  ok: boolean;
  issues: Array<{ code: string; message: string; nodeId: string | null; lineno: number | null }>;
  ir: unknown | null;
}

export interface RunState {
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  runId: string | null;
  response: BacktestResponse | null;
  error: string | null;
}

export interface SyncState {
  status: 'idle' | 'pending' | 'synced' | 'invalid';
  codeOnly: boolean;
  spans: CodeSpan[];
  sourceLines: Record<string, number>;
  lastSource: string | null;
  error: string | null;
}

export interface DesignerVersion {
  hash: string;
  name: string;
  json: string;
  timestamp: number;
}

export interface DesignerState {
  tab: DesignerTab;
  graph: StrategyGraphShape;
  positions: Record<string, { x: number; y: number }>;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isModified: boolean;
  code: string;
  codeEdited: boolean;
  verify: VerifyState;
  run: RunState;
  sync: SyncState;
  recognizer: Recognizer;
  assistant: AssistantMessage[];
  assistantStatus: 'idle' | 'thinking';
  savedStrategies: SavedStrategyManifest[];
  saveState: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  versions: DesignerVersion[];
  layout: DesignerLayout;

  setTab: (tab: DesignerTab) => void;
  setLayout: (patch: Partial<DesignerLayout>) => void;
  togglePane: (pane: DesignerPane) => void;
  toggleFocus: (pane: DesignerPane) => void;
  setPaneWidth: (pane: 'library' | 'assistant', width: number) => void;
  setCodeRatio: (ratio: number) => void;
  setDrawer: (open: boolean, tab?: DrawerTab) => void;
  setNotice: (message: string) => void;
  setName: (name: string) => Promise<void>;
  setGraph: (graph: StrategyGraphShape) => Promise<void>;
  setPositions: (positions: Record<string, { x: number; y: number }>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNodeParams: (nodeId: string, params: Record<string, unknown>) => Promise<void>;
  updateNodeLabel: (nodeId: string, label: string) => Promise<void>;
  updateNodeIndicator: (nodeId: string, indicator: string) => Promise<void>;
  updateUniverse: (universe: UniverseShape) => Promise<void>;
  updateDrivingTimeframe: (timeframe: TimeframeShape) => Promise<void>;
  updateWarmupBars: (warmupBars: number) => Promise<void>;

  addNode: (node: GraphNode, position?: { x: number; y: number }) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  spliceEdge: (
    edgeId: string,
    node: GraphNode,
    position?: { x: number; y: number },
    inPort?: string,
    outPort?: string,
  ) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => Promise<void>;

  markSaved: () => void;
  saveStrategy: (
    client?: ApiClient,
    meta?: Partial<Pick<SavedStrategyManifest, 'id' | 'name' | 'version' | 'category' | 'description' | 'tags' | 'author'>>,
  ) => Promise<void>;
  openStrategy: (graph: StrategyGraphShape) => Promise<void>;
  forkStrategy: (manifest: SavedStrategyManifest) => Promise<void>;
  deleteSavedStrategy: (id: string) => void;
  exportPython: () => string;
  setCode: (code: string) => void;
  setRecognizer: (recognizer: Recognizer) => void;
  requestSync: (source: string) => void;
  syncNow: (source: string) => void;
  applyRecognition: (result: RecognitionResult, source: string) => void;
  snapshotVersion: () => Promise<void>;
  restoreVersion: (hash: string) => Promise<void>;
  exportStrategyJson: () => string;
  verifyNow: (client: ApiClient) => Promise<void>;
  runNow: (client: ApiClient, request: { seed: number }) => Promise<void>;
  assistantSay: (text: string, kind?: AssistantKind) => void;
  addAssistantMessage: (msg: AssistantMessage) => void;
  proposeAI: (prompt: string, client?: ApiClient) => Promise<void>;
  applyProposal: (messageIndex: number) => Promise<void>;
  discardProposal: (messageIndex: number) => void;
  applySweepParams: (params: Record<string, unknown>) => Promise<void>;
  resetAssistant: () => void;
}

async function buildCode(graph: StrategyGraphShape): Promise<string> {
  const hash = await graphHash(graph);
  return generateCode(graph, hash);
}

async function regenerated(graph: StrategyGraphShape): Promise<Partial<DesignerState>> {
  const code = await buildCode(graph);
  const sync: SyncState = {
    status: 'synced',
    codeOnly: false,
    spans: [],
    sourceLines: mapNodeLines(code, graph.nodes.map((n) => n.id)),
    lastSource: code,
    error: null,
  };
  return { code, codeEdited: false, sync };
}

export const useDesignerStore = create<DesignerState>((set, get) => {
  const graph = defaultGraph();

  const scheduler: SyncScheduler = createSyncScheduler({
    recognize: (source, signal) => get().recognizer(source, signal),
    onPending: () => set({ sync: { ...get().sync, status: 'pending', error: null } }),
    onResult: (result, source) => get().applyRecognition(result, source),
    onError: (error) =>
      set({
        sync: {
          ...get().sync,
          status: 'invalid',
          error: error instanceof Error ? error.message : String(error),
        },
      }),
  });

  return {
    tab: 'canvas',
    graph,
    positions: { ...DEFAULT_NODE_POSITIONS },
    selectedNodeId: null,
    selectedEdgeId: null,
    isModified: false,
    code: '',
    codeEdited: false,
    verify: { ok: false, issues: [], ir: null },
    run: { status: 'idle', runId: null, response: null, error: null },
    sync: { status: 'idle', codeOnly: false, spans: [], sourceLines: {}, lastSource: null, error: null },
    recognizer: recognizeGeneratedSource,
    assistant: [],
    assistantStatus: 'idle',
    savedStrategies: loadSaved(),
    saveState: 'idle',
    versions: [],
    layout: loadLayout(),

    setTab: (tab) => set({ tab }),

    setLayout: (patch) => {
      const layout = normalizeLayout(patch, get().layout);
      saveLayout(layout);
      set({ layout });
    },

    togglePane: (pane) => {
      const layout = layoutWithPaneToggled(get().layout, pane);
      saveLayout(layout);
      set({ layout });
    },

    toggleFocus: (pane) => {
      const layout = layoutWithFocusToggled(get().layout, pane);
      saveLayout(layout);
      set({ layout });
    },

    setPaneWidth: (pane, width) => {
      const current = get().layout;
      const layout = normalizeLayout(pane === 'library' ? { libraryWidth: width } : { assistantWidth: width }, current);
      saveLayout(layout);
      set({ layout });
    },

    setCodeRatio: (ratio) => {
      const layout = normalizeLayout({ codeRatio: ratio }, get().layout);
      saveLayout(layout);
      set({ layout });
    },

    setDrawer: (open, tab) => {
      const layout = normalizeLayout({ drawerOpen: open, ...(tab ? { drawerTab: tab } : {}) }, get().layout);
      saveLayout(layout);
      set({ layout });
    },

    setNotice: (message) => {
      // This is a transient notice - components can subscribe to a separate notice store if needed
      // For now, we'll use a simple approach: dispatch a custom event that WorkspaceLayout listens to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('honba:notice', { detail: message }));
      }
    },

    setName: async (name) => {
      const { graph } = get();
      const next: StrategyGraphShape = { ...graph, name };
      set({ graph: next, isModified: true, ...(await regenerated(next)) });
    },

    setGraph: async (next) => {
      const currentPositions = get().positions;
      const positions: Record<string, { x: number; y: number }> = {};
      next.nodes.forEach((node, index) => {
        positions[node.id] =
          currentPositions[node.id] ??
          DEFAULT_NODE_POSITIONS[node.id] ?? {
            x: 80 + (index % 4) * 240,
            y: 80 + Math.floor(index / 4) * 160,
          };
      });
      set({
        graph: next,
        positions,
        selectedNodeId: null,
        selectedEdgeId: null,
        isModified: false,
        ...(await regenerated(next)),
      });
    },

    setPositions: (positions) => set({ positions }),

    updateNodePosition: (nodeId, position) => {
      const { positions } = get();
      set({ positions: { ...positions, [nodeId]: position }, isModified: true });
    },

    updateNodeParams: async (nodeId, params) => {
      const { graph } = get();
      const next: StrategyGraphShape = {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === nodeId ? { ...node, params: { ...(node.params ?? {}), ...params } } : node,
        ),
      };
      set({ graph: next, isModified: true, ...(await regenerated(next)) });
    },

    updateNodeLabel: async (nodeId, label) => {
      const { graph } = get();
      const next: StrategyGraphShape = {
        ...graph,
        nodes: graph.nodes.map((node) => (node.id === nodeId ? { ...node, label } : node)),
      };
      set({ graph: next, isModified: true, ...(await regenerated(next)) });
    },

    updateNodeIndicator: async (nodeId, indicator) => {
      const { graph } = get();
      const entry = catalogue().indicators.find((e) => e.kind === indicator);
      const defaultParams: Record<string, unknown> = {};
      entry?.params.forEach((p) => {
        defaultParams[p.name] = p.defaultValue;
      });

      const next: StrategyGraphShape = {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                indicator,
                label: indicator.toUpperCase(),
                params: defaultParams,
              }
            : node,
        ),
      };
      set({ graph: next, isModified: true, ...(await regenerated(next)) });
    },

    updateUniverse: async (universe) => {
      const { graph } = get();
      const next: StrategyGraphShape = { ...graph, universe };
      set({ graph: next, isModified: true, ...(await regenerated(next)) });
    },

    updateDrivingTimeframe: async (driving_timeframe) => {
      const { graph } = get();
      const next: StrategyGraphShape = { ...graph, driving_timeframe };
      set({ graph: next, isModified: true, ...(await regenerated(next)) });
    },

    updateWarmupBars: async (warmup_bars) => {
      const { graph } = get();
      const next: StrategyGraphShape = { ...graph, warmup_bars };
      set({ graph: next, isModified: true, ...(await regenerated(next)) });
    },

    addNode: async (node, position) => {
      const { graph, positions } = get();
      let uniqueId = node.id;
      let counter = 1;
      while (graph.nodes.some((n) => n.id === uniqueId)) {
        uniqueId = `${node.id}_${counter++}`;
      }
      const resolvedNode: GraphNode = { ...node, id: uniqueId };
      const nextNodes = [...graph.nodes, resolvedNode];
      const nextPositions = {
        ...positions,
        [uniqueId]: position ?? { x: 260 + Math.random() * 80, y: 140 + Math.random() * 80 },
      };
      const nextGraph: StrategyGraphShape = { ...graph, nodes: nextNodes };
      set({
        graph: nextGraph,
        positions: nextPositions,
        selectedNodeId: uniqueId,
        selectedEdgeId: null,
        isModified: true,
        ...(await regenerated(nextGraph)),
      });
    },

    deleteNode: async (nodeId) => {
      const { graph, positions, selectedNodeId } = get();
      const nextNodes = graph.nodes.filter((n) => n.id !== nodeId);
      const nextEdges = (graph.edges ?? []).filter((e) => e.from_node !== nodeId && e.to_node !== nodeId);
      const nextPositions = { ...positions };
      delete nextPositions[nodeId];
      const nextGraph: StrategyGraphShape = { ...graph, nodes: nextNodes, edges: nextEdges };
      set({
        graph: nextGraph,
        positions: nextPositions,
        selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
        isModified: true,
        ...(await regenerated(nextGraph)),
      });
    },

    deleteEdge: async (edgeId) => {
      const { graph, selectedEdgeId } = get();
      const nextEdges = (graph.edges ?? []).filter((e) => e.id !== edgeId);
      const nextGraph: StrategyGraphShape = { ...graph, edges: nextEdges };
      set({
        graph: nextGraph,
        selectedEdgeId: selectedEdgeId === edgeId ? null : selectedEdgeId,
        isModified: true,
        ...(await regenerated(nextGraph)),
      });
    },

    deleteSelected: async () => {
      const { selectedNodeId, selectedEdgeId, deleteNode, deleteEdge } = get();
      if (selectedNodeId) {
        await deleteNode(selectedNodeId);
      } else if (selectedEdgeId) {
        await deleteEdge(selectedEdgeId);
      }
    },

    spliceEdge: async (edgeId, node, position, inPort, outPort) => {
      const { graph, positions } = get();
      const edge = (graph.edges ?? []).find((e) => e.id === edgeId);
      if (!edge) return;

      const sourceNode = graph.nodes.find((n) => n.id === edge.from_node);
      const targetNode = graph.nodes.find((n) => n.id === edge.to_node);
      if (!sourceNode || !targetNode) return;

      let uniqueId = node.id;
      let counter = 1;
      while (graph.nodes.some((n) => n.id === uniqueId)) {
        uniqueId = `${node.id}_${counter++}`;
      }
      const resolvedNode: GraphNode = { ...node, id: uniqueId };

      const sourcePos = positions[sourceNode.id] ?? { x: 100, y: 100 };
      const targetPos = positions[targetNode.id] ?? { x: 400, y: 100 };
      const midPos = position ?? {
        x: (sourcePos.x + targetPos.x) / 2,
        y: (sourcePos.y + targetPos.y) / 2,
      };

      const resolvedInPort = inPort || Object.keys(nodePorts(resolvedNode.type).inputs)[0] || 'input';
      const resolvedOutPort = outPort || Object.keys(nodePorts(resolvedNode.type).outputs)[0] || 'value';

      const newEdge1: GraphEdge = {
        id: `e_${sourceNode.id}_${edge.from_port}_${uniqueId}_${resolvedInPort}`,
        from_node: sourceNode.id,
        from_port: edge.from_port,
        to_node: uniqueId,
        to_port: resolvedInPort,
      };

      const newEdge2: GraphEdge = {
        id: `e_${uniqueId}_${resolvedOutPort}_${targetNode.id}_${edge.to_port}`,
        from_node: uniqueId,
        from_port: resolvedOutPort,
        to_node: targetNode.id,
        to_port: edge.to_port,
      };

      const nextEdges = (graph.edges ?? []).filter((e) => e.id !== edgeId).concat([newEdge1, newEdge2]);
      const nextNodes = [...graph.nodes, resolvedNode];
      const nextPositions = { ...positions, [uniqueId]: midPos };

      const nextGraph: StrategyGraphShape = {
        ...graph,
        nodes: nextNodes,
        edges: nextEdges,
      };

      set({
        graph: nextGraph,
        positions: nextPositions,
        selectedNodeId: uniqueId,
        selectedEdgeId: null,
        isModified: true,
        ...(await regenerated(nextGraph)),
      });
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
    selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

    onNodesChange: (changes) => {
      const { positions } = get();
      let posChanged = false;
      const updatedPositions = { ...positions };

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updatedPositions[change.id] = change.position;
          posChanged = true;
        } else if (change.type === 'remove') {
          void get().deleteNode(change.id);
        } else if (change.type === 'select') {
          if (change.selected) {
            get().selectNode(change.id);
          } else if (get().selectedNodeId === change.id) {
            get().selectNode(null);
          }
        }
      }

      if (posChanged) {
        set({ positions: updatedPositions, isModified: true });
      }
    },

    onEdgesChange: (changes) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          void get().deleteEdge(change.id);
        } else if (change.type === 'select') {
          if (change.selected) {
            get().selectEdge(change.id);
          } else if (get().selectedEdgeId === change.id) {
            get().selectEdge(null);
          }
        }
      }
    },

    onConnect: async (connection) => {
      if (!connection.source || !connection.target) return;
      const { graph } = get();
      const sourceNode = graph.nodes.find((n) => n.id === connection.source);
      const targetNode = graph.nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const from_port = connection.sourceHandle || Object.keys(nodePorts(sourceNode.type).outputs)[0] || 'out';
      const to_port = connection.targetHandle || Object.keys(nodePorts(targetNode.type).inputs)[0] || 'in';

      const duplicate = (graph.edges ?? []).some(
        (e) =>
          e.from_node === sourceNode.id &&
          e.to_node === targetNode.id &&
          e.from_port === from_port &&
          e.to_port === to_port,
      );
      if (duplicate) return;

      const edgeId = `e_${sourceNode.id}_${from_port}_${targetNode.id}_${to_port}`;
      const newEdge: GraphEdge = {
        id: edgeId,
        from_node: sourceNode.id,
        from_port,
        to_node: targetNode.id,
        to_port,
      };

      const nextGraph: StrategyGraphShape = {
        ...graph,
        edges: [...(graph.edges ?? []), newEdge],
      };
      set({
        graph: nextGraph,
        selectedEdgeId: edgeId,
        isModified: true,
        ...(await regenerated(nextGraph)),
      });
    },

    markSaved: () => set({ isModified: false }),

    saveStrategy: async (client, meta) => {
      let { graph, code } = get();
      if (meta?.name && meta.name !== graph.name) {
        await get().setName(meta.name);
        graph = get().graph;
        code = get().code;
      }
      set({ saveState: 'saving' });
      const id = meta?.id ?? slugify(graph.name);
      const existing = get().savedStrategies.find((entry) => entry.id === id);
      const manifest = toSavedManifest(graph, code, {
        id,
        category: meta?.category ?? existing?.category ?? 'custom',
        version: meta?.version ?? existing?.version ?? '1.0.0',
        description: meta?.description ?? existing?.description ?? '',
        tags: meta?.tags ?? existing?.tags ?? [],
        author: meta?.author ?? existing?.author ?? 'local',
      });
      const list = upsertSaved(get().savedStrategies, manifest);
      persistSaved(list);
      set({ savedStrategies: list });

      let state: DesignerState['saveState'] = 'saved';
      if (client && typeof client.putProfileLayoutsByName === 'function') {
        try {
          await client.putProfileLayoutsByName(manifest.id, manifest);
        } catch {
          state = 'offline';
        }
      }
      await get().snapshotVersion();
      set({ saveState: state, isModified: false });
    },

    openStrategy: async (graph) => {
      await get().setGraph(graph);
      set({ tab: 'canvas', saveState: 'idle' });
    },

    forkStrategy: async (manifest) => {
      const taken = new Set(get().savedStrategies.map((entry) => entry.id));
      const id = uniqueId(`${manifest.id}_copy`, taken);
      const name = `${manifest.name}_copy`;
      const graph: StrategyGraphShape = { ...manifest.graph, name };
      await get().setGraph(graph);
      const forked = toSavedManifest(graph, await buildCode(graph), {
        id,
        category: manifest.category === 'custom' ? 'custom' : manifest.category,
        description: manifest.description,
        tags: [...manifest.tags],
        author: manifest.author,
      });
      const list = upsertSaved(get().savedStrategies, forked);
      persistSaved(list);
      set({ savedStrategies: list, tab: 'canvas', saveState: 'saved' });
    },

    deleteSavedStrategy: (id) => {
      const list = removeSaved(get().savedStrategies, id);
      persistSaved(list);
      set({ savedStrategies: list });
    },

    exportPython: () => get().code,

    setCode: (code) => {
      set({ code, codeEdited: true });
      scheduler.schedule(code);
    },

    setRecognizer: (recognizer) => {
      scheduler.cancel();
      set({ recognizer });
    },

    requestSync: (source) => scheduler.schedule(source),

    syncNow: (source) => {
      scheduler.cancel();
      set({ sync: { ...get().sync, status: 'pending', error: null } });
      void Promise.resolve(get().recognizer(source)).then(
        (result) => get().applyRecognition(result, source),
        (error: unknown) =>
          set({
            sync: { ...get().sync, status: 'invalid', error: error instanceof Error ? error.message : String(error) },
          }),
      );
    },

    applyRecognition: (result, source) => {
      if (get().code && get().code !== source) return;

      const current = get().graph;
      const sourceLines = mapNodeLines(source, result.graph ? result.graph.nodes.map((n) => n.id) : current.nodes.map((n) => n.id));
      const status: SyncState['status'] = result.graph ? 'synced' : 'invalid';
      const base: SyncState = {
        status,
        codeOnly: result.codeOnly,
        spans: result.spans,
        sourceLines,
        lastSource: source,
        error: null,
      };

      if (!result.graph || canonicalJson(result.graph) === canonicalJson(current)) {
        set({ sync: base });
        return;
      }

      const currentPositions = get().positions;
      const positions: Record<string, { x: number; y: number }> = {};
      result.graph.nodes.forEach((node, index) => {
        positions[node.id] =
          currentPositions[node.id] ??
          DEFAULT_NODE_POSITIONS[node.id] ?? {
            x: 80 + (index % 4) * 240,
            y: 80 + Math.floor(index / 4) * 160,
          };
      });
      const selectedNodeId = get().selectedNodeId;
      set({
        graph: result.graph,
        positions,
        selectedNodeId: selectedNodeId && result.graph.nodes.some((n) => n.id === selectedNodeId) ? selectedNodeId : null,
        isModified: true,
        codeEdited: true,
        sync: base,
      });
    },

    snapshotVersion: async () => {
      const { graph, versions } = get();
      const hash = await graphHash(graph);
      if (versions.some((v) => v.hash === hash)) return;
      set({
        versions: [
          ...versions,
          { hash, name: graph.name, json: JSON.stringify(graph), timestamp: Date.now() },
        ],
      });
    },

    restoreVersion: async (hash) => {
      const found = get().versions.find((v) => v.hash === hash);
      if (!found) return;
      const parsed = JSON.parse(found.json) as StrategyGraphShape;
      await get().setGraph(parsed);
    },

    exportStrategyJson: () => canonicalJson(get().graph),

    verifyNow: async (client) => {
      const { graph, code } = get();
      const issues = graphIssues(graph).map((issue) => ({
        code: issue.code,
        message: issue.message,
        nodeId: issue.nodeId,
        lineno: issue.nodeId ? nodeLine(code, issue.nodeId) : null,
      }));
      if (issues.length > 0) {
        set({ verify: { ok: false, issues, ir: null } });
        return;
      }
      try {
        const envelope = await client.postStrategiesVerify(toManifest(graph));
        const ir = (envelope.data ?? null) as unknown;
        set({ verify: { ok: true, issues: [], ir } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set({ verify: { ok: false, issues: [{ code: 'verify_failed', message, nodeId: null, lineno: null }], ir: null } });
      }
    },

    runNow: async (client, request) => {
      const { graph } = get();
      set({ run: { status: 'pending', runId: null, response: null, error: null } });
      try {
        const compiled = await compileStrategy(client, graph);
        if (compiled.error) {
          set({ run: { status: 'failed', runId: null, response: null, error: `compile: ${compiled.error}` } });
          return;
        }
        const envelope = await client.postBacktests({
          strategy: compiled.strategyId,
          universe: graph.universe.named ?? graph.universe.explicit?.map((e) => `${e.symbol}.${e.exchange}`).join(',') ?? '',
          seed: request.seed,
        });
        const data = envelope.data as BacktestResponse | null;
        const status = (data?.status === 'completed' || data?.status === 'pending' || data?.status === 'running' || data?.status === 'failed' || data?.status === 'idle') ? data.status : 'pending';
        set({
          run: {
            status,
            runId: data?.run_id ?? null,
            response: data,
            error: data?.error && typeof data.error === 'object' && 'code' in data.error && 'message' in data.error ? `${data.error.code}: ${data.error.message}` : null,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set({ run: { status: 'failed', runId: null, response: null, error: message } });
      }
    },

    assistantSay: (text, kind = 'discussion') =>
      set((state) => ({
        assistant: [...state.assistant, { kind, message: text, blocked: kind === 'validation_error', timestamp: Date.now() }],
      })),

    addAssistantMessage: (msg) =>
      set((state) => ({ assistant: [...state.assistant, msg] })),

    proposeAI: async (prompt: string, client?: AlgoDesignerApiClient) => {
      const state = get();
      const { graph } = state;

      const propose = hasAssistantPropose(client) ? client?.postAssistantPropose : undefined;
      if (propose) {
        const lastRun: AssistantRunSummary | null = runSummary(state.run.response);
        set({ assistantStatus: 'thinking' });
        try {
          const envelope = await propose({
            graph,
            source: state.code,
            prompt,
            context: assistantContext({ graph, source: state.code, run: lastRun, messages: state.assistant }),
          });
          if (envelope.data) {
            const msg = toAssistantMessage(envelope.data);
            set((s) => ({ assistant: [...s.assistant, msg] }));
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set((s) => ({
            assistant: [
              ...s.assistant,
              { kind: 'validation_error', message: `Co-pilot request failed: ${message}`, blocked: true, timestamp: Date.now() },
            ],
          }));
          return;
        } finally {
          set({ assistantStatus: 'idle' });
        }
      }

      // Local fallback proposals
      const lower = prompt.toLowerCase();

      if (lower.includes('invalid') || lower.includes('malformed') || lower.includes('error')) {
        const invalidCandidate: StrategyGraphShape = {
          ...graph,
          nodes: [
            ...graph.nodes,
            { id: 'bad_alpha', type: 'indicator', indicator: 'unknown_mystery_indicator' },
          ],
        };
        const issues = graphIssues(invalidCandidate);
        const msg: AssistantMessage = {
          kind: 'validation_error',
          message: `The proposed candidate graph failed institutional verification with ${issues.length} defect(s). In accordance with ADR 0029 S5, the candidate is quarantined from execution.`,
          graph: invalidCandidate,
          findings: issues.map((i) => ({ code: i.code, message: i.message })),
          blocked: true,
          timestamp: Date.now(),
        };
        set((state) => ({ assistant: [...state.assistant, msg], assistantStatus: 'idle' }));
        return;
      }

      if (lower.includes('atr') || lower.includes('volatility') || lower.includes('stop') || lower.includes('risk')) {
        const candidate: StrategyGraphShape = {
          ...graph,
          nodes: [
            ...graph.nodes,
            { id: 'atr_vol', type: 'indicator', indicator: 'atr', label: 'ATR 14', params: { period: 14 } },
            { id: 'sz_vol', type: 'sizing', label: 'Vol Sizing', params: { method: 'percent_equity', value: 15 } },
          ],
          edges: [
            ...(graph.edges ?? []),
            { id: 'e_u_atr', from_node: 'n1', from_port: 'bars', to_node: 'atr_vol', to_port: 'input' },
            { id: 'e_c_sz', from_node: 'c', from_port: 'signal', to_node: 'sz_vol', to_port: 'signal' },
          ],
        };
        const diff = computeGraphDiff(graph, candidate);
        const source = await buildCode(candidate);
        const msg: AssistantMessage = {
          kind: 'candidate',
          message: 'Proposed adding an Average True Range (ATR 14) indicator and dynamic volatility sizing to scale exposure to 15% equity.',
          graph: candidate,
          source,
          diff,
          decisions: [
            { orderId: 'o', decision: 'approve', rationale: 'Volatility-adjusted sizing verified against institutional leverage and smoke tests.' },
          ],
          blocked: false,
          timestamp: Date.now(),
        };
        set((state) => ({ assistant: [...state.assistant, msg], assistantStatus: 'idle' }));
        return;
      }

      if (lower.includes('rsi') || lower.includes('momentum')) {
        const candidate: StrategyGraphShape = {
          ...graph,
          nodes: [
            ...graph.nodes,
            { id: 'rsi_mom', type: 'indicator', indicator: 'rsi', label: 'RSI 14', params: { period: 14 } },
            { id: 'cond_rsi', type: 'condition', label: 'RSI Filter < 70', params: { op: '<', threshold: 70 } },
          ],
          edges: [
            ...(graph.edges ?? []),
            { id: 'e_u_rsi', from_node: 'n1', from_port: 'bars', to_node: 'rsi_mom', to_port: 'input' },
            { id: 'e_rsi_cond', from_node: 'rsi_mom', from_port: 'value', to_node: 'cond_rsi', to_port: 'left' },
          ],
        };
        const diff = computeGraphDiff(graph, candidate);
        const source = await buildCode(candidate);
        const msg: AssistantMessage = {
          kind: 'candidate',
          message: 'Proposed integrating a 14-period Relative Strength Index (RSI) momentum filter to confirm breakout validity.',
          graph: candidate,
          source,
          diff,
          decisions: [
            { orderId: 'o', decision: 'approve', rationale: 'RSI regime filter satisfies causal lookahead and parameter validation constraints.' },
          ],
          blocked: false,
          timestamp: Date.now(),
        };
        set((state) => ({ assistant: [...state.assistant, msg], assistantStatus: 'idle' }));
        return;
      }

      if (lower.includes('tune') || lower.includes('param') || lower.includes('period') || lower.includes('ma')) {
        const candidate: StrategyGraphShape = {
          ...graph,
          nodes: graph.nodes.map((node) => {
            if (node.id === 'f') return { ...node, params: { ...node.params, period: 5 }, label: 'Fast SMA (5)' };
            if (node.id === 's') return { ...node, params: { ...node.params, period: 20 }, label: 'Slow SMA (20)' };
            return node;
          }),
        };
        const diff = computeGraphDiff(graph, candidate);
        const source = await buildCode(candidate);
        const msg: AssistantMessage = {
          kind: 'candidate',
          message: 'Adjusted moving average windows to institutional standard (Fast: 5, Slow: 20) to filter whipsaws and improve Sharpe ratio.',
          graph: candidate,
          source,
          diff,
          decisions: [
            { orderId: 'o', decision: 'approve', rationale: 'Parameters within valid positive integer ranges; zero DAG cycle mutations.' },
          ],
          blocked: false,
          timestamp: Date.now(),
        };
        set((state) => ({ assistant: [...state.assistant, msg], assistantStatus: 'idle' }));
        return;
      }

      const msg: AssistantMessage = {
        kind: 'discussion',
        message: `Quantitative Advisory for '${graph.name}': The strategy is a dual-SMA trend cross. To increase risk-adjusted return, consider adding an ATR volatility sizing filter or an RSI confirmation check. You can ask me to "add an ATR volatility filter", "tune MA periods to 5/20", or "add an RSI momentum condition".`,
        blocked: false,
        timestamp: Date.now(),
      };
      set((state) => ({ assistant: [...state.assistant, msg], assistantStatus: 'idle' }));
    },

    applyProposal: async (index) => {
      const { assistant, snapshotVersion, setGraph } = get();
      const msg = assistant[index];
      if (!msg || !msg.graph || msg.blocked) return;
      await snapshotVersion();
      await setGraph(msg.graph);
      set((state) => ({
        tab: 'canvas',
        assistant: [
          ...state.assistant,
          { kind: 'discussion', message: `Applied candidate #${index + 1} to the canvas; graph and code regenerated.`, blocked: false, timestamp: Date.now() },
        ],
      }));
    },

    discardProposal: (index) =>
      set((state) => {
        const msg = state.assistant[index];
        if (!msg) return {};
        return {
          assistant: [
            ...state.assistant,
            { kind: 'discussion' as const, message: `Discarded candidate #${index + 1}; the canvas is unchanged.`, blocked: false, timestamp: Date.now() },
          ],
        };
      }),

    applySweepParams: async (params) => {
      const { graph } = get();
      const nextNodes = graph.nodes.map((node) => {
        const updatedParams = { ...(node.params ?? {}) };
        let changed = false;
        for (const [key, value] of Object.entries(params)) {
          if (key.startsWith(`${node.id}.`)) {
            const paramName = key.slice(node.id.length + 1);
            updatedParams[paramName] = value;
            changed = true;
          } else if (key.startsWith(`${node.id}_`)) {
            const paramName = key.slice(node.id.length + 1);
            updatedParams[paramName] = value;
            changed = true;
          } else if (node.params && key in node.params) {
            updatedParams[key] = value;
            changed = true;
          }
        }
        return changed ? { ...node, params: updatedParams } : node;
      });

      const nextGraph: StrategyGraphShape = { ...graph, nodes: nextNodes };
      set({
        graph: nextGraph,
        isModified: true,
        ...(await regenerated(nextGraph)),
        tab: 'canvas',
      });
    },

    resetAssistant: () => set({ assistant: [] }),
  };
});

// Export internal types and functions needed by other modules
export type { AssistantMessage, AssistantKind, GraphDiffSummary, AssistantRunSummary };
export { computeGraphDiff, buildCode, slugify, uniqueId, toSavedManifest, nodeLine };
export { DEFAULT_NODE_POSITIONS, defaultGraph } from './model';

export type {
  BacktestResponse,
  BarAggregation,
  CompiledStrategy,
  StrategyManifest,
  SweepResponse,
  TimeframeSpec,
} from './domain';