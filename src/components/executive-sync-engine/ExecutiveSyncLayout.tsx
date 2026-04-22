'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ExecutiveSyncLayout — Layout principal tipo Claude
// Panel izquierdo (Chat IA) + Panel derecho expansible (Documento)
// Reemplaza la UI de Claude con el design system industrial de The Giant's Forge
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatPanel } from './ChatPanel';
import { DocumentPanel } from './DocumentPanel';
import { useSyncEmitter } from './hooks/useSyncEmitter';
import type { Session } from 'next-auth';

interface ExecutiveSyncLayoutProps {
  session: Session;
  onClose: () => void;
}

export function ExecutiveSyncLayout({ session, onClose }: ExecutiveSyncLayoutProps) {
  const user = session.user as { id?: string; name?: string; role?: string };
  const isEditor = user.role === 'admin' || user.role === 'ceo'; // CEO or admin can edit

  const docId = useId().replace(/:/g, '');
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [chatWidth, setChatWidth] = useState(380); // px, resizable
  const [isResizing, setIsResizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { isBroadcasting, lastBroadcast, broadcast } = useSyncEmitter(
    user.id ?? 'ceo',
    user.name ?? 'CEO',
  );

  // SSR safety for portal
  useEffect(() => { setMounted(true); }, []);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Broadcast on content/title change
  const handleContentChange = useCallback((c: string) => {
    setContent(c);
    if (isEditor) {
      broadcast({ id: docId, title, content: c });
    }
  }, [title, docId, broadcast, isEditor]);

  const handleTitleChange = useCallback((t: string) => {
    setTitle(t);
    if (isEditor && content) {
      broadcast({ id: docId, title: t, content });
    }
  }, [content, docId, broadcast, isEditor]);

  // Apply AI suggestion — appends or replaces based on selection
  const handleApplySuggestion = useCallback((suggestion: string) => {
    // Extract the clean text (strip markdown formatting noise if needed)
    // For now we append with a separator
    const newContent = content
      ? `${content}\n\n---\n\n*Sugerencia del asistente:*\n\n${suggestion}`
      : suggestion;
    setContent(newContent);
    if (isEditor) broadcast({ id: docId, title, content: newContent }, true);
  }, [content, title, docId, broadcast, isEditor]);

  // Drag to resize divider
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = chatWidth;

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      setChatWidth(Math.max(260, Math.min(580, startWidth + delta)));
    }
    function onUp() {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [chatWidth]);

  if (!mounted) return null;

  const modal = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      background: '#070707',
      animation: 'viewer-slide-in 0.25s cubic-bezier(0.22,1,0.36,1) forwards',
    }}>
      {/* ─ Top bar ─ */}
      <div style={{
        flexShrink: 0, height: 52,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 18px',
        background: '#0d0d0d',
        borderBottom: '1px solid rgba(212,119,44,0.15)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.6)',
      }}>
        {/* ← Back to Hub */}
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 14px', borderRadius: 9,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontSize: 11.5, fontWeight: 700,
            letterSpacing: '0.05em', cursor: 'pointer',
            transition: 'all 0.18s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,119,44,0.18)'; e.currentTarget.style.borderColor = 'rgba(212,119,44,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        >
          <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Volver al Hub
        </button>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.09)' }}/>

        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {/* Module icon */}
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'rgba(212,119,44,0.12)',
            border: '1px solid rgba(212,119,44,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="#d4772c" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4772c', margin: 0, lineHeight: 1 }}>
              Executive Sync Engine
            </p>
            <p style={{
              fontSize: 13.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title || 'Documento sin título'}
            </p>
          </div>

          {/* Role badge */}
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 100,
            background: isEditor ? 'rgba(212,119,44,0.12)' : 'rgba(249,17,23,0.1)',
            border: `1px solid ${isEditor ? 'rgba(212,119,44,0.28)' : 'rgba(249,17,23,0.22)'}`,
            color: isEditor ? '#d4772c' : '#f91117',
            flexShrink: 0,
          }}>
            {isEditor ? '⚙ CEO · Editor' : '👁 Equipo · Solo lectura'}
          </span>
        </div>

        {/* Broadcast live button (CEO only) */}
        {isEditor && (
          <button
            onClick={() => broadcast({ id: docId, title, content }, true)}
            disabled={isBroadcasting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 9,
              background: isBroadcasting ? 'rgba(16,185,129,0.08)' : '#f91117',
              border: `1px solid ${isBroadcasting ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
              color: isBroadcasting ? '#10b981' : '#fff',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em',
              cursor: isBroadcasting ? 'default' : 'pointer',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            {isBroadcasting ? (
              <>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#10b981', boxShadow: '0 0 4px #10b981',
                  animation: 'pulse-status 1s infinite',
                }}/>
                Sincronizando...
              </>
            ) : (
              <>
                <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
                Publicar al equipo
              </>
            )}
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: 30, height: 30, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.45)', fontSize: 18,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,17,23,0.18)'; e.currentTarget.style.color = '#f91117'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >×</button>
      </div>

      {/* ─ Main content — Claude-style layout ─ */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', overflow: 'hidden',
        cursor: isResizing ? 'col-resize' : 'default',
        userSelect: isResizing ? 'none' : 'auto',
      }}>
        {/* Left: Chat panel */}
        <div style={{ width: chatWidth, flexShrink: 0, overflow: 'hidden' }}>
          <ChatPanel
            documentContent={content}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>

        {/* Resize divider */}
        <div
          onMouseDown={startResize}
          style={{
            width: 5, flexShrink: 0, cursor: 'col-resize',
            background: isResizing ? 'rgba(212,119,44,0.4)' : 'rgba(255,255,255,0.04)',
            transition: 'background 0.2s',
            position: 'relative',
          }}
          title="Arrastra para redimensionar"
        >
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 3, height: 3, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
              }}/>
            ))}
          </div>
        </div>

        {/* Right: Document panel (expands) */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <DocumentPanel
            isEditable={isEditor}
            documentId={docId}
            documentTitle={title}
            documentContent={content}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
            isSyncing={isBroadcasting}
            lastSync={lastBroadcast}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
