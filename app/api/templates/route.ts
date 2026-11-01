import { NextRequest, NextResponse } from 'next/server';
import { templateQueries, type Template } from '@/lib/db';
import { generateScrumTemplate } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, projectDescription, useCases } = body;

    if (!projectDescription || !useCases || !Array.isArray(useCases)) {
      return NextResponse.json(
        { 
          error: 'Descripción del proyecto y casos de uso son requeridos',
          example: {
            name: "Proyecto E-commerce",
            description: "Sistema de ventas online",
            projectDescription: "Plataforma de comercio electrónico...",
            useCases: [
              "Como usuario quiero registrarme en el sistema",
              "Como cliente quiero buscar productos"
            ]
          }
        },
        { status: 400 }
      );
    }

    const templateData = await generateScrumTemplate(
      projectDescription,
      useCases
    );

    const result = templateQueries.create.run(
      name || `Plantilla ${new Date().toISOString()}`,
      description || projectDescription.substring(0, 100),
      JSON.stringify(templateData)
    );

    const templateId = result.lastInsertRowid as number;

    return NextResponse.json({
      message: 'Plantilla Scrum generada exitosamente',
      template: {
        id: templateId,
        name,
        data: templateData
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error generando plantilla:', error);
    return NextResponse.json(
      { 
        error: 'Error generando plantilla Scrum', 
        details: error.message,
        hint: 'Asegúrate de que Ollama esté ejecutándose con el modelo hermes3'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const template = templateQueries.findById.get(parseInt(id)) as Template;
      if (!template) {
        return NextResponse.json(
          { error: 'Plantilla no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ...template,
        template_data: JSON.parse(template.template_data as any)
      });
    }

    const templates = templateQueries.findAll.all() as Template[];
    
    return NextResponse.json({
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        created_at: t.created_at
      }))
    });

  } catch (error: any) {
    console.error('Error obteniendo plantillas:', error);
    return NextResponse.json(
      { error: 'Error obteniendo plantillas', details: error.message },
      { status: 500 }
    );
  }
}
