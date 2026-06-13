'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Maximize2, Minimize2, Send, ShieldCheck, X } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { useOrganization, useUser } from '@/lib/clerk-client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { WALLY_MAX_HISTORY } from '@/lib/wally/constants';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type AssistantMode = 'closed' | 'popup' | 'fullscreen';

const wallyAvatarSrc = '/assistants/wally-avatar.svg';
const WALLY_UNAVAILABLE_MESSAGE = 'Wally is unavailable right now.';

const starterPrompts = [
  {
    category: 'Docs',
    label: 'How do I admit my first animal?',
    prompt: 'How do I admit my first animal in WildTrack360?',
  },
  {
    category: 'Docs',
    label: 'Walk me through a release checklist.',
    prompt: 'Walk me through creating a release checklist for an animal ready for release.',
  },
  {
    category: 'Workspace',
    label: 'Which open call logs need follow-up?',
    prompt: 'Which open call logs need follow-up?',
  },
  {
    category: 'Workspace',
    label: 'What reminders are due soon?',
    prompt: 'What reminders are due soon?',
  },
  {
    category: 'Reports',
    label: 'Make a report for unresolved incidents.',
    prompt: 'Make a custom reporting query for unresolved incidents by severity.',
  },
  {
    category: 'Compliance',
    label: 'What should I check before NSW reporting?',
    prompt: 'What should I check before NSW annual reporting?',
  },
  {
    category: 'Admin',
    label: 'Where do I manage roles and species groups?',
    prompt: 'Where do I manage roles and species groups?',
  },
  {
    category: 'Care tools',
    label: 'How does the feed roster find overdue feeds?',
    prompt: 'How does the feed roster decide which animals are overdue for feeding?',
  },
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
        className="object-contain"
      />
    </div>
  );
}

function isSafeLink(href: string) {
  return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(href);
}

function renderPlainMessage(content: string) {
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

const markdownComponents: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  h1: ({ children }) => <h3 className="pt-1 text-base font-semibold leading-snug">{children}</h3>,
  h2: ({ children }) => <h3 className="pt-1 text-sm font-semibold leading-snug">{children}</h3>,
  h3: ({ children }) => <h3 className="pt-1 text-sm font-semibold leading-snug">{children}</h3>,
  h4: ({ children }) => <h4 className="pt-1 text-sm font-semibold leading-snug">{children}</h4>,
  h5: ({ children }) => <h5 className="pt-1 text-sm font-semibold leading-snug">{children}</h5>,
  h6: ({ children }) => <h6 className="pt-1 text-sm font-semibold leading-snug">{children}</h6>,
  a: ({ href, children }) => {
    if (!href || !isSafeLink(href)) {
      return <span>{children}</span>;
    }

    const external = !href.startsWith('/');
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className="font-medium underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="rounded-md border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="max-w-full overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const text = String(children);
    const isBlock = text.includes('\n') || className?.startsWith('language-');

    return (
      <code
        className={cn(
          isBlock ? className : 'rounded bg-muted px-1 py-0.5 text-[0.92em]',
          isBlock && 'text-xs'
        )}
        {...props}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-max border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/70 text-muted-foreground">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-t border-border first:border-t-0">{children}</tr>,
  th: ({ children }) => (
    <th className="border-b border-border px-3 py-2 font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
  hr: () => <hr className="border-border" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-muted-foreground line-through">{children}</del>,
  input: ({ checked, type }) => {
    if (type !== 'checkbox') {
      return null;
    }

    return (
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled
        className="mr-2 align-middle"
        aria-label={checked ? 'Completed' : 'Not completed'}
      />
    );
  },
};

function renderAssistantMessage(content: string) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      skipHtml
      components={markdownComponents}
      urlTransform={(url) => (isSafeLink(url) ? url : '')}
    >
      {content}
    </ReactMarkdown>
  );
}

async function getWallyErrorMessage(response: Response) {
  let text = '';

  try {
    text = await response.text();
  } catch {
    return WALLY_UNAVAILABLE_MESSAGE;
  }

  const trimmed = text.trim();

  if (!trimmed) {
    return WALLY_UNAVAILABLE_MESSAGE;
  }

  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    const message = typeof parsed.error === 'string' ? parsed.error : parsed.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {
    // Fall back to short plain-text responses from the API.
  }

  if (trimmed.length <= 180 && !trimmed.startsWith('<')) {
    return trimmed;
  }

  return WALLY_UNAVAILABLE_MESSAGE;
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
          <p
            className={cn(
              'leading-relaxed text-primary/85',
              fullscreen ? 'text-sm' : 'text-[11px]'
            )}
          >
            Wally runs through AWS Bedrock&apos;s Australia geography. Discussions are recorded in
            your organisation audit log for accountability, and prompts or responses are not used to
            train the model.
          </p>
        </div>
      </div>
    </div>
  );
}

