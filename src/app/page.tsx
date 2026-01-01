"use client"

import * as React from "react"
import { Download, Trash2, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ChatPanel } from "@/components/chat-panel"
import { OutputPanel } from "@/components/output-panel"
import { SaveTemplateDialog } from "@/components/save-template-dialog"
import { ErrorPanel } from "@/components/error-panel"
import { WorkflowIndicator } from "@/components/workflow-indicator"
import { useToast } from "@/hooks/use-toast"
import { useBuilderWorkflow } from "@/hooks/useBuilderWorkflow"
import { saveTemplate } from "@/lib/api"
import type { OutputTarget, ReuseMode } from "@/lib/contracts"
import type { ChatMessage } from "@/types"

const STORAGE_KEY = "lead-builder-messages"

export default function LeadBuilderPage() {
  const { toast } = useToast()
  const workflow = useBuilderWorkflow()

  // Local UI state
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [outputTarget, setOutputTarget] = React.useState<OutputTarget>("lead_campaign_json")
  const [reuseMode, setReuseMode] = React.useState<ReuseMode>("auto")
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false)
  const [editsText, setEditsText] = React.useState("")

  // Load messages from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setMessages(parsed)
      }
    } catch (error) {
      console.error("[v0] Failed to load messages:", error)
    }
  }, [])

  // Save messages to localStorage
  React.useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        handleClearChat()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (workflow.state.phase === "artifact_ready") {
          handleSaveTemplate()
        }
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [workflow.state.phase])

  const handleSendMessage = async (text: string) => {
    const userMessage: ChatMessage = { role: "user", text }
    setMessages((prev) => [...prev, userMessage])

    // Call workflow state machine
    await workflow.sendMessage(text, outputTarget, reuseMode)

    // Add understanding to messages if available
    if (
      workflow.state.phase === "editing" ||
      workflow.state.phase === "candidates" ||
      workflow.state.phase === "hash_hit"
    ) {
      // Mock understanding for now - in real app, store from draft response
      const assistantMessage: ChatMessage = {
        role: "assistant",
        understanding: {
          summary_bullets: ["Processing request..."],
          assumptions: [],
          questions: [],
        },
        draftId: workflow.state.draftId || undefined,
      }
      setMessages((prev) => [...prev, assistantMessage])
    }
  }

  const handleConfirm = async (draftId: string, edits?: string) => {
    setEditsText(edits || "")
    await workflow.confirmEdits(edits || "")

    if (workflow.state.phase === "artifact_ready") {
      toast({ title: "Artifact created", description: "Your artifact has been generated successfully" })
    }
  }

  const handleReject = (draftId: string) => {
    workflow.rejectDraft()
    toast({ title: "Draft rejected", description: "You can send a new message to try again" })
  }

  const handleUseTemplate = async (templateId: string, type?: OutputTarget) => {
    await workflow.selectTemplate(templateId, type || outputTarget)

    if (workflow.state.phase === "artifact_ready") {
      toast({ title: "Template applied", description: "Template loaded successfully" })
    }
  }

  const handleCreateNew = () => {
    workflow.createNew()
    toast({ title: "Creating new", description: "Match candidates cleared" })
  }

  const handleSaveTemplate = () => {
    if (!workflow.state.artifact) {
      toast({
        variant: "destructive",
        title: "No artifact",
        description: "Generate an artifact first before saving",
      })
      return
    }
    setSaveDialogOpen(true)
  }

  const handleSaveTemplateSubmit = async (payload: { title: string; tags: string[] }) => {
    if (!workflow.state.artifact) return

    try {
      await saveTemplate(workflow.state.artifact.type, payload.title, payload.tags, workflow.state.artifact.content)
      toast({ title: "Template saved", description: "Your template has been saved to the library" })
      setSaveDialogOpen(false)
    } catch (error: any) {
      // If conflict, show error but keep dialog open
      if (error.kind === "conflict") {
        throw error // Let dialog handle it
      }
      toast({ variant: "destructive", title: "Error", description: error.message })
      throw error
    }
  }

  const handleExport = () => {
    if (!workflow.state.artifact) {
      toast({
        variant: "destructive",
        title: "No artifact",
        description: "Generate an artifact first before exporting",
      })
      return
    }

    const isJson = workflow.state.artifact.type.includes("json")
    const content = isJson
      ? JSON.stringify(workflow.state.artifact.content, null, 2)
      : String(workflow.state.artifact.content)
    const filename = `artifact-${Date.now()}.${isJson ? "json" : "txt"}`
    const blob = new Blob([content], { type: isJson ? "application/json" : "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    toast({ title: "Artifact exported", description: `Saved as ${filename}` })
  }

  const handleClearChat = () => {
    setMessages([])
    setEditsText("")
    workflow.reset()
    localStorage.removeItem(STORAGE_KEY)
    toast({ title: "Chat cleared", description: "All messages and artifacts have been cleared" })
  }

  const isLoadingChat = ["drafting", "matching"].includes(workflow.state.phase)
  const isLoadingArtifact = ["confirming", "saving"].includes(workflow.state.phase)

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Lead Builder</h1>
          <WorkflowIndicator phase={workflow.state.phase} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={workflow.state.phase !== "artifact_ready"}
            data-testid="export-button"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearChat} data-testid="clear-chat">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2 md:gap-6 md:p-6">
          <div className="flex flex-col overflow-hidden">
            {workflow.state.phase === "error" && workflow.state.error && (
              <ErrorPanel
                error={workflow.state.error}
                onRetry={() => {
                  // Retry last action based on context
                  if (workflow.state.draftId) {
                    workflow.confirmEdits(editsText)
                  } else {
                    workflow.reset()
                  }
                }}
                onReset={() => workflow.reset()}
              />
            )}
            <ChatPanel
              messages={messages}
              isLoading={isLoadingChat}
              onSendMessage={handleSendMessage}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          </div>
          <div className="flex flex-col overflow-hidden">
            <OutputPanel
              outputTarget={outputTarget}
              reuseMode={reuseMode}
              onOutputTargetChange={setOutputTarget}
              onReuseModeChange={setReuseMode}
              artifact={workflow.state.artifact}
              isLoadingArtifact={isLoadingArtifact}
              artifactError={workflow.state.error?.message || null}
              matchCandidates={workflow.state.matchCandidates}
              onUseTemplate={handleUseTemplate}
              onCreateNew={handleCreateNew}
              onSaveTemplate={handleSaveTemplate}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-2 text-center">
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>Shortcuts: Cmd/Ctrl+K to clear | Cmd/Ctrl+S to save template</span>
        </p>
      </footer>

      {/* Dialogs */}
      <SaveTemplateDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} onSave={handleSaveTemplateSubmit} />
    </div>
  )
}
