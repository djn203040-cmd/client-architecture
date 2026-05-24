# Voice corpus — dummy exports

Synthetic test data for the onboarding Voice step (§2.2 Step 3) and the
`/settings/voice` corpus importer. All content is invented — a fictional
coach, "Augusta Vesterlyng", writing to fictional leads. No real people.

Each file mimics how the platform actually exports messages:

| File | Channel | Real-world format |
|---|---|---|
| `gmail-export.txt` | Gmail exports | Plain-text dump of sent emails (Gmail/Takeout `.mbox` reads as text) |
| `linkedin-messages.csv` | LinkedIn messages | LinkedIn data export `messages.csv` (real column headers) |
| `instagram-dms.json` | Instagram DMs | Instagram data download `messages_1.json` shape |
| `whatsapp-chat.txt` | WhatsApp messages | WhatsApp "Export chat" `.txt` (iOS `[date, time] Name:` format) |

## How to use with the importer

Each channel's upload button accepts that platform's real export format:

- **Gmail** — Upload `.txt` → `gmail-export.txt`
- **LinkedIn** — Upload `.csv` → `linkedin-messages.csv`
- **Instagram** — Upload `.json` → `instagram-dms.json`
- **WhatsApp** — Upload `.txt` → `whatsapp-chat.txt`

All four can be uploaded directly. The importer reads the file as text and
sends the raw contents to `/api/voice/analyze` — pasting into the textarea
works equally well.
