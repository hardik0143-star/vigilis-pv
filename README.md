# Vigilis PV

Vigilis is a pharmacovigilance case-management prototype built with React + Vite.

## GitHub + Vercel deployment

1. Upload this project to a GitHub repository.
2. Import the repository into Vercel.
3. Vercel should detect Vite automatically.
4. In Vercel **Project Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key
   - `ANTHROPIC_MODEL` = `claude-sonnet-4-6` (optional)
5. Redeploy after saving the variables.

## Local development

```bash
npm install
cp .env.example .env.local
# edit .env.local and add your real ANTHROPIC_API_KEY
npm run dev
```

The browser never receives the Anthropic API key. AI requests go through `/api/ai`.

## Security note

This is a prototype and is not a validated GxP/regulatory submission system. Do not use real patient-identifiable or other sensitive production data without appropriate security, privacy, validation, access control, audit, retention, and regulatory controls.
