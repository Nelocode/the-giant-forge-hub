// @ts-nocheck
'use client';

/* ─────────────────────────────────────────────────────────────
   The Giant Forge — Hub principal
   Bento draggable + resizable · Tarjetas limpias y elegantes
   ───────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from 'next-auth';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { ReactGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { getInitials } from '@/lib/utils';
import { useEasterEggs, CopperRushOverlay, EggToast } from './easter-eggs';
import { EventChecklistCard } from './event-checklist-card';

/* ── Tool definitions ─────────────────────────────────────── */
interface Tool {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  url: string;
  status: 'live' | 'maintenance' | 'offline';
  accent: string;
  glow: string;
  badge: string;
  icon: React.ReactNode;
}

const TOOLS: Tool[] = [
  {
    id: 'copper-monitor',
    name: 'Copper Monitor',
    eyebrow: 'IR Terminal',
    description: 'Datos de mercado en tiempo real para CGNT.V y OCG.TO.',
    url: 'https://soluciones-copper-monitor.vz27dz.easypanel.host',
    status: 'live',
    accent: '#f91117',
    glow: 'rgba(249,17,23,0.15)',
    badge: 'TSXV · TSX',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
        <path d="M3 17 L7 11 L12 14 L17 7 L21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="21" cy="10" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'videopanel',
    name: 'VideoPanel',
    eyebrow: 'AI Video Analysis',
    description: 'IA que extrae insights de videos del CEO listos para publicar.',
    url: 'https://soluciones-videopanel.vz27dz.easypanel.host',
    status: 'live',
    accent: '#d4772c',
    glow: 'rgba(212,119,44,0.15)',
    badge: 'Gemini AI',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="2" y="6" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M17 9.5 L22 7 L22 17 L17 14.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M8 11.5 L8 9.5 L11.5 11.5 L8 13.5 Z" fill="currentColor"/>
      </svg>
    ),
  },
];

const STATUS_CFG = {
  live:        { label: 'En Vivo',       dot: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)' },
  maintenance: { label: 'Mantenimiento', dot: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.2)' },
  offline:     { label: 'Offline',       dot: '#f91117', bg: 'rgba(249,17,23,0.1)',   border: 'rgba(249,17,23,0.2)' },
};

/* ── Default layout ───────────────────────────────────────── */
/* ── Layout sizing guide (rowHeight=22, margin=10 → 1 h-unit = 32px)
   ToolCard  footer+accent min ≈ 208px → minH=7 → 214px
   QuickCard 3-items+header min ≈ 165px → minH=6 → 182px
   StatsCard avatar+info+stats min ≈ 195px → minH=7 → 214px
   Calendar  header+event+cta min ≈ 150px → minH=5 → 150px
   Activity  3col×header+rows min ≈ 172px → minH=6 → 182px
───────────────────────────────────────────────────────────────── */
const DEFAULT_LAYOUT = [
  //                              x   y   w   h   minW minH
  { i: 'copper-monitor',   x:0,  y:0,  w:5, h:10, minW:3, minH:7 },
  { i: 'videopanel',       x:5,  y:0,  w:4, h:8,  minW:3, minH:7 },
  { i: 'calendar',         x:9,  y:0,  w:3, h:10, minW:2, minH:5 },
  { i: 'stats',            x:5,  y:8,  w:2, h:7,  minW:2, minH:7 },
  { i: 'quick',            x:7,  y:8,  w:2, h:7,  minW:2, minH:6 },
  { i: 'activity',         x:0,  y:10, w:9, h:7,  minW:4, minH:6 },
  { i: 'event-checklist',  x:9,  y:10, w:3, h:14, minW:3, minH:10 },
];

