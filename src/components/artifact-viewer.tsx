"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, FileText } from "lucide-react"
import type { Artifact } from "@/types"

interface ArtifactViewerProps {
  artifact: Artifact | null
  isLoading: boolean
  error: string | null
  onSaveTemplate: () => void
}

export function ArtifactViewer({ artifact, isLoading, error, onSaveTemplate }: ArtifactViewerProps) {
  const canSave = artifact && !isLoading && !error

  return (
    <div className="h-full" data-testid="ui.artifact.viewer">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-semibold">Generated Artifact</CardTitle>
          {canSave && (
            <Button variant="outline" size="sm" onClick={onSaveTemplate} data-testid="artifact-save-button">
              <FileText className="mr-2 h-4 w-4" />
              Save as Template
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12" data-testid="artifact-loading">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating artifact...</p>
            </div>
          )}

          {error && (
            <div
              className="flex flex-col items-center justify-center rounded-lg border border-destructive bg-destructive/10 py-12"
              data-testid="artifact-error"
            >
              <AlertCircle className="mb-4 h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!isLoading && !error && !artifact && (
            <div
              className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12"
              data-testid="artifact-empty"
            >
              <FileText className="mb-4 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No artifact generated yet</p>
            </div>
          )}

          {!isLoading && !error && artifact && (
            <div className="space-y-3">
              <Badge variant="secondary">{artifact.type}</Badge>
              <pre
                className="max-h-[500px] overflow-auto rounded-lg bg-muted p-4 text-xs"
                data-testid="artifact-content"
              >
                <code>
                  {typeof artifact.content === "string" ? artifact.content : JSON.stringify(artifact.content, null, 2)}
                </code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
