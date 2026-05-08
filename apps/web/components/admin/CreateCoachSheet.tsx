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
import { Plus } from "@phosphor-icons/react";
import { InviteCoachSchema } from "@client/shared/validators";
import { toast } from "sonner";

export function CreateCoachSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; name?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const payload = { email: formData.get("email"), name: formData.get("name") };
    const parsed = InviteCoachSchema.safeParse(payload);

    if (!parsed.success) {
      const fe: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const key = i.path[0] as keyof typeof errors;
        fe[key] = i.message;
      });
      setErrors(fe);
      setSubmitting(false);
      return;
    }

    const r = await fetch("/api/admin/coaches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    setSubmitting(false);

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      toast.error(data.error ?? "Invite couldn't be sent. Check the email address and try again.");
      return;
    }

    toast.success("Invite sent");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="min-h-[44px]">
          <Plus weight="regular" className="size-4 mr-2" />
          Create coach
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Invite a new coach</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              name="name"
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "invite-name-error" : undefined}
            />
            {errors.name && (
              <p id="invite-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "invite-email-error" : undefined}
            />
            {errors.email && (
              <p id="invite-email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>
          <SheetFooter>
            <Button type="submit" disabled={submitting} className="min-h-[44px]">
              {submitting ? "Sending…" : "Send Invite"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
