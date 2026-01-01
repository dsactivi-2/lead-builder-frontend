'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnderstandingCard } from './UnderstandingCard';
import { MatchBanner } from './MatchBanner';
import { ArtifactViewer } from './ArtifactViewer';
import { TemplatesTab } from './TemplatesTab';
import { DebugPanel } from './DebugPanel';
import { Understanding, Match, Artifacts, Template, LeadBuilderState } from './types';

interface OutputPanelProps {
  understanding: Understanding | null;
  matchCount: number;
  matches: Match[];
  artifacts: Artifacts | null;
  templates: Template[];
  state: LeadBuilderState;
  debugData: unknown;
  onSaveTemplate: (name: string) => void;
  onLoadTemplate: (template: Template) => void;
}

export function OutputPanel({
  understanding,
  matchCount,
  matches,
  artifacts,
  templates,
  state,
  debugData,
  onSaveTemplate,
  onLoadTemplate,
}: OutputPanelProps) {
  const isLoading = state === 'processing' || state === 'understanding' || state === 'matching';

  return (
    <div className="flex flex-col h-full border rounded-lg" data-testid="output-panel">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Ergebnisse</h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="results" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4" data-testid="output-tabs">
            <TabsTrigger value="results" data-testid="tab-results">
              Ergebnisse
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              Templates
            </TabsTrigger>
            <TabsTrigger value="debug" data-testid="tab-debug">
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="flex-1 overflow-auto p-4 space-y-4">
            <UnderstandingCard
              understanding={understanding}
              isLoading={state === 'understanding'}
            />
            <MatchBanner
              matchCount={matchCount}
              matches={matches}
              isLoading={state === 'matching'}
            />
            <ArtifactViewer
              artifacts={artifacts}
              isLoading={isLoading}
              onSaveAsTemplate={onSaveTemplate}
            />
          </TabsContent>

          <TabsContent value="templates" className="flex-1 overflow-auto p-4">
            <TemplatesTab
              templates={templates}
              onLoadTemplate={onLoadTemplate}
            />
          </TabsContent>

          <TabsContent value="debug" className="flex-1 overflow-auto p-4">
            <DebugPanel data={debugData} state={state} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
