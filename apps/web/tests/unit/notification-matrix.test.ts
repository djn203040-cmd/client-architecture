import { describe, it, expect, vi } from "vitest";

// Mock phosphor-icons and UI components — not testing rendering here
vi.mock("@phosphor-icons/react", () => ({
  LockSimple: () => null, SquaresFour: () => null, Envelope: () => null,
  ChatCircle: () => null, WhatsappLogo: () => null, DeviceMobile: () => null,
}));
vi.mock("@/components/ui/switch", () => ({ Switch: () => null }));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: unknown }) => children,
  TooltipContent: () => null,
  TooltipTrigger: ({ children }: { children: unknown }) => children,
  TooltipProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }));

import { getLockedOn, isConnected } from "@/app/(dashboard)/settings/notifications/NotificationMatrix";

const noIntegrations: { provider: string; status: string }[] = [];
const withSlack = [{ provider: "slack", status: "connected" }];
const withTwilio = [{ provider: "twilio", status: "connected" }];
const disconnectedSlack = [{ provider: "slack", status: "disconnected" }];

describe("notification-matrix logic", () => {
  describe("getLockedOn — D-13 dashboard always on", () => {
    it("returns tooltip for dashboard column on any event type", () => {
      expect(getLockedOn("draft_ready", "dashboard")).toBeTruthy();
      expect(getLockedOn("lead_replied", "dashboard")).toBeTruthy();
      expect(getLockedOn("integration_broken", "dashboard")).toBeTruthy();
      expect(getLockedOn("hard_bounce", "dashboard")).toBeTruthy();
    });

    it("returns tooltip for hard_bounce × SMS (D-15)", () => {
      expect(getLockedOn("hard_bounce", "sms")).toBeTruthy();
    });

    it("returns null for other cells", () => {
      expect(getLockedOn("draft_ready", "email")).toBeNull();
      expect(getLockedOn("draft_ready", "sms")).toBeNull();
      expect(getLockedOn("lead_replied", "sms")).toBeNull();
      expect(getLockedOn("hard_bounce", "email")).toBeNull();
      expect(getLockedOn("hard_bounce", "slack")).toBeNull();
      expect(getLockedOn("hard_bounce", "whatsapp")).toBeNull();
    });
  });

  describe("isConnected — channel connection checks", () => {
    it("dashboard is always connected", () => {
      expect(isConnected("dashboard", noIntegrations)).toBe(true);
    });

    it("email is always connected", () => {
      expect(isConnected("email", noIntegrations)).toBe(true);
    });

    it("slack requires a connected slack integration", () => {
      expect(isConnected("slack", noIntegrations)).toBe(false);
      expect(isConnected("slack", withSlack)).toBe(true);
      expect(isConnected("slack", disconnectedSlack)).toBe(false);
    });

    it("whatsapp requires a connected twilio integration", () => {
      expect(isConnected("whatsapp", noIntegrations)).toBe(false);
      expect(isConnected("whatsapp", withTwilio)).toBe(true);
    });

    it("sms requires a connected twilio integration", () => {
      expect(isConnected("sms", noIntegrations)).toBe(false);
      expect(isConnected("sms", withTwilio)).toBe(true);
    });
  });

  describe("matrix shape — 4 event rows × 5 channel columns = 20 cells", () => {
    const EVENT_TYPES = ["draft_ready", "lead_replied", "integration_broken", "hard_bounce"] as const;
    const CHANNELS = ["dashboard", "email", "slack", "whatsapp", "sms"] as const;

    it("has 4 event types and 5 channels", () => {
      expect(EVENT_TYPES).toHaveLength(4);
      expect(CHANNELS).toHaveLength(5);
    });

    it("dashboard column is locked ON for all 4 event types", () => {
      for (const et of EVENT_TYPES) {
        expect(getLockedOn(et, "dashboard")).toBeTruthy();
      }
    });

    it("only hard_bounce × sms cell is locked among non-dashboard cells", () => {
      const lockedNonDash = EVENT_TYPES.flatMap((et) =>
        CHANNELS.filter((ch) => ch !== "dashboard" && getLockedOn(et, ch) !== null).map((ch) => `${et}×${ch}`),
      );
      expect(lockedNonDash).toEqual(["hard_bounce×sms"]);
    });
  });
});
