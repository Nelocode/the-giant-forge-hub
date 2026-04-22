'use client';

// ─────────────────────────────────────────────────────────────────────────────
// CopperPriceCard — Widget del precio spot del cobre en tiempo real
// Refresca cada 5 minutos. Sparkline de 7 días. Diseño Hub premium.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

interface PriceData {
  price_usd_lb: number;
  price_usd_t:  number;
  change_pct:   number;
  sparkline:    number[];
  source:       string;
  fetched_at:   string;
  cached?:      boolean;
  stale?:       boolean;
}

const REFRESH_MS = 5 * 60 * 1000; // 5 min

// Mini sparkline SVG
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 120, H = 32;
  const step = W / (data.length - 1);
  const pts = data
    .map((v, i) => `${i * step},${H - ((v - min) / range) * H}`)
    .join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`0,${H} ${pts} ${(data.length - 1) * step},${H}`}
        fill="url(#spark-fill)"
      />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) * step}
          cy={H - ((data[data.length - 1] - min) / range) * H}
          r={3} fill={color}
        />
      )}
    </svg>
  );
}

export function CopperPriceCard() {
  const [data,    setData]    = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch('/api/copper-price');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    intervalRef.current = setInterval(fetchPrice, REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchPrice]);

  const isUp    = (data?.change_pct ?? 0) >= 0;
  const accentC = isUp ? '#10b981' : '#f91117'; // green up, red down
  const copper  = '#d4772c';

  return (
    <div className="h-full" style={{
      background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, overflow: 'hidden', padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `${copper}12`, border: `1px solid ${copper}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>🟠</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: copper }}>
            LME · Spot Price
          </p>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            Copper
          </p>
        </div>
        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 100,
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-status 2s infinite' }}/>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10b981' }}>Live</span>
        </div>
      </div>

      {/* Price display */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Loading price...</p>
        </div>
      )}

      {error && !data && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, color: '#f91117' }}>⚠ {error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Main price */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <div>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                ${data.price_usd_lb.toFixed(4)}
              </p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>USD / lb</p>
            </div>
            {/* Change pill */}
            <div style={{
              padding: '4px 10px', borderRadius: 100, marginBottom: 2,
              background: `${accentC}12`, border: `1px solid ${accentC}25`,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 10, color: accentC }}>{isUp ? '▲' : '▼'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accentC }}>
                {Math.abs(data.change_pct).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Secondary price */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>
              ${data.price_usd_t.toLocaleString('en', { maximumFractionDigits: 0 })} <span style={{ fontSize: 9 }}>USD/t</span>
            </p>
            {/* Sparkline */}
            <Sparkline data={data.sparkline} color={accentC} />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>
              {data.stale ? '⚠ Stale data' : data.source}
            </span>
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.14)', fontFamily: 'monospace' }}>
              {new Date(data.fetched_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
