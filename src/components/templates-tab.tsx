"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileText, AlertCircle } from "lucide-react"
import { getTemplates } from "@/lib/api"
import type { TemplateItem, OutputTarget } from "@/types"

interface TemplatesTabProps {
  onUseTemplate: (templateId: string, type?: OutputTarget) => void
}

export function TemplatesTab({ onUseTemplate }: TemplatesTabProps) {
  const [templates, setTemplates] = React.useState<TemplateItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadTemplates() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await getTemplates()
        setTemplates(result.items)
      } catch (err: any) {
        setError(err.message || "Failed to load templates")
      } finally {
        setIsLoading(false)
      }
    }
    loadTemplates()
  }, [])

  if (isLoading) {
    return (
      <Card className="h-full" data-testid="templates-tab">
        <div className="flex h-full items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full" data-testid="templates-tab">
        <div className="flex h-full items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  if (templates.length === 0) {
    return (
      <Card className="h-full" data-testid="templates-tab">
        <div className="flex h-full items-center justify-center p-8" data-testid="templates-empty">
          <div className="flex flex-col items-center gap-3">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No saved templates yet.</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full" data-testid="templates-tab">
      <ScrollArea className="h-full p-4">
        <div className="space-y-2" data-testid="templates-list">
          {templates.map((template) => (
            <div
              key={template.template_id}
              className="flex items-start justify-between rounded-lg border bg-card p-3"
              data-testid={`template-item-${template.template_id}`}
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-sm">{template.title}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUseTemplate(template.template_id, template.type)}
                    data-testid={`template-load-${template.template_id}`}
                  >
                    Use
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {template.type.replace("_", " ")}
                  </Badge>
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">Used {template.usage_count}x</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
