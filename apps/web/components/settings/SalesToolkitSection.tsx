import { SalesToolkitSchema, EMPTY_SALES_TOOLKIT } from "@client/shared/validators";
import { getServerDictionary } from "@/lib/i18n/server";
import { SalesToolkitForm } from "./SalesToolkitForm";

interface Props {
  salesToolkit: unknown;
}

export async function SalesToolkitSection({ salesToolkit }: Props) {
  const t = await getServerDictionary();
  // Coerce the raw JSONB into a valid, fully-defaulted toolkit for the form.
  const parsed = SalesToolkitSchema.safeParse(salesToolkit ?? {});
  const initial = parsed.success ? parsed.data : EMPTY_SALES_TOOLKIT;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t.settings.salesToolkit.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          {t.settings.salesToolkit.description}
        </p>
      </div>
      <SalesToolkitForm initial={initial} showApproachOverride />
    </div>
  );
}
