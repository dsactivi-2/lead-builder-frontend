'use client'

import { useState } from 'react'
import { ChatPanel } from '@/components/lead-builder/ChatPanel'
import { OutputPanel } from '@/components/lead-builder/OutputPanel'
import { SaveTemplateDialog } from '@/components/lead-builder/SaveTemplateDialog'
import { DebugPanel } from '@/components/lead-builder/DebugPanel'
import { useToast } from '@/components/ui/use-toast'
import { postDraft, postMatch, postRender, postConfirm, postTemplate } from '@/lib/api'
import type { ChatMessage, OutputTarget, ReuseMode, Artifact, MatchCandidate } from '@/components/lead-builder/types'

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
      // 1) Draft
      const draftRes = await postDraft({ input_text: input, output_target: outputTarget, reuse_mode: reuseMode })
      addAssistantUnderstanding(draftRes.understanding, draftRes.draft_id)

      // 2) Match (non-blocking)
      try {
        const matchRes = await postMatch({
          input_text: input,
          types: ['lead_campaign_json', 'lead_job_json', 'call_prompt', 'enrichment_prompt'],
          top_k: 5,
        })

        // Hash hit => auto render unless alwaysNew
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
