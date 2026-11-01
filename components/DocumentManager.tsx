'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at?: string;
}

export default function DocumentManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'caso_uso'
  });

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({ title: '', content: '', type: 'caso_uso' });
        setShowForm(false);
        await loadDocuments();
        alert('Documento creado e indexado exitosamente');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDocuments();
        alert('Documento eliminado exitosamente');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Gestión de Documentos
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium
                   hover:bg-green-700 transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Documento'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Título
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                         bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Tipo
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                         bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
              >
                <option value="caso_uso">Caso de Uso</option>
                <option value="manual">Manual</option>
                <option value="guia">Guía</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Contenido
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                         bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                rows={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Documento'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {documents.length === 0 ? (
          <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
            No hay documentos. Crea uno para comenzar.
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg
                       hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Tipo: <span className="font-medium">{doc.type}</span>
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2 line-clamp-2">
                    {doc.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20
                           rounded transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
