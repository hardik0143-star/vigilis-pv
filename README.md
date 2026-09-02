# Vigilis — Pharmacovigilance Prototype (standalone export)

This is the same app you saw inside Claude, exported as a real, runnable project
(React + Vite + Tailwind) so it can run outside Claude.ai — in your own browser,
or hosted anywhere as a static site.

## Quick start (run it locally)

You need [Node.js](https://nodejs.org) installed (v18+ recommended).

```bash
npm install
npm run dev
```

Then open the local URL it prints (usually `http://localhost:5173`).

## Build a static site (for hosting on GitHub Pages, Netlify, Vercel, etc.)

```bash
npm run build
```

This creates a `dist/` folder containing plain `.html`, `.js`, and `.css` files —
upload that folder to any static host and it works as a normal website.

## ⚠️ Two important things that change outside Claude.ai

### 1. Data storage becomes local-only (per browser)

Inside Claude.ai, this app used a special shared storage API (`window.storage`)
that persisted case data across everyone viewing it. That API only exists inside
Claude's own environment.

This export includes a small compatibility shim (top of `src/App.jsx`) that
automatically falls back to your browser's `localStorage` instead — so the app
still works and still remembers data between reloads, but:
- Data is now private to **your own browser only** — not shared with anyone else
  who runs this app, even from the same hosted link.
- Clearing your browser data / using a different browser or device starts fresh.

If you want real shared/multi-user storage, you'd need to connect a real
database and backend (e.g. Supabase, Firebase, or your own API) — this export
does not include one.

### 2. The AI-powered features need your own API key + backend

Several features call Anthropic's Claude API directly:
- Voice transcript translation & field extraction
- WHO-UMC causality "AI second opinion"
- AI-generated regulatory case narratives
- Literature screening

Inside Claude.ai, these calls were transparently authenticated for you. Outside
it, the app calls `https://api.anthropic.com/v1/messages` with no API key, so
these features **will fail** as-is (you'll see the in-app "couldn't reach the
AI service" error messages, not a crash — everything else keeps working).

**To make them work, you have two options:**

**Option A — quick & only for private/local testing (not for a public site):**
Add your Anthropic API key directly into the fetch calls in `src/App.jsx`
(search for `api.anthropic.com`). This is fine for testing on your own machine,
but **never do this for anything you deploy publicly** — anyone can view your
site's source code and steal the key.

**Option B — the correct way for anything public-facing:**
Set up a tiny backend (a serverless function on Vercel/Netlify/Cloudflare
Workers, or a small Node/Express server) that holds your API key server-side,
and change the `fetch("https://api.anthropic.com/v1/messages", ...)` calls in
`src/App.jsx` to instead call your own backend endpoint, which then calls
Anthropic on the app's behalf. This keeps your key private.

## Everything else works exactly as it did in Claude

Signal detection (PRR/ROR/chi-square), MedDRA-style term matching, the
seriousness/special-situations logic, deadline countdowns, the demo sandbox,
the admin panel, exports (JSON, simplified E2B-style XML) — none of that needs
any external API and all works immediately with `npm run dev`.

## Before you publish this anywhere public

- Change `SUPERUSER_PASSWORD` and especially `ADMIN_PASSCODE` near the top of
  `src/App.jsx` — these are plain front-end checks, not real security, but
  don't leave them at the defaults.
- Remember: none of this is a certified GxP/GVP system. See the in-app
  disclaimers — they still apply here.
