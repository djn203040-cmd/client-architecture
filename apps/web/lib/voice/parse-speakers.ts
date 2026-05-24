// Speaker + timestamp detection for voice-corpus uploads.
//
// Multi-party exports (WhatsApp, IG DMs, LinkedIn messages, mbox-style Gmail)
// contain both sides of the conversation, and span months or years of history.
// The voice analyzer wants only the coach's own *recent* messages — older
// writing reflects a stale voice, and the other party's messages dilute the
// profile entirely. These pure-function parsers let the importer surface
// "which speaker is you? + how far back?" and filter before analysis.

export type Channel = "gmail" | "linkedin" | "instagram" | "whatsapp";

export type ParsedMessage = {
  speaker: string;
  content: string;
  // Undefined when the format carries no parseable timestamp (e.g. pasted
  // Gmail with no headers). Date filtering is skipped for such messages.
  timestamp?: Date;
};

const FILE_HEADER = /^---\s.+?\s---$/gm;
function stripFileHeaders(text: string): string {
  return text.replace(FILE_HEADER, "").trim();
}

// ---------------- WhatsApp ----------------
// iOS:     [24/03/2024, 14:32:11] Daniel: hej
// Android: 24/03/2024, 14:32 - Daniel: hej
// Time separator may be `:` (most locales) or `.` (Danish, German, Norwegian
// iOS exports — `[03/04/2026, 10.07.55]`).
const WHATSAPP_LINE =
  /^‎?(?:\[([^\]]+)\]|([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4},?\s+[0-9]{1,2}[:.][0-9]{2}(?:[:.][0-9]{2})?(?:\s*[AP]M)?)\s*-)\s+([^:]+?):\s?(.*)$/;

function parseWhatsApp(text: string): ParsedMessage[] {
  const cleaned = stripFileHeaders(text);
  const lines = cleaned.split(/\r?\n/);

  // Auto-detect date order (dd/mm vs mm/dd) by scanning every timestamp in
  // the corpus: any first-position value > 12 locks dd/mm; any second-position
  // value > 12 locks mm/dd. If ambiguous, default to dd/mm (European norm —
  // the app is built for that audience).
  const order = detectDateOrder(lines);

  const messages: { speaker: string; lines: string[]; timestamp?: Date }[] = [];
  for (const line of lines) {
    const m = WHATSAPP_LINE.exec(line);
    if (m) {
      const speaker = m[3].trim();
      const dt = parseWhatsAppDate(m[1] ?? m[2] ?? "", order);
      messages.push({ speaker, lines: [m[4] ?? ""], timestamp: dt });
    } else if (messages.length > 0) {
      messages[messages.length - 1].lines.push(line);
    }
  }
  return messages
    .map((m) => ({ speaker: m.speaker, content: m.lines.join("\n").trim(), timestamp: m.timestamp }))
    .filter((m) => m.content.length > 0 && !isWhatsAppSystemMessage(m.content));
}

type DateOrder = "dmy" | "mdy";
function detectDateOrder(lines: string[]): DateOrder {
  let dmyHits = 0;
  let mdyHits = 0;
  for (const line of lines) {
    const m = WHATSAPP_LINE.exec(line);
    if (!m) continue;
    const dateStr = m[1] ?? m[2] ?? "";
    const parts = dateStr.match(/([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{2,4})/);
    if (!parts) continue;
    const a = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);
    if (a > 12) dmyHits++;
    if (b > 12) mdyHits++;
  }
  if (mdyHits > 0 && dmyHits === 0) return "mdy";
  return "dmy";
}

function parseWhatsAppDate(raw: string, order: DateOrder): Date | undefined {
  // Examples: "24/03/2024, 14:32:11", "3/24/24, 2:32:11 PM", "24.03.2024 14:32"
  const m = raw.match(
    /([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{2,4})[,\s]+([0-9]{1,2})[:.]([0-9]{2})(?:[:.]([0-9]{2}))?(?:\s*([AP]M))?/i,
  );
  if (!m) return undefined;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  const yRaw = parseInt(m[3], 10);
  let hour = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  const sec = m[6] ? parseInt(m[6], 10) : 0;
  const ampm = m[7]?.toUpperCase();

  const year = yRaw < 100 ? 2000 + yRaw : yRaw;
  const [day, month] = order === "dmy" ? [a, b] : [b, a];
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const d = new Date(year, month - 1, day, hour, min, sec);
  return isNaN(d.getTime()) ? undefined : d;
}

const WHATSAPP_SYSTEM = [
  "<Media omitted>",
  "Messages and calls are end-to-end encrypted",
  "missed voice call",
  "missed video call",
  "image omitted",
  "video omitted",
  "audio omitted",
  "sticker omitted",
  "GIF omitted",
];
function isWhatsAppSystemMessage(content: string): boolean {
  const lower = content.toLowerCase();
  return WHATSAPP_SYSTEM.some((s) => lower.includes(s.toLowerCase()));
}

// ---------------- Instagram ----------------
function parseInstagram(text: string): ParsedMessage[] {
  const cleaned = stripFileHeaders(text);
  const segments = splitJsonSegments(cleaned);
  const out: ParsedMessage[] = [];
  for (const seg of segments) {
    try {
      const json = JSON.parse(seg) as {
        messages?: { sender_name?: unknown; content?: unknown; timestamp_ms?: unknown }[];
      };
      if (!json.messages || !Array.isArray(json.messages)) continue;
      for (const m of json.messages) {
        if (typeof m.sender_name === "string" && typeof m.content === "string" && m.content.trim()) {
          const ts = typeof m.timestamp_ms === "number" ? new Date(m.timestamp_ms) : undefined;
          out.push({
            speaker: m.sender_name.trim(),
            content: m.content.trim(),
            timestamp: ts && !isNaN(ts.getTime()) ? ts : undefined,
          });
        }
      }
    } catch {
      // Skip non-JSON segments.
    }
  }
  return out;
}

function splitJsonSegments(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return [];
  try {
    JSON.parse(trimmed);
    return [trimmed];
  } catch {
    // Fall through.
  }
  const segments: string[] = [];
  let depth = 0;
  let start = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") { if (depth === 0) start = i; depth++; }
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) segments.push(trimmed.slice(start, i + 1));
    }
  }
  return segments;
}

