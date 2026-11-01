'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRAG, setUseRAG] = useState(true);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, useRAG })
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${data.error}\n${data.details || ''}`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error de conexión: ${error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Chat con Hermes (Ollama)
        </h2>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={useRAG}
            onChange={(e) => setUseRAG(e.target.checked)}
            className="rounded"
          />
          Usar RAG
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 dark:text-zinc-400 mt-8">
            <p className="text-lg font-medium mb-2">
              ¡Hola! Soy tu asistente Scrum con IA
            </p>
            <p className="text-sm">
              Pregúntame sobre metodología Scrum, casos de uso o gestión de proyectos
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg 
                     bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50
                     focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
