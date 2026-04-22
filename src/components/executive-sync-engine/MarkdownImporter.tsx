'use client';

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownImporter — Drag & drop + file input para archivos .md
// El CEO puede importar documentos existentes instantáneamente
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';

interface MarkdownImporterProps {
  onImport: (content: string, filename: string) => void;
}

export function MarkdownImporter({ onImport }: MarkdownImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && file.type !== 'text/plain') {
      setError('Solo se admiten archivos .md o .markdown');
      return;
    }
    if (file.size > 1_000_000) {
      setError('Archivo demasiado grande (máx 1 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      onImport(content, file.name.replace(/\.(md|markdown)$/i, ''));
    };
    reader.onerror = () => setError('Error al leer el archivo');
    reader.readAsText(file, 'UTF-8');
  }, [onImport]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [processFile]);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      style={{
        position: 'relative',
        padding: '16px 20px',
        borderRadius: 12,
        border: `1.5px dashed ${isDragging ? '#d4772c' : 'rgba(255,255,255,0.14)'}`,
        background: isDragging ? 'rgba(212,119,44,0.06)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/plain"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />

      {/* Icon */}
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        borderRadius: 9,
        background: isDragging ? 'rgba(212,119,44,0.18)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isDragging ? 'rgba(212,119,44,0.3)' : 'rgba(255,255,255,0.09)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke={isDragging ? '#d4772c' : 'rgba(255,255,255,0.4)'} strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 700,
          color: isDragging ? '#d4772c' : 'rgba(255,255,255,0.6)',
          marginBottom: 2, transition: 'color 0.2s',
        }}>
          {isDragging ? 'Suelta el archivo aquí' : 'Importar archivo Markdown'}
        </p>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>
          Arrastra un .md o haz clic para seleccionar
        </p>
        {error && (
          <p style={{ fontSize: 10.5, color: '#f91117', marginTop: 3, fontWeight: 600 }}>
            ⚠ {error}
          </p>
        )}
      </div>
    </div>
  );
}
