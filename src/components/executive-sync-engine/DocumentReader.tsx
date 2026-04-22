'use client';

// ─────────────────────────────────────────────────────────────────────────────
// DocumentReader — Playbook document viewer (Phase 1 enhanced)
// CEO: edit + tags + publish → triggers changelog
// Team: read-only + AI chat + changelog viewer
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { ChatPanel } from './ChatPanel';
import type { ApiConfig } from './SettingsPanel';

interface BibleDocument {
  id: number;
  slug: string;
  title: string;
  content: string;
  version: number;
  published: number;
  pinned?: number;
  tags?: string;
  summary?: string | null;
  author_name?: string;
  updated_at: string;
}

interface DocVersion {
  id: number;
  version: number;
  title: string;
  change_summary: string | null;
  author_name: string | null;
  created_at: string;
}

interface DocumentReaderProps {
  doc: BibleDocument;
  role: string;
  apiConfig: ApiConfig;
  onClose: () => void;
  onDocumentUpdated?: () => void;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
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

function readTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function parseTags(tagsJson?: string): string[] {
  try { return JSON.parse(tagsJson || '[]') || []; } catch { return []; }
}

function timeAgoShort(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3.6e6);
  const d = Math.floor(diff / 86.4e6);
  if (h < 1) return 'moments ago';
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

const PRESET_TAGS = ['estrategia', 'operaciones', 'finanzas', 'RRHH', 'legal', 'marketing'];
const TAG_COLORS: Record<string, string> = {
  estrategia: '#f91117', operaciones: '#d4772c', finanzas: '#10b981',
  rrhh: '#a855f7', legal: '#3b82f6', marketing: '#ec4899',
};
function tagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase().replace(/\s+/g, '')] ?? 'rgba(255,255,255,0.4)';
}

