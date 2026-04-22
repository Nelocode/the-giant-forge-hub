'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ExecutiveSyncCard — Bento card para el dashboard del Hub
// Muestra estado del último documento y CTA para abrir el editor completo
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ExecutiveSyncLayout } from './ExecutiveSyncLayout';
import { useSyncReceiver } from './hooks/useSyncReceiver';
import type { Session } from 'next-auth';

interface ExecutiveSyncCardProps {
  session: Session;
}

export function ExecutiveSyncCard({ session }: ExecutiveSyncCardProps) {
  const [open, setOpen] = useState(false);
  const [hov,  setHov]  = useState(false);
  const { document: liveDoc, isConnected } = useSyncReceiver();

  const accent = '#d4772c';
  const glow   = 'rgba(212,119,44,0.15)';

  return (
    <div
      className="h-full flex flex-col select-none"
      style={{
        background: '#0b0b0b',
        border: `1px solid ${hov ? accent + '50' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14, overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hov ? `0 0 36px ${glow}` : '0 2px 12px rgba(0,0,0,0.4)',
        position: 'relative',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Accent top bar */}
      <div style={{
        height: 2, flexShrink: 0,
        background: `linear-gradient(90deg, transparent, ${accent} 40%, ${accent}88 100%)`,
        opacity: hov ? 1 : 0.5, transition: 'opacity 0.3s',
      }}/>

      {/* Visual area */}
      <div style={{
        flex: 1, minHeight: 72,
        overflow: 'hidden', position: 'relative',
        background: `linear-gradient(150deg, #0e0e0e 0%, ${accent}07 70%, ${accent}14 100%)`,
        display: 'flex', flexDirection: 'column', padding: '12px 14px 10px',
      }}>
        {/* Ghost icon */}
        <div style={{
          position: 'absolute', bottom: -6, right: -6,
          width: '60%', height: '60%', color: accent,
          opacity: hov ? 0.09 : 0.04, transition: 'opacity 0.4s',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${accent}18 1px, transparent 1px)`,
          backgroundSize: '18px 18px',
          opacity: hov ? 0.6 : 0.22, transition: 'opacity 0.4s',
        }}/>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: `${accent}18`, border: `1px solid ${accent}30`,
            color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7,
            boxShadow: hov ? `0 0 14px ${glow}` : 'none', transition: 'box-shadow 0.3s',
          }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Live badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 100,
            background: isConnected ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isConnected ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <span style={{
              width: 4.5, height: 4.5, borderRadius: '50%',
              background: isConnected ? '#10b981' : 'rgba(255,255,255,0.2)',
              boxShadow: isConnected ? '0 0 4px #10b981' : 'none',
              animation: isConnected ? 'pulse-status 2s infinite' : 'none',
              display: 'inline-block',
            }}/>
            <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isConnected ? '#10b981' : 'rgba(255,255,255,0.22)' }}>
              {isConnected ? 'En vivo' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Live document preview */}
        <div style={{ flex: 1, minHeight: 0, zIndex: 1, marginTop: 10 }}>
          {liveDoc ? (
            <>
              <p style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: accent, marginBottom: 3,
              }}>
                Último documento recibido
              </p>
              <p style={{
                fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4,
              }}>
                {liveDoc.title || 'Sin título'}
              </p>
              <p style={{
                fontSize: 10.5, color: 'rgba(255,255,255,0.32)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {liveDoc.content?.slice(0, 120) || '(sin contenido)'}
              </p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 5 }}>
                por {liveDoc.authorName} · v{liveDoc.version}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, opacity: 0.7 }}>
                Sync Engine
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.55, marginTop: 4 }}>
                Esperando documentos del CEO en tiempo real...
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        flexShrink: 0, padding: '10px 14px 13px',
        borderTop: '1px solid rgba(255,255,255,0.055)',
        background: '#0a0a0a',
      }}>
        <h3 style={{
          fontSize: 15, fontWeight: 800, letterSpacing: '-0.025em',
          color: '#fff', marginBottom: 3,
        }}>
          Executive Sync
        </h3>
        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.45, marginBottom: 10,
        }}>
          Redacta y sincroniza documentos con IA al equipo en tiempo real.
        </p>
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={() => setOpen(true)}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 9,
            background: hov ? accent : 'rgba(255,255,255,0.05)',
            border: `1px solid ${hov ? accent : 'rgba(255,255,255,0.09)'}`,
            color: hov ? '#fff' : 'rgba(255,255,255,0.38)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: hov ? `0 0 20px ${glow}` : 'none',
          }}
        >
          Abrir editor ✍
        </button>
      </div>

      {/* Full-screen layout via portal */}
      {open && (
        <ExecutiveSyncLayout
          session={session}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
