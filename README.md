# Vigilis – Pharmacovigilance Prototype

Vigilis is a React/Vite pharmacovigilance prototype with a secure Vercel server-side AI proxy.

## Project structure

```text
.
├── api/
│   └── ai.js
├── src/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

## Important Vercel fix

`vercel.json` is intentionally empty. Vercel automatically detects JavaScript files in the root `api/` directory as Serverless Functions. The AI function sets its own `maxDuration` in `api/ai.js`.

## Deploy to GitHub + Vercel

1. Upload the **contents of this folder** to the root of your GitHub repository. `package.json`, `api/`, and `src/` must be directly visible at repository root.
2. Import the GitHub repository into Vercel.
3. Framework preset: Vite (Vercel should detect it automatically).
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add environment variable `ANTHROPIC_API_KEY` in Vercel. Never put the real key in GitHub.
7. Optional: add `ANTHROPIC_MODEL` if you want to override the default model.
8. Deploy.

## AI architecture

Browser → `/api/ai` → Anthropic API

The Anthropic API key is read only by the server-side Vercel Function.

## Security

This is a prototype and is not validated GxP/regulatory submission software. Do not enter real patient-identifiable or other sensitive production data without appropriate security, validation, access control, audit trail, retention, and regulatory controls.
