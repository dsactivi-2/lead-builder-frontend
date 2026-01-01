"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react"

interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (payload: { title: string; tags: string[] }) => Promise<void> | void
  loading?: boolean
  error?: string
}

export function SaveTemplateDialog({ open, onOpenChange, onSave, loading = false, error }: SaveTemplateDialogProps) {
  const [title, setTitle] = React.useState("")
  const [tagsInput, setTagsInput] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | undefined>(error)

  React.useEffect(() => {
    if (!open) {
      setTitle("")
      setTagsInput("")
      setSubmitError(undefined)
      setIsSubmitting(false)
    }
  }, [open])

  React.useEffect(() => {
    setSubmitError(error)
  }, [error])

  const parsedTags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)

  const handleSave = async () => {
    if (!title.trim()) {
      setSubmitError("Title is required")
      return
    }

    setIsSubmitting(true)
    setSubmitError(undefined)

    try {
      await onSave({ title: title.trim(), tags: parsedTags })
      onOpenChange(false)
    } catch (error: any) {
      setSubmitError(error.message || "Failed to save template")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-title">Title</Label>
            <Input
              id="template-title"
              placeholder="e.g. SHK Westbalkan DE"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="ui.templateSave.title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-tags">Tags (comma-separated)</Label>
            <Input
              id="template-tags"
              placeholder="e.g. SHK, DE, Westbalkan"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              data-testid="ui.templateSave.tags"
            />
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-xs text-muted-foreground">Parsed:</span>
                {parsedTags.map((tag, i) => (
                  <React.Fragment key={i}>
                    <span className="text-xs text-muted-foreground">{tag}</span>
                    {i < parsedTags.length - 1 && <span className="text-xs text-muted-foreground">·</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-3">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid="ui.templateSave.cancel"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !title.trim()} data-testid="ui.templateSave.save">
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
