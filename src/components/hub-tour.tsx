'use client';

// ─────────────────────────────────────────────────────────────────────────────
// HubTour — Tour de burbujas tipo spotlight para el onboarding del Hub
// Se muestra la primera vez que el usuario ingresa al Hub
// Usa posicionamiento relativo al elemento target via getBoundingClientRect
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

const TOUR_KEY = 'tgf-hub-tour-seen-v1';

export function hasHubTourBeenSeen(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TOUR_KEY) === 'true';
}

export function markHubTourSeen() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOUR_KEY, 'true');
}

interface TourStep {
  targetSelector: string; // CSS selector del elemento a destacar
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  icon: string;
  accent: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="logo"]',
    title: 'The Giant\'s Forge Hub',
    description: 'Tu centro de operaciones centralizado. Desde aquí accedes a todas las herramientas del equipo de Copper Giant en un solo lugar.',
    placement: 'bottom',
    icon: '⚡',
    accent: '#f91117',
  },
  {
    targetSelector: '[data-tour="bento-toggle"]',
    title: 'Personaliza tu espacio',
    description: 'Activa o desactiva las tarjetas que ves en el dashboard. Puedes reorganizarlas arrastrándolas y redimensionarlas a tu gusto.',
    placement: 'bottom',
    icon: '🎛',
    accent: '#d4772c',
  },
  {
    targetSelector: '[data-tour="card-copper-monitor"]',
    title: 'Copper Monitor',
    description: 'Datos de mercado en tiempo real de CGNT.V y OCG.TO. Click en "Abrir herramienta" para acceder al terminal IR.',
    placement: 'right',
    icon: '📈',
    accent: '#f91117',
  },
  {
    targetSelector: '[data-tour="card-videopanel"]',
    title: 'VideoPanel AI',
    description: 'Analiza videos del CEO con IA. Extrae insights, transcripciones y contenido listo para publicar en segundos.',
    placement: 'right',
    icon: '🎬',
    accent: '#d4772c',
  },
  {
    targetSelector: '[data-tour="card-executive-sync"]',
    title: 'Executive Sync Engine',
    description: 'El CEO publica documentos estratégicos aquí. El equipo recibe notificaciones en tiempo real y puede leer la "Biblia" del equipo con asistencia de IA.',
    placement: 'top',
    icon: '✍',
    accent: '#d4772c',
  },
  {
    targetSelector: '[data-tour="live-status"]',
    title: '¡Todo en tiempo real!',
    description: 'El indicador LIVE muestra que estás conectado. Recibirás actualizaciones del CEO y del equipo instantáneamente sin recargar la página.',
    placement: 'bottom',
    icon: '🟢',
    accent: '#10b981',
  },
];

interface BubblePos {
  top: number;
  left: number;
  arrowDir: 'up' | 'down' | 'left' | 'right';
}

function getBubblePosition(el: Element, placement: TourStep['placement']): BubblePos {
  const rect = el.getBoundingClientRect();
  const BUBBLE_W = 320;
  const BUBBLE_H = 180;
  const GAP = 16;

  let top = 0, left = 0;
  let arrowDir: BubblePos['arrowDir'] = 'up';

  switch (placement) {
    case 'bottom':
      top  = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - BUBBLE_W / 2;
      arrowDir = 'up';
      break;
    case 'top':
      top  = rect.top - BUBBLE_H - GAP;
      left = rect.left + rect.width / 2 - BUBBLE_W / 2;
      arrowDir = 'down';
      break;
    case 'right':
      top  = rect.top + rect.height / 2 - BUBBLE_H / 2;
      left = rect.right + GAP;
      arrowDir = 'left';
      break;
    case 'left':
      top  = rect.top + rect.height / 2 - BUBBLE_H / 2;
      left = rect.left - BUBBLE_W - GAP;
      arrowDir = 'right';
      break;
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, window.innerWidth  - BUBBLE_W - 12));
  top  = Math.max(12, Math.min(top,  window.innerHeight - BUBBLE_H - 12));

  return { top, left, arrowDir };
}

interface SpotlightRect {
  top: number; left: number; width: number; height: number;
}

