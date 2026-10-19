import React, { useRef, useState, useCallback } from 'react';
import type { DrawingToolType } from './simulator-drawing-rail';

export interface Point {
  x: number;
  y: number;
}

export interface ChartDrawing {
  id: string;
  type: DrawingToolType;
  p1: Point;
  p2?: Point;
  points?: Point[];
  color: string;
  text?: string;
}

export interface SimulatorDrawingCanvasProps {
  activeTool: DrawingToolType;
  disabled: boolean;
  drawings: ChartDrawing[];
  onAddDrawing: (drawing: ChartDrawing) => void;
  onDeleteDrawing?: (id: string) => void;
  onSelectTool?: (tool: DrawingToolType) => void;
  color?: string;
}

export const SimulatorDrawingCanvas: React.FC<SimulatorDrawingCanvasProps> = ({
  activeTool,
  disabled,
  drawings,
  onAddDrawing,
  onDeleteDrawing,
  onSelectTool,
  color = 'var(--accent-primary, #38bdf8)',
}) => {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const [currentDraft, setCurrentDraft] = useState<ChartDrawing | null>(null);

  const getSvgPoint = useCallback((e: React.PointerEvent<SVGSVGElement>): Point => {
    const svg = containerRef.current;
    if (!svg) return { x: e.clientX, y: e.clientY };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled || activeTool === 'cursor') return;
    if (activeTool === 'eraser') return; // Handled by click on individual shapes
    if (e.button !== 0) return; // only left click

    const pt = getSvgPoint(e);
    const newDrawing: ChartDrawing = {
      id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: activeTool,
      p1: pt,
      p2: pt,
      points: activeTool === 'brush' ? [pt] : undefined,
      color,
      text: activeTool === 'text' ? 'Note' : undefined,
    };
    setCurrentDraft(newDrawing);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!currentDraft || disabled) return;
    const pt = getSvgPoint(e);
    setCurrentDraft((prev) => {
      if (!prev) return null;
      if (prev.type === 'brush') {
        const nextPts = [...(prev.points || [prev.p1]), pt];
        return { ...prev, p2: pt, points: nextPts };
      }
      return { ...prev, p2: pt };
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!currentDraft || disabled) return;
    const pt = getSvgPoint(e);
    const finalDrawing: ChartDrawing = {
      ...currentDraft,
      p2: pt,
    };

    if (finalDrawing.type === 'brush') {
      if (finalDrawing.points && finalDrawing.points.length > 2) {
        onAddDrawing(finalDrawing);
      }
      setCurrentDraft(null);
      onSelectTool?.('cursor');
      return;
    }

    // Only save if it has minimum span or is a point tool
    const dx = Math.abs(finalDrawing.p1.x - pt.x);
    const dy = Math.abs(finalDrawing.p1.y - pt.y);
    const isSinglePoint = activeTool === 'text' || activeTool === 'horizontal_line' || activeTool === 'vertical_line';

    if (isSinglePoint || dx > 4 || dy > 4) {
      if (activeTool === 'text') {
        const userText = window.prompt('Enter annotation note:', 'Support Level');
        if (userText) {
          finalDrawing.text = userText;
          onAddDrawing(finalDrawing);
        }
      } else {
        onAddDrawing(finalDrawing);
      }
    }

    setCurrentDraft(null);
    onSelectTool?.('cursor');
  };

  const isInteractive = !disabled && activeTool !== 'cursor';

  return (
    <svg
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 4,
        pointerEvents: isInteractive ? 'all' : 'none',
        cursor: activeTool === 'eraser' ? 'pointer' : isInteractive ? 'crosshair' : 'default',
      }}
    >
      <defs>
        <marker
          id="ray-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Render all confirmed drawings */}
      {drawings.map((d) => (
        <g
          key={d.id}
          onClick={(e) => {
            if (activeTool === 'eraser') {
              e.stopPropagation();
              onDeleteDrawing?.(d.id);
            }
          }}
          style={{ cursor: activeTool === 'eraser' ? 'pointer' : undefined, pointerEvents: activeTool === 'eraser' ? 'all' : undefined }}
        >
          <DrawingItem drawing={d} />
        </g>
      ))}

      {/* Render ongoing draft */}
      {currentDraft && <DrawingItem drawing={currentDraft} isDraft />}
    </svg>
  );
};

