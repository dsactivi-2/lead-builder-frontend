"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArtifactViewer } from "@/components/artifact-viewer"
import { MatchBanner } from "@/components/match-banner"
import { TemplatesTab } from "@/components/templates-tab"
import type { OutputTarget, ReuseMode, Artifact, MatchCandidate } from "@/types"

interface OutputPanelProps {
  outputTarget: OutputTarget
  reuseMode: ReuseMode
  onOutputTargetChange: (target: OutputTarget) => void
  onReuseModeChange: (mode: ReuseMode) => void
  artifact: Artifact | null
  isLoadingArtifact: boolean
  artifactError: string | null
  matchCandidates: MatchCandidate[]
  onUseTemplate: (templateId: string, type?: OutputTarget) => void
  onCreateNew: () => void
  onSaveTemplate: () => void
}

const OUTPUT_TARGET_LABELS: Record<OutputTarget, string> = {
  lead_campaign_json: "Lead Campaign (JSON)",
  lead_job_json: "Lead Job (JSON)",
  call_prompt: "Call Prompt",
  enrichment_prompt: "Enrichment Prompt",
}

export function OutputPanel({
  outputTarget,
  reuseMode,
  onOutputTargetChange,
  onReuseModeChange,
  artifact,
  isLoadingArtifact,
  artifactError,
  matchCandidates,
  onUseTemplate,
  onCreateNew,
  onSaveTemplate,
}: OutputPanelProps) {
  return (
    <div className="flex h-full flex-col" data-testid="ui.output.panel">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Output Configuration</CardTitle>
          <CardDescription className="text-xs">Configure what you want to generate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="output-type">Output Type</Label>
            <Select value={outputTarget} onValueChange={(v) => onOutputTargetChange(v as OutputTarget)}>
              <SelectTrigger id="output-type" data-testid="ui.output.typeSelect">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OUTPUT_TARGET_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reuse Mode</Label>
            <RadioGroup
              value={reuseMode}
              onValueChange={(v) => onReuseModeChange(v as ReuseMode)}
              data-testid="ui.output.reuseMode"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="mode-auto" data-testid="ui.output.reuseMode.auto" />
                <Label htmlFor="mode-auto" className="font-normal">
                  Auto (Smart detection)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="libraryOnly" id="mode-reuse" data-testid="ui.output.reuseMode.libraryOnly" />
                <Label htmlFor="mode-reuse" className="font-normal">
                  Library only (Reuse existing)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="alwaysNew" id="mode-new" data-testid="ui.output.reuseMode.alwaysNew" />
                <Label htmlFor="mode-new" className="font-normal">
                  Always new (Never reuse)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {matchCandidates.length > 0 && (
        <div className="mb-4">
          <MatchBanner candidates={matchCandidates} onUseTemplate={onUseTemplate} onCreateNew={onCreateNew} />
        </div>
      )}

      <Tabs defaultValue="artifact" className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="artifact" className="flex-1">
            Artifact
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1">
            Templates
          </TabsTrigger>
        </TabsList>
        <TabsContent value="artifact" className="h-[calc(100%-2.5rem)]">
          <ArtifactViewer
            artifact={artifact}
            isLoading={isLoadingArtifact}
            error={artifactError}
            onSaveTemplate={onSaveTemplate}
          />
        </TabsContent>
        <TabsContent value="templates" className="h-[calc(100%-2.5rem)]">
          <TemplatesTab onUseTemplate={onUseTemplate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
