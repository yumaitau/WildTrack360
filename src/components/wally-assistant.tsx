'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Maximize2, Minimize2, Send, ShieldCheck, X } from 'lucide-react';
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

type AssistantMode = 'closed' | 'popup' | 'fullscreen';

const wallyAvatarSrc = '/assistants/wally-avatar.png';

const starterPrompts = [
  'What needs attention today?',
  'Summarise open call logs.',
  'Which animals are ready for release?',
  'Help me check compliance gaps.',
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function WallyMark({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full border border-primary/30 bg-muted shadow-lg shadow-primary/20',
        className
      )}
      aria-hidden="true"
    >
      <Image
        src={wallyAvatarSrc}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 640px) 64px, 96px"
        className="object-cover"
      />
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

function WallyTrustNotice({ fullscreen = false }: { fullscreen?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border border-primary/20 bg-primary/10 text-primary',
        fullscreen ? 'px-4 py-3' : 'mx-3 mt-3 px-3 py-2'
      )}
    >
      <div className="flex gap-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className={cn('font-medium', fullscreen ? 'text-sm' : 'text-xs')}>
            Sovereign Australian AI, protected by enterprise-grade security
          </p>
          <p className={cn('leading-relaxed text-primary/85', fullscreen ? 'text-sm' : 'text-[11px]')}>
            Wally runs through AWS Bedrock&apos;s Australia geography. WildTrack360 does not store Wally conversations,
            and prompts or responses are not used to train the model.
          </p>
        </div>
      </div>
    </div>
  );
}

export function WallyAssistant() {
  const { isSignedIn, isLoaded } = useUser();
  const { organization } = useOrganization();
  const [mode, setMode] = useState<AssistantMode>('closed');
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
  }, [messages, mode]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (mode !== 'fullscreen') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mode]);

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
    setMode((current) => (current === 'closed' ? 'popup' : current));
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

  const isOpen = mode !== 'closed';
  const isFullscreen = mode === 'fullscreen';

  return (
    <div
      className={cn(
        'fixed z-40 flex flex-col items-end gap-3',
        isFullscreen
          ? 'inset-0 bg-foreground/25 p-0 backdrop-blur-sm'
          : 'bottom-4 right-4 sm:bottom-5 sm:right-5'
      )}
    >
      {isOpen && (
        <section
          aria-label="Wally the Wallaby AI assistant"
          className={cn(
            'flex flex-col overflow-hidden border border-border bg-popover text-popover-foreground shadow-2xl',
            isFullscreen
              ? 'h-full w-full rounded-none sm:m-6 sm:h-[calc(100vh-3rem)] sm:w-[calc(100vw-3rem)] sm:rounded-lg'
              : 'max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] rounded-lg sm:w-[390px]'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-3 border-b border-border bg-muted/45 px-4 py-3',
              isFullscreen && 'px-5 py-4'
            )}
          >
            <WallyMark className={cn(isFullscreen ? 'size-14' : 'size-9')} priority />
            <div className="min-w-0 flex-1">
              <h2 className={cn('truncate font-semibold', isFullscreen ? 'text-lg' : 'text-sm')}>
                Wally the Wallaby
              </h2>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                Australian-hosted AI assistant powered by AWS Bedrock
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 sm:inline-flex"
              onClick={() => setMode(isFullscreen ? 'popup' : 'fullscreen')}
              aria-label={isFullscreen ? 'Return Wally to popup' : 'Open Wally full screen'}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setMode('closed')}
              aria-label="Close Wally"
            >
              <X className="size-4" />
            </Button>
          </div>

          {!isFullscreen && <WallyTrustNotice />}

          {isFullscreen && (
            <div className="border-b border-border bg-background/60 px-5 py-4">
              <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_360px]">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">WildTrack360 workspace assistant</p>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      Ask Wally to summarise caseload risk, open calls, reminders, release prep, or where a record belongs.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    {starterPrompts.slice(0, 3).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="rounded-md border border-border bg-popover px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => void sendMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
                <WallyTrustNotice fullscreen />
              </div>
            </div>
          )}

          <ScrollArea
            ref={viewportRef}
            className={cn(
              'px-4 py-4',
              isFullscreen ? 'min-h-0 flex-1' : 'h-[min(520px,calc(100vh-17rem))]'
            )}
          >
            <div className={cn('mx-auto space-y-4 pr-2', isFullscreen && 'max-w-4xl')}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="relative mt-1 size-8 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-muted">
                      <Image
                        src={wallyAvatarSrc}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
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

          <form
            className={cn('border-t border-border bg-muted/35 p-3', isFullscreen && 'px-5 py-4')}
            onSubmit={handleSubmit}
          >
            <div className={cn('mx-auto flex items-end gap-2', isFullscreen && 'max-w-4xl')}>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Wally..."
                className={cn(
                  'max-h-32 min-h-11 resize-none bg-background text-sm',
                  isFullscreen && 'min-h-14'
                )}
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
            <p className={cn('mt-2 text-[11px] leading-snug text-muted-foreground', isFullscreen && 'mx-auto max-w-4xl')}>
              Review AI output before acting. Health, release, and licence decisions still need the right human sign-off.
            </p>
          </form>
        </section>
      )}

      {!isFullscreen && (
        <Button
          type="button"
          className="h-12 rounded-full px-3 shadow-xl shadow-primary/25"
          onClick={() => setMode((current) => (current === 'closed' ? 'popup' : 'closed'))}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close Wally the Wallaby' : 'Open Wally the Wallaby'}
        >
          {isOpen ? (
            <X className="size-5" />
          ) : (
            <span className="relative size-7 overflow-hidden rounded-full border border-primary-foreground/35">
              <Image src={wallyAvatarSrc} alt="" fill sizes="28px" className="object-cover" />
            </span>
          )}
          <span>Wally</span>
        </Button>
      )}
    </div>
  );
}
