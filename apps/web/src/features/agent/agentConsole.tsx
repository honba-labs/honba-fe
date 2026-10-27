import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useQuotesStream } from '@/hooks/useQuotesStream';
import { useLinkGroup } from '@/hooks/useLinkGroup';

export interface AgentConsoleMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Array<{
    document: string;
    pageNumber: number;
    quote: string;
  }>;
  timestamp: number;
  action?: {
    type: 'place-order' | 'add-to-watchlist' | 'create-alert';
    payload?: any;
  };
}

export interface AgentConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<AgentConsoleMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { selectedSymbol, activeSymbol } = useStore();

  // SSE streaming from the agent console
  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource('/api/agent/console?symbol=' + (activeSymbol?.ticker || ''));

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data as string);
      if (data.type === 'message') {
        setMessages((prev) => [...prev, {
          id: data.id,
          role: data.role,
          content: data.content,
          citations: data.citations,
          timestamp: Date.now(),
        }]);
      } else if (data.type === 'thread') {
        // Update conversation thread
        setMessages((prev) => [...prev, {
          id: data.id,
          role: 'system',
          content: `Thread: ${data.threadName}`,
          timestamp: Date.now(),
        }]);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, activeSymbol?.ticker]);

  const sendMessage = (content: string) => {
    setInput('');
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }]);

    // Send to agent via SSE
    const evt = new EventSource('/api/agent/console');
    evt.send(JSON.stringify({
      type: 'query',
      content,
      symbol: selectedSymbol?.ticker,
    }));
    evt.close();
  };

  const handleAction = (action: AgentConsoleMessage['action']) => {
    if (!action) return;

    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: 'system',
      content: `Action: ${action.type}`,
      timestamp: Date.now(),
    }]);

    // Execute the action based on type
    switch (action.type) {
      case 'place-order':
        // Place paper trading order
        window.dispatchEvent(new CustomEvent('place-order', {
          detail: { symbol: selectedSymbol?.ticker, ...action.payload }
        }));
        break;
      case 'add-to-watchlist':
        window.dispatchEvent(new CustomEvent('add-to-watchlist', {
          detail: { symbol: selectedSymbol?.ticker }
        }));
        break;
      case 'create-alert':
        window.dispatchEvent(new CustomEvent('create-alert', {
          detail: { symbol: selectedSymbol?.ticker, ...action.payload }
        }));
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="agent-console-overlay" onClick={onClose}>
      <div
        className="agent-console-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="agent-console-header">
          <div className="agent-console-title">
            AI Research Agent <span className="agent-console-shortcut">Ctrl+J</span>
          </div>
          <button
            className="agent-console-close"
            onClick={onClose}
            title="Close Agent Console"
          >
            <X size={16} />
          </button>
        </div>

        <div className="agent-console-messages" ref={/* message container */}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`agent-console-message agent-console-message-${msg.role}`}
            >
              <div className="agent-console-message-content">
                {msg.content}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="agent-console-citations">
                    {msg.citations.map((cite, i) => (
                      <div key={i} className="agent-console-citation">
                        <strong>{cite.document}</strong>, p. {cite.pageNumber}:
                        <em>{cite.quote}</em>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.action && (
                <div className="agent-console-action">
                  <button
                    onClick={() => handleAction(msg.action)}
                    className="agent-console-action-btn"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setMessages(
                      prev => prev.filter(m => m.id !== msg.id))
                    }
                    className="agent-console-action-btn agent-console-action-cancel"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="agent-console-message-meta">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}

          {/* System messages for threads */}
          {messages.filter(m => m.role === 'system').map((msg) => (
            <div key={msg.id} className="agent-console-message agent-console-message-system">
              <div className="agent-console-message-content">
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="agent-console-input-area">
          <div className="agent-console-input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the agent anything about markets, research, or execute actions..."
              className="agent-console-textarea"
              rows={1}
              maxRows={3}
            />
            <button
              onClick={() => sendMessage(input) || setInput('')
              }
              className="agent-console-send-btn"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};