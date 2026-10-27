import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { AgentConsoleMessage } from './agentConsole';

export type AgentPersonality = 'bull' | 'bear' | 'pm' | 'neutral';

export interface DebateRound {
  id: string;
  speaker: AgentPersonality;
  content: string;
  citations?: Array<{
    document: string;
    pageNumber: number;
    quote: string;
  }>;
  timestamp: number;
}

export interface DebateConfig {
  topic: string;
  symbol?: string;
  rounds?: number;
  initialStance?: AgentPersonality;
}

export class DebateOrchestrator {
  private rounds: number;
  private currentRound: number = 0;
  private bullArgs: string[] = [];
  private bearArgs: string[] = [];
  private pmSynthesis: string | null = null;
  private onRoundCallback: ((round: DebateRound) => void) | null = null;

  constructor(config: DebateConfig) {
    this.rounds = config.rounds ?? 3;
  }

  setOnRoundCallback(callback: (round: DebateRound) => void) {
    this.onRoundCallback = callback;
    return this;
  }

  startDebate(): DebateRound[] {
    const rounds: DebateRound[] = [];

    // Bull opening argument
    const bullOpen = this.generateBullArgument();
    rounds.push({
      id: crypto.randomUUID(),
      speaker: 'bull',
      content: bullOpen,
      timestamp: Date.now(),
    });
    this.bullArgs.push(bullOpen);

    // Bear opening argument
    const bearOpen = this.generateBearArgument();
    rounds.push({
      id: crypto.randomUUID(),
      speaker: 'bear',
      content: bearOpen,
      timestamp: Date.now(),
    });
    this.bearArgs.push(bearOpen);

    // Subsequent rounds
    for (let i = 1; i < this.rounds; i++) {
      // Bull response
      const bullResponse = this.generateBullResponse(rounds.length);
      rounds.push({
        id: crypto.randomUUID(),
        speaker: 'bull',
        content: bullResponse,
        timestamp: Date.now(),
      });
      this.bullArgs.push(bullResponse);

      // Bear response
      const bearResponse = this.generateBearResponse(rounds.length - 1);
      rounds.push({
        id: crypto.randomUUID(),
        speaker: 'bear',
        content: bearResponse,
        timestamp: Date.now(),
      });
      this.bearArgs.push(bearResponse);
    }

    // Portfolio Manager synthesis
    const synthesis = this.generatePMSynthesis();
    rounds.push({
      id: crypto.randomUUID(),
      speaker: 'pm',
      content: synthesis,
      timestamp: Date.now(),
    });
    this.pmSynthesis = synthesis;

    // Notify callback
    if (this.onRoundCallback) {
      rounds.forEach((round) => this.onRoundCallback(round));
    }

    return rounds;
  }

  private generateBullArgument(): string {
    return `BULL CASE: The ${selectedSymbol?.ticker || 'NIFTY'} is poised for growth driven by strong fundamentals. Recent earnings have beaten expectations, and the macro environment supports risk-on flows. Key catalysts include: improving margin trends, market share gains in core segments, and potential dividend growth. Technical indicators show positive momentum with the price above key moving averages.`;
  }

  private generateBearArgument(): string {
    return `BEAR CASE: Downward pressure is building on ${selectedSymbol?.ticker || 'NIFTY'} due to rising interest rates, margin compression, and increasing competitive threats. Revenue growth has slowed, and macro headwinds such as inflation and regulatory scrutiny pose risks to future performance. Technical indicators suggest the asset may be overbought, and a correction could be due.`;
  }

  private generateBullResponse(roundNum: number): string {
    const prevBear = this.bearArgs[roundNum - 1] || '';
    return `REBUTTAL (Round ${roundNum + 1}): The bear's concerns are valid but overstated. While macro headwinds exist, our company has demonstrated resilience through diversified revenue streams and strong cost-control measures. The market has historically rewarded patience with this name, and the current pullback presents a buying opportunity for long-term investors.`;
  }

  private generateBearResponse(roundNum: number): string {
    const prevBull = this.bullArgs[roundNum - 1] || '';
    return `COUNTER (Round ${roundNum + 1}): The bull's optimism ignores the fundamental deterioration we're seeing. Market share erosion, rising bad debt, and margin shrinkage are not temporary issues. Until we see concrete evidence of a turnaround, the prudent stance is to reduce exposure and await better risk-adjusted entry points.`;
  }

  private generatePMSynthesis(): string {
    const bullCount = this.bullArgs.length;
    const bearCount = this.bearArgs.length;
    const consensus = bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral';

    return `PORTFOLIO MANAGER SYNTHESIS: After reviewing the ${bullCount} bull arguments and ${bearCount} bear arguments, the decision is ${consensus}. ${consensus === 'bullish'
      ? 'We recommend initiating or increasing the position, setting a stop-loss at X, and targeting a price objective based on reverse DCF implied growth.'
      : consensus === 'bearish'
        ? 'We recommend reducing exposure, tightening stop-losses, and exploring hedging strategies with put options.'
        : 'We recommend a wait-and-see approach, monitoring for breakout or breakdown signals before establishing a new position.'}`;
  }
}

export function useDebate(topic: string, symbol?: string) {
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [active, setActive] = useState<'bull' | 'bear' | 'pm' | 'neutral'>('neutral');
  const { selectedSymbol } = useStore();

  const start = () => {
    const orchestrator = new DebateOrchestrator({
      topic,
      symbol: selectedSymbol?.ticker,
      rounds: 3,
    });

    const debateRounds = orchestrator.startDebate();
    setRounds(debateRounds);
    setActive('bull'); // Start with bull opening
  };

  return { rounds, active, setActive, start };
}