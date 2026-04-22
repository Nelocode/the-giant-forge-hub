'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ExecutiveSyncLayout — Layout principal del Executive Sync Engine
// CEO: Tab "Editar" (ghostwriter) + Tab "Biblia" (biblioteca)
// Equipo: Solo Tab "Biblia" (solo lectura + chat IA propio)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatPanel }           from './ChatPanel';
import { DocumentPanel }       from './DocumentPanel';
import { BiblePanel }          from './BiblePanel';
import { DocumentReader }      from './DocumentReader';
import { SettingsPanel, loadApiConfig } from './SettingsPanel';
import { TutorialPanel, hasTutorialBeenSeen } from './TutorialPanel';
import { NotificationToast, dispatchEseEvent } from './NotificationToast';
import { useSyncEmitter }      from './hooks/useSyncEmitter';
import type { ApiConfig }      from './SettingsPanel';
import type { Session }        from 'next-auth';

interface ExecutiveSyncLayoutProps {
  session: Session;
  onClose: () => void;
}

type ActiveTab = 'editor' | 'bible';

export function ExecutiveSyncLayout({ session, onClose }: ExecutiveSyncLayoutProps) {
  const user     = session.user as { id?: string; name?: string; role?: string };
  const isCEO    = user.role === 'ceo';
  const isAdmin  = user.role === 'admin';
  const canEdit  = isCEO; // Only CEO can edit the Bible

  const docId = useId().replace(/:/g, '');
  const [title,        setTitle]        = useState('');
  const [content,      setContent]      = useState('');
  const [chatWidth,    setChatWidth]    = useState(380);
  const [isResizing,   setIsResizing]   = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [apiConfig,    setApiConfig]    = useState<ApiConfig>(() => loadApiConfig());
  const [activeTab,    setActiveTab]    = useState<ActiveTab>(isCEO ? 'editor' : 'bible');
  const [openDoc,      setOpenDoc]      = useState<any | null>(null); // document in DocumentReader

  const { isBroadcasting, lastBroadcast, broadcast } = useSyncEmitter(
    user.id ?? 'ceo',
    user.name ?? 'CEO',
  );

  // SSR safety
  useEffect(() => {
    setMounted(true);
    // Show tutorial on first visit
    if (!hasTutorialBeenSeen()) setShowTutorial(true);
  }, []);

  // SSE subscription for doc_published events → dispatch global event for Toast + BiblePanel
  useEffect(() => {
    const es = new EventSource('/api/sync/stream');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'doc_published') {
          dispatchEseEvent(data);
        }
      } catch { /* skip */ }
    };
    return () => es.close();
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !showSettings && !showTutorial && !openDoc) onClose(); }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, showSettings, showTutorial, openDoc]);

  const handleContentChange = useCallback((c: string) => {
    setContent(c);
    if (canEdit) broadcast({ id: docId, title, content: c });
  }, [title, docId, broadcast, canEdit]);

  const handleTitleChange = useCallback((t: string) => {
    setTitle(t);
    if (canEdit && content) broadcast({ id: docId, title: t, content });
  }, [content, docId, broadcast, canEdit]);

  const handleApplySuggestion = useCallback((suggestion: string) => {
    const newContent = content ? `${content}\n\n---\n\n*Sugerencia del asistente:*\n\n${suggestion}` : suggestion;
    setContent(newContent);
    if (canEdit) broadcast({ id: docId, title, content: newContent }, true);
  }, [content, title, docId, broadcast, canEdit]);

  // Resize divider
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX, startWidth = chatWidth;
    const onMove = (ev: MouseEvent) => setChatWidth(Math.max(260, Math.min(580, startWidth + ev.clientX - startX)));
    const onUp   = () => { setIsResizing(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [chatWidth]);

  // New document: switch to editor tab with blank slate
  const handleNewDocument = useCallback(() => {
    setActiveTab('editor');
    setTitle('');
    setContent('');
  }, []);

  if (!mounted) return null;

  const accent = '#d4772c';

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
        borderBottom: `1px solid ${accent}25`,
        boxShadow: '0 2px 24px rgba(0,0,0,0.6)',
      }}>
        {/* ← Back */}
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = `${accent}20`; e.currentTarget.style.borderColor = `${accent}40`; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        >
          <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Hub
        </button>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.09)' }}/>

        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `${accent}12`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke={accent} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, margin: 0, lineHeight: 1 }}>Executive Sync Engine</p>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              {user.name ?? 'Usuario'}
            </p>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: isCEO ? `${accent}12` : 'rgba(255,255,255,0.07)', border: `1px solid ${isCEO ? accent + '28' : 'rgba(255,255,255,0.12)'}`, color: isCEO ? accent : 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
            {isCEO ? '⚡ CEO' : isAdmin ? '⚙ Admin' : '👁 Equipo'}
          </span>
        </div>

        {/* ── Tabs (CEO only sees both; team only sees Biblia) ── */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: 3 }}>
          {isCEO && (
            <button onClick={() => setActiveTab('editor')} style={{ padding: '5px 14px', borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', border: 'none', background: activeTab === 'editor' ? accent : 'transparent', color: activeTab === 'editor' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
              ✍ Ghostwriter
            </button>
          )}
          <button onClick={() => { setActiveTab('bible'); setOpenDoc(null); }} style={{ padding: '5px 14px', borderRadius: 7, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', border: 'none', background: activeTab === 'bible' ? (isCEO ? 'rgba(255,255,255,0.1)' : accent) : 'transparent', color: activeTab === 'bible' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
            📚 Biblia
          </button>
        </div>

        {/* Broadcast button (CEO editor tab) */}
        {isCEO && activeTab === 'editor' && (
          <button onClick={() => broadcast({ id: docId, title, content }, true)} disabled={isBroadcasting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: isBroadcasting ? 'rgba(16,185,129,0.08)' : '#f91117', border: `1px solid ${isBroadcasting ? 'rgba(16,185,129,0.2)' : 'transparent'}`, color: isBroadcasting ? '#10b981' : '#fff', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', cursor: isBroadcasting ? 'default' : 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
            {isBroadcasting ? (<><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981', animation: 'pulse-status 1s infinite' }}/> Sincronizando...</>) : (<><svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg> Live</>)}
          </button>
        )}

        {/* ⚙ Settings */}
        <button onClick={() => setShowSettings(true)} title="Configurar IA" style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${(apiConfig.claudeKey || apiConfig.googleKey) ? 'rgba(16,185,129,0.3)' : `${accent}40`}`, color: (apiConfig.claudeKey || apiConfig.googleKey) ? '#10b981' : accent, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>⚙</button>

        {/* ? Tutorial */}
        <button onClick={() => setShowTutorial(true)} title="Ver tutorial" style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>?</button>

        {/* × Close */}
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.45)', fontSize: 18, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,17,23,0.18)'; e.currentTarget.style.color = '#f91117'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}>×</button>
      </div>

      {/* ─ Main content ─ */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>

        {/* EDITOR TAB (CEO only) */}
        {activeTab === 'editor' && isCEO && (
          <>
            <div style={{ width: chatWidth, flexShrink: 0, overflow: 'hidden' }}>
              <ChatPanel documentContent={content} onApplySuggestion={handleApplySuggestion} apiConfig={apiConfig} />
            </div>
            <div onMouseDown={startResize} style={{ width: 5, flexShrink: 0, cursor: 'col-resize', background: isResizing ? `${accent}40` : 'rgba(255,255,255,0.04)', transition: 'background 0.2s' }}/>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <DocumentPanel isEditable={true} documentId={docId} documentTitle={title} documentContent={content} onTitleChange={handleTitleChange} onContentChange={handleContentChange} isSyncing={isBroadcasting} lastSync={lastBroadcast} />
            </div>
          </>
        )}

        {/* BIBLE TAB */}
        {activeTab === 'bible' && (
          openDoc ? (
            <DocumentReader
              doc={openDoc}
              role={user.role ?? 'user'}
              apiConfig={apiConfig}
              onClose={() => setOpenDoc(null)}
              onDocumentUpdated={() => setOpenDoc(null)}
            />
          ) : (
            <BiblePanel
              role={user.role ?? 'user'}
              onOpenDocument={setOpenDoc}
              onNewDocument={isCEO ? handleNewDocument : undefined}
            />
          )
        )}
      </div>

      {/* Notification toast (listens globally) */}
      <NotificationToast onViewDocument={(slug) => {
        setActiveTab('bible');
        fetch(`/api/ese/documents/${slug}`).then(r => r.json()).then(d => d.document && setOpenDoc(d.document));
      }}/>
    </div>
  );

  return (
    <>
      {createPortal(modal, document.body)}
      {showSettings && (
        <SettingsPanel onClose={() => { setShowSettings(false); setApiConfig(loadApiConfig()); }} />
      )}
      {showTutorial && (
        <TutorialPanel role={user.role ?? 'user'} onClose={() => setShowTutorial(false)} />
      )}
    </>
  );
}
