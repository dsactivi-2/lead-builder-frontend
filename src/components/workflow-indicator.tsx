"use client"

import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { BuilderPhase } from "@/lib/workflow"

interface WorkflowIndicatorProps {
  phase: BuilderPhase
}

const phaseLabels: Record<BuilderPhase, string> = {
  idle: "Ready",
  drafting: "Creating draft...",
  matching: "Finding templates...",
  hash_hit: "Exact match found",
  candidates: "Similar templates found",
  editing: "Editing",
  confirming: "Confirming...",
  artifact_ready: "Artifact ready",
  saving: "Saving template...",
  error: "Error",
}

const phaseColors: Record<BuilderPhase, "default" | "secondary" | "destructive" | "outline"> = {
  idle: "outline",
  drafting: "secondary",
  matching: "secondary",
  hash_hit: "default",
  candidates: "default",
  editing: "default",
  confirming: "secondary",
  artifact_ready: "default",
  saving: "secondary",
  error: "destructive",
}

const loadingPhases: BuilderPhase[] = ["drafting", "matching", "confirming", "saving"]

export function WorkflowIndicator({ phase }: WorkflowIndicatorProps) {
  const isLoading = loadingPhases.includes(phase)

  return (
    <div className="flex items-center gap-2" data-testid={`workflow.phase.${phase}`}>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" data-testid={`loading.${phase.replace("ing", "")}`} />}
      <Badge variant={phaseColors[phase]} className="font-mono text-xs">
        {phaseLabels[phase]}
      </Badge>
    </div>
  )
}
