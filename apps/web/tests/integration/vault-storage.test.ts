import { describe, it } from "vitest";

describe("GMAIL-003: integrations table stores only Vault UUID, no raw tokens", () => {
  it.todo("integrations row for gmail has vault_secret_id column set — Plan 05 implements");
  it.todo("integrations row for gmail has no access_token or refresh_token columns — Plan 02 implements");
  it.todo("raw OAuth token is readable only via private.get_gmail_tokens — Plan 05 implements");
});