/* ── Bento catalog (for toggle panel) ─────────────────────── */
const BENTO_CATALOG = [
  { id: 'copper-monitor',  label: 'Copper Monitor',       icon: '📈' },
  { id: 'videopanel',      label: 'VideoPanel',           icon: '🎬' },
  { id: 'calendar',        label: 'Calendario',           icon: '📅' },
  { id: 'stats',           label: 'Mi Perfil',            icon: '👤' },
  { id: 'quick',           label: 'Acceso Rápido',        icon: '⚡' },
  { id: 'activity',        label: 'Estado del Sistema',   icon: '🔧' },
  { id: 'event-checklist', label: 'Checklist de Eventos', icon: '✅' },
] as const;

const ALL_IDS = BENTO_CATALOG.map(b => b.id) as string[];
const VISIBILITY_KEY = 'tgf-bento-visibility-v1';

const LAYOUT_KEY = 'tgf-hub-layout-v11';

/* ══════════════════════════════════════════════════════════════
   SHARED CARD SHELL — base para todas las tarjetas
   ══════════════════════════════════════════════════════════════ */
function CardShell({
  children,
  accent = 'rgba(255,255,255,0.07)',
  glow,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  accent?: string;
  glow?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className={`h-full flex flex-col select-none ${className}`}
      style={{
        background: '#0b0b0b',
        border: `1px solid ${hov && accent !== 'rgba(255,255,255,0.07)' ? accent + '55' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hov && glow ? `0 0 32px ${glow}` : '0 2px 12px rgba(0,0,0,0.4)',
        position: 'relative',
        ...style,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TOOL CARD — diseño limpio, ícono pequeño + info
   ══════════════════════════════════════════════════════════════ */
function ToolCard({ tool }: { tool: Tool }) {
  const [hov, setHov] = useState(false);
  const st = STATUS_CFG[tool.status];

  return (
    <div
      className="h-full flex flex-col select-none"
      style={{
        background: '#0b0b0b',
        border: `1px solid ${hov ? tool.accent + '50' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        boxShadow: hov ? `0 0 36px ${tool.glow}` : '0 2px 12px rgba(0,0,0,0.4)',
        position: 'relative',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* ── Accent top line ── */}
      <div style={{
        height: 2, flexShrink: 0,
        background: `linear-gradient(90deg, transparent 0%, ${tool.accent} 40%, ${tool.accent}88 100%)`,
        opacity: hov ? 1 : 0.5,
        transition: 'opacity 0.3s',
      }}/>

      {/* ── Visual accent area — expands when card is tall, respects minimum ── */}
      <div
        style={{
          flex: 1,
          minHeight: 76,  /* icon(38) + padding-top(14) + eyebrow-margin(14) + eyebrow(10) */
          overflow: 'hidden',
          position: 'relative',
          background: `linear-gradient(150deg, #0e0e0e 0%, ${tool.accent}09 70%, ${tool.accent}16 100%)`,
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 16px 12px',
        }}
      >
        {/* Giant ghost icon — background accent */}
        <div style={{
          position: 'absolute', bottom: -10, right: -10,
          width: '65%', height: '65%',
          color: tool.accent,
          opacity: hov ? 0.10 : 0.055,
          transition: 'opacity 0.4s',
          pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          zIndex: 0,
        }}>
          {tool.icon}
        </div>

        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${tool.accent}18 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          opacity: hov ? 0.6 : 0.25,
          transition: 'opacity 0.4s',
        }}/>

        {/* Subtle glow orb — bottom right */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: '60%', height: '60%', pointerEvents: 'none',
          background: `radial-gradient(ellipse at 80% 80%, ${tool.glow}, transparent 70%)`,
          opacity: hov ? 1 : 0.4,
          transition: 'opacity 0.4s',
        }}/>

        {/* Header row: icon + status badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0, zIndex: 1, marginBottom: 'auto' }}>
          {/* Icon box */}
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `${tool.accent}18`,
            border: `1px solid ${tool.accent}30`,
            color: tool.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8,
            boxShadow: hov ? `0 0 14px ${tool.glow}` : 'none',
            transition: 'box-shadow 0.3s',
            flexShrink: 0,
          }}>
            {tool.icon}
          </div>

          {/* Status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: st.bg, border: `1px solid ${st.border}`,
            borderRadius: 100, padding: '4px 9px',
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            color: st.dot, textTransform: 'uppercase', flexShrink: 0,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: st.dot, flexShrink: 0,
              boxShadow: tool.status === 'live' ? `0 0 5px ${st.dot}` : 'none',
              animation: tool.status === 'live' ? 'pulse-status 2s infinite' : 'none',
            }}/>
            {st.label}
          </div>
        </div>

        {/* Eyebrow */}
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: tool.accent,
          opacity: 0.7, marginTop: 14, zIndex: 1, flexShrink: 0,
        }}>
          {tool.eyebrow}
        </p>
      </div>

      {/* ── Footer — always fixed height, never clips ── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px 14px',
        borderTop: '1px solid rgba(255,255,255,0.055)',
        background: '#0a0a0a',
      }}>
        <h2 style={{
          fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em',
          color: '#fff', lineHeight: 1.15, marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {tool.name}
        </h2>
        <p style={{
          fontSize: 11.5, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5,
          marginBottom: 11,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {tool.description}
        </p>
        <button
          style={{
            width: '100%', padding: '8px 0',
            borderRadius: 9,
            background: hov ? tool.accent : 'rgba(255,255,255,0.05)',
            border: `1px solid ${hov ? tool.accent : 'rgba(255,255,255,0.09)'}`,
            color: hov ? '#fff' : 'rgba(255,255,255,0.38)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: hov ? `0 0 20px ${tool.glow}` : 'none',
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={() => window.open(tool.url, '_blank', 'noopener,noreferrer')}
        >
          Abrir herramienta ↗
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CALENDAR CARD
   ══════════════════════════════════════════════════════════════ */
function CalendarCard({ session }: { session: Session }) {
  const user = session.user as any;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const upcoming = events
    .filter(e => new Date(e.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 6);

  return (
    <div className="h-full flex flex-col" style={{
      background: '#0b0b0b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header — fixed */}
      <div style={{
        padding: '13px 14px 10px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#f91117', marginBottom: 1 }}>Agenda</p>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>Calendario</h3>
        </div>
        <Link
          href="/dashboard/calendar"
          style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', textDecoration: 'none' }}
          className="hover:text-white transition-colors"
          onMouseDown={e => e.stopPropagation()}
        >
          Ver todo →
        </Link>
      </div>

      {/* Body — scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 14px 0' }}>
        {/* Connect Google banner */}
        {!user?.googleAccessToken && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 9, marginBottom: 8, flexShrink: 0,
          }}>
            <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <p style={{ fontSize: 10.5, fontWeight: 600, color: '#fff', flex: 1, lineHeight: 1.3 }}>Conecta Google Calendar</p>
            <button
              style={{ fontSize: 10, fontWeight: 700, background: '#fff', color: '#000', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => signIn('google', { callbackUrl: '/dashboard/calendar' })}
            >
              Conectar
            </button>
          </div>
        )}

        {/* Events list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="no-scrollbar">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} className="shimmer"/>)}
            </div>
          ) : upcoming.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, paddingBottom: 10, opacity: 0.5 }}>
              <svg style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Sin eventos próximos</p>
              <Link href="/dashboard/calendar" style={{ fontSize: 9.5, color: '#f91117' }} className="hover:underline" onMouseDown={e => e.stopPropagation()}>
                + Agregar evento
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {upcoming.map(ev => {
                const d = new Date(ev.start_time);
                return (
                  <div key={ev.id} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                  }}>
                    <div style={{ textAlign: 'center', minWidth: 26, flexShrink: 0 }}>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{d.getDate()}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{ev.title}</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>
                        {ev.all_day ? 'Todo el día' : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: ev.color ?? '#f91117', flexShrink: 0 }}/>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA — fixed */}
      <div style={{ padding: '9px 14px 12px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <Link
          href="/dashboard/calendar"
          style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f91117', textDecoration: 'none' }}
          onMouseDown={e => e.stopPropagation()}
        >
          Ver agenda completa →
        </Link>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STATS CARD — perfil de usuario
   ══════════════════════════════════════════════════════════════ */
function StatsCard({ session }: { session: Session }) {
  const user = session.user as any;
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="h-full flex flex-col" style={{
      background: 'linear-gradient(150deg, #0b0b0b, rgba(212,119,44,0.06))',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Main area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 12px 6px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #f91117, #d4772c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8,
          boxShadow: '0 0 20px rgba(212,119,44,0.25)',
        }}>
          {getInitials(user?.name ?? '')}
        </div>
        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2, flexShrink: 0 }}>{greeting}</p>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 7, lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {user?.name}
        </p>
        <div style={{
          fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '3px 10px', borderRadius: 100, flexShrink: 0,
          background: user?.role === 'admin' ? 'rgba(212,119,44,0.12)' : 'rgba(249,17,23,0.1)',
          color: user?.role === 'admin' ? '#d4772c' : '#f91117',
          border: `1px solid ${user?.role === 'admin' ? 'rgba(212,119,44,0.25)' : 'rgba(249,17,23,0.2)'}`,
        }}>
          {user?.role === 'admin' ? '⚙ Admin' : '◎ Usuario'}
        </div>
      </div>

      {/* Stats footer */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, padding: '0 10px 10px' }}>
        {[{ v: '2', l: 'Tools' }, { v: '3', l: 'Proyectos' }].map(s => (
          <div key={s.l} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '7px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   QUICK ACCESS CARD
   ══════════════════════════════════════════════════════════════ */
function QuickCard({ session }: { session: Session }) {
  const user = session.user as any;
  const items = [
    { label: 'Mi Perfil',   sub: 'Editar cuenta',     href: '/dashboard/profile', color: '#d4772c' },
    { label: 'Calendario',  sub: 'Ver agenda',         href: '/dashboard/calendar', color: '#f91117' },
    ...(user?.role === 'admin' ? [{ label: 'Usuarios', sub: 'Gestionar equipo', href: '/dashboard/admin', color: '#10b981' }] : []),
  ];

  return (
    <div className="h-full flex flex-col" style={{
      background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 13px 8px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 1 }}>Nav</p>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>Acceso Rápido</h3>
      </div>

      {/* Items — fixed height per item, no flex-1 stretch that clips content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }} className="no-scrollbar">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 9, textDecoration: 'none',
              minHeight: 36, flexShrink: 0,  /* fixed height — never collapses */
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div style={{ width: 3, height: 20, borderRadius: 2, background: item.color, flexShrink: 0 }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</p>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACTIVITY — wide bottom card
   ══════════════════════════════════════════════════════════════ */
function ActivityCard({ onUptimeClick }: { onUptimeClick?: () => void }) {
  const services = [
    { name: 'Copper Monitor', desc: 'IR Terminal', dot: '#10b981', time: 'Ahora', url: 'https://soluciones-copper-monitor.vz27dz.easypanel.host' },
    { name: 'VideoPanel',     desc: 'AI Videos',  dot: '#10b981', time: 'Ahora', url: 'https://soluciones-videopanel.vz27dz.easypanel.host' },
    { name: 'Hub',            desc: 'Dashboard',  dot: '#10b981', time: 'Hoy',   url: '#' },
  ];

  const ColHeader = ({ label, title }: { label: string; title: string }) => (
    <div style={{ flexShrink: 0, marginBottom: 10 }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: 1 }}>{label}</p>
      <h3 style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{title}</h3>
    </div>
  );

  return (
    <div className="h-full" style={{
      background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
    }}>

      {/* Left — system status */}
      <div style={{ padding: '13px 14px', borderRight: '1px solid rgba(255,255,255,0.055)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ColHeader label="Sistema" title="Estado" />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {services.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, boxShadow: `0 0 5px ${s.dot}`, flexShrink: 0 }}/>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', flexShrink: 0 }}>{s.time}</span>
            </div>
          ))}
        </div>
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 10, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Uptime</span>
          <span
            style={{ fontSize: 12, fontWeight: 800, color: '#10b981', fontFamily: 'monospace', cursor: onUptimeClick ? 'pointer' : 'default' }}
            onClick={onUptimeClick}
            title=""
          >99.9%</span>
        </div>
      </div>

      {/* Center — quick launch */}
      <div style={{ padding: '13px 14px', borderRight: '1px solid rgba(255,255,255,0.055)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ColHeader label="Lanzamiento Rápido" title="Herramientas" />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TOOLS.map(t => (
            <button
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 9, cursor: 'pointer', textAlign: 'left', flex: 1, minHeight: 0,
                overflow: 'hidden',
              }}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => window.open(t.url, '_blank', 'noopener,noreferrer')}
            >
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${t.accent}15`, border: `1px solid ${t.accent}25`, color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 5 }}>
                {t.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.eyebrow}</p>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>↗</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right — platform info */}
      <div style={{ padding: '13px 14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ColHeader label="Plataforma" title="The Giant Forge" />
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          Hub centralizado para el equipo de Copper Giant. Arrastra las tarjetas para personalizar tu espacio de trabajo.
        </p>
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 8 }}>
          {[{ v: '2', l: 'Apps' }, { v: '100%', l: 'Online' }].map(s => (
            <div key={s.l} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FORGE FOOTER
   ══════════════════════════════════════════════════════════════ */
function ForgeFooter() {
  const [clicked, setClicked] = useState(0);
  const [spark,   setSpark]   = useState(false);

  function handleClick() {
    const next = clicked + 1;
    setClicked(next);
    if (next >= 5) {
      setSpark(true);
      setClicked(0);
      setTimeout(() => setSpark(false), 1800);
    }
  }

  return (
    <div style={{
      marginTop: 32, paddingBottom: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      {/* Divider */}
      <div style={{
        width: '100%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(212,119,44,0.2) 30%, rgba(212,119,44,0.2) 70%, transparent)',
        marginBottom: 10,
      }}/>

      {/* Main footer line */}
      <div
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          cursor: 'default', userSelect: 'none',
          transition: 'opacity 0.2s',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>
          Made with
        </span>
        {/* Animated heart */}
        <span
          style={{
            fontSize: 13,
            display: 'inline-block',
            animation: spark ? 'footer-spark 1.8s ease forwards' : 'footer-heartbeat 2.4s ease-in-out infinite',
            filter: spark ? 'drop-shadow(0 0 8px #f91117)' : 'none',
            transition: 'filter 0.3s',
          }}
        >
          {spark ? '🔥' : '❤️'}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>
          and
        </span>
        {/* Cu element badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 8px', borderRadius: 100,
          background: 'rgba(212,119,44,0.08)',
          border: '1px solid rgba(212,119,44,0.18)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 900, fontFamily: 'monospace', color: '#d4772c', letterSpacing: '-0.02em' }}>Cu</span>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(212,119,44,0.6)' }}>Copper</span>
        </span>
      </div>

      {/* Spark message */}
      {spark && (
        <p style={{
          fontSize: 9.5, color: '#d4772c', letterSpacing: '0.1em',
          fontWeight: 600, opacity: 0.8,
          animation: 'egg-toast-in 0.3s ease forwards',
        }}>
          ¡Cu · #29 · Forjado con fuego! 🔩⚒️
        </p>
      )}

      {/* Subtle coordinates */}
      <p style={{
        fontSize: 8, color: 'rgba(255,255,255,0.1)',
        fontFamily: 'monospace', letterSpacing: '0.08em',
        marginTop: 2,
      }}>
        1°09′N 76°38′W · Mocoa, Colombia → TSX · TSXV
      </p>

      <style>{`
        @keyframes footer-heartbeat {
          0%, 100% { transform: scale(1); }
          14%       { transform: scale(1.18); }
          28%       { transform: scale(1); }
          42%       { transform: scale(1.12); }
          56%       { transform: scale(1); }
        }
        @keyframes footer-spark {
          0%   { transform: scale(1) rotate(0deg); }
          20%  { transform: scale(1.5) rotate(-12deg); }
          50%  { transform: scale(1.2) rotate(8deg); }
          80%  { transform: scale(1.1) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO HEADER
   ══════════════════════════════════════════════════════════════ */
function HeroHeader({ session, onTitleClick }: { session: Session; onTitleClick?: () => void }) {
  return (
    <div style={{ marginBottom: 14, paddingTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ height: 1, width: 20, background: 'linear-gradient(90deg, transparent, #d4772c)' }}/>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#d4772c' }}>
          Copper Giant · Hub de Herramientas
        </span>
        <div style={{ height: 1, width: 20, background: 'linear-gradient(90deg, #d4772c, transparent)' }}/>
      </div>
      <h1
        style={{
          fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900,
          letterSpacing: '-0.04em', lineHeight: 0.95, color: '#fff', marginBottom: 8,
          cursor: 'default', userSelect: 'none',
        }}
        onClick={onTitleClick}
        title="" /* no tooltip giveaway */
      >
        The Giant{' '}
        <span style={{
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          backgroundImage: 'linear-gradient(135deg, #f91117 0%, #d4772c 55%, #e8945a 100%)',
        }}>
          Forge
        </span>
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>
          Poder, tecnología y tus herramientas al alcance de la mano.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'pulse-status 2s infinite', display: 'inline-block' }}/>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#10b981' }}>Sistema Operativo</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN BENTO GRID
   ══════════════════════════════════════════════════════════════ */
export function BentoGrid({ session }: { session: Session }) {
  const [layout,      setLayout]      = useState(DEFAULT_LAYOUT);
  const [mounted,     setMounted]     = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);
  const [showCustom,  setShowCustom]  = useState(false);
  const [visible,     setVisible]     = useState<Set<string>>(new Set(ALL_IDS));
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = 1200;

  useEffect(() => {
    setMounted(true);
    try {
      const savedLayout = localStorage.getItem(LAYOUT_KEY);
      if (savedLayout) {
        const parsed = JSON.parse(savedLayout);
        if (Array.isArray(parsed) && parsed.length > 0) setLayout(parsed);
      }
      const savedVis = localStorage.getItem(VISIBILITY_KEY);
      if (savedVis) {
        const arr = JSON.parse(savedVis);
        if (Array.isArray(arr)) setVisible(new Set(arr));
      }
    } catch {}
  }, []);

  const onLayoutChange = useCallback((newLayout: any[]) => {
    setLayout(newLayout);
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(newLayout)); } catch {}
  }, []);

  function resetLayout() {
    setLayout(DEFAULT_LAYOUT);
    setVisible(new Set(ALL_IDS));
    try {
      localStorage.removeItem(LAYOUT_KEY);
      localStorage.removeItem(VISIBILITY_KEY);
    } catch {}
  }

  function toggleBento(id: string) {
    setVisible(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // keep at least one
        next.delete(id);
      } else {
        next.add(id);
        // Re-add to layout if not already present
        setLayout(lay => {
          if (lay.find(l => l.id === id)) return lay;
          const def = DEFAULT_LAYOUT.find(d => d.i === id);
          if (!def) return lay;
          return [...lay, def];
        });
      }
      try { localStorage.setItem(VISIBILITY_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const eggs = useEasterEggs();

  const CARD_MAP: Record<string, React.ReactNode> = {
    'copper-monitor':  <ToolCard tool={TOOLS[0]} />,
    'videopanel':      <ToolCard tool={TOOLS[1]} />,
    'calendar':        <CalendarCard session={session} />,
    'stats':           <StatsCard session={session} />,
    'quick':           <QuickCard session={session} />,
    'activity':        <ActivityCard onUptimeClick={eggs.onUptimeClick} />,
    'event-checklist': <EventChecklistCard />,
  };

  const visibleLayout = layout.filter(item => visible.has(item.i));

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }} ref={containerRef}>
      {/* Easter egg overlays */}
      {eggs.copperRush && <CopperRushOverlay onDone={eggs.stopCopperRush} />}
      {eggs.toast && <EggToast message={eggs.toast.msg} icon={eggs.toast.icon} onDone={eggs.clearToast} />}

      <HeroHeader session={session} onTitleClick={eggs.onTitleClick} />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
          {isDragging ? '↕ Suelta para colocar' : 'Arrastra · Redimensiona desde las esquinas'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Personalizar button */}
          <button
            onClick={() => setShowCustom(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: showCustom ? '#a855f7' : 'rgba(255,255,255,0.22)',
              background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s',
            }}
          >
            <svg style={{ width: 11, height: 11 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
            Personalizar
          </button>
          {/* Restablecer */}
          <button
            onClick={resetLayout}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#d4772c')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}
          >
            <svg style={{ width: 11, height: 11 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Restablecer
          </button>
        </div>
      </div>

      {/* ── Bento customization panel ── */}
      {showCustom && (
        <div style={{
          marginBottom: 14, padding: '12px 14px',
          background: 'rgba(168,85,247,0.06)',
          border: '1px solid rgba(168,85,247,0.18)',
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a855f7', marginBottom: 10 }}>Personalizar tarjetas visibles</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {BENTO_CATALOG.map(b => {
              const isOn = visible.has(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggleBento(b.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 11px', borderRadius: 100,
                    background: isOn ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isOn ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.09)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{b.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isOn ? '#d8b4fe' : 'rgba(255,255,255,0.38)', transition: 'color 0.2s' }}>{b.label}</span>
                  {/* Toggle indicator */}
                  <div style={{
                    width: 22, height: 12, borderRadius: 6,
                    background: isOn ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: isOn ? 12 : 2,
                      width: 8, height: 8, borderRadius: '50%',
                      background: isOn ? '#fff' : 'rgba(255,255,255,0.35)',
                      transition: 'left 0.2s, background 0.2s',
                    }}/>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ReactGridLayout
        layout={visibleLayout}
        width={containerWidth ?? 1200}
        gridConfig={{
          cols: 12,
          rowHeight: 22,
          margin: [10, 10] as [number, number],
          containerPadding: [0, 0] as [number, number],
        }}
        dragConfig={{
          handle: '.drag-handle',
        }}
        resizeConfig={{
          handles: ['se'],
        }}
        onLayoutChange={onLayoutChange}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        style={{ minHeight: 400 }}
      >
        {visibleLayout.map(item => (
          <div key={item.i} style={{ position: 'relative', height: '100%' }}>
            {/* Drag handle — invisible overlay at top */}
            <div
              className="drag-handle"
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 22,
                zIndex: 10, cursor: isDragging ? 'grabbing' : 'grab',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '0 10px', borderRadius: '14px 14px 0 0',
              }}
            >
              <div style={{ display: 'flex', gap: 3, opacity: 0.15 }}>
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff' }}/>
                ))}
              </div>
            </div>
            {/* Card fills the cell */}
            <div style={{ position: 'absolute', inset: 0 }}>
              {CARD_MAP[item.i]}
            </div>
          </div>
        ))}
      </ReactGridLayout>

      {/* ── Footer ── */}
      <ForgeFooter />
    </div>
  );
}
