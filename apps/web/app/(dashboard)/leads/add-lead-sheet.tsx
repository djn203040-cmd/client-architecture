"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreateLeadSchema, LeadSourceEnum } from "@client/shared/validators";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";
import { useDictionary } from "@/lib/i18n/provider";

type FieldErrors = Partial<Record<"name" | "email" | "phone" | "source" | "coach_notes", string>>;

export function AddLeadSheet() {
  const t = useDictionary();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || null,
      source: formData.get("source"),
      coach_notes: formData.get("coach_notes") || null,
    };
    const parsed = CreateLeadSchema.safeParse(payload);
    if (!parsed.success) {
      const fe: FieldErrors = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path[0] as keyof FieldErrors] = i.message;
      });
      setErrors(fe);
      setSubmitting(false);
      return;
    }
    const r = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setSubmitting(false);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? t.leads.addLead.saveError);
      return;
    }
    toast.success(t.leads.addLead.added);
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus weight="regular" className="size-4 mr-2" />
          {t.leads.addLead.trigger}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t.leads.addLead.title}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="lead-name">{t.leads.addLead.name}</Label>
            <Input
              id="lead-name"
              name="name"
              required
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">{t.leads.addLead.email}</Label>
            <Input
              id="lead-email"
              name="email"
              type="email"
              required
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-phone">{t.leads.addLead.phone}</Label>
            <Input id="lead-phone" name="phone" type="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-source">{t.leads.addLead.source}</Label>
            <select
              id="lead-source"
              name="source"
              required
              defaultValue="manual"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {LeadSourceEnum.options.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-notes">{t.leads.addLead.notes}</Label>
            <Textarea
              id="lead-notes"
              name="coach_notes"
              placeholder={t.leads.addLead.notesPlaceholder}
              rows={4}
            />
          </div>
          <SheetFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? t.leads.addLead.submitting : t.leads.addLead.submit}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