// ─────────────────────────────────────────────────────────────────────────────
export function DocumentReader({
  doc, role, apiConfig, onClose, onDocumentUpdated,
}: DocumentReaderProps) {
  const isCEO       = role === 'ceo';
  const [editContent, setEditContent] = useState(doc.content);
  const [editTitle,   setEditTitle]   = useState(doc.title);
  const [editTags,    setEditTags]    = useState<string[]>(parseTags(doc.tags));
  const [isEditing,   setIsEditing]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [published,   setPublished]   = useState(!!doc.published);
  const [chatWidth,   setChatWidth]   = useState(340);
  const [isResizing,  setIsResizing]  = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [versions,    setVersions]    = useState<DocVersion[]>([]);
  const [loadingVer,  setLoadingVer]  = useState(false);
  const [tagInput,    setTagInput]    = useState('');

  const accent = '#d4772c';
  const mins = readTime(editContent);

  // Load changelog
  const fetchVersions = useCallback(async () => {
    setLoadingVer(true);
    try {
      const res = await fetch(`/api/ese/versions?slug=${doc.slug}`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions ?? []);
      }
    } finally { setLoadingVer(false); }
  }, [doc.slug]);

  useEffect(() => {
    if (showChangelog) fetchVersions();
  }, [showChangelog, fetchVersions]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/ese/documents/${doc.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent, tags: JSON.stringify(editTags) }),
      });
      setIsEditing(false);
      onDocumentUpdated?.();
    } finally { setSaving(false); }
  }, [doc.slug, editTitle, editContent, editTags, onDocumentUpdated]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      // Save first (includes tags)
      if (isEditing) await handleSave();
      const res = await fetch('/api/ese/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: doc.slug }),
      });
      if (res.ok) { setPublished(true); onDocumentUpdated?.(); }
    } finally { setPublishing(false); }
  }, [doc.slug, isEditing, handleSave, onDocumentUpdated]);

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

  function addTag(tag: string) {
    const clean = tag.trim().toLowerCase();
    if (clean && !editTags.includes(clean)) setEditTags(prev => [...prev, clean]);
    setTagInput('');
  }
  function removeTag(tag: string) { setEditTags(prev => prev.filter(t => t !== tag)); }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#070707' }}>

      {/* ── Document pane ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#0d0d0d',
        }}>
          <button onClick={onClose} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>← Playbook</button>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, padding: '5px 10px', outline: 'none', width: '100%' }}
              />
            ) : (
              <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editTitle}
              </p>
            )}
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
              v{doc.version} · {doc.author_name ?? 'Ian Harris'} · 📖 ~{mins} min
              {!published && isCEO && ' · Draft'}
              {published && ' · Published'}
            </p>
          </div>

          {/* Changelog button */}
          <button
            onClick={() => setShowChangelog(v => !v)}
            title="Version history"
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
              background: showChangelog ? 'rgba(212,119,44,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showChangelog ? 'rgba(212,119,44,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: showChangelog ? accent : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >🕐 History</button>

          {/* CEO actions */}
          {isCEO && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '7px 16px', borderRadius: 8, background: '#10b981', border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : '✓ Save'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 10.5, fontWeight: 600, cursor: 'pointer' }}>
                    ✏ Edit
                  </button>
                  {!published ? (
                    <button onClick={handlePublish} disabled={publishing}
                      style={{ padding: '7px 16px', borderRadius: 8, background: accent, border: 'none', color: '#fff', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', boxShadow: `0 0 16px ${accent}40` }}>
                      {publishing ? 'Publishing...' : '📡 Publish to team'}
                    </button>
                  ) : (
                    <button onClick={handlePublish} disabled={publishing}
                      style={{ padding: '7px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                      {publishing ? 'Updating...' : '↑ Re-publish'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Tags editor (CEO, edit mode) */}
        {isCEO && isEditing && (
          <div style={{
            flexShrink: 0, padding: '10px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: '#0a0a0a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>Tags:</span>
            {editTags.map(tag => (
              <span key={tag} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 9, fontWeight: 700, padding: '2px 8px 2px 8px', borderRadius: 100,
                background: `${tagColor(tag)}15`, color: tagColor(tag), border: `1px solid ${tagColor(tag)}30`,
              }}>
                {tag}
                <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 10, lineHeight: 1 }}>×</button>
              </span>
            ))}
            {/* Preset quick-add */}
            {PRESET_TAGS.filter(t => !editTags.includes(t)).map(tag => (
              <button key={tag} onClick={() => addTag(tag)}
                style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                + {tag}
              </button>
            ))}
            {/* Custom tag input */}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Custom tag..."
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#fff', fontSize: 10, padding: '3px 10px', outline: 'none', width: 90 }}
            />
          </div>
        )}

        {/* Tags display (read mode) */}
        {!isEditing && editTags.length > 0 && (
          <div style={{ flexShrink: 0, padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#0a0a0a', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {editTags.map(tag => (
              <span key={tag} style={{
                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.1em', textTransform: 'uppercase',
                background: `${tagColor(tag)}10`, color: tagColor(tag), border: `1px solid ${tagColor(tag)}25`,
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Changelog panel */}
        {showChangelog && (
          <div style={{
            flexShrink: 0, maxHeight: 200, overflowY: 'auto',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#0c0c0c', padding: '12px 20px',
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
              Version History
            </p>
            {loadingVer ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Loading...</p>
            ) : versions.length === 0 ? (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No previous versions yet. History is saved on each publish.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {versions.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 20, borderRadius: 6, background: 'rgba(212,119,44,0.1)',
                      border: '1px solid rgba(212,119,44,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: accent, flexShrink: 0,
                    }}>v{v.version}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.change_summary ?? 'Document updated'}
                      </p>
                    </div>
                    <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{timeAgoShort(v.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 32px' }}>
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{
                width: '100%', height: '100%', minHeight: 400,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#e8e8e8', fontSize: 13, lineHeight: 1.8,
                fontFamily: 'monospace', padding: 16, outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
          ) : (
            <div
              style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)', fontSize: 13.5 }}
              dangerouslySetInnerHTML={{ __html: renderMd(editContent || '_This document is empty._') }}
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
