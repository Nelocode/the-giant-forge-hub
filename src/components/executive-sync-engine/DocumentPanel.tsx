'use client';

// ─────────────────────────────────────────────────────────────────────────────
// DocumentPanel — Panel derecho: editor Markdown + renderer en tiempo real
// Modo edición (CEO) y modo vista de solo lectura (equipo)
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { MarkdownImporter } from './MarkdownImporter';

/* ── Markdown → HTML renderer (zero dependencies) ──────────────── */
function parseMarkdown(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr/>')
    // Unordered lists
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Double newline → paragraph break
    .replace(/\n\n/g, '</p><p>')
    // Single newline
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<hr\/>)<\/p>/g, '$1')
    .replace(/<p>(<li>)/g, '<ul><li>')
    .replace(/(<\/li>)<\/p>/g, '$1</ul>');
}

interface DocumentPanelProps {
  isEditable: boolean;           // true = CEO mode, false = team read-only
  documentId: string;
  documentTitle: string;
  documentContent: string;
  onTitleChange: (t: string) => void;
  onContentChange: (c: string) => void;
  isSyncing?: boolean;
  lastSync?: string | null;
}

export function DocumentPanel({
  isEditable,
  documentId,
  documentTitle,
  documentContent,
  onTitleChange,
  onContentChange,
  isSyncing = false,
  lastSync = null,
}: DocumentPanelProps) {
  const [mode, setMode]       = useState<'write' | 'preview' | 'split'>('split');
  const [wordCount, setWc]    = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const words = documentContent.trim().split(/\s+/).filter(Boolean).length;
    setWc(words);
  }, [documentContent]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [documentContent]);

  const onImport = useCallback((content: string, filename: string) => {
    onTitleChange(filename);
    onContentChange(content);
  }, [onTitleChange, onContentChange]);

  const modeBtn = (m: typeof mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        padding: '5px 12px', borderRadius: 7, fontSize: 10.5, fontWeight: 700,
        letterSpacing: '0.06em',
        background: mode === m ? 'rgba(249,17,23,0.14)' : 'transparent',
        border: `1px solid ${mode === m ? 'rgba(249,17,23,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: mode === m ? '#f91117' : 'rgba(255,255,255,0.35)',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#080808',
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        flexShrink: 0, padding: '12px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Doc icon + title indicator */}
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: 'rgba(212,119,44,0.1)',
          border: '1px solid rgba(212,119,44,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="#d4772c" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4772c', marginBottom: 1 }}>
            {isEditable ? 'Documento Ejecutivo · CEO' : 'Documento Recibido · Solo Lectura'}
          </p>
          <p style={{
            fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {documentTitle || 'Sin título'}
          </p>
        </div>

        {/* Word count */}
        <span style={{
          fontSize: 9.5, color: 'rgba(255,255,255,0.22)',
          fontFamily: 'monospace', flexShrink: 0,
        }}>
          {wordCount.toLocaleString()} palabras
        </span>

        {/* Sync badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', borderRadius: 100, flexShrink: 0,
          background: isSyncing ? 'rgba(234,179,8,0.08)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${isSyncing ? 'rgba(234,179,8,0.18)' : 'rgba(16,185,129,0.18)'}`,
        }}>
          {isSyncing ? (
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              border: '1.5px solid rgba(234,179,8,0.5)',
              borderTopColor: '#eab308',
              animation: 'viewer-spin 0.6s linear infinite',
            }}/>
          ) : (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981', display: 'inline-block' }}/>
          )}
          <span style={{
            fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: isSyncing ? '#eab308' : '#10b981',
          }}>
            {isSyncing ? 'Sincronizando' : lastSync ? `Sincronizado` : 'En vivo'}
          </span>
        </div>

        {/* View mode toggles */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {modeBtn('write', '✏ Editar')}
          {modeBtn('split', '⊟ Dividido')}
          {modeBtn('preview', '👁 Vista previa')}
        </div>
      </div>

      {/* ── Title input (CEO only) ── */}
      {isEditable && (
        <div style={{ flexShrink: 0, padding: '12px 20px 0' }}>
          <input
            type="text"
            value={documentTitle}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="Título del documento..."
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', color: '#fff',
              fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* ── Import bar (CEO only) ── */}
      {isEditable && !documentContent && (
        <div style={{ flexShrink: 0, padding: '10px 20px 0' }}>
          <MarkdownImporter onImport={onImport} />
        </div>
      )}

      {/* ── Content area ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: mode === 'split' ? '1fr 1fr' : '1fr',
        overflow: 'hidden',
      }}>
        {/* Editor pane */}
        {(mode === 'write' || mode === 'split') && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            borderRight: mode === 'split' ? '1px solid rgba(255,255,255,0.06)' : 'none',
            overflow: 'hidden',
          }}>
            {mode === 'split' && (
              <div style={{
                flexShrink: 0, padding: '6px 14px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
                  Markdown
                </span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={documentContent}
              onChange={e => {
                if (isEditable) onContentChange(e.target.value);
              }}
              readOnly={!isEditable}
              placeholder={isEditable
                ? '# Tu documento ejecutivo\n\nEmpieza a escribir en Markdown o importa un archivo .md arriba...'
                : 'Esperando documento del CEO...'}
              className="no-scrollbar"
              style={{
                flex: 1, padding: '18px 20px',
                background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                color: 'rgba(255,255,255,0.82)', fontSize: 13.5, lineHeight: 1.75,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                caretColor: '#f91117',
                overflowY: 'auto',
              }}
            />
          </div>
        )}

        {/* Preview pane */}
        {(mode === 'preview' || mode === 'split') && (
          <div style={{
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {mode === 'split' && (
              <div style={{
                flexShrink: 0, padding: '6px 14px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
                  Vista previa
                </span>
              </div>
            )}
            <div
              className="no-scrollbar exec-doc-preview"
              style={{
                flex: 1, overflowY: 'auto',
                padding: '18px 24px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 14, lineHeight: 1.8,
              }}
              dangerouslySetInnerHTML={{ __html: documentContent
                ? parseMarkdown(documentContent)
                : '<p style="color:rgba(255,255,255,0.2);font-style:italic">El documento aparecerá aquí...</p>'
              }}
            />
          </div>
        )}
      </div>

      {/* ── Import shortcut (when document has content) ── */}
      {isEditable && documentContent && (
        <div style={{
          flexShrink: 0,
          padding: '8px 18px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={() => {
              if (confirm('¿Reemplazar el contenido actual con un archivo importado?')) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.md,.markdown';
                input.onchange = (e: Event) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    onImport(ev.target?.result as string, file.name.replace(/\.(md|markdown)$/i, ''));
                  };
                  reader.readAsText(file);
                };
                input.click();
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.22)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.07em', transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#d4772c'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.22)'; }}
          >
            <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Importar otro archivo
          </button>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>
            {documentId}
          </span>
        </div>
      )}

      {/* ── Preview styles ── */}
      <style>{`
        .exec-doc-preview h1 {
          font-size: 26px; font-weight: 900; letter-spacing: -0.03em;
          color: #fff; margin: 0 0 16px; line-height: 1.15;
          border-bottom: 2px solid rgba(249,17,23,0.25); padding-bottom: 10px;
        }
        .exec-doc-preview h2 {
          font-size: 19px; font-weight: 800; letter-spacing: -0.02em;
          color: #f0f0f0; margin: 24px 0 10px;
        }
        .exec-doc-preview h3 {
          font-size: 15px; font-weight: 700;
          color: rgba(255,255,255,0.8); margin: 18px 0 8px;
        }
        .exec-doc-preview p {
          margin: 0 0 14px; color: rgba(255,255,255,0.78);
        }
        .exec-doc-preview strong { color: #fff; font-weight: 700; }
        .exec-doc-preview em { color: rgba(255,255,255,0.65); font-style: italic; }
        .exec-doc-preview code {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          padding: 1px 6px; border-radius: 5px;
          font-family: "JetBrains Mono", monospace; font-size: 12px;
          color: #d4772c;
        }
        .exec-doc-preview a {
          color: #f91117; text-decoration: underline;
          text-underline-offset: 3px;
        }
        .exec-doc-preview blockquote {
          border-left: 3px solid #d4772c; padding-left: 14px;
          color: rgba(255,255,255,0.5); font-style: italic; margin: 14px 0;
        }
        .exec-doc-preview hr {
          border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0;
        }
        .exec-doc-preview ul, .exec-doc-preview ol {
          padding-left: 20px; margin: 0 0 14px;
        }
        .exec-doc-preview li {
          color: rgba(255,255,255,0.78); margin-bottom: 5px;
        }
        .exec-doc-preview li::marker {
          color: #f91117;
        }
      `}</style>
    </div>
  );
}
