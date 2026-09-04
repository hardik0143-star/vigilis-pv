# Vigilis — AI-Native Pharmacovigilance & Safety Intelligence Platform

Enterprise-style demonstration/portfolio product inspired by the workflow concepts found in modern PV platforms such as Veeva Safety Suite and Oracle Health Sciences Safety/Argus.

## Highlights
- Executive PV dashboard and operational work queues
- ICSR intake, structured case management, medical review and QC
- AI/agentic workflow simulator: Intake, Coding, Duplicate, Review, Narrative, Submission, Literature and Signal agents
- Human-in-the-loop approvals with explainability and confidence
- MedDRA-style coding stand-in (not a licensed MedDRA dictionary)
- Duplicate detection, causality/seriousness decision support
- Submission readiness, E2B(R3)-style export simulation and acknowledgement tracking
- Literature triage and signal management
- PRR/ROR/chi-square screening with signal investigations
- Aggregate report workspace and safety document hub
- RBAC/admin concepts, audit trail, configurable workflow concepts
- Responsive enterprise UI with command palette and AI Copilot

## Run
npm install
npm run dev

## Deploy
Push the project root to GitHub and import the repository into Vercel. Add `ANTHROPIC_API_KEY` as a Vercel Environment Variable if live AI is desired.

## Important
This is an advanced demonstration/portfolio foundation, not a validated GxP system and not a certified replacement for Veeva Vault Safety or Oracle Argus. Production deployment would require validated infrastructure, controlled authentication/RBAC, database controls, immutable audit trail, e-signatures, change control, CSV/CSA, privacy/security controls, licensed MedDRA/WHODrug, regulatory gateway connectivity, monitoring, backup/DR and formal validation.
