'use client';

// ─────────────────────────────────────────────────────────────────────────────
// NotificationToast — Aparece cuando el CEO publica un documento
// Se conecta al receiver SSE y escucha eventos doc_published
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

interface ToastData {
  title:   string;
  message: string;
  slug:    string;
  version: number;
}

interface NotificationToastProps {
  onViewDocument: (slug: string) => void;
}

export function NotificationToast({ onViewDocument }: NotificationToastProps) {
  const [toast, setToast]   = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for doc_published events from the SSE stream
    function handleSSE(event: CustomEvent<any>) {
      const data = event.detail;
      if (data?.type === 'doc_published') {
        setToast({
          title:   data.title,
          message: data.message ?? `Ian Harris publicó una actualización — v${data.version}`,
          slug:    data.slug,
          version: data.version,
        });
        setVisible(true);
        // Auto-dismiss after 8 seconds
        setTimeout(() => setVisible(false), 8000);
      }
    }

    window.addEventListener('ese-sse-event', handleSSE as EventListener);
    return () => window.removeEventListener('ese-sse-event', handleSSE as EventListener);
  }, []);

  if (!toast || !visible) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999999,
        width: 340,
        background: '#0d0d0d',
        border: '1px solid rgba(212,119,44,0.4)',
        borderRadius: 14,
        boxShadow: '0 0 40px rgba(212,119,44,0.15), 0 16px 32px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        animation: 'toast-in 0.4s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Amber top accent */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, #d4772c, #f91117)' }}/>

      <div style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(212,119,44,0.12)',
            border: '1px solid rgba(212,119,44,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, flexShrink: 0,
          }}>📡</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#d4772c' }}>
              Biblia del Equipo — Actualización
            </p>
            <p style={{
              fontSize: 12.5, fontWeight: 800, color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {toast.title}
            </p>
          </div>
          <button
            onClick={() => setVisible(false)}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
              fontSize: 16, cursor: 'pointer', padding: 4, flexShrink: 0,
            }}
          >×</button>
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 12, lineHeight: 1.5 }}>
          {toast.message}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setVisible(false)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.45)', fontSize: 10.5, fontWeight: 600,
              cursor: 'pointer',
            }}
          >Más tarde</button>
          <button
            onClick={() => { setVisible(false); onViewDocument(toast.slug); }}
            style={{
              flex: 2, padding: '7px 0', borderRadius: 8,
              background: '#d4772c', border: 'none',
              color: '#fff', fontSize: 10.5, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >Ver documento →</button>
        </div>
      </div>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Helper: dispatch SSE events globally so NotificationToast can listen ──
export function dispatchEseEvent(data: any) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ese-sse-event', { detail: data }));
}
