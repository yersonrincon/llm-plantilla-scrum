'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import DocumentManager from '@/components/DocumentManager';
import TemplateGenerator from '@/components/TemplateGenerator';

type Tab = 'chat' | 'documents' | 'templates';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            🚀 Scrum LLM Assistant
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Sistema inteligente con Hermes + Ollama para generación de plantillas Scrum basadas en casos de uso
          </p>
        </header>

        <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'chat'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            💬 Chat con IA
            {activeTab === 'chat' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'documents'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            📚 Documentos (RAG)
            {activeTab === 'documents' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'templates'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            ✨ Plantillas Scrum
            {activeTab === 'templates' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        <div className="min-h-[600px]">
          {activeTab === 'chat' && (
            <div className="h-[calc(100vh-280px)]">
              <ChatInterface />
            </div>
          )}
          
          {activeTab === 'documents' && <DocumentManager />}
          
          {activeTab === 'templates' && <TemplateGenerator />}
        </div>

        <footer className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                🤖 Modelo LLM
              </h3>
              <p>Hermes 3 via Ollama</p>
              <p className="text-xs mt-1">Compatible con tarjetas AMD RX</p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                🔍 Sistema RAG
              </h3>
              <p>Base de datos SQLite local</p>
              <p className="text-xs mt-1">Embeddings con nomic-embed-text</p>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                📋 Metodología
              </h3>
              <p>Plantillas Scrum automáticas</p>
              <p className="text-xs mt-1">Basadas en casos de uso</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
