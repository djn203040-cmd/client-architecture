# Uptime Monitor Setup — 06-PLAN.md §1.10

The product needs an external uptime monitor that pings `/api/health` and pages
Daniel when the endpoint returns non-200 for >2 minutes. This is a one-time setup.

## Recommended: BetterStack (free tier)

1. Create an account at https://betterstack.com/uptime
2. Create a new monitor:
   - **URL:** `https://<your-domain>.com/api/health`
   - **Check frequency:** 1 minute
   - **Request timeout:** 10 seconds
   - **Expected status:** 200
   - **Expected body contains:** `"ok":true`
3. Notification channels:
   - Email → djn203040@gmail.com
   - SMS / WhatsApp via Twilio integration (optional)
   - Slack incoming webhook into #ops (optional)
4. Set escalation: page after 2 consecutive failures (2 min outage).

## Alternative: Vercel Monitor (paid)

If already on Vercel Pro, configure under Project → Observability → Monitors.

## Verification

After setup, set `OBSERVABILITY_UPTIME_URL` env to the public status page URL.
Document in README + SECURITY.md.
