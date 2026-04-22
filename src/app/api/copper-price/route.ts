// GET /api/copper-price — Devuelve el precio spot del cobre con caché de 5 min
// Fuentes: metalprice.io (gratuita) con fallback a precio estático conocido
import { NextResponse } from 'next/server';
import { getCachedCopperPrice, setCopperPriceCache } from '@/lib/db';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Sparkline mock — 7 días de variación relativa (se actualiza progresivamente)
function buildSparkline(currentPrice: number): number[] {
  // Simula variación ±3% en 7 días basada en el precio actual
  const seed = currentPrice * 100;
  const points: number[] = [];
  let p = currentPrice * 0.97;
  for (let i = 0; i < 7; i++) {
    const delta = ((seed * (i + 1) * 7) % 6) - 3; // -3% a +3%
    p = currentPrice + (delta / 100) * currentPrice;
    points.push(parseFloat(p.toFixed(4)));
  }
  points.push(currentPrice); // hoy
  return points;
}

export async function GET() {
  try {
    // Check cache first
    const cached = getCachedCopperPrice();
    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached, cached: true });
      }
    }

    // Try to fetch fresh price
    // Using open exchange rate / commodity APIs (no key needed for basic metals)
    let priceUsdT: number | null = null;
    let source = 'fallback';

    try {
      // metalpriceapi.com free tier — copper per troy oz, convert to metric ton
      // Alternative: use commodity-price.com open endpoint
      const res = await fetch(
        'https://api.metals.live/v1/spot/copper',
        { next: { revalidate: 300 } }
      );
      if (res.ok) {
        const data = await res.json();
        // metals.live returns price per troy oz in USD
        // 1 metric ton = 32150.7 troy oz
        // But copper is typically quoted per lb: 1 metric ton = 2204.62 lbs
        if (data?.copper || data?.[0]?.copper) {
          const ozPrice = data?.copper ?? data?.[0]?.copper;
          priceUsdT = ozPrice * 32150.7;
          source = 'metals.live';
        }
      }
    } catch {
      // Fallback to another source
    }

    if (!priceUsdT) {
      try {
        // Alternative: stooq.com open data
        const res = await fetch('https://stooq.com/q/l/?s=hg.f&f=sd2t2ohlcv&e=csv');
        if (res.ok) {
          const text = await res.text();
          const lines = text.trim().split('\n');
          if (lines.length >= 2) {
            const cols = lines[1].split(',');
            const pricePerLb = parseFloat(cols[4]); // close price in USD/lb (COMEX)
            if (!isNaN(pricePerLb)) {
              priceUsdT = pricePerLb * 2204.62;
              source = 'stooq (COMEX HG)';
            }
          }
        }
      } catch {}
    }

    // Final fallback — use last cached or known approximate price
    if (!priceUsdT) {
      if (cached) {
        return NextResponse.json({ ...cached, cached: true, stale: true });
      }
      // Approximate LME copper price (update periodically)
      priceUsdT = 9850;
      source = 'static-fallback';
    }

    const priceUsdLb = priceUsdT / 2204.62;
    const prevPrice  = cached?.price_usd_t ?? priceUsdT;
    const changePct  = parseFloat((((priceUsdT - prevPrice) / prevPrice) * 100).toFixed(2));

    const data = {
      price_usd_lb: parseFloat(priceUsdLb.toFixed(4)),
      price_usd_t:  parseFloat(priceUsdT.toFixed(2)),
      change_pct:   changePct,
      sparkline:    buildSparkline(priceUsdLb),
      source,
      fetched_at:   new Date().toISOString(),
    };

    setCopperPriceCache(data);
    return NextResponse.json({ ...data, cached: false });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
