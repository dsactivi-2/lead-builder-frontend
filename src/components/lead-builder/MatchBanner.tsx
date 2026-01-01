'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Match } from './types';

interface MatchBannerProps {
  matchCount: number;
  matches: Match[];
  isLoading: boolean;
}

export function MatchBanner({ matchCount, matches, isLoading }: MatchBannerProps) {
  return (
    <Card data-testid="match-banner">
      <CardContent className="py-4">
        {isLoading ? (
          <div
            className="animate-pulse flex items-center gap-4"
            data-testid="match-loading"
          >
            <div className="h-8 w-24 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        ) : matchCount > 0 ? (
          <div className="space-y-3" data-testid="match-content">
            <div className="flex items-center gap-3">
              <Badge
                variant="default"
                className="text-lg px-3 py-1"
                data-testid="match-count"
              >
                {matchCount} Matches
              </Badge>
              <span className="text-muted-foreground">
                gefunden basierend auf deinen Kriterien
              </span>
            </div>

            {matches.length > 0 && (
              <div className="flex flex-wrap gap-2" data-testid="match-preview">
                {matches.slice(0, 5).map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-2 bg-muted rounded-full px-3 py-1"
                    data-testid={`match-item-${match.id}`}
                  >
                    <span className="text-sm">{match.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(match.score * 100)}%
                    </Badge>
                  </div>
                ))}
                {matches.length > 5 && (
                  <span className="text-muted-foreground text-sm self-center">
                    +{matches.length - 5} weitere
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p
            className="text-muted-foreground"
            data-testid="match-empty"
          >
            Noch keine Matches - definiere Lead-Kriterien im Chat
          </p>
        )}
      </CardContent>
    </Card>
  );
}