export function HubTour({ onDone }: { onDone: () => void }) {
  const [step, setStep]           = useState(0);
  const [pos,  setPos]            = useState<BubblePos | null>(null);
  const [spot, setSpot]           = useState<SpotlightRect | null>(null);
  const [visible, setVisible]     = useState(false);

  const currentStep = TOUR_STEPS[step];

  const updatePosition = useCallback(() => {
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      // Skip step if element not found
      if (step < TOUR_STEPS.length - 1) setStep(s => s + 1);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPos(getBubblePosition(el, currentStep.placement));
    setSpot({ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 });
    setVisible(true);
  }, [currentStep, step]);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(updatePosition, 150); // small delay for render
    return () => clearTimeout(t);
  }, [step, updatePosition]);

  useEffect(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      markHubTourSeen();
      onDone();
    }
  };

  const handleSkip = () => {
    markHubTourSeen();
    onDone();
  };

  const accent = currentStep.accent;

  return (
    <>
      {/* ── Overlay with spotlight cutout ── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 99990,
          pointerEvents: 'none',
        }}
      >
        {/* SVG spotlight mask */}
        {spot && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white"/>
                <rect
                  x={spot.left} y={spot.top}
                  width={spot.width} height={spot.height}
                  rx={12} fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%" height="100%"
              fill="rgba(0,0,0,0.72)"
              mask="url(#spotlight-mask)"
            />
            {/* Glow ring around spotlight */}
            <rect
              x={spot.left} y={spot.top}
              width={spot.width} height={spot.height}
              rx={12} fill="none"
              stroke={accent} strokeWidth={2}
              strokeOpacity={0.6}
              style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
            />
          </svg>
        )}
      </div>

      {/* ── Click blocker (allows clicking only the Next button) ── */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99991, cursor: 'default' }}
        onClick={handleNext}
      />

      {/* ── Bubble ── */}
      {pos && visible && (
        <div
          style={{
            position: 'fixed',
            top: pos.top, left: pos.left,
            width: 320, zIndex: 99992,
            background: '#0d0d0d',
            border: `1px solid ${accent}40`,
            borderRadius: 16,
            boxShadow: `0 0 60px ${accent}20, 0 20px 40px rgba(0,0,0,0.8)`,
            overflow: 'hidden',
            animation: 'hub-tour-bubble-in 0.3s cubic-bezier(0.22,1,0.36,1)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Accent top bar */}
          <div style={{ height: 2.5, background: `linear-gradient(90deg, ${accent}, ${accent}55)` }}/>

          <div style={{ padding: '16px 18px 14px' }}>
            {/* Step counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: `${accent}14`, border: `1px solid ${accent}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>{currentStep.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent }}>
                  Paso {step + 1} de {TOUR_STEPS.length}
                </p>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {currentStep.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 14 }}>
              {currentStep.description}
            </p>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
              {TOUR_STEPS.map((_, i) => (
                <div key={i} style={{
                  height: 3, borderRadius: 2,
                  width: i === step ? 20 : 6,
                  background: i <= step ? accent : 'rgba(255,255,255,0.12)',
                  transition: 'all 0.3s ease',
                }}/>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSkip}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 9,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)', fontSize: 10.5, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >Saltar tour</button>
              <button
                onClick={handleNext}
                style={{
                  flex: 2, padding: '7px 0', borderRadius: 9,
                  background: accent, border: 'none',
                  color: '#fff', fontSize: 10.5, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.05em',
                  boxShadow: `0 0 16px ${accent}50`,
                }}
              >
                {step < TOUR_STEPS.length - 1 ? 'Siguiente →' : '¡Listo, al trabajo! 🚀'}
              </button>
            </div>
          </div>

          {/* Arrow pointer */}
          {pos.arrowDir === 'up' && (
            <div style={{
              position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
              borderBottom: `8px solid ${accent}40`,
            }}/>
          )}
          {pos.arrowDir === 'down' && (
            <div style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
              borderTop: `8px solid ${accent}40`,
            }}/>
          )}
          {pos.arrowDir === 'left' && (
            <div style={{
              position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
              borderRight: `8px solid ${accent}40`,
            }}/>
          )}
        </div>
      )}

      <style>{`
        @keyframes hub-tour-bubble-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
