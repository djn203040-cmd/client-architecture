import { describe, it, expect } from "vitest";
import {
  buildRawEmail,
  ensureReSubject,
  textToHtml,
  escapeHtml,
} from "@/lib/gmail/send";

function decode(raw: string): string {
  return Buffer.from(raw, "base64url").toString("utf8");
}

describe("ensureReSubject", () => {
  it("prefixes a bare subject", () => {
    expect(ensureReSubject("Quick question")).toBe("Re: Quick question");
  });
  it("collapses an existing Re: chain to one", () => {
    expect(ensureReSubject("Re: Re: Hi there")).toBe("Re: Hi there");
    expect(ensureReSubject("RE:  spaced")).toBe("Re: spaced");
  });
});

describe("escapeHtml / textToHtml", () => {
  it("escapes the five significant characters", () => {
    expect(escapeHtml(`a & b < c > "d" 'e'`)).toBe(
      "a &amp; b &lt; c &gt; &quot;d&quot; &#39;e&#39;",
    );
  });
  it("converts newlines to <br> in HTML output", () => {
    expect(textToHtml("line1\nline2")).toBe("line1<br>\nline2");
  });
});

describe("buildRawEmail", () => {
  const base = {
    toEmail: "jane@example.com",
    toName: "Jane Doe",
    subject: "Following up",
    textBody: "Hi Jane,\n\nGreat talking today.",
    htmlBody: "<!DOCTYPE html><html><body>Hi Jane</body></html>",
    boundary: "TESTBOUNDARY",
  };

  it("builds a multipart/alternative message with the expected headers", () => {
    const mime = decode(buildRawEmail(base));
    expect(mime).toContain("To: Jane Doe <jane@example.com>");
    expect(mime).toContain("Subject: Following up");
    expect(mime).toContain(
      'Content-Type: multipart/alternative; boundary="TESTBOUNDARY"',
    );
    expect(mime).toContain("--TESTBOUNDARY--");
    // Both parts present
    expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(mime).toContain('Content-Type: text/html; charset="UTF-8"');
  });

  it("omits the List-Unsubscribe header (1:1 personal email, not bulk)", () => {
    const mime = decode(buildRawEmail(base));
    expect(mime).not.toContain("List-Unsubscribe");
  });

  it("base64-encodes the body parts (decodable round-trip)", () => {
    const mime = decode(buildRawEmail(base));
    // The html body should appear as base64 within the html part.
    const expectedHtmlB64 = Buffer.from(base.htmlBody, "utf8").toString("base64");
    expect(mime).toContain(expectedHtmlB64);
  });

  it("omits From / Message-ID so Gmail stamps the coach identity", () => {
    const mime = decode(buildRawEmail(base));
    expect(mime).not.toMatch(/^From:/m);
    expect(mime).not.toMatch(/^Message-ID:/m);
  });

  it("adds threading headers only when inReplyTo is provided", () => {
    const withReply = decode(
      buildRawEmail({ ...base, inReplyTo: "abc123@mail.gmail.com" }),
    );
    expect(withReply).toContain("In-Reply-To: <abc123@mail.gmail.com>");
    expect(withReply).toContain("References: <abc123@mail.gmail.com>");

    const without = decode(buildRawEmail(base));
    expect(without).not.toContain("In-Reply-To:");
  });

  it("RFC 2047-encodes a non-ASCII subject", () => {
    const mime = decode(buildRawEmail({ ...base, subject: "Café ☕" }));
    expect(mime).toContain("Subject: =?UTF-8?B?");
    expect(mime).not.toContain("Subject: Café");
  });
});
