// Designer Canvas - @xyflow/react graph editor
// Mirrors honba-frontend apps/algodesigner/canvas.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge as FlowEdge,
  type Node as FlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCode,
  History,
  Layers,
  MoreHorizontal,
  Play,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import type { StrategyGraphShape, GraphNode, GraphEdge } from '../model';
import { nodePorts, graphIssues } from '../nodes/validation';
import { DEFAULT_NODE_POSITIONS, useDesignerStore } from '../store';
import type { ApiClient } from '../../../core/api/client';
import { createApiClient } from '../../../core/api/client';
import { honbaNodeTypes } from '../nodes/HonbaNodes';
import { honbaEdgeTypes } from '../edges/HonbaInsertableEdge';
import { NodePalette, type NodeTemplate } from './NodePalette';
import { NodeInspector } from './NodeInspector';
import { HbButton } from '../../../components/ui/hb-button';
import { HbBadge } from '../../../components/ui/hb-bubble';
import { stashHandoff, simulatorHandoffUrl } from '../handoff';

interface CanvasProps {
  graph: StrategyGraphShape;
  onNodeParams: (nodeId: string, params: Record<string, unknown>) => void;
  onError: (message: string) => void;
  client?: ApiClient;
}

function DesignerCanvasInner({ graph, onError, client }: CanvasProps) {
  const store = useDesignerStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition, setCenter } = useReactFlow();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedGraph, setParsedGraph] = useState<StrategyGraphShape | null>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [moreMenuOpen]);

  const activeClient = useMemo(() => {
    if (client) return client;
    return createApiClient();
  }, [client]);

  const nodes: FlowNode[] = useMemo(() => {
    return graph.nodes.map((node, index) => {
      const position =
        store.positions[node.id] ||
        DEFAULT_NODE_POSITIONS[node.id] || {
          x: 60 + (index % 4) * 250,
          y: 60 + Math.floor(index / 4) * 160,
        };

      const issuesForNode = store.verify.issues.filter((i) => i.nodeId === node.id);

      return {
        id: node.id,
        type: node.type in honbaNodeTypes ? node.type : 'card',
        position,
        selected: store.selectedNodeId === node.id,
        data: {
          node,
          issues: issuesForNode,
          universe: graph.universe,
          driving_timeframe: graph.driving_timeframe,
          warmup_bars: graph.warmup_bars,
          label: node.label || node.type,
          subtitle: node.indicator || node.id,
        },
      };
    });
  }, [
    graph.nodes,
    graph.universe,
    graph.driving_timeframe,
    graph.warmup_bars,
    store.positions,
    store.selectedNodeId,
    store.verify.issues,
  ]);

  const edges: FlowEdge[] = useMemo(() => {
    return (graph.edges ?? []).map((edge) => {
      const isSelected = store.selectedEdgeId === edge.id;
      return {
        id: edge.id,
        source: edge.from_node,
        target: edge.to_node,
        sourceHandle: edge.from_port,
        targetHandle: edge.to_port,
        type: 'insertable',
        animated: true,
        selected: isSelected,
      };
    });
  }, [graph.edges, store.selectedEdgeId]);

  useEffect(() => {
    if (store.selectedNodeId && store.positions[store.selectedNodeId]) {
      const pos = store.positions[store.selectedNodeId];
      setCenter(pos.x + 110, pos.y + 60, { duration: 500, zoom: 1.05 });
    }
  }, [store.selectedNodeId, setCenter, store.positions]);

  const isValidConnection = useCallback(
    (connection: Connection | { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return false;
      }
      const sourceNode = graph.nodes.find((n) => n.id === connection.source);
      const targetNode = graph.nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourcePort = connection.sourceHandle || Object.keys(nodePorts(sourceNode.type).outputs)[0];
      const targetPort = connection.targetHandle || Object.keys(nodePorts(targetNode.type).inputs)[0];

      if (!sourcePort || !targetPort) return false;

      const sourceKind = nodePorts(sourceNode.type).outputs[sourcePort];
      const targetKind = nodePorts(targetNode.type).inputs[targetPort];

      return sourceKind !== undefined && targetKind !== undefined && sourceKind === targetKind;
    },
    [graph.nodes],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        onError('An edge requires both endpoints');
        return;
      }
      if (!isValidConnection(connection)) {
        onError('Connection rejected: Port types do not match');
        return;
      }
      void store.onConnect(connection);
    },
    [isValidConnection, onError, store],
  );

  const handleDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/honba-node', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/honba-node');
      if (!raw || !reactFlowWrapper.current) return;

      try {
        const template = JSON.parse(raw) as NodeTemplate;
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const defaultData = template.defaultNode();
        const baseId = template.type.charAt(0);
        void store.addNode({ ...defaultData, id: baseId }, position);
      } catch (err) {
        onError(`Failed to drop node: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [screenToFlowPosition, store, onError],
  );

  const handleAddFromPalette = useCallback(
    (template: NodeTemplate) => {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: bounds ? bounds.x + bounds.width / 2 : window.innerWidth / 2,
        y: bounds ? bounds.y + bounds.height / 2 : window.innerHeight / 2,
      });
      const defaultData = template.defaultNode();
      const baseId = template.type.charAt(0);
      void store.addNode({ ...defaultData, id: baseId }, position);
    },
    [screenToFlowPosition, store],
  );

  const handleExportJson = useCallback(() => {
    try {
      const jsonStr = store.exportStrategyJson ? store.exportStrategyJson() : JSON.stringify(graph, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${graph.name || 'strategy'}.strategy.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onError(`Strategy exported as ${graph.name || 'strategy'}.strategy.json`);
    } catch (err) {
      onError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [graph, store, onError]);

  const handleImportTextChange = (text: string) => {
    setImportText(text);
    if (!text.trim()) {
      setImportError(null);
      setParsedGraph(null);
      return;
    }
    try {
      const parsed = JSON.parse(text) as StrategyGraphShape;
      // Validate
      const issues = graphIssues(parsed);
      if (issues.length > 0) {
        setImportError(`Graph has ${issues.length} structural issue(s): ${issues[0].message}`);
      } else {
        setImportError(null);
      }
      setParsedGraph(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setParsedGraph(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleImportTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = async () => {
    if (!parsedGraph) return;
    try {
      await store.setGraph(parsedGraph);
      setImportModalOpen(false);
      setImportText('');
      setParsedGraph(null);
      setImportError(null);
      onError(`Successfully imported strategy '${parsedGraph.name}'`);
    } catch (err) {
      setImportError(`Failed to load graph: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (store.selectedNodeId || store.selectedEdgeId) {
          event.preventDefault();
          void store.deleteSelected();
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        void store.saveStrategy(client);
      }

      if (event.key === 'Escape') {
        store.selectNode(null);
        store.selectEdge(null);
        setImportModalOpen(false);
        setVersionModalOpen(false);
        setMoreMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store, client]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={honbaNodeTypes}
          edgeTypes={honbaEdgeTypes}
          onNodesChange={store.onNodesChange}
          onEdgesChange={store.onEdgesChange}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          onNodeClick={(_, node) => store.selectNode(node.id)}
          onEdgeClick={(_, edge) => store.selectEdge(edge.id)}
          onPaneClick={() => {
            store.selectNode(null);
            store.selectEdge(null);
            setMoreMenuOpen(false);
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode={null}
          defaultEdgeOptions={{
            type: 'insertable',
            animated: true,
          }}
        >
          <Background gap={16} size={1} color="var(--border-subtle)" />
          <MiniMap
            nodeStrokeWidth={2}
            nodeColor={(node) => {
              if (node.type === 'universe') return '#06b6d4';
              if (node.type === 'indicator') return '#10b981';
              if (node.type === 'condition') return '#f59e0b';
              if (node.type === 'sizing') return '#ef4444';
              return '#8b5cf6';
            }}
            pannable
            zoomable
            style={{
              background: 'rgba(26, 30, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-subtle, #2a2e39)',
              borderRadius: 8,
              width: 140,
              height: 90,
            }}
          />
          <Controls />

          <Panel position="top-left" style={{ margin: 12 }}>
            <div className="canvas-float-bar">
              <HbButton
                variant={paletteOpen ? 'primary' : 'secondary'}
                size="xs"
                onClick={() => setPaletteOpen(!paletteOpen)}
                icon={<Layers size={12} />}
                title={paletteOpen ? 'Close Node Palette' : 'Open Node Palette to add nodes'}
              >
                + Add Nodes
              </HbButton>

              <span className="canvas-float-bar__stats">
                {graph.nodes.length} nodes · {(graph.edges ?? []).length} edges
              </span>

              {store.isModified ? (
                <HbBadge variant="gold" size="xs" dot>
                  Unsaved
                </HbBadge>
              ) : (
                <HbBadge variant="bullish" size="xs" dot pulse>
                  Saved
                </HbBadge>
              )}

              {(store.selectedNodeId || store.selectedEdgeId) && (
                <HbBadge variant="accent" size="xs">
                  <Sliders size={10} style={{ marginRight: 4 }} />
                  Property Editor
                </HbBadge>
              )}
            </div>
          </Panel>

          <Panel position="top-right" style={{ margin: 12 }}>
            <div className="canvas-float-bar">
              <div style={{ position: 'relative' }} ref={moreMenuRef}>
                <HbButton
                  variant="secondary"
                  size="xs"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  icon={<MoreHorizontal size={13} />}
                  title="Graph actions (Import, Export, Versions, Delete)"
                >
                  Actions
                </HbButton>

                {moreMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 36,
                      minWidth: 180,
                      background: 'var(--bg-surface, #1e222d)',
                      border: '1px solid var(--border-subtle, #2a2e39)',
                      borderRadius: 'var(--radius-md, 6px)',
                      boxShadow: 'var(--shadow-lg, 0 10px 24px rgba(0,0,0,0.4))',
                      zIndex: 50,
                      padding: '4px 0',
                      fontSize: 12,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setImportModalOpen(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover, #2a2e39)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Upload size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>Import JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        handleExportJson();
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover, #2a2e39)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Download size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>Export JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setVersionModalOpen(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover, #2a2e39)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <History size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>Version Snapshots ({store.versions.length})</span>
                    </button>

                    {(store.selectedNodeId || store.selectedEdgeId) && (
                      <>
                        <div style={{ height: 1, background: 'var(--border-subtle, #2a2e39)', margin: '4px 0' }} />
                        <button
                          type="button"
                          onClick={() => {
                            setMoreMenuOpen(false);
                            void store.deleteSelected();
                          }}
                          style={{
                            width: '100%',
                            padding: '7px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--bearish, #f23645)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover, #2a2e39)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Trash2 size={13} />
                          <span>Delete Selected (Del)</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {(() => {
                const structuralIssues = graphIssues(graph);
                const verifyIssues = store.verify?.issues ?? [];
                const errorCount = structuralIssues.length + verifyIssues.length;
                const canSimulate = errorCount === 0;

                return (
                  <HbButton
                    variant="bullish"
                    size="xs"
                    disabled={!canSimulate}
                    onClick={() => {
                      if (!canSimulate) {
                        store.setDrawer(true, 'verify');
                        return;
                      }
                      window.location.href = `/simulator?strategy=${encodeURIComponent(graph.name)}&source=designer`;
                    }}
                    title={
                      canSimulate
                        ? `Launch quantitative simulation for ${graph.name} (strategy is verified clean)`
                        : `Cannot simulate: ${errorCount} error(s) detected. Click to inspect diagnostics.`
                    }
                    icon={<Play size={12} fill={canSimulate ? 'currentColor' : 'none'} />}
                    badge={
                      !canSimulate ? (
                        <HbBadge variant="bearish" size="xs">
                          {errorCount}
                        </HbBadge>
                      ) : undefined
                    }
                  >
                    Simulate
                  </HbButton>
                );
              })()}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {paletteOpen ? (
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 56,
            bottom: 12,
            width: 260,
            zIndex: 20,
            borderRadius: 'var(--radius-md, 6px)',
            border: '1px solid var(--border-subtle, #2a2e39)',
            boxShadow: 'var(--shadow-lg, 0 10px 24px rgba(0,0,0,0.4))',
            overflow: 'hidden',
            background: 'var(--bg-surface, #1e222d)',
          }}
        >
          <NodePalette
            onDragStart={handleDragStart}
            onAdd={handleAddFromPalette}
            onClose={() => setPaletteOpen(false)}
          />
        </div>
      ) : null}

      {store.selectedNodeId || store.selectedEdgeId ? (
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: 56,
            bottom: 12,
            width: 310,
            zIndex: 20,
            borderRadius: 'var(--radius-md, 6px)',
            border: '1px solid var(--border-subtle, #2a2e39)',
            boxShadow: 'var(--shadow-lg, 0 10px 24px rgba(0,0,0,0.4))',
            overflow: 'hidden',
            background: 'var(--bg-surface, #1e222d)',
          }}
        >
          <NodeInspector />
        </div>
      ) : null}

      {importModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setImportModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
              borderRadius: 'var(--radius-lg, 8px)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileCode size={18} style={{ color: 'var(--accent-primary, #2962ff)' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Import / Replace Strategy Graph
                </h3>
              </div>
              <button
                type="button"
                className="shortlist-btn"
                onClick={() => setImportModalOpen(false)}
                style={{ padding: 4 }}
              >
                <X size={15} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
              Paste strategy graph JSON or select a `.json` file. The graph will be validated for schema compatibility before replacing the canvas.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="shortlist-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}
              >
                <Upload size={13} />
                <span>Choose .json file</span>
              </button>
              {fileInputRef.current?.files?.[0] && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fileInputRef.current.files[0].name}
                </span>
              )}
            </div>

            <textarea
              placeholder="Paste StrategyGraph JSON here..."
              value={importText}
              onChange={(e) => handleImportTextChange(e.target.value)}
              style={{
                width: '100%',
                height: 180,
                background: 'var(--bg-secondary, #131722)',
                border: '1px solid var(--border-subtle, #2a2e39)',
                borderRadius: 'var(--radius-sm, 4px)',
                padding: 10,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: 11,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            {importError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  background: 'rgba(242, 54, 69, 0.1)',
                  border: '1px solid var(--bearish, #f23645)',
                  color: 'var(--bearish, #f23645)',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{importError}</span>
              </div>
            )}

            {parsedGraph && !importError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  background: 'rgba(8, 153, 129, 0.1)',
                  border: '1px solid var(--bullish, #089981)',
                  color: 'var(--bullish, #089981)',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={14} />
                <span>
                  Valid graph ready: <strong>{parsedGraph.name}</strong> ({parsedGraph.nodes.length} nodes, {(parsedGraph.edges ?? []).length} edges)
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="shortlist-btn"
                onClick={() => setImportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="shortlist-btn shortlist-btn-primary"
                disabled={!parsedGraph || !!importError}
                onClick={() => void handleApplyImport()}
              >
                Replace Strategy Graph
              </button>
            </div>
          </div>
        </div>
      )}

      {versionModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setVersionModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              background: 'var(--bg-surface, #1e222d)',
              border: '1px solid var(--border-subtle, #2a2e39)',
              borderRadius: 'var(--radius-lg, 8px)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} style={{ color: 'var(--accent-primary, #2962ff)' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Version Snapshots ({store.versions.length})
                </h3>
              </div>
              <button
                type="button"
                className="shortlist-btn"
                onClick={() => setVersionModalOpen(false)}
                style={{ padding: 4 }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Immutable canonical hashes capturing complete visual and parameter state.
              </span>
              <button
                type="button"
                className="shortlist-btn shortlist-btn-primary"
                onClick={() => {
                  void store.snapshotVersion();
                  store.markSaved();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 11 }}
              >
                <Save size={12} />
                <span>Snapshot Now</span>
              </button>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {store.versions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  No snapshots recorded yet. Use <strong>Snapshot Now</strong> or <code>Ctrl+S</code> to save a version checkpoint.
                </div>
              ) : (
                store.versions.map((v) => (
                  <div
                    key={v.hash}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md, 6px)',
                      background: 'var(--bg-secondary, #131722)',
                      border: '1px solid var(--border-subtle, #2a2e39)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2 }}>
                        <span style={{ fontFamily: 'var(--font-family-mono)' }}>Hash: {v.hash.slice(0, 10)}...</span>
                        {v.timestamp ? <span>{new Date(v.timestamp).toLocaleTimeString()}</span> : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="shortlist-btn"
                      onClick={() => {
                        void store.restoreVersion(v.hash);
                        setVersionModalOpen(false);
                        onError(`Restored version '${v.name}' (${v.hash.slice(0, 8)})`);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11 }}
                      title="Restore this version"
                    >
                      <RotateCcw size={12} />
                      <span>Restore</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                className="shortlist-btn"
                onClick={() => setVersionModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const DesignerCanvas: React.FC<CanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DesignerCanvasInner {...props} />
    </ReactFlowProvider>
  );
};