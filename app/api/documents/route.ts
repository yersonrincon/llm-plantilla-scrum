import { NextRequest, NextResponse } from 'next/server';
import { documentQueries, type Document } from '@/lib/db';
import { indexDocument } from '@/lib/rag';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (id) {
      const document = documentQueries.findById.get(parseInt(id)) as Document;
      if (!document) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      return NextResponse.json(document);
    }

    const documents = type
      ? documentQueries.findByType.all(type)
      : documentQueries.findAll.all();

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Error obteniendo documentos:', error);
    return NextResponse.json(
      { error: 'Error obteniendo documentos', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, type } = body;

    if (!title || !content || !type) {
      return NextResponse.json(
        { error: 'Título, contenido y tipo son requeridos' },
        { status: 400 }
      );
    }

    const validTypes = ['caso_uso', 'manual', 'guia', 'otro'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo inválido. Debe ser: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = documentQueries.create.run(title, content, type);
    const documentId = result.lastInsertRowid as number;

    const document: Document = {
      id: documentId,
      title,
      content,
      type
    };

    await indexDocument(document);

    return NextResponse.json({
      message: 'Documento creado e indexado exitosamente',
      document: {
        id: documentId,
        title,
        type
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando documento:', error);
    return NextResponse.json(
      { error: 'Error creando documento', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, type } = body;

    if (!id || !title || !content || !type) {
      return NextResponse.json(
        { error: 'ID, título, contenido y tipo son requeridos' },
        { status: 400 }
      );
    }

    const existing = documentQueries.findById.get(id) as Document;
    if (!existing) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    documentQueries.update.run(title, content, type, id);

    const document: Document = {
      id,
      title,
      content,
      type
    };

    await indexDocument(document);

    return NextResponse.json({
      message: 'Documento actualizado y re-indexado exitosamente',
      document: { id, title, type }
    });

  } catch (error: any) {
    console.error('Error actualizando documento:', error);
    return NextResponse.json(
      { error: 'Error actualizando documento', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    const document = documentQueries.findById.get(parseInt(id)) as Document;
    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    documentQueries.delete.run(parseInt(id));

    return NextResponse.json({
      message: 'Documento eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Error eliminando documento:', error);
    return NextResponse.json(
      { error: 'Error eliminando documento', details: error.message },
      { status: 500 }
    );
  }
}
