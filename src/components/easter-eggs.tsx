'use client';

/* ══════════════════════════════════════════════════════════════
   THE GIANT FORGE — Easter Eggs & Guiños Culturales
   Cu · #29 · Mocoa, Colombia 🇨🇴 → TSX 🇨🇦
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react';

/* ── Konami sequence ──────────────────────────────────────── */
const KONAMI = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
  'b','a',
];

/* ── Pre-defined Cu particle positions (avoids hydration mismatch) ── */
const CU_PARTICLES = [
  { x:  6, y: 10, size: 22, delay: 0.00, dur: 2.6, opacity: 0.55 },
  { x: 18, y:  4, size: 14, delay: 0.18, dur: 2.2, opacity: 0.40 },
  { x: 31, y: 16, size: 18, delay: 0.08, dur: 2.9, opacity: 0.50 },
  { x: 47, y:  6, size: 26, delay: 0.28, dur: 2.4, opacity: 0.60 },
  { x: 62, y: 12, size: 16, delay: 0.05, dur: 3.0, opacity: 0.45 },
  { x: 76, y:  5, size: 20, delay: 0.35, dur: 2.7, opacity: 0.55 },
  { x: 88, y: 14, size: 24, delay: 0.12, dur: 2.5, opacity: 0.50 },
  { x:  4, y: 72, size: 18, delay: 0.40, dur: 2.8, opacity: 0.45 },
  { x: 22, y: 80, size: 12, delay: 0.22, dur: 3.1, opacity: 0.35 },
  { x: 38, y: 76, size: 22, delay: 0.10, dur: 2.6, opacity: 0.55 },
  { x: 54, y: 82, size: 16, delay: 0.32, dur: 2.3, opacity: 0.40 },
  { x: 70, y: 68, size: 20, delay: 0.06, dur: 2.9, opacity: 0.50 },
  { x: 84, y: 75, size: 28, delay: 0.25, dur: 2.1, opacity: 0.60 },
  { x:  2, y: 42, size: 13, delay: 0.50, dur: 3.2, opacity: 0.35 },
  { x: 96, y: 48, size: 17, delay: 0.14, dur: 2.7, opacity: 0.45 },
  { x: 42, y: 55, size: 30, delay: 0.00, dur: 2.0, opacity: 0.65 }, // centre
  { x: 14, y: 38, size: 11, delay: 0.60, dur: 3.3, opacity: 0.30 },
  { x: 66, y: 32, size: 15, delay: 0.30, dur: 2.8, opacity: 0.40 },
  { x: 92, y: 58, size: 19, delay: 0.04, dur: 2.5, opacity: 0.50 },
  { x: 28, y: 52, size: 23, delay: 0.44, dur: 2.3, opacity: 0.55 },
];

/* ══════════════════════════════════════════════════════════════
   COPPER RUSH OVERLAY
   ══════════════════════════════════════════════════════════════ */
export function CopperRushOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'none',
        animation: 'copper-rush-bg 3.8s ease-in-out forwards',
      }}
    >
      {/* Background vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(212,119,44,0.12) 0%, transparent 70%)',
        animation: 'copper-rush-vignette 3.8s ease-in-out forwards',
      }}/>

      {/* Floating Cu particles */}
      {CU_PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            fontWeight: 900,
            fontFamily: 'monospace',
            color: `rgba(212,119,44,${p.opacity})`,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            animation: `copper-particle ${p.dur}s ${p.delay}s ease-out both`,
            userSelect: 'none',
          }}
        >
          Cu
        </div>
      ))}

      {/* Centre banner */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        animation: 'copper-banner 3.8s ease-in-out forwards',
      }}>
        {/* Glow ring */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 260, height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,119,44,0.2) 0%, transparent 70%)',
          filter: 'blur(20px)',
          animation: 'copper-banner 3.8s ease-in-out forwards',
        }}/>

        {/* Element symbol */}
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.4em',
          textTransform: 'uppercase', color: 'rgba(212,119,44,0.6)',
          marginBottom: 6, fontFamily: 'monospace',
        }}>
          Cu · Elemento #29
        </div>

        {/* Main text */}
        <div style={{
          fontSize: 72, fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1,
          background: 'linear-gradient(135deg, #f91117 0%, #d4772c 45%, #e8945a 75%, #f0b870 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 30px rgba(212,119,44,0.7))',
        }}>
          ¡COBRE!
        </div>

        {/* Sub info */}
        <div style={{
          marginTop: 10, fontSize: 13, fontWeight: 600,
          color: 'rgba(212,119,44,0.75)', letterSpacing: '0.08em',
        }}>
          63.546 u · Peso Atómico
        </div>
        <div style={{
          marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.06em',
        }}>
          🇨🇴 Mocoa, Colombia → 🌎 → 🇨🇦 TSX · TSXV
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION
   ══════════════════════════════════════════════════════════════ */
