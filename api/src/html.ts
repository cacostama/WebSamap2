const SCRIPT_TAG_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const JS_URL_RE = /\s+(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi;

export function sanitizeHtml(input: string | null | undefined): string | null {
  if (input == null) return null;
  return input
    .replace(SCRIPT_TAG_RE, "")
    .replace(EVENT_ATTR_RE, "")
    .replace(JS_URL_RE, "");
}

export function stripHtml(input: string | null | undefined): string {
  return (input ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
