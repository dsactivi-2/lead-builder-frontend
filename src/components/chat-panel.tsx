"use client"

import * as React from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ChatMessage } from "@/types"

interface ChatPanelProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSendMessage: (text: string) => void
  onConfirm: (draftId: string, edits?: string) => void
  onReject: (draftId: string) => void
}

export function ChatPanel({ messages, isLoading, onSendMessage, onConfirm, onReject }: ChatPanelProps) {
  const [inputText, setInputText] = React.useState("")
  const [editsMap, setEditsMap] = React.useState<Record<string, string>>({})
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const text = inputText.trim()
    if (text && !isLoading) {
      onSendMessage(text)
      setInputText("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col" data-testid="ui.chat.panel">
      <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === "user" ? (
                <div className="flex justify-end" data-testid="chat-message-user">
                  <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start" data-testid="chat-message-assistant">
                  <div className="max-w-[80%] space-y-3">
                    {msg.understanding && (
                      <Card className="p-4" data-testid="ui.builder.understandingCard">
                        <div className="space-y-3">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              Verständnis
                            </Badge>
                            <ul className="space-y-1 text-sm">
                              {msg.understanding.summary_bullets.map((bullet, i) => (
                                <li key={i} className="flex gap-2">
                                  <span>•</span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {msg.understanding.assumptions.length > 0 && (
                            <div>
                              <Badge variant="secondary" className="mb-2">
                                Annahmen
                              </Badge>
                              <ul className="space-y-1 text-sm text-muted-foreground">
                                {msg.understanding.assumptions.map((assumption, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span>•</span>
                                    <span>{assumption}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.understanding.questions.length > 0 && (
                            <div>
                              <Badge variant="destructive" className="mb-2">
                                Rückfragen
                              </Badge>
                              <ul className="space-y-1 text-sm text-destructive">
                                {msg.understanding.questions.map((question, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span>•</span>
                                    <span>{question}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {msg.draftId && (
                          <div className="mt-4 space-y-3 border-t pt-4">
                            <Textarea
                              placeholder="Optional: Korrekturen oder Änderungen..."
                              value={editsMap[msg.draftId] || ""}
                              onChange={(e) =>
                                setEditsMap((prev) => ({
                                  ...prev,
                                  [msg.draftId!]: e.target.value,
                                }))
                              }
                              className="min-h-[80px]"
                              data-testid="ui.builder.editsInput"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => onConfirm(msg.draftId!, editsMap[msg.draftId!] || "")}
                                data-testid="ui.builder.confirm"
                              >
                                Bestätigen
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => onReject(msg.draftId!)}
                                data-testid="ui.builder.reject"
                              >
                                Ablehnen
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    )}

                    {msg.text && !msg.understanding && (
                      <div className="rounded-lg bg-muted px-4 py-2">
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Beschreibe was du brauchst..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
            data-testid="ui.chat.input"
          />
          <Button onClick={handleSend} disabled={!inputText.trim() || isLoading} size="icon" data-testid="ui.chat.send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
