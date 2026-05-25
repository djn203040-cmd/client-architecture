# Calendar OAuth Setup

To enable the 4 OAuth-based calendar providers in **Settings → Calendar** and the onboarding **Calendar** step, you need to register an OAuth app per provider and drop the credentials into `.env.local`.

The 3 API-key providers (**Cal.com**, **Setmore**, **TidyCal**) need nothing from you — coaches paste their own keys directly in the UI at connect time.

| Provider | Auth type | What you need | Where it goes |
|---|---|---|---|
| Calendly | OAuth2 | client_id + client_secret | `CALENDLY_CLIENT_ID`, `CALENDLY_CLIENT_SECRET` |
| Cal.com | API key (per-coach) | nothing | — |
| Acuity Scheduling | OAuth2 | client_id + client_secret | `ACUITY_CLIENT_ID`, `ACUITY_CLIENT_SECRET` |
| Setmore | API key (per-coach) | nothing | — |
| Square Appointments | OAuth2 | client_id + client_secret | `SQUARE_CLIENT_ID`, `SQUARE_CLIENT_SECRET` |
| Microsoft Bookings | OAuth2 | client_id + client_secret | `MS_BOOKINGS_CLIENT_ID`, `MS_BOOKINGS_CLIENT_SECRET` |
| TidyCal | API key (per-coach) | nothing | — |

You also need to set a single shared HMAC secret used to sign the OAuth `state` param (CSRF protection):

```
CALENDAR_OAUTH_STATE_SECRET=<random 32+ chars, e.g. `openssl rand -hex 32`>
```

All 4 OAuth providers use the same redirect URI shape:

```
{NEXT_PUBLIC_APP_URL}/api/auth/calendar/{provider}/callback
```

For local dev:
- `http://localhost:3000/api/auth/calendar/calendly/callback`
- `http://localhost:3000/api/auth/calendar/acuity/callback`
- `http://localhost:3000/api/auth/calendar/square/callback`
- `http://localhost:3000/api/auth/calendar/ms_bookings/callback`

For production, swap `http://localhost:3000` for your real domain. Both URIs need to be whitelisted in the provider's dashboard if you want the same OAuth app to work in both environments.

---

## Calendly

1. Sign in to [developer.calendly.com](https://developer.calendly.com/).
2. **My Apps → Create App** → pick the workspace.
3. **App Type:** Webhook + OAuth (Authorization Code).
4. **Redirect URI:** the localhost URL above (and production, on separate lines).
5. Copy **Client ID** and **Client Secret** into `.env.local`:
   ```
   CALENDLY_CLIENT_ID=...
   CALENDLY_CLIENT_SECRET=...
   ```
6. **Scopes:** Calendly OAuth does not require explicit scope strings — leave blank.
7. The webhook signing secret is generated per-coach at connect time. Nothing to configure here.

**Gotcha:** Calendly OAuth apps need an internal team approval (~24h) before they go live. While in dev mode, only the app's owner email can complete the flow.

---

## Acuity Scheduling

1. Sign in to your Acuity admin → **Business Settings → Integrations → API**.
2. Click **Create App** under "OAuth 2 Applications".
3. **Redirect URI:** the localhost URL above.
4. **Scopes:** check `api-v1`.
5. Copy **Client ID** and **Client Secret** into `.env.local`:
   ```
   ACUITY_CLIENT_ID=...
   ACUITY_CLIENT_SECRET=...
   ```

**Gotcha:** Acuity registers webhooks per event type, so on connect we register three separate subscriptions (scheduled/rescheduled/canceled). If one fails to register the others may still succeed — check `integrations.metadata.webhook_subscription_ids` for the actual list.

---

## Square Appointments

1. Sign in to the [Square Developer Dashboard](https://developer.squareup.com/).
2. **Applications → New Application**.
3. Open the application → **OAuth** tab.
4. **Redirect URL:** the localhost URL above. Add a separate production entry.
5. Copy **Application ID** (= client_id) and **Application Secret** into `.env.local`:
   ```
   SQUARE_CLIENT_ID=...
   SQUARE_CLIENT_SECRET=...
   ```
6. **Scopes** used by the connect flow:
   - `APPOINTMENTS_READ`
   - `APPOINTMENTS_WRITE`
   - `MERCHANT_PROFILE_READ`

**Webhook secret** is not auto-registered by us — Square uses a one-secret-per-endpoint model. After connecting in our UI:
1. Open **Webhooks → Subscriptions → Add Endpoint** in the Square dashboard.
2. Paste the webhook URL shown in **Settings → Calendar → Webhook setup**.
3. Subscribe to events: `booking.created`, `booking.updated`.
4. Square shows you a **signature key** — paste that into `SQUARE_WEBHOOK_SECRET` in `.env.local`.

---

## Microsoft Bookings

1. Sign in to the [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID → App registrations**.
2. **New registration**:
   - Name: e.g. "The Client Architecture — Bookings"
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (multitenant).
   - Redirect URI (type: **Web**): the localhost URL above.
3. Open the new app → **Certificates & secrets → Client secrets → New client secret**. Copy the **Value** (this is your `MS_BOOKINGS_CLIENT_SECRET` — it is shown only once).
4. Open **API permissions → Add a permission → Microsoft Graph → Delegated permissions**. Add:
   - `Bookings.Read.All`
   - `Bookings.ReadWrite.All`
   - `offline_access`
5. Click **Grant admin consent** if the directory requires it.
6. Copy the **Application (client) ID** + the client secret value into `.env.local`:
   ```
   MS_BOOKINGS_CLIENT_ID=...
   MS_BOOKINGS_CLIENT_SECRET=...
   ```

**Gotchas:**
- MS Bookings does **not** support push webhooks today. We poll Graph API every ~5 minutes — bookings will appear with a small delay. No webhook setup is required in the UI.
- Personal Microsoft accounts that don't have an active Microsoft 365 Business subscription will get a 403 on the Bookings endpoints — they need a tenant with Bookings enabled.

---

## Rotating credentials

If a client secret leaks:
1. Generate a new secret in the provider's dashboard.
2. Replace the value in `.env.local` (and Vercel project env).
3. Redeploy.
4. Existing coach tokens are unaffected (they hold an `access_token` + `refresh_token` granted to the old client_id — only new connects use the new secret).

If you also rotate the `client_id`, every existing coach will need to reconnect from **Settings → Calendar**.
