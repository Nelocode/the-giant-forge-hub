import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { eventTitle, eventDate, company, task } = await req.json();
    if (!eventTitle || !eventDate || !company || !task) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ note: 'Configura GEMINI_API_KEY para habilitar notas IA.' });
    }

    const today = new Date();
    const evDate = new Date(eventDate);
    const daysLeft = Math.ceil((evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysLabel =
      daysLeft < 0   ? `hace ${Math.abs(daysLeft)} días (pasado)` :
      daysLeft === 0 ? 'hoy' :
      daysLeft === 1 ? 'mañana' :
                      `en ${daysLeft} días`;

    const prompt = `Eres un asistente ejecutivo de eventos corporativos. 
Genera una nota CORTA y ACCIONABLE (máximo 2 oraciones) para el siguiente contexto:

Empresa: ${company}
Evento: "${eventTitle}" — ${daysLabel} (${eventDate})
Tarea del checklist: "${task}"

La nota debe indicar la urgencia o el estado de la tarea según los días restantes, y dar una recomendación concreta. 
Responde SOLO con la nota, sin encabezados ni emojis extra.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 150 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[ai-note] Gemini error:', err);
      return NextResponse.json({ error: 'Gemini API error' }, { status: 500 });
    }

    const data = await res.json();
    const note = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    return NextResponse.json({ note });
  } catch (e) {
    console.error('[ai-note]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
