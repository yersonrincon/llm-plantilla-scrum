'use client';

import { useState } from 'react';

interface ScrumTemplate {
  id?: number;
  name?: string;
  data: {
    product_backlog?: Array<{
      id: string;
      titulo: string;
      descripcion: string;
      criterios_aceptacion: string[];
      prioridad: string;
      story_points: number;
    }>;
    sprints_sugeridos?: Array<{
      sprint_numero: number;
      objetivo: string;
      historias: string[];
      duracion_dias: number;
    }>;
    roles?: any;
    ceremonias?: any;
    definition_of_done?: string[];
    dependencias?: Array<{
      historia_origen: string;
      historia_destino: string;
      tipo: string;
    }>;
  };
}

export default function TemplateGenerator() {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<ScrumTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    projectDescription: '',
    useCases: ['']
  });

  const addUseCase = () => {
    setFormData({
      ...formData,
      useCases: [...formData.useCases, '']
    });
  };

  const updateUseCase = (index: number, value: string) => {
    const newUseCases = [...formData.useCases];
    newUseCases[index] = value;
    setFormData({ ...formData, useCases: newUseCases });
  };

  const removeUseCase = (index: number) => {
    const newUseCases = formData.useCases.filter((_, i) => i !== index);
    setFormData({ ...formData, useCases: newUseCases });
  };

  const generateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const filteredUseCases = formData.useCases.filter(uc => uc.trim());
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          projectDescription: formData.projectDescription,
          useCases: filteredUseCases
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTemplate(data.template);
        alert('Plantilla Scrum generada exitosamente');
      } else {
        alert(`Error: ${data.error}\n${data.hint || ''}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
        Generador de Plantillas Scrum
      </h2>

      <form onSubmit={generateTemplate} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Nombre del Proyecto
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                     bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Descripción del Proyecto
          </label>
          <textarea
            value={formData.projectDescription}
            onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                     bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
            rows={3}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Casos de Uso
            </label>
            <button
              type="button"
              onClick={addUseCase}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Agregar
            </button>
          </div>
          <div className="space-y-2">
            {formData.useCases.map((useCase, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={useCase}
                  onChange={(e) => updateUseCase(index, e.target.value)}
                  placeholder="Como [usuario] quiero [acción] para [beneficio]"
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg
                           bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50"
                  required
                />
                {formData.useCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUseCase(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium
                   hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Generando con IA...' : '✨ Generar Plantilla Scrum'}
        </button>
      </form>

      {template && (
        <div className="mt-8 space-y-6">
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Product Backlog
            </h3>
            <div className="space-y-3">
              {template.data.product_backlog?.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
                      {item.id}
                    </span>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.prioridad === 'Alta' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : item.prioridad === 'Media'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {item.prioridad}
                      </span>
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                        {item.story_points} pts
                      </span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                    {item.titulo}
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {item.descripcion}
                  </p>
                  {item.criterios_aceptacion?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Criterios de Aceptación:
                      </p>
                      <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                        {item.criterios_aceptacion.map((criterio, idx) => (
                          <li key={idx}>✓ {criterio}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {template.data.sprints_sugeridos && (
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Sprints Sugeridos
              </h3>
              <div className="space-y-3">
                {template.data.sprints_sugeridos.map((sprint) => (
                  <div
                    key={sprint.sprint_numero}
                    className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        Sprint {sprint.sprint_numero}
                      </h4>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {sprint.duracion_dias} días
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                      Objetivo: {sprint.objetivo}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Historias: {sprint.historias.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {template.data.definition_of_done && (
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Definition of Done
              </h3>
              <ul className="space-y-2">
                {template.data.definition_of_done.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="text-green-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
