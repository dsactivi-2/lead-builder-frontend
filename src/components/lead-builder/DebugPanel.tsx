'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadBuilderState } from './types';

interface DebugPanelProps {
  data: unknown;
  state: LeadBuilderState;
}

const stateColors: Record<LeadBuilderState, string> = {
  idle: 'bg-gray-500',
  processing: 'bg-blue-500',
  understanding: 'bg-yellow-500',
  matching: 'bg-orange-500',
  complete: 'bg-green-500',
  error: 'bg-red-500',
};

export function DebugPanel({ data, state }: DebugPanelProps) {
  return (
    <div className="space-y-4" data-testid="debug-panel">
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Status</CardTitle>
            <Badge
              className={stateColors[state]}
              data-testid="debug-state"
            >
              {state}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Raw Response</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <pre
              className="text-xs bg-muted p-4 rounded-lg overflow-auto"
              data-testid="debug-raw-data"
            >
              {data ? JSON.stringify(data, null, 2) : 'Keine Daten'}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
