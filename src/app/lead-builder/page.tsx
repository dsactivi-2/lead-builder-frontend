'use client';

import { useReducer, useCallback } from 'react';
import { ChatPanel } from '@/components/lead-builder/ChatPanel';
import { OutputPanel } from '@/components/lead-builder/OutputPanel';
import { leadBuilderReducer, initialState } from '@/store/leadBuilderReducer';
import { api } from '@/lib/api';
import { config } from '@/config/runtime';
import { Template } from '@/components/lead-builder/types';

export default function LeadBuilderPage() {
  const [state, dispatch] = useReducer(leadBuilderReducer, initialState);

  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_STATE', payload: 'processing' });

    try {
      // Call API
      dispatch({ type: 'SET_STATE', payload: 'understanding' });

      const response = await api.leadBuilder.process({
        userInput: content,
        workspaceId: config.workspaceId,
        userId: config.userId,
      });

      dispatch({ type: 'SET_DEBUG_DATA', payload: response });

      // Update understanding
      dispatch({ type: 'SET_UNDERSTANDING', payload: response.understanding });
      dispatch({ type: 'SET_STATE', payload: 'matching' });

      // Update matches
      dispatch({
        type: 'SET_MATCHES',
        payload: {
          count: response.matches.count,
          matches: response.matches.preview,
        },
      });

      // Update artifacts
      dispatch({ type: 'SET_ARTIFACTS', payload: response.artifacts });

      // Add assistant response
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: `Ich habe ${response.matches.count} passende Leads gefunden basierend auf: ${response.understanding.intent}`,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });

      dispatch({ type: 'SET_STATE', payload: 'complete' });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten',
      });

      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
    }
  }, []);

  const handleSaveTemplate = useCallback(async (name: string) => {
    if (!state.artifacts) return;

    try {
      const result = await api.leadBuilder.saveTemplate({
        name,
        query: state.artifacts.query,
      });

      const newTemplate: Template = {
        id: result.id,
        name,
        query: state.artifacts.query,
        createdAt: new Date(),
      };

      dispatch({ type: 'ADD_TEMPLATE', payload: newTemplate });
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }, [state.artifacts]);

  const handleLoadTemplate = useCallback((template: Template) => {
    handleSendMessage(template.query);
  }, [handleSendMessage]);

  return (
    <div
      className="h-screen flex flex-col"
      data-testid="lead-builder-page"
    >
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold" data-testid="lead-builder-title">
          Lead Builder
        </h1>
        <p className="text-muted-foreground">
          Beschreibe deine idealen Leads und lass AI die passenden finden
        </p>
      </header>

      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="w-1/2">
          <ChatPanel
            messages={state.messages}
            onSendMessage={handleSendMessage}
            isProcessing={state.state === 'processing' || state.state === 'understanding' || state.state === 'matching'}
          />
        </div>

        <div className="w-1/2">
          <OutputPanel
            understanding={state.understanding}
            matchCount={state.matchCount}
            matches={state.matches}
            artifacts={state.artifacts}
            templates={state.templates}
            state={state.state}
            debugData={state.debugData}
            onSaveTemplate={handleSaveTemplate}
            onLoadTemplate={handleLoadTemplate}
          />
        </div>
      </main>
    </div>
  );
}
