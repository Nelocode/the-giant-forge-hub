// ─────────────────────────────────────────────────────────────────────────────
// /api/executive-chat — Ghostwriting ejecutivo con Google Gemini
// Streaming habilitado para respuesta en tiempo real en el ChatPanel
// Proveedor: Google AI (Gemini 1.5 Flash — tier gratuito disponible)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-1.5-flash';

const SYSTEM_PROMPT = `Eres un asistente de ghostwriting ejecutivo para el CEO de Copper Giant, una empresa minera canadiense. Tu objetivo es:

1. **Ghostwriting de alta calidad**: Ayudar a redactar, refinar y mejorar documentos ejecutivos, comunicados corporativos, informes y presentaciones.
2. **Tono apropiado**: Mantener un tono ejecutivo, preciso, profesional y orientado a datos. Adecuado para inversores, equipo directivo y stakeholders del sector minero.
3. **Formato Markdown**: Siempre responde con formato Markdown limpio y bien estructurado cuando el CEO pida texto para el documento.
4. **Contextual**: Usa el contenido actual del documento como contexto para tus sugerencias.
5. **Conciso**: Respuestas directas y accionables. No expliques lo obvio.

Idioma: Responde siempre en el mismo idioma en que te hablen (español o inglés).`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_AI_API_KEY no configurada. Agrega la variable de entorno en EasyPanel.' },
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

  // Build the current user message with document context
  let userContent = body.message;
  if (body.documentContext?.trim()) {
    userContent = `**Contenido actual del documento:**\n\`\`\`\n${body.documentContext.slice(0, 3000)}\n\`\`\`\n\n**Mi solicitud:**\n${body.message}`;
  }

  // Build Gemini chat history (last 6 turns)
  const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  if (body.history?.length) {
    body.history.slice(-6).forEach(h => {
      if (h.role === 'user') {
        history.push({ role: 'user', parts: [{ text: h.content }] });
      } else if (h.role === 'assistant') {
        history.push({ role: 'model', parts: [{ text: h.content }] });
      }
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(userContent);

    // Stream the response as plain text chunks using ReadableStream
    // ChatPanel consumes these via a simple fetch + reader loop
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              // Emit as SSE-compatible data line so ChatPanel can parse uniformly
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (err) {
          console.error('[executive-chat] Gemini stream error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache, no-store',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    console.error('[executive-chat] Gemini error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Error al conectar con Google AI' },
      { status: 500 }
    );
  }
}
