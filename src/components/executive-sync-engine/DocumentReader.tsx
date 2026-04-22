'use client';

// ─────────────────────────────────────────────────────────────────────────────
// DocumentReader — Visor de documentos de la Biblia
// CEO: puede editar + publicar. Equipo: solo lectura + chat IA propio
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { ChatPanel } from './ChatPanel';
import type { ApiConfig } from './SettingsPanel';

interface BibleDocument {
  id: number;
  slug: string;
  title: string;
  content: string;
  version: number;
  published: number;
  author_name?: string;
  updated_at: string;
}

interface DocumentReaderProps {
  doc: BibleDocument;
  role: string;
  apiConfig: ApiConfig;
  onClose: () => void;
  onDocumentUpdated?: () => void;
}

// Minimal Markdown renderer
function renderMd(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:#fff;margin:20px 0 8px">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:18px;font-weight:800;color:#fff;margin:24px 0 10px;letter-spacing:-0.02em">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 16px;letter-spacing:-0.03em">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em style="color:rgba(255,255,255,0.7)">$1</em>')
    .replace(/`(.+?)`/g,       '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px">$1</code>')
    .replace(/^---$/gm,        '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0"/>')
    .replace(/^- (.+)$/gm,    '<li style="color:rgba(255,255,255,0.7);margin:4px 0;padding-left:8px">$1</li>')
    .replace(/\n/g, '<br/>');
}

export function DocumentReader({
  doc, role, apiConfig, onClose, onDocumentUpdated,
}: DocumentReaderProps) {
  const isCEO = role === 'ceo';
  const [editContent, setEditContent] = useState(doc.content);
  const [editTitle,   setEditTitle]   = useState(doc.title);
  const [isEditing,   setIsEditing]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [published,   setPublished]   = useState(!!doc.published);
  const [chatWidth,   setChatWidth]   = useState(340);
  const [isResizing,  setIsResizing]  = useState(false);

  const accent = '#d4772c';

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/ese/documents/${doc.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      setIsEditing(false);
      onDocumentUpdated?.();
    } finally {
      setSaving(false);
    }
  }, [doc.slug, editTitle, editContent, onDocumentUpdated]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const res = await fetch('/api/ese/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: doc.slug }),
      });
      if (res.ok) {
        setPublished(true);
        onDocumentUpdated?.();
      }
    } finally {
      setPublishing(false);
    }
  }, [doc.slug, onDocumentUpdated]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = chatWidth;
    const onMove = (ev: MouseEvent) => setChatWidth(Math.max(240, Math.min(520, startW - (ev.clientX - startX))));
    const onUp   = () => { setIsResizing(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [chatWidth]);

  return (
    <div style={{ display: 'flex', height: '100%', background: '#070707' }}>

      {/* ── Document pane ── */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#0d0d0d',
        }}>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ← Playbook
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700,
                  padding: '5px 10px', outline: 'none', width: '100%',
                }}
              />
            ) : (
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editTitle}
              </p>
            )}
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
              v{doc.version} · {doc.author_name ?? 'Ian Harris'}
              {!published && isCEO && ' · Borrador'}
              {published && ' · Publicado'}
            </p>
          </div>

          {/* CEO actions */}
          {isCEO && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '7px 16px', borderRadius: 8, background: '#10b981', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Guardando...' : '✓ Guardar'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>
                    ✏ Editar
                  </button>
                  {!published && (
                    <button onClick={handlePublish} disabled={publishing}
                      style={{ padding: '7px 16px', borderRadius: 8, background: accent, border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', boxShadow: `0 0 16px ${accent}40` }}>
                      {publishing ? 'Publicando...' : '📡 Publicar al equipo'}
                    </button>
                  )}
                  {published && (
                    <button onClick={handlePublish} disabled={publishing}
                      style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                      {publishing ? 'Actualizando...' : '↑ Re-publicar'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px' }}>
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{
                width: '100%', height: '100%', minHeight: 400,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#e8e8e8',
                fontSize: 13, lineHeight: 1.8,
                fontFamily: 'monospace', padding: 16,
                outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          ) : (
            <div
              style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', fontSize: 13.5 }}
              dangerouslySetInnerHTML={{ __html: renderMd(editContent || '_Este documento está vacío._') }}
            />
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div onMouseDown={startResize} style={{
        width: 5, flexShrink: 0, cursor: 'col-resize',
        background: isResizing ? `${accent}40` : 'rgba(255,255,255,0.04)',
        transition: 'background 0.2s',
      }}/>

      {/* ── Chat pane ── */}
      <div style={{ width: chatWidth, flexShrink: 0, overflow: 'hidden' }}>
        <ChatPanel
          documentContent={editContent}
          onApplySuggestion={(text) => { if (isCEO) { setEditContent(prev => prev ? `${prev}\n\n---\n\n${text}` : text); setIsEditing(true); } }}
          apiConfig={apiConfig}
        />
      </div>
    </div>
  );
}
