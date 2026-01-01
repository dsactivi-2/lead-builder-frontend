'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Artifact } from './types';

interface ArtifactViewerProps {
  artifact: Artifact | null;
  isLoading: boolean;
  error: string | null;
  onSaveTemplate: () => void;
}

export function ArtifactViewer({ artifact, isLoading, error, onSaveTemplate }: ArtifactViewerProps) {
  const isText = artifact?.type === 'call_prompt' || artifact?.type === 'enrichment_prompt';

  return (
    <Card data-testid="artifact-viewer">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Generated Artifact</CardTitle>
        {artifact && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveTemplate}
            data-testid="artifact-save-button"
          >
            Save as Template
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2" data-testid="artifact-loading">
            <div className="h-24 bg-muted rounded" />
          </div>
        ) : error ? (
          <div className="text-red-600 text-sm" data-testid="artifact-error">
            {error}
          </div>
        ) : artifact ? (
          <div className="space-y-3">
            <Badge variant="outline">{artifact.type}</Badge>
            <ScrollArea className="h-[300px]">
              <pre
                className="bg-muted p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap"
                data-testid="artifact-content"
              >
                {isText
                  ? artifact.content
                  : JSON.stringify(artifact.content, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm" data-testid="artifact-empty">
            No artifact generated yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
