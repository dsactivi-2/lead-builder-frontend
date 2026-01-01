'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage, OutputTarget, ReuseMode, Artifact, MatchCandidate } from './types';

interface DebugPanelProps {
  messages: ChatMessage[];
  outputTarget: OutputTarget;
  reuseMode: ReuseMode;
  artifact: Artifact | null;
  matchCandidates: MatchCandidate[];
  isLoadingChat: boolean;
  isLoadingArtifact: boolean;
  artifactError: string | null;
}

export function DebugPanel({
  messages,
  outputTarget,
  reuseMode,
  artifact,
  matchCandidates,
  isLoadingChat,
  isLoadingArtifact,
  artifactError,
}: DebugPanelProps) {
  const state = isLoadingChat
    ? 'processing'
    : isLoadingArtifact
    ? 'rendering'
    : artifactError
    ? 'error'
    : artifact
    ? 'complete'
    : 'idle';

  const stateColors: Record<string, string> = {
    idle: 'bg-gray-500',
    processing: 'bg-blue-500',
    rendering: 'bg-orange-500',
    complete: 'bg-green-500',
    error: 'bg-red-500',
  };

  const debugData = {
    state,
    outputTarget,
    reuseMode,
    messagesCount: messages.length,
    matchCandidatesCount: matchCandidates.length,
    hasArtifact: !!artifact,
    artifactError,
    artifact: artifact ? { type: artifact.type, contentKeys: Object.keys(artifact.content || {}) } : null,
  };

  return (
    <div className="space-y-4" data-testid="debug-panel">
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Status</CardTitle>
            <Badge
              className={stateColors[state]}
              data-testid="debug-state"
            >
              {state}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge variant="outline">Target: {outputTarget}</Badge>
            <Badge variant="outline">Reuse: {reuseMode}</Badge>
            <Badge variant="outline">Matches: {matchCandidates.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Debug Data</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <pre
              className="text-xs bg-muted p-4 rounded-lg overflow-auto"
              data-testid="debug-raw-data"
            >
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
