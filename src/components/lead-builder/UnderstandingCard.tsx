'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Understanding } from './types';

interface UnderstandingCardProps {
  understanding: Understanding | null;
  isLoading: boolean;
}

export function UnderstandingCard({ understanding, isLoading }: UnderstandingCardProps) {
  return (
    <Card data-testid="understanding-card">
      <CardHeader>
        <CardTitle className="text-sm">Verstanden</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div
            className="animate-pulse space-y-2"
            data-testid="understanding-loading"
          >
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ) : understanding ? (
          <div className="space-y-3" data-testid="understanding-content">
            <div>
              <span className="text-sm text-muted-foreground">Intent:</span>
              <p
                className="font-medium"
                data-testid="understanding-intent"
              >
                {understanding.intent}
              </p>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Erkannte Kriterien:</span>
              <div
                className="flex flex-wrap gap-1 mt-1"
                data-testid="understanding-entities"
              >
                {understanding.entities.map((entity, index) => (
                  <Badge key={index} variant="secondary">
                    {entity}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Konfidenz:</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${understanding.confidence * 100}%` }}
                    data-testid="understanding-confidence-bar"
                  />
                </div>
                <span
                  className="text-sm font-medium"
                  data-testid="understanding-confidence-value"
                >
                  {Math.round(understanding.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p
            className="text-muted-foreground text-sm"
            data-testid="understanding-empty"
          >
            Starte einen Chat um Lead-Kriterien zu definieren
          </p>
        )}
      </CardContent>
    </Card>
  );
}
