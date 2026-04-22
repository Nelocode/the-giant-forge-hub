'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ChatPanel — Panel izquierdo: asistente IA conectado a Google Gemini
// Ghostwriting y refinamiento de texto para el CEO
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from './types';

interface ChatPanelProps {
  documentContent: string;
  onApplySuggestion: (text: string) => void;
}

/* ── Minimal Markdown renderer for chat bubbles ───────────────── */
function renderChatMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11px">$1</code>')
    .replace(/\n/g, '<br/>');
}

export function ChatPanel({ documentContent, onApplySuggestion }: ChatPanelProps) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setStreaming('');

    try {
      const res = await fetch('/api/executive-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          documentContext: documentContent.slice(0, 4000), // send relevant context
          history: messages.slice(-6), // last 3 exchanges
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE chunks from the Gemini streaming response
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') break;
              try {
                const data = JSON.parse(raw);
                if (data.text) {
                  full += data.text;
                  setStreaming(full);
                }
              } catch { /* skip malformed chunks */ }
            }
          }
        }
      }

      if (!full) full = '(Sin respuesta del asistente)';

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: full,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStreaming('');
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `⚠ Error: ${err instanceof Error ? err.message : 'No se pudo conectar con el asistente. Verifica la GOOGLE_AI_API_KEY.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
      setStreaming('');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, documentContent, messages]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Extract last assistant block as a suggestion to apply
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const canApply = !!lastAssistantMsg && !lastAssistantMsg.content.startsWith('⚠');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0a0a0a',
      borderRight: '1px solid rgba(255,255,255,0.07)',
    }}>
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0, padding: '16px 18px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'rgba(249,17,23,0.12)',
          border: '1px solid rgba(249,17,23,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* Anthropic spark icon */}
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"
              fill="#f91117" stroke="#f91117" strokeWidth={0.5} strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f91117', marginBottom: 1 }}>
            Asistente IA
          </p>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Gemini Ghostwriter
          </p>
        </div>
        {/* Connection status */}
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', borderRadius: 100,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.18)',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#10b981', boxShadow: '0 0 4px #10b981',
            animation: 'pulse-status 2s infinite', display: 'inline-block',
          }}/>
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#10b981' }}>
            Conectado
          </span>
        </div>
      </div>

      {/* ── Welcome state ── */}
      {messages.length === 0 && !streaming && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 28, gap: 14, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(249,17,23,0.08)',
            border: '1px solid rgba(249,17,23,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"
                fill="#f91117" opacity={0.8}/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Tu ghostwriter ejecutivo
            </p>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, maxWidth: 240 }}>
              Redacta, refina y mejora tu documento. Puedes pedirle al asistente que reescriba secciones, mejore el tono o genere resúmenes.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 260 }}>
            {[
              '✍ Mejora el tono ejecutivo',
              '📋 Genera un resumen ejecutivo',
              '🔍 Revisa la claridad del documento',
            ].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                style={{
                  padding: '8px 12px', borderRadius: 9, textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Message list ── */}
      {(messages.length > 0 || streaming) && (
        <div
          ref={listRef}
          className="no-scrollbar"
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            padding: '16px 16px 8px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: 8, alignItems: 'flex-start',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #f91117, #d4772c)'
                  : 'rgba(249,17,23,0.12)',
                border: msg.role === 'assistant' ? '1px solid rgba(249,17,23,0.2)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: msg.role === 'user' ? 10 : 12,
              }}>
                {msg.role === 'user' ? '👤' : '✦'}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '82%',
                padding: '9px 13px', borderRadius: 12,
                background: msg.role === 'user'
                  ? 'rgba(249,17,23,0.12)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(249,17,23,0.2)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <p
                  style={{
                    fontSize: 12.5, color: msg.content.startsWith('⚠') ? '#f91117' : '#e8e8e8',
                    lineHeight: 1.65, margin: 0,
                  }}
                  dangerouslySetInnerHTML={{ __html: renderChatMd(msg.content) }}
                />
                {/* Apply suggestion button for assistant messages */}
                {msg.role === 'assistant' && !msg.content.startsWith('⚠') && (
                  <button
                    onClick={() => onApplySuggestion(msg.content)}
                    style={{
                      marginTop: 8, padding: '5px 10px', borderRadius: 7,
                      background: 'rgba(212,119,44,0.12)',
                      border: '1px solid rgba(212,119,44,0.25)',
                      color: '#d4772c', fontSize: 10, fontWeight: 700,
                      cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,119,44,0.22)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,119,44,0.12)'; }}
                  >
                    ↑ Aplicar al documento
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {streaming && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'rgba(249,17,23,0.12)',
                border: '1px solid rgba(249,17,23,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0,
              }}>✦</div>
              <div style={{
                maxWidth: '82%', padding: '9px 13px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <p
                  style={{ fontSize: 12.5, color: '#e8e8e8', lineHeight: 1.65, margin: 0 }}
                  dangerouslySetInnerHTML={{ __html: renderChatMd(streaming) + '<span style="opacity:0.5">▊</span>' }}
                />
              </div>
            </div>
          )}

          {/* Typing indicator (before first token) */}
          {isLoading && !streaming && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                background: 'rgba(249,17,23,0.12)',
                border: '1px solid rgba(249,17,23,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}>✦</div>
              <div style={{ display: 'flex', gap: 4, paddingLeft: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.35)',
                    animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}/>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Apply last suggestion CTA (sticky) ── */}
      {canApply && (
        <div style={{
          flexShrink: 0, padding: '6px 14px',
          borderTop: '1px solid rgba(212,119,44,0.1)',
        }}>
          <button
            onClick={() => onApplySuggestion(lastAssistantMsg!.content)}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 8,
              background: 'rgba(212,119,44,0.08)',
              border: '1px solid rgba(212,119,44,0.2)',
              color: '#d4772c', fontSize: 10.5, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,119,44,0.16)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,119,44,0.08)'; }}
          >
            ↑ Aplicar última sugerencia al documento
          </button>
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a0a',
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '10px 12px',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pídele al asistente que mejore tu documento... (Enter para enviar)"
            rows={2}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#fff', fontSize: 12.5, lineHeight: 1.6, resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: input.trim() && !isLoading ? '#f91117' : 'rgba(255,255,255,0.07)',
              border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? (
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: '#fff',
                animation: 'viewer-spin 0.75s linear infinite',
              }}/>
            ) : (
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7"/>
              </svg>
            )}
          </button>
        </div>
        <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.2)', marginTop: 5, textAlign: 'center' }}>
          Powered by Gemini · Shift+Enter para nueva línea
        </p>
      </div>

      <style>{`
        @keyframes typing-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
