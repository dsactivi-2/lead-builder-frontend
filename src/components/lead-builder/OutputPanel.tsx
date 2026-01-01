'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArtifactViewer } from './ArtifactViewer'
import { TemplatesTab } from './TemplatesTab'
import { MatchBanner } from './MatchBanner'
import type { OutputTarget, ReuseMode, Artifact, MatchCandidate } from './types'

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
    <div className="space-y-4" data-testid="ui.output.panel">
      <div className="space-y-2">
        <Label>Output Type</Label>
        <Select value={outputTarget} onValueChange={(v) => onOutputTargetChange(v as OutputTarget)}>
          <SelectTrigger data-testid="ui.output.typeSelect">
            <SelectValue placeholder="Select output type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead_campaign_json">
              <span data-testid="ui.output.typeSelect.option.leadCampaignJson">Lead Campaign JSON</span>
            </SelectItem>
            <SelectItem value="lead_job_json">
              <span data-testid="ui.output.typeSelect.option.leadJobJson">Lead Job JSON</span>
            </SelectItem>
            <SelectItem value="call_prompt">
              <span data-testid="ui.output.typeSelect.option.callPrompt">Call Prompt</span>
            </SelectItem>
            <SelectItem value="enrichment_prompt">
              <span data-testid="ui.output.typeSelect.option.enrichmentPrompt">Enrichment Prompt</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Reuse Mode</Label>
        <RadioGroup value={reuseMode} onValueChange={(v) => onReuseModeChange(v as ReuseMode)} data-testid="ui.output.reuseMode">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="auto" id="reuse-auto" data-testid="ui.output.reuseMode.auto" />
            <Label htmlFor="reuse-auto">Auto</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="libraryOnly" id="reuse-library" data-testid="ui.output.reuseMode.libraryOnly" />
            <Label htmlFor="reuse-library">Library only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="alwaysNew" id="reuse-new" data-testid="ui.output.reuseMode.alwaysNew" />
            <Label htmlFor="reuse-new">Always new</Label>
          </div>
        </RadioGroup>
      </div>

      <MatchBanner candidates={matchCandidates} onUseTemplate={onUseTemplate} onCreateNew={onCreateNew} />

      <Tabs defaultValue="artifact" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="artifact">Artifact</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="artifact" className="space-y-3">
          <ArtifactViewer artifact={artifact} isLoading={isLoadingArtifact} error={artifactError} onSaveTemplate={onSaveTemplate} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab onUseTemplate={onUseTemplate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
