import "server-only";

interface DraftReadyArgs {
  leadName: string;
  subject: string;
  body: string;
  sendTime: string;
  confidenceLevel?: "high" | "low";
  reviewUrl: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}

interface HardBounceArgs {
  leadName: string;
  leadEmail: string;
  settingsUrl: string;
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sonorous</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="padding:32px 32px 0;">
${content}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function footerHtml(settingsUrl: string, unsubscribeUrl: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:32px;border-top:1px solid #e5e5e5;padding-top:24px;padding-bottom:32px;">
<tr><td>
<p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
You're receiving this because notifications are enabled in your Sonorous settings.
</p>
<p style="margin:8px 0 0;font-size:12px;color:#999;line-height:1.6;">
Manage notifications: <a href="${settingsUrl}" style="color:#c9913a;text-decoration:none;">${settingsUrl}</a>
&nbsp;|&nbsp;
Unsubscribe: <a href="${unsubscribeUrl}" style="color:#c9913a;text-decoration:none;">${unsubscribeUrl}</a>
</p>
</td></tr>
</table>`;
}

export function buildDraftReadyEmail(args: DraftReadyArgs): {
  html: string;
  text: string;
  subject: string;
} {
  const subject = `Draft ready for ${args.leadName}`;

  const confidencePill =
    args.confidenceLevel === "low"
      ? `<p style="margin:0 0 12px;"><span style="background:#fdf4e3;color:#8b6914;padding:4px 10px;border-radius:9999px;font-size:12px;display:inline-block;">Voice model has limited examples</span></p>`
      : "";

  const content = `
<p style="margin:0 0 4px;font-size:14px;color:#666;font-weight:500;letter-spacing:0.05em;">Sonorous</p>
<h1 style="margin:12px 0 4px;font-size:20px;font-weight:600;color:#111;line-height:1.3;">Draft ready for ${args.leadName}</h1>
<p style="margin:0 0 24px;font-size:14px;color:#666;">Scheduled to send at ${args.sendTime}</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9f7f3;border-radius:12px;padding:24px;margin:0 0 24px;">
<tr><td>
${confidencePill}
<p style="margin:0 0 8px;font-size:14px;color:#111;"><span style="color:#666;">Subject:</span> <strong>${args.subject}</strong></p>
<p style="margin:0;font-size:14px;color:#222;line-height:1.6;white-space:pre-wrap;">${args.body}</p>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:12px;">
<tr><td>
<a href="${args.reviewUrl}" style="display:inline-block;background:#c9913a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">Review draft</a>
</td></tr>
</table>
<p style="margin:0 0 24px;font-size:12px;color:#999;">Or open: <a href="${args.reviewUrl}" style="color:#999;text-decoration:underline;">${args.reviewUrl}</a></p>

${footerHtml(args.settingsUrl, args.unsubscribeUrl)}`;

  const html = emailWrapper(content);

  const text = `Sonorous

Draft ready for ${args.leadName}
Scheduled to send at ${args.sendTime}

---
Subject: ${args.subject}

${args.body}
---

Review draft: ${args.reviewUrl}

---
You're receiving this because notifications are enabled in your Sonorous settings.
Manage notifications: ${args.settingsUrl} | Unsubscribe: ${args.unsubscribeUrl}`;

  return { html, text, subject };
}

export function buildDraftFollowupEmail(args: DraftReadyArgs): {
  html: string;
  text: string;
  subject: string;
} {
  const subject = `Reminder: draft for ${args.leadName} still waiting`;

  const confidencePill =
    args.confidenceLevel === "low"
      ? `<p style="margin:0 0 12px;"><span style="background:#fdf4e3;color:#8b6914;padding:4px 10px;border-radius:9999px;font-size:12px;display:inline-block;">Voice model has limited examples</span></p>`
      : "";

  const content = `
<p style="margin:0 0 4px;font-size:14px;color:#666;font-weight:500;letter-spacing:0.05em;">Sonorous</p>
<h1 style="margin:12px 0 4px;font-size:20px;font-weight:600;color:#111;line-height:1.3;">Reminder: draft for ${args.leadName}</h1>
<p style="margin:0 0 24px;font-size:14px;color:#666;">Reminder: scheduled to send at ${args.sendTime}</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9f7f3;border-radius:12px;padding:24px;margin:0 0 24px;">
<tr><td>
${confidencePill}
<p style="margin:0 0 8px;font-size:14px;color:#111;"><span style="color:#666;">Subject:</span> <strong>${args.subject}</strong></p>
<p style="margin:0;font-size:14px;color:#222;line-height:1.6;white-space:pre-wrap;">${args.body}</p>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:12px;">
<tr><td>
<a href="${args.reviewUrl}" style="display:inline-block;background:#c9913a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">Review draft</a>
</td></tr>
</table>
<p style="margin:0 0 24px;font-size:12px;color:#999;">Or open: <a href="${args.reviewUrl}" style="color:#999;text-decoration:underline;">${args.reviewUrl}</a></p>

${footerHtml(args.settingsUrl, args.unsubscribeUrl)}`;

  const html = emailWrapper(content);

  const text = `Sonorous

Reminder: draft for ${args.leadName} still waiting
Scheduled to send at ${args.sendTime}

---
Subject: ${args.subject}

${args.body}
---

Review draft: ${args.reviewUrl}

---
You're receiving this because notifications are enabled in your Sonorous settings.
Manage notifications: ${args.settingsUrl} | Unsubscribe: ${args.unsubscribeUrl}`;

  return { html, text, subject };
}

export function buildHardBounceEmail(args: HardBounceArgs): {
  html: string;
  text: string;
  subject: string;
} {
  const subject = `Email to ${args.leadEmail} bounced`;

  const content = `
<p style="margin:0 0 4px;font-size:14px;color:#666;font-weight:500;letter-spacing:0.05em;">Sonorous</p>
<h1 style="margin:12px 0 4px;font-size:20px;font-weight:600;color:#111;line-height:1.3;">Email to ${args.leadName} bounced</h1>
<p style="margin:0 0 24px;font-size:14px;color:#666;">The email address <strong>${args.leadEmail}</strong> could not be reached.</p>

<p style="margin:0 0 24px;font-size:14px;color:#444;line-height:1.6;">
Update the email address for this lead to resume their sequence.
</p>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:12px;">
<tr><td>
<a href="${args.settingsUrl}" style="display:inline-block;background:#c9913a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">Update email</a>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:32px;border-top:1px solid #e5e5e5;padding-top:24px;padding-bottom:32px;">
<tr><td>
<p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
This notification was sent by Sonorous because a hard bounce was detected on your sequence.
</p>
</td></tr>
</table>`;

  const html = emailWrapper(content);

  const text = `Sonorous

Email to ${args.leadName} bounced
The email address ${args.leadEmail} could not be reached.

Update the email address for this lead to resume their sequence.

Update email: ${args.settingsUrl}

---
This notification was sent by Sonorous because a hard bounce was detected on your sequence.`;

  return { html, text, subject };
}
