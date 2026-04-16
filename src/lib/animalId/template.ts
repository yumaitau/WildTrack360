export interface TemplateContext {
  orgShortCode?: string;
  year?: number;
  seq?: number;
  species?: string;
}

/**
 * Renders an animal ID template string, replacing supported placeholders
 * with values from the context.
 *
 * Supported placeholders:
 *   {ORG_SHORT}  — org short code
 *   {YYYY}       — 4-digit year
 *   {YY}         — 2-digit year
 *   {seq}        — sequence number, unpadded
 *   {seq:N}      — sequence zero-padded to N digits
 *   {SPECIES}    — species code (empty string if missing)
 *
 * Unknown placeholders are left as-is.
 */
export function renderAnimalIdTemplate(
  template: string,
  ctx: TemplateContext
): string {
  return template.replace(/\{([^}]+)\}/g, (_match, token: string) => {
    switch (token) {
      case "ORG_SHORT":
        return ctx.orgShortCode ?? "";
      case "YYYY":
        return ctx.year != null ? String(ctx.year) : "";
      case "YY":
        return ctx.year != null ? String(ctx.year).slice(-2) : "";
      case "seq":
        return ctx.seq != null ? String(ctx.seq) : "";
      case "SPECIES":
        return ctx.species ?? "";
      default: {
        // Handle {seq:N} — zero-padded sequence
        const seqMatch = token.match(/^seq:(\d+)$/);
        if (seqMatch) {
          if (ctx.seq == null) return "";
          const width = parseInt(seqMatch[1], 10);
          return String(ctx.seq).padStart(width, "0");
        }
        // Unknown placeholder — leave literal
        return `{${token}}`;
      }
    }
  });
}
