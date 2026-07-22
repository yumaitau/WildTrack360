import { Fragment } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { parseCommunityRichText, type MentionRef } from './rich-text-core';

export { parseCommunityRichText } from './rich-text-core';
export type { MentionRef, RichSegment } from './rich-text-core';

// Renders community-authored text as safe rich text: React escapes every text
// node (no HTML injection), newlines are preserved via whitespace-pre-line, bare
// URLs become external links (noopener + noreferrer + nofollow so we never lend
// rank, opener access, or referrer to whatever a member pastes), and @mentions
// become internal member links.
export function CommunityRichText({
  text,
  mentions = [],
  className,
}: {
  text: string;
  mentions?: MentionRef[];
  className?: string;
}) {
  return (
    <span className={cn('whitespace-pre-line break-words', className)}>
      {parseCommunityRichText(text, mentions).map((segment, index) => {
        if (segment.mentionId) {
          return (
            <Link
              key={index}
              href={`/community/members/${segment.mentionId}`}
              className="font-medium text-forest hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {segment.value}
            </Link>
          );
        }
        if (segment.href) {
          return (
            <a
              key={index}
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-forest underline underline-offset-2 hover:text-forest/80"
              onClick={(event) => event.stopPropagation()}
            >
              {segment.value}
            </a>
          );
        }
        return <Fragment key={index}>{segment.value}</Fragment>;
      })}
    </span>
  );
}
