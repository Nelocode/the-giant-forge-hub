'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TutorialPanel — Onboarding de 3 pasos para el Executive Sync Engine
// Se muestra la primera vez que cualquier usuario abre el módulo
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

const TUTORIAL_KEY = 'ese-tutorial-seen-v1';

export function hasTutorialBeenSeen(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

export function markTutorialSeen() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TUTORIAL_KEY, 'true');
}

interface Step {
  icon: string;
  title: string;
  description: string;
  forRole?: 'ceo' | 'team' | 'all';
}

const STEPS_CEO: Step[] = [
  {
    icon: '✍',
    title: 'Crea y sube tus documentos',
    description: 'Redacta directrices, estrategia y protocolos directamente aquí o importa tus archivos .md desde Claude. Tu asistente de IA te ayuda a mejorar el contenido.',
  },
  {
    icon: '📡',
    title: 'Publica a la Biblia del equipo',
    description: 'Cuando un documento esté listo, presiona "Publicar". El equipo recibirá una notificación instantánea y podrá leerlo desde su propio Hub.',
  },
  {
    icon: '🔒',
    title: 'Solo tú editas — el equipo solo lee',
    description: 'Los documentos publicados son de solo lectura para el equipo. Cada quien puede chatear con su IA sobre el contenido, pero la autoría es exclusivamente tuya.',
  },
];

const STEPS_TEAM: Step[] = [
  {
    icon: '📚',
    title: 'La Biblia del equipo',
    description: 'Aquí encontrarás las directrices, estrategia y documentos oficiales publicados por Ian Harris. Se actualizan en tiempo real cuando el CEO publica cambios.',
  },
  {
    icon: '🔔',
    title: 'Notificaciones instantáneas',
    description: 'Cuando el CEO publique o actualice un documento, recibirás una notificación aquí mismo en el Hub. Siempre sabrás qué es nuevo.',
  },
  {
    icon: '🤖',
    title: 'Chatea con tu IA sobre los docs',
    description: 'Puedes usar tu propia clave de Claude o Gemini para hacer preguntas y analizar los documentos. Configúrala en ⚙ Configuración.',
  },
];

interface TutorialPanelProps {
  role: string;
  onClose: () => void;
}

export function TutorialPanel({ role, onClose }: TutorialPanelProps) {
  const [step, setStep] = useState(0);
  const isCEO = role === 'ceo';
  const steps = isCEO ? STEPS_CEO : STEPS_TEAM;

  const handleDone = () => {
    markTutorialSeen();
    onClose();
  };

  const accent = '#d4772c';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0d0d0d',
        border: `1px solid ${accent}30`,
        borderRadius: 20,
        boxShadow: `0 0 80px ${accent}15, 0 32px 64px rgba(0,0,0,0.9)`,
        overflow: 'hidden',
        animation: 'settings-in 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%', background: accent,
            width: `${((step + 1) / steps.length) * 100}%`,
            transition: 'width 0.4s ease',
          }}/>
        </div>

        {/* Header */}
        <div style={{ padding: '22px 26px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${accent}15`, border: `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>⚡</div>
          <div>
            <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent }}>
              Executive Sync Engine
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              {isCEO ? 'Bienvenido, Ian' : 'Guía rápida'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            {step + 1} / {steps.length}
          </div>
        </div>

        {/* Step content */}
        <div style={{ padding: '28px 26px 24px', minHeight: 200 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: `${accent}10`, border: `1px solid ${accent}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 20,
            animation: 'settings-in 0.25s ease',
          }}>
            {steps[step].icon}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 10 }}>
            {steps[step].title}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            {steps[step].description}
          </p>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 4 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 3,
              background: i === step ? accent : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease', cursor: 'pointer',
            }} onClick={() => setStep(i)}/>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 26px 24px',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                padding: '9px 18px', borderRadius: 9,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
              }}
            >← Anterior</button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                padding: '9px 22px', borderRadius: 9,
                background: accent, border: 'none',
                color: '#fff', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.05em',
                boxShadow: `0 0 20px ${accent}40`,
              }}
            >Siguiente →</button>
          ) : (
            <button
              onClick={handleDone}
              style={{
                padding: '9px 22px', borderRadius: 9,
                background: '#10b981', border: 'none',
                color: '#fff', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.05em',
                boxShadow: '0 0 20px rgba(16,185,129,0.4)',
              }}
            >¡Entendido, arrancar! ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}
