"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import type { MatchCandidate, OutputTarget } from "@/types"

interface MatchBannerProps {
  candidates: MatchCandidate[]
  onUseTemplate: (templateId: string, type?: OutputTarget) => void
  onCreateNew: () => void
}

export function MatchBanner({ candidates, onUseTemplate, onCreateNew }: MatchBannerProps) {
  if (candidates.length === 0) return null

  return (
    <Card data-testid="ui.templates.matchBanner">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Badge variant="secondary">{candidates.length} Similar Templates</Badge>
            <span className="text-sm text-muted-foreground">found</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onCreateNew} data-testid="match-create-new">
            Create New Instead
          </Button>
        </div>

        <div className="space-y-2">
          {candidates.map((candidate) => {
            const matchPercent = Math.round(candidate.score * 100)
            return (
              <div
                key={candidate.template_id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
                data-testid={`ui.templates.candidateItem.${candidate.template_id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{candidate.title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {candidate.type.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {matchPercent}% match
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onUseTemplate(candidate.template_id, candidate.type)}
                  data-testid={`match-use-${candidate.template_id}`}
                >
                  Use This
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
