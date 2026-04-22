'use client';

// ─────────────────────────────────────────────────────────────────────────────
// BiblePanel — CEO's Playbook document library
// El equipo puede leer; solo el CEO puede crear/editar/publicar
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

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

interface BiblePanelProps {
  role: string;
  onOpenDocument: (doc: BibleDocument) => void;
  onNewDocument?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3.6e6);
  const d = Math.floor(diff / 86.4e6);
  if (h < 1)  return 'hace unos minutos';
  if (h < 24) return `hace ${h}h`;
  if (d < 7)  return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 86_400_000 * 2; // 48h
}

export function BiblePanel({ role, onOpenDocument, onNewDocument }: BiblePanelProps) {
  const isCEO = role === 'ceo';
  const [docs,    setDocs]    = useState<BibleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

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

  // Listen for SSE doc_published to refresh the list
  useEffect(() => {
    function handleSSE(e: CustomEvent) {
      if (e.detail?.type === 'doc_published') fetchDocs();
    }
    window.addEventListener('ese-sse-event', handleSSE as EventListener);
    return () => window.removeEventListener('ese-sse-event', handleSSE as EventListener);
  }, [fetchDocs]);

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const accent = '#d4772c';

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#080808',
    }}>
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0, padding: '20px 22px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `${accent}12`, border: `1px solid ${accent}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>📚</div>
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
            >+ Nuevo doc</button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar documentos..."
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
      </div>

      {/* ── Document list ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
            Cargando documentos...
          </div>
        )}
        {error && (
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(249,17,23,0.08)', border: '1px solid rgba(249,17,23,0.2)' }}>
            <p style={{ color: '#f91117', fontSize: 11 }}>⚠ {error}</p>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
              {search ? 'Sin resultados' : isCEO ? 'The Playbook is empty' : 'No published documents yet'}
            </p>
            {isCEO && !search && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
                Crea tu primer documento con el botón + Nuevo doc
              </p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(doc => (
            <div
              key={doc.slug}
              onClick={() => onOpenDocument(doc)}
              style={{
                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isNew(doc.updated_at) ? accent + '35' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: `${accent}10`, border: `1px solid ${accent}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: '#fff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{doc.title}</p>
                    {isNew(doc.updated_at) && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
                        padding: '1px 6px', borderRadius: 100,
                        background: `${accent}20`, border: `1px solid ${accent}40`, color: accent,
                        flexShrink: 0,
                      }}>NUEVO</span>
                    )}
                    {isCEO && !doc.published && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
                        padding: '1px 6px', borderRadius: 100,
                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.4)', flexShrink: 0,
                      }}>BORRADOR</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    v{doc.version} · {timeAgo(doc.updated_at)} · {doc.author_name ?? 'Ian Harris'}
                  </p>
                </div>
                <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 4 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
