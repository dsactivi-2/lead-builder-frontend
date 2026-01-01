'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (payload: { title: string; tags: string[] }) => Promise<void> | void
  loading?: boolean
  error?: string
}

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function SaveTemplateDialog({ open, onOpenChange, onSave, loading, error }: Props) {
  const [title, setTitle] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const tags = useMemo(() => parseTags(tagsRaw), [tagsRaw])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setTagsRaw('')
      setLocalError(null)
    }
  }, [open])

  async function handleSave() {
    setLocalError(null)
    if (!title.trim()) {
      setLocalError('Title is required')
      return
    }
    await onSave({ title: title.trim(), tags })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Save Template">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SHK Westbalkan DE – 200 leads"
              data-testid="ui.templateSave.title"
              disabled={!!loading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <Input
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="e.g. SHK, DE, Westbalkan"
              data-testid="ui.templateSave.tags"
              disabled={!!loading}
            />
            <div className="text-xs text-muted-foreground">{tags.length ? `Parsed: ${tags.join(' · ')}` : 'No tags'}</div>
          </div>

          {localError ? <div className="text-sm text-red-600">{localError}</div> : null}
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="ui.templateSave.cancel" disabled={!!loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="ui.templateSave.save" disabled={!!loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
