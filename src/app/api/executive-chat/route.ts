// ─────────────────────────────────────────────────────────────────────────────
// /api/executive-chat — Ghostwriting ejecutivo con fallback automático
// Intenta Claude (Anthropic) primero → fallback a Google Gemini si falla
// Las API keys se reciben desde el cliente (configuradas en la app)
// Fallback también a variables de entorno del servidor si no se proveen
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `Eres un asistente de ghostwriting ejecutivo para el CEO de Copper Giant, una empresa minera canadiense. Tu objetivo es:

1. **Ghostwriting de alta calidad**: Ayudar a redactar, refinar y mejorar documentos ejecutivos, comunicados corporativos, informes y presentaciones.
2. **Tono apropiado**: Mantener un tono ejecutivo, preciso, profesional y orientado a datos. Adecuado para inversores, equipo directivo y stakeholders del sector minero.
3. **Formato Markdown**: Siempre responde con formato Markdown limpio y bien estructurado cuando el CEO pida texto para el documento.
4. **Contextual**: Usa el contenido actual del documento como contexto para tus sugerencias.
5. **Conciso**: Respuestas directas y accionables. No expliques lo obvio.

Idioma: Responde siempre en el mismo idioma en que te hablen (español o inglés).`;

interface RequestBody {
  message: string;
  documentContext?: string;
  history?: Array<{ role: string; content: string }>;
  // API keys from client-side config (SettingsPanel)
  claudeKey?: string;
  googleKey?: string;
  preferredProvider?: 'claude' | 'gemini' | 'auto';
}

// ── Claude (Anthropic) streaming ────────────────────────────────────────────
async function streamWithClaude(
  apiKey: string,
  userContent: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<Response> {
  const messages = [
    ...history,
    { role: 'user' as const, content: userContent },
  ];

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-opus-4-5',
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages,
      stream:     true,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    throw new Error(`Claude API ${upstream.status}: ${text.slice(0, 200)}`);
  }

  // Re-map Anthropic SSE format → unified {text} format consumed by ChatPanel
  const stream = new ReadableStream({
    async start(ctrl) {
      const reader  = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { ctrl.enqueue(encoder.encode('data: [DONE]\n\n')); continue; }
          try {
            const ev = JSON.parse(raw);
            if (ev.type === 'content_block_delta' && ev.delta?.text) {
              ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text: ev.delta.text, provider: 'claude' })}\n\n`));
            }
          } catch { /* skip */ }
        }
      }
      ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
      ctrl.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-store',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── Gemini (Google) streaming ────────────────────────────────────────────────
async function streamWithGemini(
  apiKey: string,
  userContent: string,
  history: Array<{ role: string; content: string }>
): Promise<Response> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const geminiHistory = history.map(h => ({
    role:  h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  })) as Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;

  const chat   = model.startChat({ history: geminiHistory });
  const result = await chat.sendMessageStream(userContent);

  const stream = new ReadableStream({
    async start(ctrl) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ text, provider: 'gemini' })}\n\n`));
          }
        }
      } catch (err) {
        console.error('[executive-chat] Gemini stream error:', err);
      } finally {
        ctrl.enqueue(encoder.encode('data: [DONE]\n\n'));
        ctrl.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-store',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 422 });
  }

  // Resolve keys: client config takes precedence over env vars
  const claudeKey = body.claudeKey?.trim() || process.env.ANTHROPIC_API_KEY || '';
  const googleKey = body.googleKey?.trim() || process.env.GOOGLE_AI_API_KEY || '';
  const preferred = body.preferredProvider ?? 'auto';

  if (!claudeKey && !googleKey) {
    return NextResponse.json(
      { error: 'No hay API key configurada. Abre ⚙ Configuración en el panel de IA para agregar tu clave de Claude o Gemini.' },
      { status: 503 }
    );
  }

  // Build user content with document context
  let userContent = body.message;
  if (body.documentContext?.trim()) {
    userContent = `**Contenido actual del documento:**\n\`\`\`\n${body.documentContext.slice(0, 3000)}\n\`\`\`\n\n**Mi solicitud:**\n${body.message}`;
  }

  // Normalize history
  const history = (body.history ?? []).slice(-6).filter(
    h => h.role === 'user' || h.role === 'assistant'
  ) as Array<{ role: 'user' | 'assistant'; content: string }>;

  // ── Provider selection + auto-fallback ──────────────────────────────────
  const tryProviders = (): Array<() => Promise<Response>> => {
    if (preferred === 'claude' && claudeKey) {
      return [() => streamWithClaude(claudeKey, userContent, history)];
    }
    if (preferred === 'gemini' && googleKey) {
      return [() => streamWithGemini(googleKey, userContent, history)];
    }
    // 'auto' — Claude first, Gemini as fallback
    const fns: Array<() => Promise<Response>> = [];
    if (claudeKey) fns.push(() => streamWithClaude(claudeKey, userContent, history));
    if (googleKey) fns.push(() => streamWithGemini(googleKey, userContent, history));
    return fns;
  };

  const providers = tryProviders();
  if (providers.length === 0) {
    return NextResponse.json(
      { error: 'El proveedor seleccionado no tiene API key configurada.' },
      { status: 503 }
    );
  }

  let lastError = '';
  for (const attempt of providers) {
    try {
      return await attempt();
    } catch (err: any) {
      lastError = err.message ?? 'Error desconocido';
      console.warn('[executive-chat] Provider failed, trying next:', lastError);
    }
  }

  return NextResponse.json(
    { error: `Todos los proveedores fallaron. Último error: ${lastError}` },
    { status: 502 }
  );
}
