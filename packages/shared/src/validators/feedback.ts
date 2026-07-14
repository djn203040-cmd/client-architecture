import { z } from "zod";

export const FeedbackSentimentEnum = z.enum(["good", "bad"]);

export const CreateFeedbackSchema = z.object({
  title: z.string().min(1, "Title required").max(120),
  sentiment: FeedbackSentimentEnum,
  // Generous cap: testers paste in error output, email threads, screenshots-as-text.
  note: z.string().max(20000).optional().default(""),
  page_path: z.string().max(300).optional().nullable(),
});

export type TFeedbackSentiment = z.infer<typeof FeedbackSentimentEnum>;
export type TCreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;