const FIB_LEVELS = [
  { pct: 0, label: '0.0%', color: '#787b86' },
  { pct: 0.236, label: '23.6%', color: '#f23645' },
  { pct: 0.382, label: '38.2%', color: '#ff9800' },
  { pct: 0.5, label: '50.0%', color: '#4caf50' },
  { pct: 0.618, label: '61.8%', color: '#089981' },
  { pct: 0.786, label: '78.6%', color: '#2962ff' },
  { pct: 1.0, label: '100.0%', color: '#787b86' },
];

const DrawingItem: React.FC<{ drawing: ChartDrawing; isDraft?: boolean }> = ({ drawing, isDraft }) => {
  const { type, p1, p2 = p1, color, text } = drawing;
  const strokeColor = color || 'var(--accent-primary, #38bdf8)';
  const opacity = isDraft ? 0.75 : 1;

  switch (type) {
    case 'trendline': {
      return (
        <g opacity={opacity}>
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={p1.x} cy={p1.y} r={3.5} fill={strokeColor} />
          <circle cx={p2.x} cy={p2.y} r={3.5} fill={strokeColor} />
        </g>
      );
    }

    case 'ray': {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const extendLength = 3000;
      const factor = length > 0 ? extendLength / length : 0;
      const targetX = p1.x + dx * factor;
      const targetY = p1.y + dy * factor;

      return (
        <g opacity={opacity}>
          <line
            x1={p1.x}
            y1={p1.y}
            x2={targetX}
            y2={targetY}
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <circle cx={p1.x} cy={p1.y} r={3.5} fill={strokeColor} />
        </g>
      );
    }

    case 'extended_line': {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const extend = 4000;
      const factor = length > 0 ? extend / length : 0;

      return (
        <g opacity={opacity}>
          <line
            x1={p1.x - dx * factor}
            y1={p1.y - dy * factor}
            x2={p2.x + dx * factor}
            y2={p2.y + dy * factor}
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
          <circle cx={p1.x} cy={p1.y} r={3} fill={strokeColor} />
          <circle cx={p2.x} cy={p2.y} r={3} fill={strokeColor} />
        </g>
      );
    }

    case 'horizontal_line': {
      return (
        <g opacity={opacity}>
          <line
            x1={0}
            y1={p1.y}
            x2="100%"
            y2={p1.y}
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <circle cx={p1.x} cy={p1.y} r={3} fill={strokeColor} />
          <text
            x={10}
            y={p1.y - 4}
            fill={strokeColor}
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
          >
            Level
          </text>
        </g>
      );
    }

    case 'vertical_line': {
      return (
        <g opacity={opacity}>
          <line
            x1={p1.x}
            y1={0}
            x2={p1.x}
            y2="100%"
            stroke={strokeColor}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <circle cx={p1.x} cy={p1.y} r={3} fill={strokeColor} />
          <text
            x={p1.x + 4}
            y={24}
            fill={strokeColor}
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
          >
            Time
          </text>
        </g>
      );
    }

    case 'arrow': {
      return (
        <g opacity={opacity} color={strokeColor}>
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={strokeColor}
            strokeWidth={2}
            markerEnd="url(#ray-arrow)"
          />
          <circle cx={p1.x} cy={p1.y} r={3} fill={strokeColor} />
        </g>
      );
    }

    case 'rectangle': {
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.max(2, Math.abs(p2.x - p1.x));
      const height = Math.max(2, Math.abs(p2.y - p1.y));

      return (
        <g opacity={opacity}>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={strokeColor}
            fillOpacity={0.15}
            stroke={strokeColor}
            strokeWidth={1.5}
            rx={2}
          />
        </g>
      );
    }

    case 'circle': {
      const rx = Math.max(4, Math.abs(p2.x - p1.x) / 2);
      const ry = Math.max(4, Math.abs(p2.y - p1.y) / 2);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      return (
        <g opacity={opacity}>
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={strokeColor}
            fillOpacity={0.15}
            stroke={strokeColor}
            strokeWidth={1.5}
          />
        </g>
      );
    }

    case 'channel': {
      const offset = 35;
      return (
        <g opacity={opacity}>
          <line x1={p1.x} y1={p1.y - offset} x2={p2.x} y2={p2.y - offset} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={p1.x} y1={p1.y + offset} x2={p2.x} y2={p2.y + offset} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={strokeColor} strokeWidth={1} strokeDasharray="4 4" />
          <polygon
            points={`${p1.x},${p1.y - offset} ${p2.x},${p2.y - offset} ${p2.x},${p2.y + offset} ${p1.x},${p1.y + offset}`}
            fill={strokeColor}
            fillOpacity={0.08}
          />
        </g>
      );
    }

    case 'fibonacci': {
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      const diffY = maxY - minY;
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);

      return (
        <g opacity={opacity}>
          {FIB_LEVELS.map((lvl) => {
            const currentY = minY + diffY * lvl.pct;
            return (
              <g key={lvl.pct}>
                <line
                  x1={minX}
                  y1={currentY}
                  x2={maxX + 80}
                  y2={currentY}
                  stroke={lvl.color}
                  strokeWidth={1}
                  strokeDasharray={lvl.pct === 0.5 || lvl.pct === 0.618 ? undefined : '3 3'}
                />
                <text
                  x={maxX + 4}
                  y={currentY - 2}
                  fill={lvl.color}
                  fontSize={9}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontWeight={600}
                >
                  {lvl.label}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    case 'price_range': {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const width = Math.max(30, maxX - minX);
      const topHeight = Math.max(12, Math.abs(p2.y - p1.y));
      const stopHeight = Math.max(8, topHeight * 0.5);

      return (
        <g opacity={opacity}>
          <rect
            x={minX}
            y={Math.min(p1.y, p2.y)}
            width={width}
            height={topHeight}
            fill="rgba(8, 153, 129, 0.2)"
            stroke="var(--bullish, #089981)"
            strokeWidth={1.5}
            rx={2}
          />
          <rect
            x={minX}
            y={Math.max(p1.y, p2.y)}
            width={width}
            height={stopHeight}
            fill="rgba(242, 54, 69, 0.2)"
            stroke="var(--bearish, #f23645)"
            strokeWidth={1.5}
            rx={2}
          />
          <text x={minX + 4} y={Math.min(p1.y, p2.y) + 14} fill="var(--bullish, #089981)" fontSize={10} fontWeight={700}>
            Target (2.0 R)
          </text>
          <text x={minX + 4} y={Math.max(p1.y, p2.y) + stopHeight - 4} fill="var(--bearish, #f23645)" fontSize={10} fontWeight={700}>
            Stop Loss
          </text>
        </g>
      );
    }

    case 'brush': {
      const pts = drawing.points && drawing.points.length > 0 ? drawing.points : [p1, p2];
      const pathD = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
      return (
        <g opacity={opacity}>
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }

    case 'text': {
      return (
        <g opacity={opacity}>
          <rect
            x={p1.x - 4}
            y={p1.y - 14}
            width={Math.max(40, (text?.length ?? 4) * 7 + 12)}
            height={20}
            rx={4}
            fill="var(--bg-surface-elevated, #1e222d)"
            stroke={strokeColor}
            strokeWidth={1}
          />
          <text
            x={p1.x + 2}
            y={p1.y}
            fill="var(--text-primary)"
            fontSize={11}
            fontWeight={600}
            fontFamily="var(--font-family-sans, sans-serif)"
          >
            {text || 'Note'}
          </text>
        </g>
      );
    }

    case 'measure': {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      const dx = Math.round(Math.abs(p2.x - p1.x));
      const dy = Math.round(Math.abs(p2.y - p1.y));

      return (
        <g opacity={opacity}>
          <rect
            x={minX}
            y={minY}
            width={Math.max(2, maxX - minX)}
            height={Math.max(2, maxY - minY)}
            fill="rgba(41, 98, 255, 0.12)"
            stroke="var(--accent-primary, #2962ff)"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
          <text
            x={minX + 6}
            y={minY + 16}
            fill="var(--accent-primary, #2962ff)"
            fontSize={10}
            fontWeight={700}
            fontFamily="var(--font-family-mono, monospace)"
          >
            Δ {dx}px × {dy}px
          </text>
        </g>
      );
    }

    default:
      return null;
  }
};
