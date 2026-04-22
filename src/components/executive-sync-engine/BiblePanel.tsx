'use client';

// ─────────────────────────────────────────────────────────────────────────────
// BiblePanel — CEO's Playbook document library (Phase 1 enhanced)
// Tags filter, Pin indicator, Read time, AI Summary, Changelog
// El equipo puede leer; solo el CEO puede crear/editar/publicar/pinear
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

interface BibleDocument {
  id: number;
  slug: string;
  title: string;
  content: string;
  version: number;
  published: number;
  pinned: number;
  tags: string;    // JSON array string
  summary: string | null;
  author_name?: string;
  updated_at: string;
}

interface BiblePanelProps {
  role: string;
  onOpenDocument: (doc: BibleDocument) => void;
  onNewDocument?: () => void;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3.6e6);
  const d = Math.floor(diff / 86.4e6);
  if (h < 1)  return 'moments ago';
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 86_400_000 * 2; // 48h
}

function readTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function parseTags(tagsJson: string): string[] {
  try { return JSON.parse(tagsJson) || []; }
  catch { return []; }
}

// ── Tag color palette ─────────────────────────────────────────────────────────
const TAG_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  estrategia: { bg: 'rgba(249,17,23,0.1)',   color: '#f91117', border: 'rgba(249,17,23,0.25)' },
  operaciones: { bg: 'rgba(212,119,44,0.1)', color: '#d4772c', border: 'rgba(212,119,44,0.25)' },
  finanzas:    { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  rrhh:        { bg: 'rgba(168,85,247,0.1)', color: '#a855f7', border: 'rgba(168,85,247,0.25)' },
  legal:       { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  marketing:   { bg: 'rgba(236,72,153,0.1)', color: '#ec4899', border: 'rgba(236,72,153,0.25)' },
};
function tagStyle(tag: string) {
  const key = tag.toLowerCase().replace(/\s+/g, '');
  return TAG_COLORS[key] ?? { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.12)' };
}

const PRESET_TAGS = ['estrategia', 'operaciones', 'finanzas', 'RRHH', 'legal', 'marketing'];

// ── Tag Pill ──────────────────────────────────────────────────────────────────
function TagPill({ tag, small = false }: { tag: string; small?: boolean }) {
  const s = tagStyle(tag);
  return (
    <span style={{
      fontSize: small ? 8 : 9, fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: small ? '2px 6px' : '2px 8px',
      borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      flexShrink: 0,
    }}>{tag}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function BiblePanel({ role, onOpenDocument, onNewDocument }: BiblePanelProps) {
  const isCEO = role === 'ceo';
  const [docs,          setDocs]         = useState<BibleDocument[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState('');
  const [search,        setSearch]       = useState('');
  const [activeTag,     setActiveTag]    = useState<string | null>(null);
  const [pinning,       setPinning]      = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ese/documents');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDocs(data.documents ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    function handleSSE(e: CustomEvent) {
      if (e.detail?.type === 'doc_published') fetchDocs();
    }
    window.addEventListener('ese-sse-event', handleSSE as EventListener);
    return () => window.removeEventListener('ese-sse-event', handleSSE as EventListener);
  }, [fetchDocs]);

  async function handlePin(e: React.MouseEvent, slug: string) {
    e.stopPropagation();
    setPinning(slug);
    try {
      await fetch('/api/ese/pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      await fetchDocs();
    } finally { setPinning(null); }
  }

  // Collect all unique tags from all docs
  const allTags = Array.from(new Set(docs.flatMap(d => parseTags(d.tags))));

  const filtered = docs.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.summary ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || parseTags(d.tags).includes(activeTag);
    return matchSearch && matchTag;
  });

  const accent = '#d4772c';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#080808' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, padding: '20px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `${accent}12`, border: `1px solid ${accent}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>📋</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent }}>
              Executive Sync Engine
            </p>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Team Playbook
            </h2>
          </div>
          {isCEO && (
            <button
              onClick={onNewDocument}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 9,
                background: accent, border: 'none',
                color: '#fff', fontSize: 10.5, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.05em',
                boxShadow: `0 0 16px ${accent}40`,
              }}
            >+ New doc</button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px 9px 36px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 9, color: '#fff', fontSize: 12,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.3 }}>🔍</span>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <button
              onClick={() => setActiveTag(null)}
              style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '3px 9px', borderRadius: 100, cursor: 'pointer', border: 'none',
                background: !activeTag ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                color: !activeTag ? '#fff' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.15s',
              }}
            >All</button>
            {allTags.map(tag => {
              const s = tagStyle(tag);
              const active = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTag(active ? null : tag)}
                  style={{
                    fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '3px 9px', borderRadius: 100, cursor: 'pointer',
                    background: active ? s.bg : 'rgba(255,255,255,0.04)',
                    color: active ? s.color : 'rgba(255,255,255,0.35)',
                    border: `1px solid ${active ? s.border : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.15s',
                  }}
                >{tag}</button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Document list ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
            Loading documents...
          </div>
        )}
        {error && (
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(249,17,23,0.08)', border: '1px solid rgba(249,17,23,0.2)' }}>
            <p style={{ color: '#f91117', fontSize: 11 }}>⚠ {error}</p>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
              {search ? 'No results' : activeTag ? `No docs tagged "${activeTag}"` : isCEO ? 'The Playbook is empty' : 'No published documents yet'}
            </p>
            {isCEO && !search && !activeTag && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
                Create your first document with + New doc
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(doc => {
            const tags = parseTags(doc.tags);
            const mins = readTime(doc.content);
            const isPinned = !!doc.pinned;

            return (
              <div
                key={doc.slug}
                onClick={() => onOpenDocument(doc)}
                style={{
                  padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  background: isPinned ? 'rgba(212,119,44,0.05)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPinned ? 'rgba(212,119,44,0.25)' : isNew(doc.updated_at) ? accent + '30' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 0.2s', position: 'relative',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isPinned ? 'rgba(212,119,44,0.09)' : 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isPinned ? 'rgba(212,119,44,0.05)' : 'rgba(255,255,255,0.03)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: isPinned ? 'rgba(212,119,44,0.15)' : `${accent}10`,
                    border: `1px solid ${isPinned ? 'rgba(212,119,44,0.3)' : `${accent}20`}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>{isPinned ? '📌' : '📄'}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.title}
                      </p>
                      {isPinned && (
                        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', padding: '1px 6px', borderRadius: 100, background: 'rgba(212,119,44,0.2)', border: '1px solid rgba(212,119,44,0.4)', color: '#d4772c', flexShrink: 0 }}>
                          PINNED
                        </span>
                      )}
                      {isNew(doc.updated_at) && (
                        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', padding: '1px 6px', borderRadius: 100, background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, flexShrink: 0 }}>
                          NEW
                        </span>
                      )}
                      {isCEO && !doc.published && (
                        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', padding: '1px 6px', borderRadius: 100, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                          DRAFT
                        </span>
                      )}
                    </div>

                    {/* AI Summary */}
                    {doc.summary && (
                      <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, marginBottom: 5, fontStyle: 'italic' }}>
                        {doc.summary.length > 120 ? doc.summary.slice(0, 117) + '...' : doc.summary}
                      </p>
                    )}

                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                        v{doc.version} · {timeAgo(doc.updated_at)} · {doc.author_name ?? 'Ian Harris'}
                      </p>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>📖 ~{mins} min</span>

                      {/* Tags */}
                      {tags.map(tag => <TagPill key={tag} tag={tag} small />)}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    {/* Pin button (CEO only) */}
                    {isCEO && (
                      <button
                        onClick={e => handlePin(e, doc.slug)}
                        title={isPinned ? 'Unpin document' : 'Pin document'}
                        style={{
                          width: 26, height: 26, borderRadius: 7, border: 'none',
                          background: isPinned ? 'rgba(212,119,44,0.15)' : 'rgba(255,255,255,0.05)',
                          color: isPinned ? '#d4772c' : 'rgba(255,255,255,0.2)',
                          fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: pinning === doc.slug ? 0.5 : 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#d4772c')}
                        onMouseLeave={e => (e.currentTarget.style.color = isPinned ? '#d4772c' : 'rgba(255,255,255,0.2)')}
                      >📌</button>
                    )}
                    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth={2} style={{ marginTop: 2 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
