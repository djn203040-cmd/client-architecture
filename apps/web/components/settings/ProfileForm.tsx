"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAutosave } from "@/lib/settings/autosave";
import { useDictionary } from "@/lib/i18n/provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Coach {
  id: string;
  name: string | null;
  display_name?: string | null;
  role_title?: string | null;
  timezone?: string | null;
  working_hours?: { start: string; end: string } | null;
  email_signature?: string | null;
  public_booking_url?: string | null;
  avatar_url?: string | null;
}

interface Props {
  coach: Coach;
}

async function patchProfile(fields: Record<string, unknown>) {
  const res = await fetch("/api/settings/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Failed to save");
}

export function ProfileForm({ coach }: Props) {
  const t = useDictionary();
  const [displayName, setDisplayName] = useState(coach.display_name ?? coach.name ?? "");
  const [roleTitle, setRoleTitle] = useState(coach.role_title ?? "");
  // Browser-dependent values (resolved zone, supported-zone list) must not be
  // computed during render: SSR resolves the server's zone and Node's zone list,
  // which mismatches the browser's and breaks hydration. Start deterministic,
  // resolve in the mount effect below.
  const [timezone, setTimezone] = useState(coach.timezone ?? "");
  const [tzOptions, setTzOptions] = useState<string[]>(
    coach.timezone ? [coach.timezone] : [],
  );
  const [workStart, setWorkStart] = useState(coach.working_hours?.start ?? "09:00");
  const [workEnd, setWorkEnd] = useState(coach.working_hours?.end ?? "18:00");
  const [signature, setSignature] = useState(coach.email_signature ?? "");
  const [bookingUrl, setBookingUrl] = useState(coach.public_booking_url ?? "");
  const [avatarUrl, setAvatarUrl] = useState(coach.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useAutosave(displayName, (v) => patchProfile({ display_name: v }));
  useAutosave(roleTitle, (v) => patchProfile({ role_title: v || null }));
  useAutosave(timezone, (v) => patchProfile({ timezone: v }));

  // Resolve browser-dependent values after mount (see comment on the timezone
  // state above). First-load backstop: onboarding (WizardShell → TimezoneCapture)
  // already captures the browser zone on the coach's first step; this covers the
  // edge case of a coach whose zone is still null by the time they reach
  // Settings — setTimezone here is a post-mount change, so the autosave hook
  // picks it up and persists it.
  useEffect(() => {
    setTzOptions(Intl.supportedValuesOf("timeZone"));
    if (!coach.timezone) {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [coach.timezone]);
  useAutosave(signature, (v) => patchProfile({ email_signature: v || null }));
  useAutosave(bookingUrl, (v) =>
    v && !v.startsWith("http")
      ? Promise.reject()
      : patchProfile({ public_booking_url: v || null }),
  );

  function saveWorkingHours() {
    return patchProfile({ working_hours: { start: workStart, end: workEnd } });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/settings/profile/avatar", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? t.settings.profile.uploadFailed);
        return;
      }
      const { url } = await res.json();
      setAvatarUrl(url);
      toast.success(t.settings.profile.avatarUpdated);
    } catch {
      toast.error(t.settings.profile.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-2xl font-semibold shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={t.settings.profile.avatarAlt} className="size-full object-cover" />
          ) : (
            <span>{(coach.display_name ?? coach.name ?? "?")[0]?.toUpperCase()}</span>
          )}
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? t.settings.profile.uploading : t.settings.profile.changePhoto}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">{t.settings.profile.photoHint}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pf-display-name">{t.settings.profile.displayName}</Label>
          <Input id="pf-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-role-title">{t.settings.profile.roleTitle}</Label>
          <Input
            id="pf-role-title"
            placeholder={t.settings.profile.roleTitlePlaceholder}
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-timezone">{t.settings.profile.timezone}</Label>
        <select
          id="pf-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {/* Keep the stored zone selectable even if this browser's supported
              list doesn't include it. */}
          {(timezone && !tzOptions.includes(timezone)
            ? [timezone, ...tzOptions]
            : tzOptions
          ).map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-work-start">{t.settings.profile.workingHours}</Label>
        <div className="flex items-center gap-3">
          <Input
            id="pf-work-start"
            type="time"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
            onBlur={saveWorkingHours}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">{t.settings.profile.workingHoursTo}</span>
          <Input
            id="pf-work-end"
            type="time"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
            onBlur={saveWorkingHours}
            className="w-32"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-booking-url">{t.settings.profile.bookingUrl}</Label>
        <Input
          id="pf-booking-url"
          type="url"
          placeholder={t.settings.profile.bookingUrlPlaceholder}
          value={bookingUrl}
          onChange={(e) => setBookingUrl(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-signature">{t.settings.profile.signature}</Label>
        <Textarea
          id="pf-signature"
          placeholder={t.settings.profile.signaturePlaceholder}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          maxLength={2000}
          rows={4}
        />
        <p className="text-xs text-muted-foreground text-right">{signature.length}/2000</p>
      </div>
    </div>
  );
}
