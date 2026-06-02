'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Maximize2, MessageCircle, Minimize2, PawPrint, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const starterPrompts = [
  'What needs attention today?',
  'Summarise open call logs.',
  'Which animals are ready for release?',
  'Help me check compliance gaps.',
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function WallyMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative grid size-10 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-primary/20',
        className
      )}
      aria-hidden="true"
    >
      <PawPrint className="size-5 opacity-95" />
      <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border border-background bg-accent text-[10px] font-bold leading-none text-accent-foreground">
        W
      </span>
    </div>
  );
}

function renderMessage(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => (
      <p key={`${block.slice(0, 18)}-${index}`} className="whitespace-pre-wrap leading-relaxed">
        {block}
      </p>
    ));
}

export function WallyAssistant() {
  const { isSignedIn, isLoaded } = useUser();
  const { organization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: makeId(),
      role: 'assistant',
      content:
        "Hi, I'm Wally. Ask me about your caseload, call logs, reminders, reporting prep, or where to record something in WildTrack360.",
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  if (!isLoaded || !isSignedIn || !organization) {
    return null;
  }

  async function sendMessage(promptOverride?: string) {
    const prompt = (promptOverride ?? input).trim();
    if (!prompt || isStreaming) return;

    const userMessage: AssistantMessage = {
      id: makeId(),
      role: 'user',
      content: prompt,
    };
    const assistantMessage: AssistantMessage = {
      id: makeId(),
      role: 'assistant',
      content: '',
    };
    const nextMessages = [...messages, userMessage, assistantMessage];

    setMessages(nextMessages);
    setInput('');
    setOpen(true);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/wally', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.content.trim().length > 0)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || 'Wally is unavailable right now.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        streamedText += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: streamedText }
              : message
          )
        );
      }

      const tail = decoder.decode();
      if (tail) {
        streamedText += tail;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: streamedText }
              : message
          )
        );
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Wally is unavailable right now.';
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id
            ? {
                ...item,
                content:
                  'I could not get a response from Bedrock just now. Check the AWS Bedrock credentials, region, and model access, then try again.',
              }
            : item
        )
      );
      toast.error(message);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {open && (
        <section
          aria-label="Wally the Wallaby AI assistant"
          className={cn(
            'flex max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl sm:w-[390px]',
            expanded && 'sm:w-[620px]'
          )}
        >
          <div className="flex items-center gap-3 border-b border-border bg-muted/45 px-4 py-3">
            <WallyMark className="size-9" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">Wally the Wallaby</h2>
              <p className="truncate text-xs text-muted-foreground">AI assistant powered by AWS Bedrock</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden size-8 sm:inline-flex"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? 'Shrink Wally' : 'Expand Wally'}
            >
              {expanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setOpen(false)}
              aria-label="Close Wally"
            >
              <X className="size-4" />
            </Button>
          </div>

          <ScrollArea ref={viewportRef} className="h-[min(520px,calc(100vh-17rem))] px-4 py-4">
            <div className="space-y-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                      <Bot className="size-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[82%] rounded-lg px-3 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-background'
                    )}
                  >
                    {message.content ? (
                      <div className="space-y-2">{renderMessage(message.content)}</div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span>Wally is thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      onClick={() => void sendMessage(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          <form className="border-t border-border bg-muted/35 p-3" onSubmit={handleSubmit}>
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Wally..."
                className="max-h-32 min-h-11 resize-none bg-background text-sm"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <Button type="button" variant="outline" size="icon" onClick={stopStreaming} aria-label="Stop Wally">
                  <X className="size-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send to Wally">
                  <Send className="size-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              Review AI output before acting. Health, release, and licence decisions still need the right human sign-off.
            </p>
          </form>
        </section>
      )}

      <Button
        type="button"
        className="h-12 rounded-full px-4 shadow-xl shadow-primary/25"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close Wally the Wallaby' : 'Open Wally the Wallaby'}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        <span>Wally</span>
      </Button>
    </div>
  );
}