// ---------------- LinkedIn CSV ----------------
function parseLinkedIn(text: string): ParsedMessage[] {
  const cleaned = stripFileHeaders(text);
  const rows = parseCSV(cleaned);
  if (rows.length < 2) return [];
  const header = rows[0].map((c) => c.trim().toUpperCase());
  const fromIdx = header.indexOf("FROM");
  const contentIdx = header.indexOf("CONTENT");
  const dateIdx = header.indexOf("DATE");
  if (fromIdx < 0 || contentIdx < 0) return [];
  const out: ParsedMessage[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const speaker = (row[fromIdx] ?? "").trim();
    const content = (row[contentIdx] ?? "").trim();
    if (!speaker || !content) continue;
    let ts: Date | undefined;
    if (dateIdx >= 0) {
      const parsed = new Date((row[dateIdx] ?? "").trim());
      if (!isNaN(parsed.getTime())) ts = parsed;
    }
    out.push({ speaker, content, timestamp: ts });
  }
  return out;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((f) => f.length > 0)) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.length > 0)) rows.push(row);
  }
  return rows;
}

// ---------------- Gmail (mbox / RFC822) ----------------
function parseGmail(text: string): ParsedMessage[] {
  const cleaned = stripFileHeaders(text);
  if (!/^From:\s/m.test(cleaned)) return [];
  const blocks = cleaned.split(/(?=^From\s[^:]|\n\nFrom:\s)/m);
  const out: ParsedMessage[] = [];
  for (const block of blocks) {
    const fromMatch = block.match(/^From:\s*(.+)$/m);
    if (!fromMatch) continue;
    const speaker = fromMatch[1].trim();
    const dateMatch = block.match(/^Date:\s*(.+)$/m);
    let ts: Date | undefined;
    if (dateMatch) {
      const parsed = new Date(dateMatch[1].trim());
      if (!isNaN(parsed.getTime())) ts = parsed;
    }
    const blankIdx = block.search(/\n\r?\n/);
    const body = blankIdx >= 0 ? block.slice(blankIdx).trim() : "";
    if (!body) continue;
    out.push({ speaker, content: body, timestamp: ts });
  }
  return out;
}

// ---------------- Public API ----------------

export function parseChannel(channel: Channel, text: string): ParsedMessage[] {
  if (!text.trim()) return [];
  switch (channel) {
    case "whatsapp": return parseWhatsApp(text);
    case "instagram": return parseInstagram(text);
    case "linkedin": return parseLinkedIn(text);
    case "gmail": return parseGmail(text);
  }
}

export function detectSpeakers(channel: Channel, text: string): { name: string; count: number }[] {
  const messages = parseChannel(channel, text);
  const counts = new Map<string, number>();
  for (const m of messages) counts.set(m.speaker, (counts.get(m.speaker) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// Returns true if at least one parsed message in the corpus carries a
// timestamp. Used by the UI to decide whether to surface the date filter.
export function hasTimestamps(channel: Channel, text: string): boolean {
  return parseChannel(channel, text).some((m) => m.timestamp instanceof Date);
}

export type FilterOptions = {
  selfNames: string[];
  // If provided, drop messages older than this date. Messages with no
  // timestamp are kept (we can't know how old they are, so we don't discard).
  sinceDate?: Date;
};

// Used by the UI to preview impact of a filter before applying it.
export function previewFilter(
  channel: Channel,
  text: string,
  opts: FilterOptions,
): { keptCount: number; totalCount: number; keptChars: number } {
  const messages = parseChannel(channel, text);
  const selfSet = new Set(opts.selfNames);
  const kept = messages.filter((m) => {
    if (selfSet.size > 0 && !selfSet.has(m.speaker)) return false;
    if (opts.sinceDate && m.timestamp && m.timestamp < opts.sinceDate) return false;
    return true;
  });
  return {
    keptCount: kept.length,
    totalCount: messages.length,
    keptChars: kept.reduce((sum, m) => sum + m.content.length, 0),
  };
}

// Returns the corpus rewritten to only contain messages from `selfNames`
// dated on or after `sinceDate` (if provided).
export function filterCorpus(channel: Channel, text: string, opts: FilterOptions): string {
  const messages = parseChannel(channel, text);
  const selfSet = new Set(opts.selfNames);
  return messages
    .filter((m) => {
      if (selfSet.size > 0 && !selfSet.has(m.speaker)) return false;
      if (opts.sinceDate && m.timestamp && m.timestamp < opts.sinceDate) return false;
      return true;
    })
    .map((m) => m.content)
    .join("\n\n");
}

// Back-compat alias for callers that don't need date filtering.
export function filterToSelf(channel: Channel, text: string, selfNames: string[]): string {
  return filterCorpus(channel, text, { selfNames });
}
