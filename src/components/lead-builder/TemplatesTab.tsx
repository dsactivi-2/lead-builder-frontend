'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getTemplates } from '@/lib/api';
import type { OutputTarget } from './types';

interface TemplateItem {
  template_id: string;
  type: OutputTarget;
  title: string;
  tags: string[];
  usage_count: number;
  last_used_at?: string;
}

interface TemplatesTabProps {
  onUseTemplate: (templateId: string, type?: OutputTarget) => void;
}

export function TemplatesTab({ onUseTemplate }: TemplatesTabProps) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getTemplates({});
        setTemplates(res.items || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load templates');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div data-testid="templates-tab">
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-pulse text-muted-foreground">Loading templates...</div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground" data-testid="templates-empty">
              No saved templates yet.
              <br />
              Create a search and save it as a template.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3" data-testid="templates-list">
            {templates.map((template) => (
              <Card
                key={template.template_id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onUseTemplate(template.template_id, template.type)}
                data-testid={`template-item-${template.template_id}`}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{template.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUseTemplate(template.template_id, template.type);
                      }}
                      data-testid={`template-load-${template.template_id}`}
                    >
                      Use
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {template.type.replace('_', ' ')}
                    </Badge>
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">
                      Used {template.usage_count}x
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
