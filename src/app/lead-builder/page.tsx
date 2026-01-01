'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { ChatPanel } from '@/components/lead-builder/ChatPanel'
import { OutputPanel } from '@/components/lead-builder/OutputPanel'
import { SaveTemplateDialog } from '@/components/lead-builder/SaveTemplateDialog'
import { DebugPanel } from '@/components/lead-builder/DebugPanel'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useToast } from '@/components/ui/use-toast'
import { postDraft, postMatch, postRender, postConfirm, postTemplate } from '@/lib/api'
import type { ChatMessage, OutputTarget, ReuseMode, Artifact, MatchCandidate } from '@/components/lead-builder/types'

const STORAGE_KEY = 'lead-builder-messages'

export default function LeadBuilderPage() {
  const { toast } = useToast()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [outputTarget, setOutputTarget] = useState<OutputTarget>('lead_campaign_json')
  const [reuseMode, setReuseMode] = useState<ReuseMode>('auto')

  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([])

  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false)
  const [artifactError, setArtifactError] = useState<string | null>(null)

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveDialogLoading, setSaveDialogLoading] = useState(false)
  const [saveDialogError, setSaveDialogError] = useState<string | undefined>(undefined)

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setMessages(JSON.parse(saved))
      }
    } catch (e) {
      console.warn('Failed to load messages from localStorage:', e)
    }
  }, [])

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
      } catch (e) {
        console.warn('Failed to save messages to localStorage:', e)
      }
    }
  }, [messages])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + K = Clear chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        clearChat()
      }
      // Cmd/Ctrl + S = Export artifact (if exists)
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && artifact) {
        e.preventDefault()
        exportArtifact()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [artifact])

  function clearChat() {
    setMessages([])
    setArtifact(null)
    setMatchCandidates([])
    setArtifactError(null)
    localStorage.removeItem(STORAGE_KEY)
    toast({ title: 'Chat cleared' })
  }

  function exportArtifact() {
    if (!artifact) return

    const isText = artifact.type === 'call_prompt' || artifact.type === 'enrichment_prompt'
    const content = isText ? artifact.content : JSON.stringify(artifact.content, null, 2)
    const ext = isText ? 'txt' : 'json'
    const mimeType = isText ? 'text/plain' : 'application/json'

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `artifact-${artifact.type}-${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({ title: 'Artifact exported' })
  }

  function addAssistantUnderstanding(understanding: any, draftId: string) {
    setMessages((prev) => [...prev, { role: 'assistant', understanding, draftId }])
  }

  async function onSendMessage(text: string) {
    const input = text.trim()
    if (!input) return

    setArtifactError(null)
    setIsLoadingChat(true)

    setMessages((prev) => [...prev, { role: 'user', text: input }])

    try {
      const draftRes = await postDraft({ input_text: input, output_target: outputTarget, reuse_mode: reuseMode })
      addAssistantUnderstanding(draftRes.understanding, draftRes.draft_id)

      try {
        const matchRes = await postMatch({
          input_text: input,
          types: ['lead_campaign_json', 'lead_job_json', 'call_prompt', 'enrichment_prompt'],
          top_k: 5,
        })

        if (matchRes.hash_hit && reuseMode !== 'alwaysNew') {
          setIsLoadingArtifact(true)
          try {
            const renderRes = await postRender({
              template_id: matchRes.hash_hit.template_id,
              parameters: {},
              output_target: outputTarget,
            })
            setArtifact({ type: outputTarget, content: renderRes.content })
            setMatchCandidates([])
          } catch (e: any) {
            setArtifactError(e?.message || 'Render failed')
          } finally {
            setIsLoadingArtifact(false)
          }
        } else {
          setMatchCandidates(matchRes.candidates || [])
        }
      } catch {
        setMatchCandidates([])
      }
    } catch (e: any) {
      toast({
        title: 'Draft failed',
        description: e?.message || 'Unknown error',
        variant: 'destructive',
      })
      setMessages((prev) => [...prev, { role: 'assistant', text: `Error: ${e?.message || 'Draft failed'}` }])
    } finally {
      setIsLoadingChat(false)
    }
  }

  async function onConfirm(draftId: string, edits?: string) {
    setArtifactError(null)
    setIsLoadingArtifact(true)

    try {
      const res = await postConfirm({ draft_id: draftId, output_target: outputTarget, edits_text: edits || '' })
      setArtifact({ type: res.artifact.type, content: res.artifact.content })
      toast({ title: 'Artifact created' })
    } catch (e: any) {
      setArtifactError(e?.message || 'Confirm failed')
      toast({ title: 'Confirm failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setIsLoadingArtifact(false)
    }
  }

  function onReject(_draftId: string) {
    setArtifact(null)
    setMatchCandidates([])
    toast({ title: 'Draft rejected', description: 'You can send a new message.' })
  }

  async function onUseTemplate(templateId: string, type?: OutputTarget) {
    setArtifactError(null)
    setIsLoadingArtifact(true)

    try {
      const target = type ?? outputTarget
      const renderRes = await postRender({ template_id: templateId, parameters: {}, output_target: target })
      setArtifact({ type: target, content: renderRes.content })
      toast({ title: 'Template applied' })
    } catch (e: any) {
      setArtifactError(e?.message || 'Render failed')
    } finally {
      setIsLoadingArtifact(false)
    }
  }

  function onCreateNew() {
    setArtifact(null)
    setMatchCandidates([])
    toast({ title: 'Create new', description: 'Use Confirm to generate a fresh artifact.' })
  }

  function onSaveTemplateOpen() {
    if (!artifact) {
      toast({ title: 'No artifact', description: 'Generate an artifact first.', variant: 'destructive' })
      return
    }
    setSaveDialogError(undefined)
    setSaveDialogOpen(true)
  }

  async function onSaveTemplate(payload: { title: string; tags: string[] }) {
    if (!artifact) return

    setSaveDialogLoading(true)
    setSaveDialogError(undefined)

    try {
      await postTemplate({
        type: artifact.type,
        title: payload.title,
        tags: payload.tags,
        content: artifact.content,
      })
      setSaveDialogOpen(false)
      toast({ title: 'Template saved' })
    } catch (e: any) {
      setSaveDialogError(e?.message || 'Failed to save template')
    } finally {
      setSaveDialogLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="mx-auto max-w-7xl mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Lead Builder</h1>
        <div className="flex items-center gap-2">
          {artifact && (
            <Button variant="outline" size="sm" onClick={exportArtifact} data-testid="export-button">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearChat} data-testid="clear-chat">
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div>
          <ChatPanel messages={messages} isLoading={isLoadingChat} onSendMessage={onSendMessage} onConfirm={onConfirm} onReject={onReject} />
        </div>

        <div>
          <OutputPanel
            outputTarget={outputTarget}
            reuseMode={reuseMode}
            onOutputTargetChange={setOutputTarget}
            onReuseModeChange={setReuseMode}
            artifact={artifact}
            isLoadingArtifact={isLoadingArtifact}
            artifactError={artifactError}
            matchCandidates={matchCandidates}
            onUseTemplate={onUseTemplate}
            onCreateNew={onCreateNew}
            onSaveTemplate={onSaveTemplateOpen}
          />

          <div className="mt-4">
            <DebugPanel
              messages={messages}
              outputTarget={outputTarget}
              reuseMode={reuseMode}
              artifact={artifact}
              matchCandidates={matchCandidates}
              isLoadingChat={isLoadingChat}
              isLoadingArtifact={isLoadingArtifact}
              artifactError={artifactError}
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mx-auto max-w-7xl mt-4 text-center text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 bg-muted rounded">Cmd+K</kbd> Clear chat
        {artifact && (
          <>
            {' | '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded">Cmd+S</kbd> Export artifact
          </>
        )}
      </div>

      <SaveTemplateDialog
        open={saveDialogOpen}
        onOpenChange={(o) => {
          setSaveDialogOpen(o)
          if (!o) setSaveDialogError(undefined)
        }}
        onSave={onSaveTemplate}
        loading={saveDialogLoading}
        error={saveDialogError}
      />
    </div>
  )
}
