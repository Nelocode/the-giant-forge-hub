// ─────────────────────────────────────────────────────────────────────────────
// /api/executive-chat — Proxy a la API de Anthropic Claude
// Streaming habilitado para respuesta en tiempo real en el ChatPanel
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-5';

const SYSTEM_PROMPT = `Eres un asistente de ghostwriting ejecutivo para el CEO de Copper Giant, una empresa minera canadiense. Tu objetivo es:

1. **Ghostwriting de alta calidad**: Ayudar a redactar, refinar y mejorar documentos ejecutivos, comunicados corporativos, informes y presentaciones.
2. **Tono apropiado**: Mantener un tono ejecutivo, preciso, profesional y orientado a datos. Adecuado para inversores, equipo directivo y stakeholders del sector minero.
3. **Formato Markdown**: Siempre responde con formato Markdown limpio y bien estructurado cuando el CEO pida texto para el documento.
4. **Contextual**: Usa el contenido actual del documento como contexto para tus sugerencias.
5. **Conciso**: Respuestas directas y accionables. No expliques lo obvio.

Idioma: Responde siempre en el mismo idioma en que te hablen (español o inglés).`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY no configurada. Agrega la variable de entorno en EasyPanel.' },
      { status: 503 }
    );
  }

  let body: {
    message: string;
    documentContext?: string;
    history?: Array<{ role: string; content: string }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 422 });
  }

  // Build the messages array for Anthropic
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Include history (last 6 messages)
  if (body.history?.length) {
    body.history.slice(-6).forEach(h => {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({ role: h.role as 'user' | 'assistant', content: h.content });
      }
    });
  }

  // Build the current user message with document context
  let userContent = body.message;
  if (body.documentContext?.trim()) {
    userContent = `**Contenido actual del documento:**\n\`\`\`\n${body.documentContext.slice(0, 3000)}\n\`\`\`\n\n**Mi solicitud:**\n${body.message}`;
  }

  messages.push({ role: 'user', content: userContent });

  // Call Anthropic with streaming
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[executive-chat] Anthropic error:', errText);
    return NextResponse.json(
      { error: `Anthropic API error: ${response.status}` },
      { status: response.status }
    );
  }

  // Pipe the SSE stream directly to the client
  return new Response(response.body, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
