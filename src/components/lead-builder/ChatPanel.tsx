'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message } from './types';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

export function ChatPanel({ messages, onSendMessage, isProcessing }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div
      className="flex flex-col h-full border rounded-lg"
      data-testid="chat-panel"
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
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`chat-message-${message.role}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beschreibe deine Lead-Kriterien..."
            className="min-h-[80px] resize-none"
            disabled={isProcessing}
            data-testid="chat-input"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isProcessing}
            data-testid="chat-send-button"
          >
            {isProcessing ? 'Verarbeite...' : 'Senden'}
          </Button>
        </div>
      </form>
    </div>
  );
}
