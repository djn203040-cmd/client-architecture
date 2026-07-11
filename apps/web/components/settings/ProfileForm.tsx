"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAutosave } from "@/lib/settings/autosave";
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
  const [displayName, setDisplayName] = useState(coach.display_name ?? coach.name ?? "");
  const [roleTitle, setRoleTitle] = useState(coach.role_title ?? "");
  const [timezone, setTimezone] = useState(
    coach.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
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

  // First-load backstop: onboarding (WizardShell → TimezoneCapture) already
  // captures the browser zone on the coach's first step. This covers the edge
  // case of a coach whose zone is still null by the time they reach Settings, 
  // the autosave hook skips the picker's pre-filled value on initial render, so
  // persist it once here rather than leaving them on the launch-default zone.
  useEffect(() => {
    if (!coach.timezone) {
      patchProfile({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).catch(() => {});
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
        toast.error(error ?? "Upload failed");
        return;
      }
      const { url } = await res.json();
      setAvatarUrl(url);
      toast.success("Avatar updated");
    } catch {
      toast.error("Upload failed");
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
            <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
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
            {uploading ? "Uploading…" : "Change photo"}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP · max 5 MB</p>
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
          <Label htmlFor="pf-display-name">Display name</Label>
          <Input id="pf-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-role-title">Role / title</Label>
          <Input
            id="pf-role-title"
            placeholder="e.g. Executive Coach"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-timezone">Timezone</Label>
        <select
          id="pf-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {Intl.supportedValuesOf("timeZone").map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-work-start">Working hours</Label>
        <div className="flex items-center gap-3">
          <Input
            id="pf-work-start"
            type="time"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
            onBlur={saveWorkingHours}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">to</span>
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
        <Label htmlFor="pf-booking-url">Public booking URL</Label>
        <Input
          id="pf-booking-url"
          type="url"
          placeholder="https://cal.com/your-name"
          value={bookingUrl}
          onChange={(e) => setBookingUrl(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-signature">Email signature</Label>
        <Textarea
          id="pf-signature"
          placeholder="Appended to the bottom of outbound emails"
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
