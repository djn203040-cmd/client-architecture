/**
 * In-process Inngest step runner for Phase 4 tests.
 *
 * Lets tests synchronously invoke an Inngest function handler without spinning
 * up the dev server. `step.run`, `step.sleepUntil`, and `step.sendEvent` are
 * stubbed; sent events accumulate in an in-memory queue exposed via
 * `getSentEvents()` and reset via `resetInngestQueue()`.
 */

import { vi } from "vitest";

export interface InngestEvent {
  name: string;
  data?: Record<string, unknown>;
  user?: Record<string, unknown>;
  ts?: number;
}

interface StepRunner {
  run: <T>(id: string, fn: () => Promise<T> | T) => Promise<T>;
  sleepUntil: (id: string, when: Date | string | number) => Promise<void>;
  sleep: (id: string, duration: string | number) => Promise<void>;
  sendEvent: (
    id: string,
    eventOrEvents: InngestEvent | InngestEvent[],
  ) => Promise<{ ids: string[] }>;
  waitForEvent: (
    id: string,
    opts: { event: string; timeout: string; match?: string; if?: string },
  ) => Promise<InngestEvent | null>;
  invoke: <T>(
    id: string,
    opts: { function: { id: () => string } | string; data?: unknown },
  ) => Promise<T | null>;
}

interface InngestHandlerContext {
  event: InngestEvent;
  step: StepRunner;
  logger: { info: (msg: unknown) => void; error: (msg: unknown) => void; warn: (msg: unknown) => void };
}

export type InngestHandler<T = unknown> = (ctx: InngestHandlerContext) => Promise<T> | T;

interface InngestFunctionLike<T = unknown> {
  // Real Inngest functions expose `.fn` or accept direct invocation; tests pass either.
  fn?: InngestHandler<T>;
}

let sentQueue: InngestEvent[] = [];

export function resetInngestQueue(): void {
  sentQueue = [];
}

export function getSentEvents(): InngestEvent[] {
  return sentQueue.slice();
}

function makeStep(): StepRunner {
  const runSpy = vi.fn(async (_id: string, fn: () => unknown) => fn());
  const invokeSpy = vi.fn(
    async (
      _id: string,
      _opts: { function: { id: () => string } | string; data?: unknown },
    ) => null,
  );

  return {
    run: (async <T,>(id: string, fn: () => Promise<T> | T): Promise<T> => {
      return (await runSpy(id, fn as () => unknown)) as T;
    }) as StepRunner["run"],
    sleepUntil: vi.fn(async (_id: string, _when: Date | string | number): Promise<void> => {
      // Resolve immediately, tests don't actually sleep.
    }),
    sleep: vi.fn(async (_id: string, _duration: string | number): Promise<void> => {
      // Resolve immediately.
    }),
    sendEvent: vi.fn(
      async (
        _id: string,
        eventOrEvents: InngestEvent | InngestEvent[],
      ): Promise<{ ids: string[] }> => {
        const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
        sentQueue.push(...events);
        return { ids: events.map((_, i) => `test-id-${sentQueue.length - events.length + i}`) };
      },
    ),
    waitForEvent: vi.fn(
      async (
        _id: string,
        _opts: { event: string; timeout: string; match?: string; if?: string },
      ): Promise<InngestEvent | null> => null,
    ),
    invoke: (async <T,>(
      id: string,
      opts: { function: { id: () => string } | string; data?: unknown },
    ): Promise<T | null> => {
      return (await invokeSpy(id, opts)) as T | null;
    }) as StepRunner["invoke"],
  };
}

/**
 * Synchronously execute an Inngest function handler against a test event.
 * Pass either a bare handler `(ctx) => ...` or an object exposing `.fn`.
 */
export async function runInngestStep<T = unknown>(
  fnOrHandler: InngestHandler<T> | InngestFunctionLike<T>,
  event: InngestEvent,
): Promise<T> {
  const handler: InngestHandler<T> =
    typeof fnOrHandler === "function"
      ? fnOrHandler
      : ((fnOrHandler as InngestFunctionLike<T>).fn as InngestHandler<T>);

  if (typeof handler !== "function") {
    throw new Error("runInngestStep: no handler function found on input");
  }

  const step = makeStep();
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  return await handler({ event, step, logger });
}
