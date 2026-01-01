'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Template } from './types';

interface TemplatesTabProps {
  templates: Template[];
  onLoadTemplate: (template: Template) => void;
}

export function TemplatesTab({ templates, onLoadTemplate }: TemplatesTabProps) {
  return (
    <div data-testid="templates-tab">
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p
              className="text-muted-foreground"
              data-testid="templates-empty"
            >
              Keine gespeicherten Templates vorhanden.
              <br />
              Erstelle eine Suche und speichere sie als Template.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3" data-testid="templates-list">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onLoadTemplate(template)}
                data-testid={`template-item-${template.id}`}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadTemplate(template);
                      }}
                      data-testid={`template-load-${template.id}`}
                    >
                      Laden
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <pre className="text-xs text-muted-foreground truncate">
                    {template.query}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
