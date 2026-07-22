import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operationTypes } from '@flowops/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import OpenAI from 'openai';

const inputSchema = z.object({
  input: z.string().min(1).max(2000),
});

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// POST /api/operations/natural — Create operation from natural language
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { input } = inputSchema.parse(body);

    // Get available operation types for this tenant
    const types = await db
      .select()
      .from(operationTypes)
      .where(eq(operationTypes.tenantId, session.tenantId));

    if (types.length === 0) {
      return NextResponse.json(
        { error: 'No operation types configured. Create one first.' },
        { status: 400 },
      );
    }

    // Use AI to classify and extract data
    const typesContext = types.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      fields: t.fields,
    }));

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que clasifica solicitudes empresariales. 
Dado el mensaje del usuario y los tipos de operación disponibles, debes:
1. Identificar a qué tipo corresponde (o decir que no matchea).
2. Extraer los datos relevantes para los campos del tipo.
3. Generar un título corto y claro.
4. Indicar qué campos faltan para completar la solicitud.

Responde SIEMPRE en JSON con este formato:
{
  "matched": true/false,
  "operationTypeId": "uuid del tipo" | null,
  "operationTypeName": "nombre del tipo",
  "title": "título generado",
  "extractedData": { "campo": "valor" },
  "missingFields": [{ "key": "campo", "label": "Etiqueta", "question": "Pregunta natural para obtener el dato" }],
  "confidence": 0.0 a 1.0
}`,
        },
        {
          role: 'user',
          content: `Tipos de operación disponibles:\n${JSON.stringify(typesContext, null, 2)}\n\nMensaje del usuario: "${input}"`,
        },
      ],
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      data: {
        ...aiResponse,
        originalInput: input,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Failed to process natural input:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
