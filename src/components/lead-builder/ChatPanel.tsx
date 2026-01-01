'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ChatMessage } from './types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onConfirm: (draftId: string, edits?: string) => void;
  onReject: (draftId: string) => void;
}

export function ChatPanel({ messages, isLoading, onSendMessage, onConfirm, onReject }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [editText, setEditText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && m.draftId);

  return (
    <div
      className="flex flex-col h-full border rounded-lg"
      data-testid="ui.chat.panel"
    >
      <div className="p-4 border-b">
        <h2 className="font-semibold">Lead Builder Chat</h2>
      </div>

      <ScrollArea
        className="flex-1 p-4"
        ref={scrollRef}
        data-testid="chat-messages"
      >
        <div className="space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`chat-message-${message.role}`}
            >
              {message.role === 'user' ? (
                <div className="max-w-[80%] rounded-lg p-3 bg-primary text-primary-foreground">
                  {message.text}
                </div>
              ) : message.understanding ? (
                <Card className="max-w-[90%]" data-testid="ui.builder.understandingCard">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <Badge variant="outline" className="mb-2">Verständnis</Badge>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {message.understanding.summary_bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    {message.understanding.assumptions.length > 0 && (
                      <div>
                        <Badge variant="secondary" className="mb-2">Annahmen</Badge>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {message.understanding.assumptions.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {message.understanding.questions.length > 0 && (
                      <div>
                        <Badge variant="destructive" className="mb-2">Rückfragen</Badge>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {message.understanding.questions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                  {message.text}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-muted animate-pulse">
                Verarbeite...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {lastAssistant?.draftId && (
        <div className="p-4 border-t bg-muted/50 space-y-3">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Optional: Korrekturen oder Ergänzungen..."
            className="min-h-[60px] resize-none"
            data-testid="ui.builder.editsInput"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                onConfirm(lastAssistant.draftId!, editText || undefined);
                setEditText('');
              }}
              disabled={isLoading}
              data-testid="ui.builder.confirm"
            >
              Bestätigen
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onReject(lastAssistant.draftId!);
                setEditText('');
              }}
              disabled={isLoading}
              data-testid="chat-reject-button"
            >
              Ablehnen
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beschreibe deine Lead-Kriterien..."
            className="min-h-[80px] resize-none"
            disabled={isLoading}
            data-testid="ui.chat.input"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            data-testid="ui.chat.send"
          >
            {isLoading ? 'Verarbeite...' : 'Senden'}
          </Button>
        </div>
      </form>
    </div>
  );
}
