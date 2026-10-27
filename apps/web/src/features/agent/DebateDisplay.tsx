import React from 'react';
import { useDebate } from './debateOrchestrator';
import { useStore } from '@/lib/store';

export interface DebateRound {
  id: string;
  speaker: 'bull' | 'bear' | 'pm' | 'neutral';
  content: string;
  timestamp: number;
}

export const DebateDisplay: React.FC = () => {
  const { rounds, active, setActive, start } = useDebate('market outlook', undefined);
  const { selectedSymbol } = useStore();

  return (
    <div className="agent-debate-panel">
      <div className="agent-debate-header">
        <span className="agent-debate-title">Multi-Agent Debate</span>
        <span className="agent-debate-symbol">
          {selectedSymbol?.ticker || ''}
        </span>
        <button
          onClick={start}
          className="agent-debate-start-btn"
          disabled={rounds.length > 0}
        >
          Start Debate
        </button>
      </div>

      <div className="agent-debate-rounds">
        {rounds.map((round) => (
          <div
            key={round.id}
            className={`agent-debate-round agent-debate-round-${round.speaker}`}
          >
            <div className="agent-debate-speaker">
              {round.speaker === 'pm'
                ? 'Portfolio Manager'
                : round.speaker === 'bull'
                  ? 'Bull'
                  : round.speaker === 'bear'
                    ? 'Bear'
                    : 'Neutral'}
            </div>
            <div className="agent-debate-content">{round.content}</div>
            <div className="agent-debate-meta">
              {new Date(round.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      <div className="agent-debate-synthesis">
        {rounds.some((r) => r.speaker === 'pm') && (
          <div className="agent-debate-synthesis-box">
            <strong>PM Decision:</strong> {rounds
              .filter((r) => r.speaker === 'pm')
              .at(0)?.content || 'Pending...'}
          </div>
        )}
      </div>
    </div>
  );
};