'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MatchCandidate, OutputTarget } from './types';

interface MatchBannerProps {
  candidates: MatchCandidate[];
  onUseTemplate: (templateId: string, type?: OutputTarget) => void;
  onCreateNew: () => void;
}

export function MatchBanner({ candidates, onUseTemplate, onCreateNew }: MatchBannerProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <Card data-testid="match-banner" className="border-blue-200 bg-blue-50/50">
      <CardContent className="py-4">
        <div className="space-y-3" data-testid="match-content">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="match-count">
                {candidates.length} Similar Template{candidates.length > 1 ? 's' : ''}
              </Badge>
              <span className="text-muted-foreground text-sm">found</span>
            </div>
            <Button variant="outline" size="sm" onClick={onCreateNew} data-testid="match-create-new">
              Create New Instead
            </Button>
          </div>

          <div className="space-y-2" data-testid="match-preview">
            {candidates.slice(0, 3).map((candidate) => (
              <div
                key={candidate.template_id}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border"
                data-testid={`match-item-${candidate.template_id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{candidate.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {candidate.type.replace('_', ' ')}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(candidate.score * 100)}% match
                  </Badge>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onUseTemplate(candidate.template_id, candidate.type)}
                  data-testid={`match-use-${candidate.template_id}`}
                >
                  Use This
                </Button>
              </div>
            ))}
            {candidates.length > 3 && (
              <span className="text-muted-foreground text-sm">
                +{candidates.length - 3} more
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
