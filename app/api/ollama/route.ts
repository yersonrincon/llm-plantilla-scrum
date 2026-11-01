import { Ollama } from 'ollama';
import { NextRequest, NextResponse } from 'next/server';
import { getRelevantContext } from '@/lib/rag';

const ollama = new Ollama({ 
  host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' 
});

export async function POST(request: NextRequest) {
  try {
    const { message, useRAG = true } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'El mensaje es requerido' },
        { status: 400 }
      );
    }

    let context = '';
    if (useRAG) {
      context = await getRelevantContext(message);
    }

    const systemPrompt = `Eres un asistente experto en metodología Scrum y desarrollo ágil de software. 
Tu objetivo es ayudar a los usuarios a crear y gestionar proyectos siguiendo las mejores prácticas Scrum.

${context ? `Contexto relevante de la base de conocimiento:\n${context}\n` : ''}

Proporciona respuestas claras, prácticas y basadas en los principios ágiles.`;

    const response = await ollama.chat({
      model: 'hermes3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      stream: false
    });

    return NextResponse.json({
      message: response.message.content,
      context_used: useRAG
    });

  } catch (error: any) {
    console.error('Error en /api/ollama:', error);
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
      return NextResponse.json(
        { 
          error: 'No se pudo conectar a Ollama. Asegúrate de que Ollama esté ejecutándose.',
          details: 'Ejecuta: ollama serve'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error procesando la solicitud', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const list = await ollama.list();
    
    return NextResponse.json({
      models: list.models,
      ollama_connected: true
    });
  } catch (error: any) {
    return NextResponse.json({
      ollama_connected: false,
      error: error.message
    }, { status: 503 });
  }
}