export function EggToast({
  message,
  icon,
  onDone,
}: {
  message: string;
  icon?: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', bottom: 80, right: 24, zIndex: 9998,
        background: 'rgba(12,12,12,0.97)',
        border: '1px solid rgba(212,119,44,0.35)',
        borderRadius: 12, padding: '12px 18px',
        boxShadow: '0 0 40px rgba(212,119,44,0.12), 0 8px 32px rgba(0,0,0,0.7)',
        animation: 'egg-toast-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards',
        maxWidth: 340, display: 'flex', alignItems: 'flex-start', gap: 10,
      }}
    >
      {icon && (
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      )}
      <p style={{
        fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.82)',
        lineHeight: 1.55, margin: 0,
      }}>
        {message}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOOK — useEasterEggs
   ══════════════════════════════════════════════════════════════ */
export function useEasterEggs() {
  const [copperRush, setCopperRush]   = useState(false);
  const [toast, setToast]             = useState<{ msg: string; icon?: string } | null>(null);
  const konamiRef                     = useRef<string[]>([]);
  const titleClicksRef                = useRef(0);
  const titleTimerRef                 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tintoFiredRef                 = useRef(false);

  /* ── Console easter egg — fires once on mount ── */
  useEffect(() => {
    // Only in browser
    if (typeof window === 'undefined') return;
    console.log(
      '%c\n' +
      '  ██████╗██╗   ██╗    ██╗ ██████╗ ██████╗ \n' +
      ' ██╔════╝██║   ██║   ██╔╝██╔════╝ ╚════██╗\n' +
      ' ██║     ██║   ██║  ██╔╝ ╚█████╗   █████╔╝\n' +
      ' ██║  ██╗██║   ██║ ██╔╝   ╚═══██╗  ╚═══██╗\n' +
      ' ╚██████╔╝╚██████╔╝██╔╝   ██████╔╝ ██████╔╝\n' +
      '  ╚═════╝  ╚═════╝ ╚═╝    ╚═════╝  ╚═════╝ \n' +
      '\n' +
      '  THE  GIANT  FORGE  ·  Hub de Herramientas\n' +
      '  ─────────────────────────────────────────\n' +
      '  Cu  ·  Atomic #29  ·  63.546 u\n' +
      '  📍 Mocoa, Colombia 🇨🇴  —  1°09\'N  76°38\'W\n' +
      '  🇨🇦 Listado en TSXV · TSX · CGNT.V · OCG.TO\n' +
      '  Hecho con ❤️  por el equipo de Copper Giant\n' +
      '  ─────────────────────────────────────────\n',
      'color: #d4772c; font-family: monospace; font-size: 11px; line-height: 1.3;',
    );
    console.log(
      '%c🔍 Pista: intenta ↑↑↓↓←→←→BA 👀',
      'color: rgba(212,119,44,0.45); font-size: 9px; font-family: monospace;',
    );
  }, []);

  /* ── Konami Code listener ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      konamiRef.current = [...konamiRef.current, e.key].slice(-KONAMI.length);
      if (konamiRef.current.join(',') === KONAMI.join(',')) {
        setCopperRush(true);
        konamiRef.current = [];
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Hora del tinto — 3:00 pm Colombia (UTC-5) ── */
  useEffect(() => {
    function checkTinto() {
      const now = new Date();
      const colombiaHour = (now.getUTCHours() - 5 + 24) % 24;
      const colombiaMin  = now.getUTCMinutes();
      if (colombiaHour === 15 && colombiaMin === 0 && !tintoFiredRef.current) {
        tintoFiredRef.current = true;
        setToast({ msg: 'Hora del tinto — pausa de 5 minutos. El equipo lo merece 🫂', icon: '☕' });
        // Reset so it can fire again tomorrow
        setTimeout(() => { tintoFiredRef.current = false; }, 60_000);
      }
    }
    const interval = setInterval(checkTinto, 30_000);
    return () => clearInterval(interval);
  }, []);

  /* ── Title click ×7 ── */
  const onTitleClick = useCallback(() => {
    titleClicksRef.current += 1;
    clearTimeout(titleTimerRef.current);
    if (titleClicksRef.current >= 7) {
      setToast({
        msg: 'Cu · #29 · 63.546 u · Forjado en Mocoa, Colombia 🇨🇴 y operando en Canadá 🇨🇦',
        icon: '⚗️',
      });
      titleClicksRef.current = 0;
    } else if (titleClicksRef.current === 3) {
      // Tiny hint at 3 clicks
      setToast({ msg: '...', icon: '🔍' });
      titleTimerRef.current = setTimeout(() => { titleClicksRef.current = 0; }, 4000);
    } else {
      titleTimerRef.current = setTimeout(() => { titleClicksRef.current = 0; }, 2000);
    }
  }, []);

  /* ── Uptime click — small Canadian nod ── */
  const onUptimeClick = useCallback(() => {
    setToast({ msg: 'Sistema 100% operativo — eh? 🍁', icon: '🇨🇦' });
  }, []);

  return {
    copperRush,
    stopCopperRush: () => setCopperRush(false),
    toast,
    clearToast:     () => setToast(null),
    onTitleClick,
    onUptimeClick,
  };
}
