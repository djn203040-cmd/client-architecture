import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// REQUIRED: Vercel default 10s timeout breaks Inngest long-polling (RESEARCH.md Pitfall 4)
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions: [] });
