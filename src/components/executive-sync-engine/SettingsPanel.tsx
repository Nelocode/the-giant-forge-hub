'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SettingsPanel — Configuración de proveedores de IA
// El CEO ingresa sus API keys directamente en la app
// Claude (primario) → Google Gemini (respaldo automático)
// Keys guardadas en localStorage — nunca viajan al servidor sin cifrar
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

export const STORAGE_KEY = 'ese-api-config-v1';

export interface ApiConfig {
  claudeKey: string;
  googleKey: string;
  preferredProvider: 'claude' | 'gemini' | 'auto';
}

export const DEFAULT_CONFIG: ApiConfig = {
  claudeKey: '',
  googleKey: '',
  preferredProvider: 'auto',
};

export function loadApiConfig(): ApiConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveApiConfig(config: ApiConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [saved,  setSaved]  = useState(false);
  const [showClaude, setShowClaude] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  useEffect(() => {
    setConfig(loadApiConfig());
  }, []);

  const handleSave = () => {
    saveApiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const accent   = '#d4772c';
  const claudeC  = '#f91117';

  const providerOptions: Array<{ value: ApiConfig['preferredProvider']; label: string; sub: string }> = [
    { value: 'auto',   label: '⚡ Auto (recomendado)', sub: 'Intenta Claude primero, cambia a Gemini si falla' },
    { value: 'claude', label: '✦ Claude (Anthropic)',   sub: 'Usa solo Claude — el más potente para ghostwriting' },
    { value: 'gemini', label: '✧ Gemini (Google)',      sub: 'Usa solo Gemini — tier gratuito disponible' },
  ];

  return (
    /* Overlay */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: '#0d0d0d',
          border: `1px solid ${accent}30`,
          borderRadius: 18,
          boxShadow: `0 0 60px ${accent}18, 0 24px 48px rgba(0,0,0,0.8)`,
          overflow: 'hidden',
          animation: 'settings-in 0.25s cubic-bezier(0.22,1,0.36,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid rgba(255,255,255,0.07)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${accent}15`, border: `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accent, fontSize: 17,
          }}>⚙</div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: accent, marginBottom: 2 }}>
              Executive Sync
            </p>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Configuración de IA
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,17,23,0.15)'; e.currentTarget.style.color = '#f91117'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Provider selector */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
              Modo de proveedor
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {providerOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setConfig(c => ({ ...c, preferredProvider: opt.value }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                    background: config.preferredProvider === opt.value ? `${accent}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${config.preferredProvider === opt.value ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer', transition: 'all 0.2s', width: '100%',
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${config.preferredProvider === opt.value ? accent : 'rgba(255,255,255,0.2)'}`,
                    background: config.preferredProvider === opt.value ? accent : 'transparent',
                    transition: 'all 0.2s',
                  }}/>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: config.preferredProvider === opt.value ? '#fff' : 'rgba(255,255,255,0.55)', marginBottom: 1 }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>
                      {opt.sub}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }}/>

          {/* Claude Key */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>✦</span>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>
                  Claude API Key
                  <span style={{
                    marginLeft: 8, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em',
                    padding: '2px 7px', borderRadius: 100,
                    background: `${claudeC}15`, border: `1px solid ${claudeC}30`, color: claudeC,
                  }}>PRIMARIO</span>
                </p>
              </div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 9.5, color: accent, textDecoration: 'none', letterSpacing: '0.04em' }}
              >
                Obtener key →
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showClaude ? 'text' : 'password'}
                value={config.claudeKey}
                onChange={e => setConfig(c => ({ ...c, claudeKey: e.target.value }))}
                placeholder="sk-ant-api03-..."
                style={{
                  width: '100%', padding: '11px 40px 11px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${config.claudeKey ? claudeC + '35' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10, color: '#fff', fontSize: 12,
                  outline: 'none', fontFamily: 'monospace',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => setShowClaude(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                  cursor: 'pointer', fontSize: 13, padding: 4,
                }}
              >{showClaude ? '🙈' : '👁'}</button>
            </div>
            <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', marginTop: 5 }}>
              Guardado localmente en tu navegador. Nunca se envía a nuestros servidores sin tu solicitud.
            </p>
          </div>

          {/* Google Key */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>✧</span>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>
                  Google AI API Key
                  <span style={{
                    marginLeft: 8, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em',
                    padding: '2px 7px', borderRadius: 100,
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981',
                  }}>RESPALDO</span>
                </p>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 9.5, color: accent, textDecoration: 'none', letterSpacing: '0.04em' }}
              >
                Obtener key →
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showGoogle ? 'text' : 'password'}
                value={config.googleKey}
                onChange={e => setConfig(c => ({ ...c, googleKey: e.target.value }))}
                placeholder="AIzaSy..."
                style={{
                  width: '100%', padding: '11px 40px 11px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${config.googleKey ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10, color: '#fff', fontSize: 12,
                  outline: 'none', fontFamily: 'monospace',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => setShowGoogle(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
                  cursor: 'pointer', fontSize: 13, padding: 4,
                }}
              >{showGoogle ? '🙈' : '👁'}</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          {/* Status indicator */}
          <div style={{ flex: 1 }}>
            {!config.claudeKey && !config.googleKey && (
              <p style={{ fontSize: 10, color: 'rgba(249,17,23,0.7)' }}>
                ⚠ Configura al menos una key para activar el asistente
              </p>
            )}
            {(config.claudeKey || config.googleKey) && (
              <p style={{ fontSize: 10, color: '#10b981' }}>
                ✓ {config.claudeKey && config.googleKey ? 'Claude + Gemini configurados' : config.claudeKey ? 'Claude configurado' : 'Gemini configurado'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: 9,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '9px 22px', borderRadius: 9,
              background: saved ? '#10b981' : accent,
              border: 'none', color: '#fff', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.3s',
              letterSpacing: '0.05em',
              boxShadow: saved ? '0 0 20px rgba(16,185,129,0.3)' : `0 0 20px ${accent}40`,
            }}
          >
            {saved ? '✓ Guardado' : 'Guardar configuración'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes settings-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
