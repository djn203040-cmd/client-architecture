import { SalesToolkitSchema, EMPTY_SALES_TOOLKIT } from "@client/shared/validators";
import { SalesToolkitForm } from "./SalesToolkitForm";

interface Props {
  salesToolkit: unknown;
}

export function SalesToolkitSection({ salesToolkit }: Props) {
  // Coerce the raw JSONB into a valid, fully-defaulted toolkit for the form.
  const parsed = SalesToolkitSchema.safeParse(salesToolkit ?? {});
  const initial = parsed.success ? parsed.data : EMPTY_SALES_TOOLKIT;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">How you sell</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Pick your sales approach, capture your programs, and tell the AI how you handle
          objections. When a lead hesitates on price or timing, it draws on all of this to
          make one on-brand attempt to bridge the gap instead of accepting the deferral.
          Everything here is optional, and saved automatically as you type.
        </p>
      </div>
      <SalesToolkitForm initial={initial} showApproachOverride />
    </div>
  );
}
