interface TraceMetadata {
  leadId: string;
  coachId: string;
  confidenceLevel?: string;
  truncationLog?: string[];
  inputTokens?: number;
  [key: string]: unknown;
}

let langfuse: { generation: (opts: unknown) => void } | null = null;

function getLangfuse() {
  if (langfuse !== null) return langfuse;
  if (!process.env['LANGFUSE_PUBLIC_KEY'] || !process.env['LANGFUSE_SECRET_KEY']) {
    langfuse = null;
    return null;
  }
  try {
    // Dynamic require to avoid bundling issues when keys are absent
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- reason: dynamic require avoids bundling when LANGFUSE keys absent
    const { Langfuse } = require('langfuse');
    langfuse = new Langfuse({
      publicKey: process.env['LANGFUSE_PUBLIC_KEY'],
      secretKey: process.env['LANGFUSE_SECRET_KEY'],
    });
    return langfuse;
  } catch {
    return null;
  }
}

export function traceGeneration(
  name: string,
  metadata: TraceMetadata,
): void {
  const client = getLangfuse();
  if (!client) return;
  try {
    client.generation({ name, metadata });
  } catch {
    // tracing must never break generation
  }
}