function WallyPromptExample({
  example,
  onSelect,
}: {
  example: (typeof starterPrompts)[number];
  onSelect: (prompt: string) => void;
}) {
  return (
    <button
      type="button"
      className="rounded-md border border-border bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={() => onSelect(example.prompt)}
    >
      <span className="block text-[11px] font-medium text-muted-foreground">
        {example.category}
      </span>
      <span className="block font-medium leading-snug">{example.label}</span>
    </button>
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
        "Hi, I'm Wally. I can answer from WildTrack360's public docs and your workspace context. Ask me how to use a module, where a workflow lives, or to summarise visible animals, open call logs, unresolved incidents, reminders, release readiness, recent records, expiring carer training, and custom reports.",
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
      const history = nextMessages
        .filter((message) => message.content.trim().length > 0)
        .slice(-WALLY_MAX_HISTORY)
        .map(({ role, content }) => ({ role, content }));

      const response = await fetch('/api/wally', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await getWallyErrorMessage(response));
      }

      if (!response.body) {
        throw new Error(WALLY_UNAVAILABLE_MESSAGE);
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
            message.id === assistantMessage.id ? { ...message, content: streamedText } : message
          )
        );
      }

      const tail = decoder.decode();
      if (tail) {
        streamedText += tail;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessage.id ? { ...message, content: streamedText } : message
          )
        );
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : WALLY_UNAVAILABLE_MESSAGE;
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id
            ? {
                ...item,
                content: message,
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

  function closeWally() {
    if (isStreaming) {
      stopStreaming();
    }

    setMode('closed');
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
              onClick={closeWally}
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
                    <p className="text-sm font-medium text-foreground">
                      WildTrack360 workspace assistant
                    </p>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                      Ask Wally to explain documented workflows, link the right help page, summarise
                      live workspace risks, or turn a reporting question into a safe query.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {starterPrompts.slice(0, 6).map((example) => (
                      <WallyPromptExample
                        key={example.prompt}
                        example={example}
                        onSelect={(prompt) => void sendMessage(prompt)}
                      />
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
                      <div className="space-y-2">
                        {message.role === 'assistant'
                          ? renderAssistantMessage(message.content)
                          : renderPlainMessage(message.content)}
                      </div>
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
                  {starterPrompts.map((example) => (
                    <WallyPromptExample
                      key={example.prompt}
                      example={example}
                      onSelect={(prompt) => void sendMessage(prompt)}
                    />
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={stopStreaming}
                  aria-label="Stop Wally"
                >
                  <X className="size-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim()}
                  aria-label="Send to Wally"
                >
                  <Send className="size-4" />
                </Button>
              )}
            </div>
            <p
              className={cn(
                'mt-2 text-[11px] leading-snug text-muted-foreground',
                isFullscreen && 'mx-auto max-w-4xl'
              )}
            >
              Review AI output before acting. Health, release, and licence decisions still need the
              right human sign-off.
            </p>
          </form>
        </section>
      )}

      {!isFullscreen && (
        <Button
          type="button"
          className="h-12 rounded-full px-3 shadow-xl shadow-primary/25"
          onClick={() => {
            if (isOpen) {
              closeWally();
            } else {
              setMode('popup');
            }
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close Wally the Wallaby' : 'Open Wally the Wallaby'}
        >
          {isOpen ? (
            <X className="size-5" />
          ) : (
            <span className="relative size-7 overflow-hidden rounded-full border border-primary-foreground/35">
              <Image src={wallyAvatarSrc} alt="" fill sizes="28px" className="object-contain" />
            </span>
          )}
          <span>Wally</span>
        </Button>
      )}
    </div>
  );
}
