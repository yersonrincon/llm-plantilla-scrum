import { Ollama } from 'ollama';
import { documentQueries, embeddingQueries, type Document, type Embedding } from './db';

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' });

export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ollama.embeddings({
      model: 'nomic-embed-text',
      prompt: text
    });
    return response.embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function indexDocument(document: Document): Promise<void> {
  if (!document.id) {
    throw new Error('El documento debe tener un ID');
  }

  embeddingQueries.deleteByDocument.run(document.id);
  
  const chunks = chunkText(document.content);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk);
    
    embeddingQueries.create.run(
      document.id,
      chunk,
      i,
      JSON.stringify(embedding)
    );
  }
}

export async function searchSimilarChunks(
  query: string,
  topK: number = 5
): Promise<Array<{ chunk_text: string; similarity: number; document_id: number }>> {
  const queryEmbedding = await generateEmbedding(query);
  
  const allEmbeddings = embeddingQueries.findAll.all() as Array<{
    id: number;
    document_id: number;
    chunk_text: string;
    chunk_index: number;
    embedding: string;
  }>;
  
  const similarities = allEmbeddings.map(emb => {
    const embedding = JSON.parse(emb.embedding) as number[];
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    return {
      chunk_text: emb.chunk_text,
      similarity,
      document_id: emb.document_id
    };
  });
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export async function getRelevantContext(query: string, topK: number = 5): Promise<string> {
  const similarChunks = await searchSimilarChunks(query, topK);
  
  if (similarChunks.length === 0) {
    return 'No se encontró contexto relevante en la base de conocimiento.';
  }
  
  const context = similarChunks
    .map((chunk, idx) => `[Fragmento ${idx + 1}] ${chunk.chunk_text}`)
    .join('\n\n');
  
  return context;
}

export async function generateScrumTemplate(
  projectDescription: string,
  useCases: string[]
): Promise<any> {
  const context = await getRelevantContext(
    `casos de uso proyecto scrum ${projectDescription}`
  );
  
  const prompt = `
Eres un experto en metodología Scrum y gestión de proyectos ágiles de desarrollo de software.

Contexto de la base de conocimiento:
${context}

Descripción del proyecto:
${projectDescription}

Casos de uso proporcionados:
${useCases.map((uc, idx) => `${idx + 1}. ${uc}`).join('\n')}

Genera una plantilla Scrum completa que incluya:

1. **Product Backlog**: Lista priorizada de historias de usuario derivadas de los casos de uso
2. **Sprint Planning**: Sugerencias para la planificación del primer sprint
3. **Definición de Done**: Criterios de aceptación
4. **Roles del equipo**: Product Owner, Scrum Master, Development Team
5. **Ceremonias**: Planning, Daily Standup, Review, Retrospective
6. **Estimaciones**: Story points sugeridos usando fibonacci
7. **Dependencias**: Identificar dependencias entre historias

Responde SOLO con un objeto JSON válido con la siguiente estructura:
{
  "product_backlog": [
    {
      "id": "US-001",
      "titulo": "...",
      "descripcion": "...",
      "criterios_aceptacion": ["...", "..."],
      "prioridad": "Alta|Media|Baja",
      "story_points": 3
    }
  ],
  "sprints_sugeridos": [
    {
      "sprint_numero": 1,
      "objetivo": "...",
      "historias": ["US-001", "US-002"],
      "duracion_dias": 14
    }
  ],
  "roles": {
    "product_owner": "...",
    "scrum_master": "...",
    "equipo_desarrollo": "..."
  },
  "ceremonias": {
    "sprint_planning": "...",
    "daily_standup": "...",
    "sprint_review": "...",
    "sprint_retrospective": "..."
  },
  "definition_of_done": ["...", "..."],
  "dependencias": [
    {
      "historia_origen": "US-001",
      "historia_destino": "US-002",
      "tipo": "..."
    }
  ]
}
`;

  try {
    const response = await ollama.chat({
      model: 'hermes3',
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    });

    return JSON.parse(response.message.content);
  } catch (error) {
    console.error('Error generando plantilla:', error);
    throw error;
  }
}
