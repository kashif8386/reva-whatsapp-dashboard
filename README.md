# Parfumea WhatsApp Inbox Dashboard

A simple, WhatsApp-style inbox for REVA's clients to view AI-handled
conversations and jump in with a manual reply whenever they want.

Reads and writes data directly to your Airtable base — no separate database
needed for now. n8n keeps doing all the heavy lifting (receiving WhatsApp
messages, running the AI Agent, sending replies); this dashboard is just a
clean window into the same Airtable tables n8n already uses.

## How it fits with the rest of the system

```
WhatsApp <-> n8n (Railway) <-> Airtable (Leads + Messages) <-> this dashboard
```

- n8n writes new messages and AI replies into the `Messages` table, and
  keeps `Last Message At` updated on each `Leads` record.
- This dashboard reads from those same tables to show the chat list and
  thread view.
- When someone at Parfumea types a reply here and hits send, the dashboard
  sets `Pending Reply` and `Send Reply = true` on that Lead. A separate n8n
  workflow (triggered by `Send Reply` becoming true) picks it up, sends it
  over WhatsApp, logs it to `Messages`, then clears those two fields again.

## 1. Install dependencies

```bash
npm install
```

## 2. Set up your environment variables

Copy the example file:

```bash
cp .env.example .env
```

Then open `.env` and fill in:

- `VITE_AIRTABLE_TOKEN` — a Personal Access Token from
  https://airtable.com/create/tokens with `data.records:read` and
  `data.records:write` scopes, granted access to your
  `Parfumea WhatsApp Sales CRM` base.
- `VITE_AIRTABLE_BASE_ID` — found in your base's URL
  (`airtable.com/appXXXXXXXXXXXXXX/...` — the `appXXXXXXXXXXXXXX` part).

**Never commit your real `.env` file.** It's already listed in
`.gitignore`, so a normal `git add .` won't pick it up — but always
double check before pushing to GitHub.

## 3. Run it locally

```bash
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

## 4. Required Airtable fields

This dashboard expects your `Leads` table to have at least:

| Field | Type |
|---|---|
| Contact Name | Single line text |
| Phone Number | Phone number |
| Status | Single select |
| Lead Source | Single select |
| Label | Single line text or single select |
| Human Takeover | Checkbox |
| Pending Reply | Long text |
| Send Reply | Checkbox |
| Last Message At | Date (with time) |

And your `Messages` table:

| Field | Type |
|---|---|
| Lead | Link to Leads |
| Message Text | Long text |
| Sender | Single select: Customer / AI Agent / Client |
| Timestamp | Date (with time) |

## 5. Deploying to Railway (or any static host)

```bash
npm run build
```

This produces a `dist/` folder with the production build. On Railway:

1. Create a new project (or add a service to your existing n8n project).
2. Connect this code's GitHub repo, or deploy the `dist/` folder directly.
3. In Railway's environment variables panel, add the same variables from
   your `.env` file — **paste the token there, not into any code file or
   chat.**
4. Set the build command to `npm run build` and the start command to serve
   the `dist/` folder (e.g. with `vite preview` or a static file server).

## Notes on scale

This setup uses simple polling (refetches data every 8 seconds) rather than
real-time websockets — easily good enough for one client at moderate
WhatsApp volume. Airtable's free/Team plans support up to roughly 50,000
records per base, which is plenty of headroom for now but worth watching as
message volume grows. If you outgrow Airtable later (many clients, high
message volume), the plan is to swap the contents of `src/api/airtable.js`
for calls to a real database (e.g. Supabase or Postgres) — the rest of the
dashboard doesn't need to change.
