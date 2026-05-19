export function parseVtt(vtt: string): string {
  const lines = vtt.split(/\r?\n/);
  const textLines: string[] = [];
  let inNote = false;

  for (const line of lines) {
    if (line.startsWith("WEBVTT")) continue;
    if (line.startsWith("NOTE")) { inNote = true; continue; }
    if (inNote) {
      if (line.trim() === "") inNote = false;
      continue;
    }
    // Skip timing lines: "00:00:00.000 --> 00:00:05.000"
    if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s+-->\s+/.test(line)) continue;
    // Skip numeric-only cue identifiers
    if (/^\d+$/.test(line.trim())) continue;
    if (line.trim() === "") continue;
    textLines.push(line.trim());
  }

  return textLines.join(" ");
}
