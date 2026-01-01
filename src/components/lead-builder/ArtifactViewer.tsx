'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { Artifacts } from './types';

interface ArtifactViewerProps {
  artifacts: Artifacts | null;
  isLoading: boolean;
  onSaveAsTemplate: (name: string) => void;
}

export function ArtifactViewer({ artifacts, isLoading, onSaveAsTemplate }: ArtifactViewerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  return (
    <>
      <Card data-testid="artifact-viewer">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Generierte Artefakte</CardTitle>
          {artifacts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              data-testid="artifact-save-button"
            >
              Als Template speichern
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div
              className="animate-pulse space-y-2"
              data-testid="artifact-loading"
            >
              <div className="h-24 bg-muted rounded" />
            </div>
          ) : artifacts ? (
            <Tabs defaultValue="query" data-testid="artifact-tabs">
              <TabsList>
                <TabsTrigger value="query">Query</TabsTrigger>
                <TabsTrigger value="filters">Filter</TabsTrigger>
              </TabsList>

              <TabsContent value="query">
                <pre
                  className="bg-muted p-4 rounded-lg overflow-auto text-sm"
                  data-testid="artifact-query"
                >
                  {artifacts.query}
                </pre>
              </TabsContent>

              <TabsContent value="filters">
                <pre
                  className="bg-muted p-4 rounded-lg overflow-auto text-sm"
                  data-testid="artifact-filters"
                >
                  {JSON.stringify(artifacts.filters, null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          ) : (
            <p
              className="text-muted-foreground text-sm"
              data-testid="artifact-empty"
            >
              Noch keine Artefakte generiert
            </p>
          )}
        </CardContent>
      </Card>

      <SaveTemplateDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={(name) => {
          onSaveAsTemplate(name);
          setShowSaveDialog(false);
        }}
      />
    </>
  );
}
