import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronRight, ChevronLeft, AlertTriangle, Activity, Pill, User,
  FileText, Send, Download, Printer, Plus, Check, Mic, MicOff, Languages,
  ClipboardList, Trash2, ArrowLeft, LayoutDashboard, BarChart3, PlayCircle,
  Sparkles, ShieldAlert, Loader2, TrendingUp, FlaskConical, CalendarClock,
  Radar, Zap, Info, Cloud, CloudOff, Lock, Eye, EyeOff, Code2, Mail,
  LogOut, EyeOff as MaskIcon, Copy, ExternalLink, Tag, X, BookOpen, Link2, ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

// ---------------------------------------------------------------------------
// Storage compatibility shim — outside Claude.ai, window.storage (the
// Claude-artifact key/value API) doesn't exist. This shim makes it fall back
// to the browser's localStorage automatically, so the app still persists
// data across reloads in THIS browser. It ignores the "shared" flag (there's
// no multi-user backend without a real server), so unlike on Claude.ai, data
// here is local to this browser only, not shared across visitors.
// ---------------------------------------------------------------------------
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) {
      const v = window.localStorage.getItem(key);
      if (v === null) throw new Error("not found");
      return { key, value: v, shared: false };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      window.localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix) {
      const keys = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return { keys, prefix, shared: false };
    },
  };
}


// ---------------------------------------------------------------------------
// Config — edit these before sharing publicly
// ---------------------------------------------------------------------------
const APP_NAME = "Vigilis";
const SUPERUSER_USERNAME = "Superuser";
const SUPERUSER_PASSWORD = "Vigilis#2026"; // front-end-only gate, not real security — change freely
const ADMIN_PASSCODE = "VigilisAdmin#2026"; // separate from the public demo password above — change this before publishing. Still front-end-only, not real security (see Admin tab).
const DEVELOPER_NAME = "Hardik Desai";
const DEVELOPER_ROLE = "Developer & Product Owner";
const CONTACT_EMAIL = ""; // <-- add your email when ready
const CONTACT_LINKEDIN = ""; // optional, e.g. "https://linkedin.com/in/yourprofile"

const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const C = {
  indigo: "#4F46E5", indigoDeep: "#4338CA", indigoDeeper: "#312E81",
  violet: "#7C3AED", violetDeep: "#6D28D9", violetSoft: "#F5F3FF", violetBorder: "#DDD6FE",
  emerald: "#10B981", emeraldDeep: "#059669", emeraldDeeper: "#047857", emeraldSoft: "#ECFDF5", emeraldBorder: "#A7F3D0",
  rose: "#E11D48", roseDeep: "#BE123C", roseSoft: "#FFF1F2", roseBorder: "#FECDD3",
  amber: "#F59E0B", amberDeep: "#D97706", amberSoft: "#FFFBEB", amberBorder: "#FDE68A",
  sky: "#0EA5E9", skyDeep: "#0284C7", skySoft: "#F0F9FF", skyBorder: "#BAE6FD",
  slate900: "#0F172A", slate600: "#64748B", slate400: "#94A3B8",
  border: "#E4E4F0", bg: "#F7F7FB",
};

const UI_REFINEMENT_CSS = `
  :root { color-scheme: light; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: #F7F7FB; }
  button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible { outline: 3px solid rgba(79,70,229,.28); outline-offset: 2px; }
  .vigilis-surface { box-shadow: 0 1px 2px rgba(15,23,42,.03), 0 10px 30px rgba(49,46,129,.05); }
  .vigilis-grid { background-image: linear-gradient(rgba(79,70,229,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,.035) 1px, transparent 1px); background-size: 28px 28px; }
  .vigilis-card-hover { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
  .vigilis-card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(15,23,42,.08); border-color: #C7C8F5 !important; }
  .vigilis-metric { position: relative; overflow: hidden; }
  .vigilis-metric:after { content: ""; position:absolute; width:70px; height:70px; right:-28px; top:-28px; border-radius:999px; background: currentColor; opacity:.045; }
  @media (max-width: 640px) { .vigilis-page { padding-left:16px !important; padding-right:16px !important; } .vigilis-detail-card { padding:20px !important; border-radius:16px !important; } .vigilis-title { font-size:20px !important; } }
  @media print { body { background:#fff !important; } }
`;

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const COUNTRIES = [
  { code: "US", name: "United States", authority: "FDA", portal: "MedWatch (FAERS)", serious: "15 calendar days", nonSerious: "Periodic report" },
  { code: "EU", name: "European Union", authority: "EMA", portal: "EudraVigilance", serious: "15 calendar days", nonSerious: "90 calendar days" },
  { code: "UK", name: "United Kingdom", authority: "MHRA", portal: "Yellow Card Scheme", serious: "15 calendar days", nonSerious: "90 calendar days" },
  { code: "CA", name: "Canada", authority: "Health Canada", portal: "Canada Vigilance", serious: "15 calendar days", nonSerious: "Annual report" },
  { code: "IN", name: "India", authority: "CDSCO", portal: "PvPI", serious: "14 calendar days", nonSerious: "Periodic report" },
  { code: "AU", name: "Australia", authority: "TGA", portal: "DAEN Blue Card", serious: "15 calendar days", nonSerious: "Periodic report" },
  { code: "JP", name: "Japan", authority: "PMDA", portal: "PMDA Adverse Event Portal", serious: "15 calendar days", nonSerious: "Periodic report" },
  { code: "OTHER", name: "Other / not listed", authority: "WHO Uppsala Monitoring Centre", portal: "VigiBase (via national center)", serious: "As per national center", nonSerious: "As per national center" },
];

const SERIOUSNESS_CRITERIA = [
  { key: "death", label: "Resulted in death" },
  { key: "lifeThreatening", label: "Life-threatening" },
  { key: "hospitalization", label: "Caused or prolonged hospitalization" },
  { key: "disability", label: "Persistent or significant disability" },
  { key: "congenital", label: "Congenital anomaly / birth defect" },
  { key: "otherMedical", label: "Other medically important event" },
];

// GVP Module VI special situations — reportable/trackable independent of the
// seriousness criteria above, each with its own regulatory handling.
const SPECIAL_SITUATIONS = [
  { key: "pregnancy", label: "Pregnancy or breastfeeding exposure" },
  { key: "overdose", label: "Overdose (intentional or accidental)" },
  { key: "misuseAbuse", label: "Misuse or abuse" },
  { key: "medicationError", label: "Medication error (wrong dose, drug, or route)" },
  { key: "offLabel", label: "Off-label use" },
  { key: "lackOfEfficacy", label: "Lack of therapeutic efficacy" },
];

// ---------------------------------------------------------------------------
// WHO-UMC causality assessment — simplified decision aid based on the WHO
// Uppsala Monitoring Centre causality categories. This is a teaching/triage
// aid, not a substitute for a qualified clinician's judgement.
// ---------------------------------------------------------------------------
const CAUSALITY_CATEGORIES = {
  "Certain": { color: C.emeraldDeeper, soft: C.emeraldSoft, border: C.emeraldBorder },
  "Probable / Likely": { color: C.emeraldDeep, soft: C.emeraldSoft, border: C.emeraldBorder },
  "Possible": { color: C.amberDeep, soft: C.amberSoft, border: C.amberBorder },
  "Unlikely": { color: C.slate600, soft: "#F1F5F9", border: C.border },
  "Conditional / Unclassified": { color: C.skyDeep, soft: C.skySoft, border: C.skyBorder },
  "Unassessable / Unclassifiable": { color: C.rose, soft: C.roseSoft, border: C.roseBorder },
};

function computeWhoUmcCategory({ temporal, altExplanation, dechallenge, rechallenge }) {
  if (!temporal || !altExplanation) return null;
  if (temporal === "unknown" || altExplanation === "unknown") {
    return {
      category: "Conditional / Unclassified",
      rationale: "Key information needed for a firm classification — the temporal relationship and/or possible alternative explanations — is still missing. More data is needed before this pair can be classified with confidence.",
    };
  }
  if (temporal === "no") {
    return {
      category: "Unlikely",
      rationale: "The timing between starting the medicine and the reaction doesn't fit a plausible causal relationship, which argues against this medicine as the cause.",
    };
  }
  // temporal === "yes" from here on
  if (altExplanation === "yes") {
    return {
      category: "Possible",
      rationale: "The timing is plausible, but the underlying condition or another medicine could equally explain the reaction, so causality can't be pinned on this medicine alone.",
    };
  }
  if (altExplanation === "possibly") {
    return {
      category: "Possible",
      rationale: "The timing is plausible and an alternative explanation can't be ruled out, so this sits in the middle rather than a stronger category.",
    };
  }
  // altExplanation === "no", temporal === "yes"
  if (rechallenge === "recurred") {
    return {
      category: "Certain",
      rationale: "Timing is plausible, no alternative explanation was identified, and the reaction recurred when the medicine was restarted — about as strong as evidence gets outside a controlled trial.",
    };
  }
  if (dechallenge === "improved") {
    return {
      category: "Probable / Likely",
      rationale: "Timing is plausible, no alternative explanation was identified, and the reaction improved after the medicine was stopped or reduced.",
    };
  }
  return {
    category: "Probable / Likely",
    rationale: "Timing is plausible and no alternative explanation was identified, though dechallenge/rechallenge information is limited or wasn't applicable.",
  };
}

// ---------------------------------------------------------------------------
// MedDRA-style term standardization — a small curated terminology set
// (System Organ Class → Preferred Term, with lay synonyms) inspired by the
// structure of MedDRA. This is NOT the licensed MedDRA dictionary — it's a
// simplified stand-in so free-text reaction descriptions can be grouped
// consistently for analytics and signal detection.
// ---------------------------------------------------------------------------
const MEDDRA_TERMS = [
  { pt: "Nausea", soc: "Gastrointestinal disorders", synonyms: ["nausea", "feeling sick", "queasy", "queasiness"] },
  { pt: "Vomiting", soc: "Gastrointestinal disorders", synonyms: ["vomiting", "throwing up", "threw up", "emesis"] },
  { pt: "Diarrhoea", soc: "Gastrointestinal disorders", synonyms: ["diarrhea", "diarrhoea", "loose stools", "loose motions"] },
  { pt: "Abdominal pain", soc: "Gastrointestinal disorders", synonyms: ["stomach ache", "abdominal pain", "tummy ache", "belly pain", "stomach pain"] },
  { pt: "Constipation", soc: "Gastrointestinal disorders", synonyms: ["constipation", "constipated"] },
  { pt: "Dyspepsia", soc: "Gastrointestinal disorders", synonyms: ["indigestion", "dyspepsia", "heartburn", "acid reflux"] },
  { pt: "Rash", soc: "Skin and subcutaneous tissue disorders", synonyms: ["rash", "skin rash", "breakout"] },
  { pt: "Pruritus", soc: "Skin and subcutaneous tissue disorders", synonyms: ["itching", "itchy", "pruritus", "itchiness"] },
  { pt: "Urticaria", soc: "Skin and subcutaneous tissue disorders", synonyms: ["hives", "urticaria", "welts"] },
  { pt: "Angioedema", soc: "Skin and subcutaneous tissue disorders", synonyms: ["swelling of lips", "facial swelling", "angioedema", "swollen face", "lip swelling"] },
  { pt: "Erythema", soc: "Skin and subcutaneous tissue disorders", synonyms: ["redness", "erythema", "red skin", "flushed skin"] },
  { pt: "Headache", soc: "Nervous system disorders", synonyms: ["headache", "head pain", "migraine"] },
  { pt: "Dizziness", soc: "Nervous system disorders", synonyms: ["dizziness", "dizzy", "lightheaded", "light-headed"] },
  { pt: "Somnolence", soc: "Nervous system disorders", synonyms: ["drowsy", "drowsiness", "sleepy", "somnolence"] },
  { pt: "Tremor", soc: "Nervous system disorders", synonyms: ["tremor", "shaking", "shakiness"] },
  { pt: "Paraesthesia", soc: "Nervous system disorders", synonyms: ["tingling", "numbness", "pins and needles", "paraesthesia"] },
  { pt: "Syncope", soc: "Nervous system disorders", synonyms: ["fainting", "passed out", "syncope", "blackout"] },
  { pt: "Seizure", soc: "Nervous system disorders", synonyms: ["seizure", "convulsion", "fit"] },
  { pt: "Fatigue", soc: "General disorders and administration site conditions", synonyms: ["fatigue", "tiredness", "tired", "exhaustion", "exhausted"] },
  { pt: "Pyrexia", soc: "General disorders and administration site conditions", synonyms: ["fever", "high temperature", "pyrexia"] },
  { pt: "Chills", soc: "General disorders and administration site conditions", synonyms: ["chills", "shivering"] },
  { pt: "Asthenia", soc: "General disorders and administration site conditions", synonyms: ["weakness", "asthenia", "feeling weak"] },
  { pt: "Injection site reaction", soc: "General disorders and administration site conditions", synonyms: ["injection site pain", "injection site redness", "site reaction"] },
  { pt: "Malaise", soc: "General disorders and administration site conditions", synonyms: ["malaise", "feeling unwell", "generally unwell"] },
  { pt: "Insomnia", soc: "Psychiatric disorders", synonyms: ["insomnia", "trouble sleeping", "can't sleep", "sleeplessness"] },
  { pt: "Anxiety", soc: "Psychiatric disorders", synonyms: ["anxiety", "anxious", "nervousness"] },
  { pt: "Depression", soc: "Psychiatric disorders", synonyms: ["depression", "depressed mood", "low mood"] },
  { pt: "Confusional state", soc: "Psychiatric disorders", synonyms: ["confusion", "confused", "disorientation"] },
  { pt: "Palpitations", soc: "Cardiac disorders", synonyms: ["palpitations", "heart racing", "racing heart", "heart pounding"] },
  { pt: "Tachycardia", soc: "Cardiac disorders", synonyms: ["fast heartbeat", "tachycardia", "rapid heart rate"] },
  { pt: "Chest pain", soc: "Cardiac disorders", synonyms: ["chest pain", "chest tightness"] },
  { pt: "QT prolongation", soc: "Cardiac disorders", synonyms: ["qt prolongation", "prolonged qt", "abnormal ecg"] },
  { pt: "Dyspnoea", soc: "Respiratory, thoracic and mediastinal disorders", synonyms: ["shortness of breath", "breathlessness", "dyspnoea", "trouble breathing", "difficulty breathing"] },
  { pt: "Cough", soc: "Respiratory, thoracic and mediastinal disorders", synonyms: ["cough", "coughing"] },
  { pt: "Wheezing", soc: "Respiratory, thoracic and mediastinal disorders", synonyms: ["wheezing", "wheeze"] },
  { pt: "Throat tightness", soc: "Respiratory, thoracic and mediastinal disorders", synonyms: ["throat tightness", "tight throat", "throat closing"] },
  { pt: "Myalgia", soc: "Musculoskeletal and connective tissue disorders", synonyms: ["muscle pain", "myalgia", "aching muscles"] },
  { pt: "Arthralgia", soc: "Musculoskeletal and connective tissue disorders", synonyms: ["joint pain", "arthralgia", "aching joints"] },
  { pt: "Muscle spasms", soc: "Musculoskeletal and connective tissue disorders", synonyms: ["muscle cramps", "muscle spasms", "cramping"] },
  { pt: "Myopathy", soc: "Musculoskeletal and connective tissue disorders", synonyms: ["myopathy", "muscle weakness", "muscle damage"] },
  { pt: "Anaphylactic reaction", soc: "Immune system disorders", synonyms: ["anaphylaxis", "anaphylactic reaction", "severe allergic reaction"] },
  { pt: "Hypersensitivity", soc: "Immune system disorders", synonyms: ["allergic reaction", "hypersensitivity", "allergy"] },
  { pt: "Hepatic injury", soc: "Hepatobiliary disorders", synonyms: ["liver damage", "hepatic injury", "liver injury", "hepatotoxicity"] },
  { pt: "Jaundice", soc: "Hepatobiliary disorders", synonyms: ["jaundice", "yellowing of skin", "yellow eyes"] },
  { pt: "Acute kidney injury", soc: "Renal and urinary disorders", synonyms: ["kidney injury", "acute kidney injury", "kidney damage", "renal failure"] },
  { pt: "Dysuria", soc: "Renal and urinary disorders", synonyms: ["painful urination", "dysuria", "burning urination"] },
  { pt: "Hypotension", soc: "Vascular disorders", synonyms: ["low blood pressure", "hypotension"] },
  { pt: "Hypertension", soc: "Vascular disorders", synonyms: ["high blood pressure", "hypertension"] },
  { pt: "Flushing", soc: "Vascular disorders", synonyms: ["flushing", "hot flashes", "hot flush"] },
  { pt: "Weight increased", soc: "Investigations", synonyms: ["weight gain", "weight increased", "gained weight"] },
  { pt: "Weight decreased", soc: "Investigations", synonyms: ["weight loss", "weight decreased", "lost weight"] },
  { pt: "Blood glucose increased", soc: "Investigations", synonyms: ["high blood sugar", "blood glucose increased", "hyperglycemia"] },
  { pt: "Fall", soc: "Injury, poisoning and procedural complications", synonyms: ["fell down", "fall", "falling"] },
];

function standardizeTerm(rawText) {
  const text = (rawText || "").trim().toLowerCase();
  if (!text) return null;
  let best = null, bestScore = 0;
  MEDDRA_TERMS.forEach((entry) => {
    const candidates = [entry.pt.toLowerCase(), ...entry.synonyms];
    candidates.forEach((c) => {
      let score = 0;
      if (text === c) score = 100;
      else if (text.includes(c) || c.includes(text)) score = Math.min(90, 50 + Math.min(c.length, text.length));
      if (score > bestScore) { bestScore = score; best = entry; }
    });
  });
  if (!best || bestScore < 45) return null;
  return { pt: best.pt, soc: best.soc, method: bestScore >= 90 ? "exact" : "fuzzy" };
}

async function aiStandardizeTerm(rawText) {
  const list = MEDDRA_TERMS.map((t) => `${t.pt} (${t.soc})`).join("; ");
  const prompt =
    `You are coding an adverse-event description onto a MedDRA-style Preferred Term. Available Preferred Terms, ` +
    `with their System Organ Class in parentheses:\n${list}\n\n` +
    `Reaction description: "${rawText}"\n\n` +
    `Pick the single best-matching Preferred Term EXACTLY as written above (copy the pt text exactly, do not modify it). ` +
    `If truly nothing in the list fits, respond with null values. Respond with ONLY this JSON, no markdown, no commentary: ` +
    `{"pt": "..." or null, "soc": "..." or null}`;
  const text = await askClaudeText(prompt);
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.pt) return null;
  const match = MEDDRA_TERMS.find((t) => t.pt === parsed.pt);
  return match ? { pt: match.pt, soc: match.soc, method: "ai" } : null;
}


const STEPS = ["Patient", "Medicines", "Reactions", "Seriousness", "Reporter", "Review"];
const STORAGE_KEY = "ae-reports";
const LOCKDOWN_KEY = "vigilis-lockdown-v1";

const LANGUAGES = [
  { code: "en-US", label: "English" }, { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" }, { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" }, { code: "pt-BR", label: "Portuguese" },
  { code: "nl-NL", label: "Dutch" }, { code: "ru-RU", label: "Russian" },
  { code: "zh-CN", label: "Chinese (Mandarin)" }, { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" }, { code: "ar-SA", label: "Arabic" },
  { code: "hi-IN", label: "Hindi" }, { code: "bn-BD", label: "Bengali" },
  { code: "ur-PK", label: "Urdu" }, { code: "tr-TR", label: "Turkish" },
  { code: "vi-VN", label: "Vietnamese" }, { code: "th-TH", label: "Thai" },
  { code: "id-ID", label: "Indonesian" }, { code: "pl-PL", label: "Polish" },
  { code: "uk-UA", label: "Ukrainian" }, { code: "sv-SE", label: "Swedish" },
  { code: "el-GR", label: "Greek" }, { code: "he-IL", label: "Hebrew" },
  { code: "fa-IR", label: "Persian" }, { code: "sw-KE", label: "Swahili" },
];

const SCHEMAS = {
  patient: {
    fields: `{"age": string, "sex": "Female"|"Male"|"Other"|"", "weight": string, "weightUnit": "kg"|"lb"|"", "conditions": string}`,
    labels: { age: "Age", sex: "Sex", weight: "Weight", weightUnit: "Weight unit", conditions: "Medical history" },
  },
  drug: {
    fields: `{"name": string, "dose": string, "doseUnit": string, "route": string, "frequency": string, "indication": string}`,
    labels: { name: "Drug name", dose: "Dose", doseUnit: "Dose unit", route: "Route", frequency: "Frequency", indication: "Taken for" },
  },
  event: {
    fields: `{"description": string, "term": string, "severity": "Mild"|"Moderate"|"Severe"|"", "outcome": string}`,
    labels: { description: "Description", term: "Reaction term", severity: "Severity", outcome: "Outcome" },
  },
};

const blankDrug = () => ({ id: uid(), name: "", dose: "", doseUnit: "mg", route: "Oral", frequency: "", startDate: "", endDate: "", ongoing: false, indication: "" });
const blankEvent = () => ({ id: uid(), description: "", term: "", onsetDate: "", severity: "Moderate", outcome: "Recovering", expectedness: "" });

const blankForm = () => ({
  patient: { age: "", sex: "", weight: "", weightUnit: "kg", conditions: "", country: "US", masked: false },
  drugs: [blankDrug()],
  events: [blankEvent()],
  seriousness: { death: false, lifeThreatening: false, hospitalization: false, disability: false, congenital: false, otherMedical: false },
  specialSituations: { pregnancy: false, overdose: false, misuseAbuse: false, medicationError: false, offLabel: false, lackOfEfficacy: false },
  reporter: { type: "Patient", name: "", contact: "", masked: false },
  source: "manual",
  literatureSource: null,
});

// ---------------------------------------------------------------------------
// Privacy masking
// ---------------------------------------------------------------------------
function bucketAge(age) {
  const n = parseInt(age, 10);
  if (isNaN(n)) return "Unknown";
  const lower = Math.floor(n / 10) * 10;
  return `${lower}-${lower + 9} yrs`;
}
function maskPatient(p) {
  if (!p.masked) return p;
  return { ...p, age: bucketAge(p.age), weight: "", weightUnit: "", conditions: "Withheld for privacy" };
}
function maskReporter(r) {
  if (!r.masked) return r;
  return { ...r, name: "Withheld for privacy", contact: "Withheld for privacy" };
}

// ---------------------------------------------------------------------------
// Anthropic API helper (translation + field extraction)
// ---------------------------------------------------------------------------
async function translateAndExtract(transcript, languageLabel, stepType) {
  const schema = SCHEMAS[stepType];
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content:
            `You are a medical intake assistant. The person spoke aloud in ${languageLabel}. ` +
            `Translate their speech to English if it isn't already in English, then extract information ` +
            `into this exact JSON schema. If the step is "event", also produce a short standardized "term" ` +
            `(1-3 words, e.g. "rash", "nausea", "dizziness") summarizing the reaction. Only include information ` +
            `explicitly stated; leave a field as an empty string if it wasn't mentioned. Respond with ONLY valid ` +
            `JSON — no markdown fences, no commentary before or after it.\n\n` +
            `Transcribed speech: "${transcript}"\n\nJSON schema:\n${schema.fields}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { const errBody = await res.json(); detail = errBody?.error?.message || ""; } catch (e) {}
    throw new Error(`API request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock || !textBlock.text) throw new Error("Empty response from model");
  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  const jsonStr = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(jsonStr);
}

async function askClaudeText(prompt) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = await res.json();
  return (data.text || "").trim();
}

// ---------------------------------------------------------------------------
// Literature screening — searches (or reads a pasted excerpt) for adverse
// event signals tied to a named product, and returns a structured, citable
// draft. This never auto-saves a case: a human always reviews the draft in
// the normal intake wizard before anything is added to the case log.
// ---------------------------------------------------------------------------
async function screenLiterature({ drugName, sourceUrl, pastedText }) {
  const hasOwnText = pastedText && pastedText.trim().length > 40;
  const contextParts = [];
  if (hasOwnText) contextParts.push(`Pasted excerpt supplied by the reviewer:\n"""${pastedText.trim().slice(0, 6000)}"""`);
  if (sourceUrl && sourceUrl.trim()) contextParts.push(`Reference link supplied by the reviewer: ${sourceUrl.trim()}`);

  const prompt =
    `You are a pharmacovigilance literature screener performing an initial triage scan (this is a screening aid, ` +
    `not a final medical determination). Product/company drug name to screen: "${drugName}".\n\n` +
    (hasOwnText
      ? `Base your assessment primarily on the pasted excerpt below. Only search the web for extra context if the excerpt is ambiguous.`
      : `Search the public web for case reports, published literature, regulatory safety communications, or reputable ` +
        `news describing adverse events associated with this product. If a reference link was supplied, try to locate ` +
        `and use that specific source.`) +
    `\n\n${contextParts.join("\n\n")}\n\n` +
    `Respond with ONLY this JSON (no markdown fences, no commentary, no text before or after):\n` +
    `{"found": true|false, "drug": "product name as commonly written", "reactionTerm": "short 1-3 word reaction term, or empty string", ` +
    `"severity": "Mild" or "Moderate" or "Severe" or "", "summary": "a 2-4 sentence summary IN YOUR OWN WORDS — never copy a direct quote longer than a few words", ` +
    `"sourceTitle": "title of the source you used, or empty string", "sourceUrl": "URL of the source you actually used, or empty string — never invent one", ` +
    `"confidence": "high" or "medium" or "low", "notes": "brief caveats, e.g. single case report, preprint, or ambiguous causality"}\n\n` +
    `If nothing credible turns up, set "found": false and explain briefly in "notes". Do not fabricate a source, a URL, or ` +
    `statistics. Never reproduce more than a short paraphrase of any source.`;

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
      useWebSearch: !hasOwnText,
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = await res.json();
  const finalText = data.text || "";
  const cleaned = finalText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  const jsonStr = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(jsonStr);
}


// ---------------------------------------------------------------------------
// Signal detection (disproportionality screening across the user's case log)
// ---------------------------------------------------------------------------
function computeSignals(history) {
  const drugDisplay = {}, termDisplay = {};
  const effTerm = (e) => (e.meddra?.pt || e.term || "").trim();
  history.forEach((r) => {
    (r.drugs || []).forEach((d) => { if (d.name?.trim()) drugDisplay[d.name.trim().toLowerCase()] = d.name.trim(); });
    (r.events || []).forEach((e) => { const t = effTerm(e); if (t) termDisplay[t.toLowerCase()] = t; });
  });

  const cases = history.map((r) => ({
    drugs: Array.from(new Set((r.drugs || []).map((d) => d.name?.trim().toLowerCase()).filter(Boolean))),
    terms: Array.from(new Set((r.events || []).map((e) => effTerm(e).toLowerCase()).filter(Boolean))),
  })).filter((c) => c.drugs.length > 0 && c.terms.length > 0);

  const N = cases.length;
  const drugTotals = {}, termTotals = {}, pairCounts = {};
  cases.forEach((c) => {
    c.drugs.forEach((dk) => { drugTotals[dk] = (drugTotals[dk] || 0) + 1; });
    c.terms.forEach((tk) => { termTotals[tk] = (termTotals[tk] || 0) + 1; });
    c.drugs.forEach((dk) => c.terms.forEach((tk) => {
      const key = dk + "|" + tk;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }));
  });

  const results = Object.entries(pairCounts).map(([key, a]) => {
    const [dk, tk] = key.split("|");
    const drugTotal = drugTotals[dk] || 0;
    const termTotal = termTotals[tk] || 0;
    const b = drugTotal - a;
    const c = termTotal - a;
    const d = N - a - b - c;
    let prr = null, exclusive = false;
    if (c > 0 && d >= 0) {
      const rateWithDrug = a / (a + b);
      const rateWithout = c / (c + d);
      prr = rateWithout > 0 ? rateWithDrug / rateWithout : null;
    } else if (c === 0 && a >= 2) {
      exclusive = true;
    }
    const ror = b > 0 && c > 0 ? (a * d) / (b * c) : null;
    const denom = (a + b) * (c + d) * (a + c) * (b + d);
    const chi2 = denom > 0 ? (N * Math.pow(a * d - b * c, 2)) / denom : 0;
    const flagged = (a >= 3 && prr !== null && prr >= 2 && chi2 >= 4) || (exclusive && a >= 3);
    return { drug: drugDisplay[dk], term: termDisplay[tk], drugKey: dk, termKey: tk, a, b, c, d, N, prr, ror, chi2, exclusive, flagged };
  });

  results.sort((x, y) => (y.prr || (y.exclusive ? 99 : 0)) - (x.prr || (x.exclusive ? 99 : 0)) || y.a - x.a);
  return {
    signals: results.filter((r) => r.flagged),
    watchlist: results.filter((r) => !r.flagged && r.a >= 1),
    N,
  };
}

function findSimilarCases(form, history) {
  const effTerm = (e) => (e.meddra?.pt || e.term || "").trim().toLowerCase();
  const curDrugs = new Set(form.drugs.map((d) => d.name?.trim().toLowerCase()).filter(Boolean));
  const curTerms = new Set(form.events.map(effTerm).filter(Boolean));
  if (curDrugs.size === 0 || curTerms.size === 0) return [];
  return history.filter((r) => {
    const rDrugs = new Set((r.drugs || []).map((d) => d.name?.trim().toLowerCase()).filter(Boolean));
    const rTerms = new Set((r.events || []).map(effTerm).filter(Boolean));
    return [...curDrugs].some((d) => rDrugs.has(d)) && [...curTerms].some((t) => rTerms.has(t));
  }).slice(0, 3);
}

// ---------------------------------------------------------------------------
// Demo dataset — fictional cases used only inside the "How it works" tab.
// This never touches window.storage or the user's real case log; it's a
// self-contained sandbox so Analytics / Signals / Case log can be shown
// fully populated and working without any real reports on file.
// ---------------------------------------------------------------------------
const DEMO_DRUG_INFO = {
  "Nortemvir": { dose: "400", doseUnit: "mg", route: "Oral", frequency: "Once daily", indication: "Chronic viral infection" },
  "Calmezol": { dose: "150", doseUnit: "mg", route: "Oral", frequency: "Twice daily", indication: "Heart rhythm control" },
  "Fluxapran": { dose: "20", doseUnit: "mg", route: "Oral", frequency: "Once daily", indication: "Depression" },
  "Bendorix": { dose: "50", doseUnit: "mg", route: "Oral", frequency: "As needed", indication: "Chronic pain" },
  "Sarolimus": { dose: "2", doseUnit: "mg", route: "Oral", frequency: "Once daily", indication: "Autoimmune condition" },
};
// [drug, reaction term, severity, how many cases] — engineered so two pairs
// clear the PRR/chi-square signal threshold and the rest stay as noise/watchlist.
const DEMO_SPEC = [
  ["Nortemvir", "Hepatic injury", "Severe", 6],
  ["Nortemvir", "Nausea", "Mild", 2],
  ["Calmezol", "QT prolongation", "Severe", 4],
  ["Calmezol", "Dizziness", "Moderate", 2],
  ["Fluxapran", "Hepatic injury", "Moderate", 1],
  ["Fluxapran", "Headache", "Mild", 2],
  ["Fluxapran", "Rash", "Mild", 2],
  ["Bendorix", "QT prolongation", "Moderate", 1],
  ["Bendorix", "Nausea", "Mild", 2],
  ["Bendorix", "Dizziness", "Mild", 1],
  ["Sarolimus", "Headache", "Mild", 1],
  ["Sarolimus", "Rash", "Moderate", 1],
  ["Sarolimus", "Fatigue", "Mild", 1],
];
const DEMO_COUNTRIES_POOL = ["US", "EU", "UK", "CA", "IN", "AU"];
const DEMO_SEXES = ["Female", "Male"];
const DEMO_OUTCOMES = ["Recovered", "Recovering", "Ongoing", "Recovered with sequelae"];

function buildDemoHistory() {
  const records = [];
  let i = 0;
  const now = Date.now();
  DEMO_SPEC.forEach(([drug, term, severity, count]) => {
    const info = DEMO_DRUG_INFO[drug];
    for (let k = 0; k < count; k++) {
      i++;
      const daysAgo = 4 + i * 5 + (i % 3) * 2;
      const createdAt = new Date(now - daysAgo * 86400000).toISOString();
      const age = 24 + ((i * 7) % 55);
      const sex = DEMO_SEXES[i % 2];
      const country = DEMO_COUNTRIES_POOL[i % DEMO_COUNTRIES_POOL.length];
      const serious = severity === "Severe" || (severity === "Moderate" && i % 4 === 0);
      records.push({
        id: `DEMO-${1000 + i}`,
        createdAt,
        patient: { age: String(age), sex, weight: String(55 + (i % 30)), weightUnit: "kg", conditions: i % 3 === 0 ? "None reported" : "Hypertension", country, masked: false },
        drugs: [{ id: `demo-d-${i}`, name: drug, dose: info.dose, doseUnit: info.doseUnit, route: info.route, frequency: info.frequency, startDate: "", endDate: "", ongoing: true, indication: info.indication }],
        events: [{ id: `demo-e-${i}`, description: `Patient developed ${term.toLowerCase()} while taking ${drug}.`, term, onsetDate: "", severity, outcome: DEMO_OUTCOMES[i % DEMO_OUTCOMES.length], meddra: standardizeTerm(term) }],
        seriousness: { death: false, lifeThreatening: false, hospitalization: severity === "Severe", disability: false, congenital: false, otherMedical: serious && severity !== "Severe" },
        reporter: { type: i % 2 === 0 ? "Patient" : "Healthcare professional", name: "Demo reporter", contact: "demo@example.com", masked: false },
        seriousnessCount: serious ? 1 : 0,
        isSerious: serious,
      });
    }
  });
  return records;
}
const DEMO_HISTORY = buildDemoHistory();
const DEMO_SIGNAL_DATA = computeSignals(DEMO_HISTORY);

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function Field({ label, hint, children }) {
  return (
    <label className="block mb-5">
      <span className="block font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[12px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-[#D6D6E8] bg-white px-3 py-2.5 text-[15px] text-[#0F172A] outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 placeholder:text-[#B3BDC9]";

const TextInput = (props) => <input {...props} className={inputCls} />;
const TextArea = (props) => <textarea {...props} className={inputCls + " min-h-[100px] resize-y"} />;
const Select = ({ children, ...props }) => (
  <select {...props} className={inputCls + " appearance-none bg-white"}>{children}</select>
);

function MaskToggle({ checked, onChange, label }) {
  return (
    <label className="flex items-start gap-3 rounded-md border px-4 py-3 cursor-pointer mt-1"
      style={checked ? { borderColor: C.violetBorder, background: C.violetSoft } : { borderColor: C.border }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 mt-0.5" style={{ accentColor: C.violet }} />
      <span>
        <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#0F172A]"><MaskIcon size={14} style={{ color: C.violetDeep }} /> {label}</span>
        <span className="block text-[12px] text-[#64748B] mt-0.5">Generalizes or withholds identifying details on the review, export, and print views. Your entry stays visible to you while editing.</span>
      </span>
    </label>
  );
}

function SeriousnessDial({ count, total }) {
  const pct = count / total;
  const isSerious = count > 0;
  const color = count === 0 ? C.emeraldDeep : count <= 1 ? C.amberDeep : C.rose;
  const circumference = Math.PI * 72;
  const dash = circumference * Math.min(pct, 1);
  return (
    <div className="flex flex-col items-center py-2">
      <svg width="160" height="92" viewBox="0 0 160 92">
        <path d="M 8 84 A 72 72 0 0 1 152 84" fill="none" stroke="#EDEDF7" strokeWidth="12" strokeLinecap="round" />
        <path d="M 8 84 A 72 72 0 0 1 152 84" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`} style={{ transition: "stroke-dasharray .4s ease, stroke .4s ease" }} />
      </svg>
      <div className="-mt-8 text-center">
        <div className="font-mono text-[26px] font-bold" style={{ color }}>{isSerious ? "SERIOUS" : "NOT SERIOUS"}</div>
        <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mt-1">{count} of {total} ICH criteria met</div>
      </div>
    </div>
  );
}

function StepDot({ index, current, done, label, onClick }) {
  const active = index === current;
  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full text-left py-2.5 group">
      <span className={"flex items-center justify-center w-7 h-7 rounded-full font-mono text-[12px] font-bold shrink-0 transition " +
        (active ? "text-white" : done ? "text-white" : "bg-[#EDEDF7] text-[#64748B] group-hover:bg-[#E0E0F2]")}
        style={active ? { background: C.indigo } : done ? { background: C.emerald } : {}}>
        {done && !active ? <Check size={14} /> : index + 1}
      </span>
      <span className={"text-[13px] font-medium " + (active ? "text-[#312E81]" : "text-[#64748B]")}>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Voice + translate intake widget
// ---------------------------------------------------------------------------
function VoiceFill({ stepType, language, setLanguage, onApply }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("idle");
  const [parsed, setParsed] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [micErrorMsg, setMicErrorMsg] = useState("");
  const recRef = useRef(null);

  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const langLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setMicErrorMsg("");
    try {
      const rec = new SR();
      rec.lang = language;
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let finalText = "";
        for (let i = 0; i < e.results.length; i++) finalText += e.results[i][0].transcript + " ";
        setTranscript(finalText.trim());
      };
      rec.onend = () => setListening(false);
      rec.onerror = (e) => {
        setListening(false);
        const reasons = {
          "not-allowed": "Microphone access was blocked. If this app is embedded in a preview panel, open it in its own browser tab and allow microphone access, then try again.",
          "service-not-allowed": "Microphone access was blocked by the browser or page. Try opening this app in its own tab.",
          "no-speech": "Didn't catch any speech — try again, a little closer to the mic.",
          "audio-capture": "No microphone was found. Check that one is connected and not in use by another app.",
          "network": "A network issue interrupted speech recognition. Try again.",
        };
        setMicErrorMsg(reasons[e.error] || `Speech recognition stopped (${e.error || "unknown error"}). You can type into the box below instead.`);
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
      setStatus("idle");
    } catch (e) {
      setListening(false);
      setMicErrorMsg("Couldn't start the microphone in this browser. You can type into the box below instead.");
    }
  }
  function stopListening() { recRef.current?.stop(); setListening(false); }

  async function runExtraction() {
    if (!transcript.trim()) return;
    setStatus("processing"); setErrorMsg("");
    try {
      const result = await translateAndExtract(transcript, langLabel, stepType);
      setParsed(result); setStatus("ready");
    } catch (e) {
      setErrorMsg(`Couldn't process that just now (${e.message || "unknown error"}) — try again, or fill the fields in manually below.`);
      setStatus("error");
    }
  }
  function apply() {
    if (parsed) onApply(parsed);
    setOpen(false); setTranscript(""); setParsed(null); setStatus("idle");
  }

  const schema = SCHEMAS[stepType];

  return (
    <div className="mb-4 rounded-lg border p-4" style={{ background: C.violetSoft, borderColor: C.violetBorder }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: C.violetDeep }}>
          <Sparkles size={15} /> Speak or type in any language
        </span>
        <ChevronRight size={16} style={{ color: C.violetDeep }} className={"transition-transform " + (open ? "rotate-90" : "")} />
      </button>

      {open && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages size={15} className="text-[#64748B]" />
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-[#D6D6E8] bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#7C3AED]">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            {supported ? (
              <button onClick={listening ? stopListening : startListening}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-white transition"
                style={{ background: listening ? C.rose : C.violet }}>
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
                {listening ? "Stop" : "Speak"}
              </button>
            ) : (
              <span className="ml-auto text-[11.5px] text-[#94A3B8]">Voice not supported here — type below</span>
            )}
          </div>

          <TextArea placeholder={`Say or type what happened, in ${langLabel}…`} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
          {micErrorMsg && (
            <p className="text-[12px] mt-2 flex items-start gap-1.5" style={{ color: C.rose }}>
              <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {micErrorMsg}
            </p>
          )}
          {listening && (
            <div className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: C.rose }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C.rose }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C.rose }} />
              </span>
              Listening…
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button onClick={runExtraction} disabled={!transcript.trim() || status === "processing"}
              className="inline-flex items-center gap-1.5 rounded-md text-white px-3.5 py-2 text-[13px] font-medium disabled:opacity-30"
              style={{ background: C.indigo }}>
              {status === "processing" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Translate & extract
            </button>
            {status === "ready" && (
              <span className="text-[12px] flex items-center gap-1" style={{ color: C.emeraldDeeper }}><Check size={13} /> Ready to review</span>
            )}
          </div>

          {errorMsg && <p className="text-[12.5px] mt-2" style={{ color: C.rose }}>{errorMsg}</p>}

          {parsed && status === "ready" && (
            <div className="mt-4 rounded-md border bg-white p-3" style={{ borderColor: C.violetBorder }}>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-[#64748B] mb-2">What we picked up</div>
              <div className="space-y-1.5 mb-3">
                {Object.entries(parsed).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 text-[13px]">
                    <span className="text-[#64748B]">{schema.labels[k] || k}</span>
                    <span className="text-[#0F172A] font-medium text-right">{v}</span>
                  </div>
                ))}
                {Object.values(parsed).every((v) => !v) && <p className="text-[12.5px] text-[#94A3B8]">Nothing usable came through — try rephrasing.</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={apply} className="inline-flex items-center gap-1.5 rounded-md text-white px-3 py-1.5 text-[12.5px] font-medium" style={{ background: C.emeraldDeep }}>
                  <Check size={13} /> Apply to form
                </button>
                <button onClick={() => { setParsed(null); setStatus("idle"); }} className="rounded-md border border-[#D6D6E8] px-3 py-1.5 text-[12.5px] font-medium text-[#64748B] hover:bg-[#F1F0FB]">
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Login gate
// ---------------------------------------------------------------------------
const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); body,input,select,textarea,button{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif;}";

function Logo({ size = 40, light }) {
  const iconSize = Math.round(size * 0.52);
  return (
    <div className="relative shrink-0 flex items-center justify-center rounded-[14px]" style={{
      width: size, height: size,
      background: light ? "rgba(255,255,255,0.16)" : `linear-gradient(135deg, ${C.indigo} 0%, ${C.violet} 100%)`,
      boxShadow: light ? "inset 0 0 0 1px rgba(255,255,255,0.28)" : `0 6px 16px -4px ${C.indigo}66`,
    }}>
      <Radar size={iconSize} className="text-white" strokeWidth={2.25} />
      <span className="absolute rounded-full ring-2 ring-white" style={{ width: size * 0.24, height: size * 0.24, bottom: -size * 0.03, right: -size * 0.03, background: C.emeraldDeep }} />
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [showDemoHelp, setShowDemoHelp] = useState(false);

  function submit(e) {
    e.preventDefault();
    // Trim + case-insensitive on both fields — this is a front-end-only demo
    // gate (see note below), so we deliberately make it forgiving rather than
    // let stray spaces or caps-lock silently block a legitimate demo user.
    const u = username.trim().toLowerCase();
    const p = password.trim().toLowerCase();
    if (u === SUPERUSER_USERNAME.toLowerCase() && p === SUPERUSER_PASSWORD.toLowerCase()) {
      setError(""); onLogin();
    } else {
      setError("Incorrect username or password. Tap \"Autofill demo credentials\" below, or use \"Skip login\" to jump straight into the demo.");
    }
  }

  function fillDemo() {
    setUsername(SUPERUSER_USERNAME);
    setPassword(SUPERUSER_PASSWORD);
    setError("");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden" style={{ background: `linear-gradient(150deg, ${C.indigoDeeper} 0%, ${C.indigo} 45%, ${C.violet} 100%)` }}>
      <style>{FONT_IMPORT}</style>
      <div className="absolute top-0 left-0 right-0"><DemoDisclaimerBanner /></div>
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: C.emeraldDeep }} />
      <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: C.sky }} />
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-6">
          <div className="inline-block mb-3">
            <Logo size={48} light />
          </div>
          <h1 className="text-white text-[23px] font-bold tracking-tight">{APP_NAME}</h1>
          <p className="text-white/70 text-[13px] mt-1">Adverse event intake & signal screening</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl p-6 shadow-2xl">
          <Field label="Username">
            <TextInput placeholder="Superuser" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls + " pr-10"} />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          {error && <p className="text-[12.5px] mb-4" style={{ color: C.rose }}>{error}</p>}
          <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-lg text-white px-4 py-2.5 text-[14px] font-semibold transition hover:brightness-110" style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoDeep})`, boxShadow: `0 4px 12px -2px ${C.indigo}66` }}>
            <Lock size={15} /> Sign in
          </button>
        </form>

        <div className="mt-4 text-center">
          {!showDemoHelp ? (
            <button type="button" onClick={() => setShowDemoHelp(true)} className="text-white/60 hover:text-white/85 text-[12px] underline underline-offset-2 transition">
              Trying this out? Get demo access
            </button>
          ) : (
            <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-white/80 text-[12px]">
                Demo credentials: <strong className="font-mono">{SUPERUSER_USERNAME}</strong> / <strong className="font-mono">{SUPERUSER_PASSWORD}</strong>
              </p>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={fillDemo} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-medium px-3 py-1.5 transition">
                  <Copy size={12} /> Autofill
                </button>
                <button type="button" onClick={onLogin} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white text-[12px] font-semibold px-3 py-1.5 transition hover:brightness-95" style={{ color: C.indigoDeep }}>
                  <PlayCircle size={13} /> Skip login
                </button>
              </div>
              <p className="text-white/60 text-[11px] mt-2">This is a front-end check for demo purposes only — not real authentication or data security.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top navigation
// ---------------------------------------------------------------------------
function SyncBadge({ status }) {
  const map = {
    saving: { icon: Loader2, text: "Saving…", spin: true },
    synced: { icon: Cloud, text: "Saved to cloud" },
    error: { icon: CloudOff, text: "Save failed" },
    loading: { icon: Loader2, text: "Loading…", spin: true },
  };
  const m = map[status];
  if (!m) return null;
  const Icon = m.icon;
  return (
    <span className="flex items-center gap-1 text-[11px] text-white/80 bg-white/10 rounded-full px-2 py-0.5 ml-1 shrink-0">
      <Icon size={11} className={m.spin ? "animate-spin" : ""} /> {m.text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Persistent disclaimer — visible on every screen, not just the dashboard.
// Dismissible per session only (resets on reload) so it can't be permanently
// hidden and forgotten.
// ---------------------------------------------------------------------------
function DemoDisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return (
      <button onClick={() => setDismissed(false)} className="fixed bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg" style={{ background: C.rose }}>
        <AlertTriangle size={12} /> Prototype notice
      </button>
    );
  }
  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-1.5 text-[11.5px] font-medium text-white" style={{ background: C.rose }}>
      <AlertTriangle size={13} className="shrink-0" />
      <span className="flex-1">
        <strong>Prototype for demonstration only.</strong> Not a real reporting channel — do not enter real patient
        information. To report an actual adverse event, contact your national regulator (e.g. FDA MedWatch, EMA) or
        the product's manufacturer directly.
      </span>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-80 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

function TopNav({ view, setView, count, signalCount, syncStatus, onLogout, isAdmin, onOpenAdminGate, lockdown }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "log", label: "Case log", icon: ClipboardList },
    { id: "literature", label: "Literature", icon: BookOpen },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "signals", label: "Signals", icon: Radar, badge: signalCount },
    { id: "demo", label: "How it works", icon: PlayCircle },
    { id: "developer", label: "Developer", icon: Code2 },
    { id: "contact", label: "Contact", icon: Mail },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: ShieldCheck }] : []),
  ];
  return (
    <div style={{ background: `linear-gradient(120deg, ${C.indigoDeeper} 0%, ${C.indigo} 55%, ${C.violet} 100%)`, boxShadow: "0 2px 10px -2px rgba(30,20,70,0.25)" }} className="sticky top-0 z-20 border-b border-indigo-950/20">
      {lockdown && (
        <div className="bg-amber-500/90 text-white text-[11.5px] font-medium text-center py-1 flex items-center justify-center gap-1.5">
          <Lock size={11} /> New case submissions are currently paused by the administrator.
        </div>
      )}
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo size={30} light />
          <div className="min-w-0">
            <span className="text-white font-bold text-[16px] tracking-tight shrink-0 font-display">{APP_NAME}</span>
            <span className="hidden sm:block text-white/55 text-[10px] tracking-[0.14em] uppercase leading-none mt-0.5">Safety intelligence</span>
          </div>
          <SyncBadge status={syncStatus} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!lockdown && (
            <button onClick={() => setView("wizard")}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold shadow-sm transition hover:brightness-105"
              style={{ background: C.amber, color: "#4A2A00" }}>
              <Plus size={15} /> Report a case
            </button>
          )}
          <button onClick={onOpenAdminGate} title={isAdmin ? "Admin unlocked" : "Admin access"} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
            {isAdmin ? <ShieldCheck size={14} /> : <Lock size={13} />}
          </button>
          <button onClick={onLogout} title="Sign out" className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition">
            <LogOut size={14} />
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 flex gap-1 border-t border-white/15 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id)}
              className={"flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition shrink-0 whitespace-nowrap " +
                (active ? "text-white bg-white/10" : "text-white/60 border-transparent hover:text-white/90 hover:bg-white/5")}
              style={active ? { borderColor: C.amber } : {}}>
              <Icon size={14} /> {t.label}
              {t.id === "log" && count > 0 && <span className="text-[10.5px] bg-white/20 rounded-full px-1.5">{count}</span>}
              {t.id === "signals" && t.badge > 0 && (
                <span className="text-[10.5px] rounded-full px-1.5 font-bold" style={{ background: C.rose, color: "white" }}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState("dashboard");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blankForm());
  const [history, setHistory] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [voiceLang, setVoiceLang] = useState("en-US");
  const [syncStatus, setSyncStatus] = useState("loading");
  const [lockdown, setLockdown] = useState(false);
  const [adminGateOpen, setAdminGateOpen] = useState(false);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (res && res.value) setHistory(JSON.parse(res.value));
        setSyncStatus("synced");
      } catch (e) {
        setSyncStatus("idle");
      }
      setTimeout(() => setSyncStatus((s) => (s === "synced" ? "idle" : s)), 2000);
      try {
        const lockRes = await window.storage.get(LOCKDOWN_KEY, true);
        setLockdown(lockRes?.value === "true");
      } catch (e) { /* no lockdown record yet — default unlocked */ }
    })();
  }, [authed]);

  async function setLockdownMode(next) {
    setLockdown(next);
    try { await window.storage.set(LOCKDOWN_KEY, next ? "true" : "false", true); } catch (e) {}
  }

  const seriousnessCount = useMemo(() => Object.values(form.seriousness).filter(Boolean).length, [form.seriousness]);
  const isSerious = seriousnessCount > 0;
  const country = COUNTRIES.find((c) => c.code === form.patient.country) || COUNTRIES[0];
  const signalData = useMemo(() => computeSignals(history), [history]);
  const similarCases = useMemo(() => findSimilarCases(form, history), [form, history]);

  function update(section, key, value) { setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } })); }
  function mergeInto(section, obj) {
    setForm((f) => {
      const next = { ...f[section] };
      Object.entries(obj).forEach(([k, v]) => { if (v && k in next) next[k] = v; });
      return { ...f, [section]: next };
    });
  }
  function updateArrayItem(section, index, key, value) {
    setForm((f) => {
      const arr = [...f[section]];
      arr[index] = { ...arr[index], [key]: value };
      return { ...f, [section]: arr };
    });
  }
  function mergeIntoArrayItem(section, index, obj) {
    setForm((f) => {
      const arr = [...f[section]];
      const next = { ...arr[index] };
      Object.entries(obj).forEach(([k, v]) => { if (v && k in next) next[k] = v; });
      arr[index] = next;
      return { ...f, [section]: arr };
    });
  }
  function addArrayItem(section, factory) { setForm((f) => ({ ...f, [section]: [...f[section], factory()] })); }
  function removeArrayItem(section, index) { setForm((f) => ({ ...f, [section]: f[section].filter((_, i) => i !== index) })); }

  function startNew() { setForm(blankForm()); setStep(0); setView("wizard"); }
  function startFromLiterature(candidate) {
    const f = blankForm();
    f.drugs[0] = { ...f.drugs[0], name: candidate.drug || "" };
    const meddra = candidate.reactionTerm ? standardizeTerm(candidate.reactionTerm) : null;
    f.events[0] = { ...f.events[0], term: candidate.reactionTerm || "", description: candidate.summary || "", severity: candidate.severity || "", meddra };
    f.reporter = { ...f.reporter, type: "Literature report" };
    f.source = "literature";
    f.literatureSource = {
      url: candidate.sourceUrl || "", title: candidate.sourceTitle || "",
      confidence: candidate.confidence || "", notes: candidate.notes || "",
      screenedAt: new Date().toISOString(),
    };
    setForm(f); setStep(0); setView("wizard");
  }

  async function saveHistory(next) {
    setHistory(next);
    setSyncStatus("saving");
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next), true);
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus((s) => (s === "synced" ? "idle" : s)), 2000);
    } catch (e) {
      setSyncStatus("error");
    }
  }
  async function submitReport() {
    if (lockdown) return;
    const nowIso = new Date().toISOString();
    const auditLog = [
      form.source === "literature"
        ? { ts: nowIso, action: "Case drafted from literature screening", actor: "AI-assisted" }
        : { ts: nowIso, action: "Case entered", actor: "human" },
      { ts: nowIso, action: "Case reviewed and saved", actor: "human" },
    ];
    const record = { id: `AE-${Date.now()}`, createdAt: nowIso, ...form, seriousnessCount, isSerious, auditLog };
    await saveHistory([record, ...history]);
    setView("log");
  }
  async function deleteRecord(id) {
    await saveHistory(history.filter((r) => r.id !== id));
    if (detailId === id) setDetailId(null);
  }
  async function clearAllHistory() {
    await saveHistory([]);
    setDetailId(null);
  }
  function downloadAllJSON() {
    const exportable = history.map((r) => ({ ...r, patient: maskPatient(r.patient), reporter: maskReporter(r.reporter) }));
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${APP_NAME.toLowerCase()}-all-cases-backup.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function withAuditEntry(record, entry) {
    return { ...record, auditLog: [...(record.auditLog || []), { ts: new Date().toISOString(), ...entry }] };
  }
  async function updateEventCausality(recordId, eventIndex, causality) {
    const next = history.map((r) => {
      if (r.id !== recordId) return r;
      const events = r.events.map((e, i) => (i === eventIndex ? { ...e, causality } : e));
      return withAuditEntry({ ...r, events }, { action: `Causality assessed for reaction ${eventIndex + 1}: ${causality.category}`, actor: causality.aiOpinion ? "human + AI second opinion" : "human" });
    });
    await saveHistory(next);
  }
  async function updateEventMeddra(recordId, eventIndex, meddra) {
    const next = history.map((r) => {
      if (r.id !== recordId) return r;
      const events = r.events.map((e, i) => (i === eventIndex ? { ...e, meddra } : e));
      if (!meddra) return { ...r, events };
      return withAuditEntry({ ...r, events }, { action: `Reaction ${eventIndex + 1} coded to "${meddra.pt}"`, actor: meddra.method === "ai" ? "AI-assisted, human-confirmed" : "local dictionary, human-confirmed" });
    });
    await saveHistory(next);
  }
  function downloadJSON(record) {
    const exportable = {
      ...record,
      patient: maskPatient(record.patient),
      reporter: maskReporter(record.reporter),
    };
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${record.id}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function downloadE2B(record) {
    const p = maskPatient(record.patient);
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const drugsXml = (record.drugs || []).map((d) => `    <drug>
      <medicinalproduct>${esc(d.name)}</medicinalproduct>
      <drugdosagetext>${esc(d.dose)} ${esc(d.doseUnit)}, ${esc(d.frequency)}</drugdosagetext>
      <drugadministrationroute>${esc(d.route)}</drugadministrationroute>
      <drugindication>${esc(d.indication)}</drugindication>
    </drug>`).join("\n");
    const eventsXml = (record.events || []).map((e) => `    <reaction>
      <primarysourcereaction>${esc(e.term || e.description)}</primarysourcereaction>
      <reactionmeddrapt>${esc(e.meddra?.pt || "")}</reactionmeddrapt>
      <reactionmeddrasoc>${esc(e.meddra?.soc || "")}</reactionmeddrasoc>
      <reactionstartdate>${esc(e.onsetDate)}</reactionstartdate>
      <reactionoutcome>${esc(e.outcome)}</reactionoutcome>
      <expectedness>${esc(e.expectedness || "not assessed")}</expectedness>
    </reaction>`).join("\n");
    const seriousCriteria = SERIOUSNESS_CRITERIA.filter((c) => record.seriousness[c.key]).map((c) => c.key).join(",");
    const specialSituations = SPECIAL_SITUATIONS.filter((s) => record.specialSituations?.[s.key]).map((s) => s.key).join(",");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  SIMPLIFIED, NON-CERTIFIED EXPORT — inspired by the ICH E2B(R3) ICSR
  structure for illustration purposes only. This has NOT been validated
  against the official E2B(R3) HL7 schema and must not be submitted to any
  regulator as-is. Consult a validated pharmacovigilance database for real
  E2B(R3) submissions.
-->
<ichicsr lang="en" simplified="true" notE2BCertified="true">
  <safetyreport>
    <safetyreportid>${esc(record.id)}</safetyreportid>
    <receivedate>${esc(record.createdAt)}</receivedate>
    <serious>${record.isSerious ? "1" : "2"}</serious>
    <seriousnesscriteria>${esc(seriousCriteria)}</seriousnesscriteria>
    <specialsituations>${esc(specialSituations)}</specialsituations>
    <primarysource>
      <reportertype>${esc(record.reporter?.type)}</reportertype>
      <qualification>${esc(record.reporter?.masked ? "masked" : record.reporter?.type)}</qualification>
    </primarysource>
    <patient>
      <patientonsetage>${esc(p.age)}</patientonsetage>
      <patientsex>${esc(p.sex)}</patientsex>
      <patientweight>${esc(p.weight)} ${esc(p.weightUnit)}</patientweight>
      <patientcountry>${esc(record.patient?.country)}</patientcountry>
    </patient>
${drugsXml}
${eventsXml}
  </safetyreport>
</ichicsr>`;
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${record.id}-simplified-e2b.xml`; a.click();
    URL.revokeObjectURL(url);
  }

  const canAdvance = useMemo(() => {
    if (step === 0) return form.patient.age && form.patient.sex && form.patient.country;
    if (step === 1) return form.drugs.every((d) => d.name && d.route);
    if (step === 2) return form.events.every((e) => e.description && e.onsetDate);
    if (step === 4) return form.reporter.type;
    return true;
  }, [step, form]);

  const record = detailId ? history.find((r) => r.id === detailId) : null;

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen font-sans text-[#0F172A]" style={{ background: C.bg }}>
      <style>{FONT_IMPORT + UI_REFINEMENT_CSS}</style>
      <DemoDisclaimerBanner />
      {view !== "wizard" && !record && <TopNav view={view} setView={setView} count={history.length} signalCount={signalData.signals.length} syncStatus={syncStatus} onLogout={() => setAuthed(false)} isAdmin={isAdmin} onOpenAdminGate={() => (isAdmin ? setView("admin") : setAdminGateOpen(true))} lockdown={lockdown} />}
      {adminGateOpen && (
        <AdminGate
          onUnlock={() => { setIsAdmin(true); setAdminGateOpen(false); setView("admin"); }}
          onCancel={() => setAdminGateOpen(false)}
        />
      )}

      {view === "dashboard" && !record && <Dashboard history={history} signalData={signalData} onNew={startNew} onOpenLog={() => setView("log")} onOpenDemo={() => setView("demo")} onOpenSignals={() => setView("signals")} onOpenLiterature={() => setView("literature")} lockdown={lockdown} />}
      {view === "log" && !record && <LogView history={history} onOpen={setDetailId} onNew={startNew} hideNew={lockdown} />}
      {view === "literature" && !record && <LiteratureView history={history} onCreateDraft={startFromLiterature} />}
      {record && <DetailView record={record} onBack={() => setDetailId(null)} onDelete={() => deleteRecord(record.id)} onDownload={() => downloadJSON(record)} onDownloadE2B={() => downloadE2B(record)} onSaveCausality={(eventIndex, causality) => updateEventCausality(record.id, eventIndex, causality)} onSaveMeddra={(eventIndex, meddra) => updateEventMeddra(record.id, eventIndex, meddra)} />}
      {view === "analytics" && !record && <Analytics history={history} />}
      {view === "signals" && !record && <SignalsView signalData={signalData} />}
      {view === "demo" && !record && <Demo />}
      {view === "developer" && !record && <DeveloperView />}
      {view === "admin" && !record && (
        isAdmin ? (
          <AdminPanel history={history} signalData={signalData} onClearAll={clearAllHistory} onDownloadAll={downloadAllJSON}
            onExitAdmin={() => { setIsAdmin(false); setView("dashboard"); }} lockdown={lockdown} onToggleLockdown={setLockdownMode} />
        ) : (
          <AdminGate onUnlock={() => setIsAdmin(true)} onCancel={() => setView("dashboard")} />
        )
      )}
      {view === "contact" && !record && <ContactView />}

      {view === "wizard" && (
        <Wizard form={form} update={update} mergeInto={mergeInto}
          updateArrayItem={updateArrayItem} mergeIntoArrayItem={mergeIntoArrayItem}
          addArrayItem={addArrayItem} removeArrayItem={removeArrayItem}
          step={step} setStep={setStep} canAdvance={canAdvance}
          seriousnessCount={seriousnessCount} isSerious={isSerious}
          country={country} onExit={() => setView("dashboard")} onSubmit={submitReport}
          voiceLang={voiceLang} setVoiceLang={setVoiceLang} similarCases={similarCases} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ history, signalData, onNew, onOpenLog, onOpenDemo, onOpenSignals, onOpenLiterature, demoMode, lockdown }) {
  const serious = history.filter((r) => r.isSerious).length;
  const thisMonth = history.filter((r) => {
    const d = new Date(r.createdAt), now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const topDrug = useMemo(() => {
    const counts = {};
    history.forEach((r) => (r.drugs || []).forEach((d) => { const n = d.name?.trim(); if (n) counts[n] = (counts[n] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [history]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 vigilis-page vigilis-grid">
      <div className="rounded-2xl border bg-white/90 p-5 sm:p-6 mb-6 vigilis-surface" style={{borderColor:C.border}}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] px-2 py-1 rounded-full mb-2" style={{background:C.emeraldSoft,color:C.emeraldDeeper}}><ShieldCheck size={11}/> Pharmacovigilance workspace</div>
            <h1 className="text-[24px] font-bold vigilis-title"
        <h1 className="text-[22px] font-bold" style={{ color: C.indigoDeeper }}>Overview</h1>
        <p className="text-[13.5px] text-[#64748B] mt-1 max-w-2xl">Track, structure and review adverse event reports, identify potential safety patterns, and prepare cases for regulatory review.</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#64748B] rounded-xl border px-3 py-2 bg-white" style={{borderColor:C.border}}><Cloud size={14} style={{color:C.emeraldDeep}}/> Local persistence active</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPI label="Total cases" value={history.length} icon={ClipboardList} accent={C.indigo} tint={C.violetSoft} />
        <KPI label="Serious cases" value={serious} icon={ShieldAlert} accent={C.rose} tint={C.roseSoft} />
        <KPI label="Logged this month" value={thisMonth} icon={CalendarClock} accent={C.sky} tint={C.skySoft} />
        <KPI label="Most reported drug" value={topDrug} icon={Pill} accent={C.amberDeep} tint={C.amberSoft} small />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <ActionCard onClick={demoMode || lockdown ? undefined : onNew} disabled={demoMode || lockdown} icon={Plus} accent={C.indigo} title="Report a new case"
          desc={demoMode ? "Try this in the real app — case intake isn't wired up in this sandboxed demo." : lockdown ? "Submissions are temporarily paused by the administrator." : "Guided intake with voice input in any language."} />
        <ActionCard onClick={onOpenLog} icon={ClipboardList} accent={C.sky} title="Review the case log" desc="Every saved report, exportable and ready for filing." />
        <ActionCard onClick={demoMode ? undefined : onOpenLiterature} disabled={demoMode} icon={BookOpen} accent={C.violetDeep} title="Screen the literature"
          desc={demoMode ? "Try this in the real app — literature screening calls a live AI search." : "Enter a product name + link and AI drafts a signal candidate."} />
        <ActionCard onClick={onOpenSignals} icon={Radar} accent={C.rose} title="Check for signals" desc={`${signalData.signals.length} pattern${signalData.signals.length === 1 ? "" : "s"} flagged for review.`} />
        <ActionCard onClick={onOpenDemo} icon={PlayCircle} accent={C.violet} title="See how it works" desc="A quick interactive walkthrough of every feature." />
      </div>

      {history.length > 0 && (
        <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-[14px]">Recent cases</div>
            <button onClick={onOpenLog} className="text-[12.5px] font-medium hover:underline" style={{ color: C.indigo }}>View all</button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 4).map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-[13.5px] py-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.isSerious ? C.rose : C.emeraldDeep }} />
                <span className="flex-1 truncate">{(r.drugs || []).map((d) => d.name).filter(Boolean).join(" + ") || "Unnamed medicine"}</span>
                <span className="font-mono text-[11.5px] text-[#94A3B8]">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 rounded-lg border px-4 py-3.5 flex gap-3" style={{ background: demoMode ? C.violetSoft : C.skySoft, borderColor: demoMode ? C.violetBorder : C.skyBorder }}>
        {demoMode ? <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: C.violetDeep }} /> : <Cloud size={16} className="shrink-0 mt-0.5" style={{ color: C.skyDeep }} />}
        {demoMode ? (
          <p className="text-[12.5px] leading-relaxed" style={{ color: C.violetDeep }}>
            <strong>This is fictional demo data:</strong> {history.length} made-up cases generated for this walkthrough. Nothing
            on this screen is saved, synced, or shared with anyone — it exists only in this browser tab, right now.
          </p>
        ) : (
          <p className="text-[12.5px] leading-relaxed" style={{ color: "#0C4A6E" }}>
            <strong>Where your data lives:</strong> cases save to shared cloud storage as soon as you submit, visible to
            everyone using this app — not just this browser or your account. That's separate from being sent to any
            regulator: this tool structures reports and screens for patterns, it does not transmit anything to FDA, EMA,
            or other authorities automatically. It's also not a HIPAA-certified clinical database — for real-world
            clinical use this would need dedicated compliant infrastructure. Voice transcripts are translated and
            summarized by AI before reaching the form, so always check the "review" screen before saving.
          </p>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent, tint, small }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm vigilis-metric vigilis-card-hover" style={{ borderColor: C.border, borderTop: `3px solid ${accent}`, color: accent }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: tint }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div className={"font-bold " + (small ? "text-[15px] truncate" : "text-[22px]")} style={{ color: C.indigoDeeper }}>{value}</div>
      <div className="text-[11.5px] text-[#64748B] mt-0.5">{label}</div>
    </div>
  );
}

function ActionCard({ onClick, icon: Icon, accent, title, desc, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={"text-left rounded-xl border bg-white p-5 transition shadow-sm vigilis-card-hover " + (disabled ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-0.5")}
      style={{ borderColor: C.border }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}1A` }}>
        <Icon size={17} style={{ color: accent }} />
      </div>
      <div className="font-semibold text-[14.5px] mb-1">{title}</div>
      <div className="text-[13px] text-[#64748B]">{desc}</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Case log
// ---------------------------------------------------------------------------
function computeDeadline(record, country) {
  const windowText = record.isSerious ? country.serious : country.nonSerious;
  const match = windowText.match(/^(\d+)/);
  if (!match) return null;
  const totalDays = parseInt(match[1], 10);
  const elapsedDays = (Date.now() - new Date(record.createdAt).getTime()) / 86400000;
  const remaining = Math.ceil(totalDays - elapsedDays);
  return { totalDays, remaining, overdue: remaining < 0, urgent: remaining >= 0 && remaining <= 3, pct: Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100)) };
}

function LogView({ history, onOpen, onNew, hideNew }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...history]
      .filter(r => filter === "all" || (filter === "serious" ? r.isSerious : !r.isSerious))
      .filter(r => {
        if (!q) return true;
        const hay = [r.id, r.patient?.country, r.reporter?.type, ...(r.drugs||[]).map(d=>d.name), ...(r.events||[]).map(e=>`${e.term||""} ${e.description||""}`)].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a,b) => sort === "newest" ? new Date(b.createdAt)-new Date(a.createdAt) : new Date(a.createdAt)-new Date(b.createdAt));
  }, [history, query, filter, sort]);
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 vigilis-page">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] px-2 py-1 rounded-full mb-2" style={{background:C.violetSoft,color:C.violetDeep}}><ClipboardList size={11}/> Safety operations</div>
          <h1 className="text-[22px] font-bold vigilis-title" style={{color:C.indigoDeeper}}>Case log</h1>
          <p className="text-[13px] text-[#64748B] mt-1">Search, triage and open saved safety reports.</p>
        </div>
        {!hideNew && <button onClick={onNew} className="inline-flex items-center gap-1.5 rounded-lg text-white px-3.5 py-2.5 text-[13px] font-semibold shadow-sm" style={{background:C.indigo}}><Plus size={15}/> New case</button>}
      </div>
      <div className="rounded-xl border bg-white p-3 mb-4 vigilis-surface" style={{borderColor:C.border}}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search case ID, medicine, reaction, country…" className="flex-1 rounded-lg border px-3 py-2.5 text-[13px] outline-none" style={{borderColor:C.border}} />
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[13px] bg-white" style={{borderColor:C.border}}><option value="all">All cases</option><option value="serious">Serious only</option><option value="nserious">Not serious</option></select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="rounded-lg border px-3 py-2.5 text-[13px] bg-white" style={{borderColor:C.border}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
        </div>
      </div>
      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center bg-white/70" style={{borderColor:C.border}}><div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{background:C.violetSoft,color:C.violetDeep}}><ClipboardList size={19}/></div><p className="text-[14px] text-[#64748B] mb-4">Nothing logged yet. Your first report takes about three minutes.</p>{!hideNew&&<button onClick={onNew} className="inline-flex items-center gap-2 rounded-lg text-white px-4 py-2.5 text-[13px] font-semibold" style={{background:C.indigo}}><Plus size={15}/> Report a case</button>}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center" style={{borderColor:C.border}}><p className="font-semibold text-[14px]">No matching cases</p><p className="text-[12.5px] text-[#94A3B8] mt-1">Try a different search or filter.</p></div>
      ) : (
        <div className="space-y-2.5"><div className="text-[11px] text-[#94A3B8] px-1">Showing {filtered.length} of {history.length} case{history.length===1?"":"s"}</div>
          {filtered.map(r=>{const c=COUNTRIES.find(x=>x.code===r.patient.country)||COUNTRIES[0];const dl=computeDeadline(r,c);return <button key={r.id} onClick={()=>onOpen(r.id)} className="w-full text-left rounded-xl border bg-white px-4 py-3.5 flex items-center gap-3 vigilis-card-hover" style={{borderColor:C.border}}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:r.isSerious?C.rose:C.emeraldDeep}}/>
            <div className="flex-1 min-w-0"><div className="font-semibold text-[14px] truncate flex items-center gap-1.5">{(r.drugs||[]).map(d=>d.name).filter(Boolean).join(" + ")||"Unnamed medicine"}{r.source==="literature"&&<span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{background:C.violetSoft,color:C.violetDeep}}><BookOpen size={9}/> Literature</span>}</div>
              <div className="text-[12px] text-[#94A3B8] truncate mt-0.5">{(r.events||[]).map(e=>e.term||e.description).filter(Boolean).join(" · ")||"No description"}</div>
              <div className="flex items-center gap-2 mt-1.5"><span className="text-[10px] font-bold uppercase tracking-wide" style={{color:r.isSerious?C.rose:C.emeraldDeep}}>{r.isSerious?"Serious":"Not serious"}</span>{dl&&<span className="text-[10px] text-[#94A3B8]">· {dl.overdue?`Overdue ${Math.abs(dl.remaining)}d`:dl.remaining+"d remaining"}</span>}</div>
            </div><div className="text-right shrink-0 hidden sm:block"><div className="font-mono text-[11px] text-[#64748B]">{new Date(r.createdAt).toLocaleDateString()}</div><div className="font-mono text-[10px] uppercase tracking-wide text-[#94A3B8]">{c.authority}</div></div><ChevronRight size={15} className="text-[#CBD5E1] shrink-0"/>
          </button>})}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Literature screening — enter a product name (+ optional link or pasted
// excerpt), AI drafts a structured signal candidate, and we preview what it
// would do to real signal detection if saved. Nothing is written to the case
// log until a human walks it through the normal review wizard.
// ---------------------------------------------------------------------------
function LiteratureView({ history, onCreateDraft, demoMode }) {
  const [drugName, setDrugName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const preview = useMemo(() => {
    if (!result || !result.found || !result.drug || !result.reactionTerm) return null;
    const meddra = standardizeTerm(result.reactionTerm);
    const hypothetical = {
      id: "PREVIEW", createdAt: new Date().toISOString(),
      drugs: [{ name: result.drug }],
      events: [{ term: result.reactionTerm, meddra }],
      isSerious: result.severity === "Severe",
    };
    const withCandidate = computeSignals([...history, hypothetical]);
    const termKey = (meddra?.pt || result.reactionTerm).toLowerCase();
    const drugKey = result.drug.toLowerCase();
    const match = withCandidate.signals.find((s) => s.drug.toLowerCase() === drugKey && s.term.toLowerCase() === termKey)
      || withCandidate.watchlist.find((s) => s.drug.toLowerCase() === drugKey && s.term.toLowerCase() === termKey);
    return match ? { ...match, wouldFlag: withCandidate.signals.some((s) => s.drug.toLowerCase() === drugKey && s.term.toLowerCase() === termKey) } : null;
  }, [result, history]);

  async function run() {
    if (!drugName.trim() || (!sourceUrl.trim() && !pastedText.trim())) return;
    setState("loading"); setErrorMsg(""); setResult(null);
    try {
      const r = await screenLiterature({ drugName: drugName.trim(), sourceUrl, pastedText });
      setResult(r); setState("ready");
    } catch (e) {
      setErrorMsg("Couldn't complete the screen just now — try again in a moment."); setState("error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-[20px] font-bold" style={{ color: C.indigoDeeper }}>Literature screening</h1>
      </div>
      <p className="text-[13.5px] text-[#64748B] mb-5">
        Enter a product name and either a reference link or a pasted excerpt. AI drafts a structured signal candidate
        and previews its effect on signal detection — nothing is saved until you review it in the normal intake flow.
      </p>

      <div className="rounded-lg border px-4 py-3.5 flex gap-3 mb-6" style={{ background: C.skySoft, borderColor: C.skyBorder }}>
        <ShieldCheck size={16} className="shrink-0 mt-0.5" style={{ color: C.skyDeep }} />
        <p className="text-[12.5px] leading-relaxed" style={{ color: "#0C4A6E" }}>
          <strong>Compliance approach:</strong> this screen is built around GVP-aligned habits — every AI draft is
          traceable to its source, standardized to a MedDRA-style term, and requires a human to review and explicitly
          save it before it becomes a case (nothing here auto-submits). That said, <strong>no software is "GxP/GVP
          compliant" on its own</strong> — real compliance also depends on your organization's computer system
          validation, SOPs, qualified-person sign-off, 21 CFR Part 11-style controls, and data governance, none of
          which this demo can certify for you.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm mb-6" style={{ borderColor: C.border }}>
        <Field label="Company / product (drug) name" hint="Required.">
          <TextInput placeholder="e.g. Nortemvir" value={drugName} onChange={(e) => setDrugName(e.target.value)} />
        </Field>
        <Field label="Reference link" hint="A journal article, safety communication, or news link. We search the web using this plus the product name — most publisher sites block direct in-browser fetches, so AI searches rather than scraping the URL byte-for-byte.">
          <div className="relative">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input placeholder="https://…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={inputCls + " pl-9"} />
          </div>
        </Field>
        <Field label="Or paste an excerpt / abstract" hint="If you have the text (e.g. from a PDF you can't link to), paste it here instead — or in addition.">
          <textarea rows={4} placeholder="Paste an abstract, case report excerpt, or summary…" value={pastedText} onChange={(e) => setPastedText(e.target.value)} className={inputCls} />
        </Field>
        <button onClick={run} disabled={!drugName.trim() || (!sourceUrl.trim() && !pastedText.trim()) || state === "loading"}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg text-white px-4 py-2.5 text-[14px] font-semibold disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.violetDeep})` }}>
          {state === "loading" ? <><Loader2 size={16} className="animate-spin" /> Screening…</> : <><Sparkles size={16} /> Screen for adverse event signals</>}
        </button>
      </div>

      {state === "error" && (
        <div className="rounded-lg border p-4 mb-4" style={{ background: C.roseSoft, borderColor: C.roseBorder, color: C.rose }}>{errorMsg}</div>
      )}

      {state === "ready" && result && !result.found && (
        <div className="rounded-xl border bg-white p-5 shadow-sm text-center" style={{ borderColor: C.border }}>
          <BookOpen size={24} className="mx-auto text-[#CBD5E1] mb-2" />
          <p className="text-[13.5px] font-medium mb-1">No credible adverse event signal found</p>
          <p className="text-[12.5px] text-[#64748B]">{result.notes || "Nothing specific enough turned up for this product and source."}</p>
        </div>
      )}

      {state === "ready" && result && result.found && (
        <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: C.border }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag size={14} style={{ color: C.indigoDeep }} />
              <span className="font-semibold text-[14.5px]">{result.drug} <span className="text-[#94A3B8] font-normal">→</span> {result.reactionTerm || "unspecified reaction"}</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full capitalize" style={{ background: C.violetSoft, color: C.violetDeep }}>{result.confidence || "—"} confidence</span>
          </div>
          {result.severity && <p className="text-[12.5px] text-[#64748B] mb-2">Severity (AI estimate): <strong>{result.severity}</strong></p>}
          <p className="text-[13.5px] leading-relaxed mb-3">{result.summary}</p>
          {result.sourceTitle && (
            <p className="text-[12px] text-[#64748B] mb-2 flex items-center gap-1.5">
              <ExternalLink size={11} />
              {result.sourceUrl ? <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="underline" style={{ color: C.indigoDeep }}>{result.sourceTitle}</a> : result.sourceTitle}
            </p>
          )}
          {result.notes && <p className="text-[12px] text-[#94A3B8] mb-3">Caveats: {result.notes}</p>}

          {preview && (
            <div className="rounded-lg border p-3 mb-4" style={{ background: preview.wouldFlag ? C.roseSoft : C.amberSoft, borderColor: preview.wouldFlag ? C.roseBorder : C.amberBorder }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Radar size={13} style={{ color: preview.wouldFlag ? C.rose : C.amberDeep }} />
                <span className="text-[12px] font-semibold" style={{ color: preview.wouldFlag ? C.rose : C.amberDeep }}>
                  {preview.wouldFlag ? "Would clear the signal threshold" : "Would join the watchlist (below threshold)"}
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B]">
                If saved, this pair would sit at a={preview.a}, PRR {preview.prr !== null ? preview.prr.toFixed(2) : "n/a"}, χ² {preview.chi2.toFixed(2)}
                {" "}against the current case log — computed live, not simulated.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setResult(null); setState("idle"); }} className="flex-1 rounded-lg border px-3.5 py-2 text-[13px] font-medium" style={{ borderColor: C.border }}>Discard</button>
            <button onClick={demoMode ? undefined : () => onCreateDraft(result)} disabled={demoMode}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-white px-3.5 py-2 text-[13px] font-semibold disabled:opacity-50"
              style={{ background: C.indigo }} title={demoMode ? "Try this in the real app — case creation isn't wired up in this sandboxed demo." : ""}>
              <Plus size={14} /> Create draft case for review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
const SEVERITY_COLORS = { Mild: C.emerald, Moderate: C.amber, Severe: C.rose };
const DRUG_COLORS = [C.indigo, C.violet, C.sky, C.emeraldDeep, C.amberDeep];

function Analytics({ history }) {
  const bySeverity = useMemo(() => {
    const c = { Mild: 0, Moderate: 0, Severe: 0 };
    history.forEach((r) => (r.events || []).forEach((e) => { if (c[e.severity] !== undefined) c[e.severity]++; }));
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [history]);

  const seriousSplit = useMemo(() => {
    const serious = history.filter((r) => r.isSerious).length;
    return [{ name: "Serious", value: serious }, { name: "Not serious", value: history.length - serious }];
  }, [history]);

  const byMonth = useMemo(() => {
    const map = {};
    history.forEach((r) => {
      const key = new Date(r.createdAt).toLocaleString("default", { month: "short", year: "2-digit" });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).slice(-6);
  }, [history]);

  const topDrugs = useMemo(() => {
    const counts = {};
    history.forEach((r) => (r.drugs || []).forEach((d) => { const n = d.name?.trim(); if (n) counts[n] = (counts[n] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [history]);

  const bySoc = useMemo(() => {
    const counts = {};
    history.forEach((r) => (r.events || []).forEach((e) => {
      const soc = e.meddra?.soc || "Not yet coded";
      counts[soc] = (counts[soc] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [history]);
  const codedCount = useMemo(() => history.reduce((n, r) => n + (r.events || []).filter((e) => e.meddra?.pt).length, 0), [history]);
  const totalEvents = useMemo(() => history.reduce((n, r) => n + (r.events || []).length, 0), [history]);

  if (history.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <BarChart3 size={28} className="mx-auto text-[#CBD5E1] mb-3" />
        <p className="text-[14px] text-[#64748B]">Log a few cases and analytics will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-[20px] font-bold mb-1" style={{ color: C.indigoDeeper }}>Analytics</h1>
      <p className="text-[13.5px] text-[#64748B] mb-6">A read on what's being reported and how urgent it is.</p>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Severity distribution" accent={C.indigo}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bySeverity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F0FB" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={{ stroke: "#E4E4F0" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E4E4F0" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {bySeverity.map((s) => <Cell key={s.name} fill={SEVERITY_COLORS[s.name]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Serious vs not serious" accent={C.rose}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={seriousSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                <Cell fill={C.rose} /><Cell fill={C.emeraldDeep} />
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E4E4F0" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            {seriousSplit.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[12px] text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? C.rose : C.emeraldDeep }} /> {s.name} ({s.value})
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="Cases over time" accent={C.sky}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F0FB" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={{ stroke: "#E4E4F0" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E4E4F0" }} />
              <Line type="monotone" dataKey="value" stroke={C.sky} strokeWidth={2.5} dot={{ r: 3, fill: C.sky }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most reported medicines" accent={C.amberDeep}>
          {topDrugs.length === 0 ? (
            <p className="text-[13px] text-[#94A3B8] py-8 text-center">No drug names logged yet.</p>
          ) : (
            <div className="space-y-3 py-2">
              {topDrugs.map(([name, count], i) => (
                <div key={name}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="font-medium">{name}</span>
                    <span className="text-[#64748B]">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F1F0FB] overflow-hidden">
                    <div className="h-full" style={{ width: `${(count / topDrugs[0][1]) * 100}%`, background: DRUG_COLORS[i % DRUG_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-1 gap-4 mt-4">
        <ChartCard title="Reactions by system organ class" accent={C.indigo}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-[#94A3B8]">MedDRA-style coding coverage: {codedCount} of {totalEvents} reaction{totalEvents === 1 ? "" : "s"}.</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: C.indigoDeep }}><Tag size={11} /> Standardized</span>
          </div>
          {bySoc.length === 0 ? (
            <p className="text-[13px] text-[#94A3B8] py-8 text-center">No reactions logged yet.</p>
          ) : (
            <div className="space-y-3 py-1">
              {bySoc.map(([name, count], i) => (
                <div key={name}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className={"font-medium" + (name === "Not yet coded" ? " text-[#94A3B8] italic" : "")}>{name}</span>
                    <span className="text-[#64748B]">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F1F0FB] overflow-hidden">
                    <div className="h-full" style={{ width: `${(count / bySoc[0][1]) * 100}%`, background: name === "Not yet coded" ? "#CBD5E1" : DRUG_COLORS[i % DRUG_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, accent, children }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-1.5 mb-3">
        <TrendingUp size={14} style={{ color: accent }} />
        <div className="font-semibold text-[13.5px]">{title}</div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal detection view
// ---------------------------------------------------------------------------
function SignalsView({ signalData }) {
  const { signals, watchlist, N } = signalData;
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Radar size={20} style={{ color: C.rose }} />
        <h1 className="text-[20px] font-bold" style={{ color: C.indigoDeeper }}>Signal detection</h1>
      </div>
      <p className="text-[13.5px] text-[#64748B] mb-5 max-w-2xl">
        Screens every drug–reaction pair in your case log for disproportionate reporting, the same basic idea
        national databases like FAERS and EudraVigilance use at massive scale. Cases with multiple medicines
        or multiple reactions are checked pairwise.
      </p>

      <div className="rounded-lg border p-4 mb-6 flex gap-3" style={{ background: C.skySoft, borderColor: C.skyBorder }}>
        <Info size={16} className="shrink-0 mt-0.5" style={{ color: C.skyDeep }} />
        <p className="text-[12.5px] leading-relaxed" style={{ color: "#0C4A6E" }}>
          We calculate the <strong>Proportional Reporting Ratio (PRR)</strong> and <strong>Reporting Odds Ratio (ROR)</strong> for
          each drug–reaction pair against every other case in your log, then apply the standard screening rule regulators
          use: at least 3 reports, PRR ≥ 2, and χ² ≥ 4. Real pharmacovigilance signal detection runs this across millions
          of reports — with only {N} case{N === 1 ? "" : "s"} logged here, treat results as illustrative, not clinical evidence.
        </p>
      </div>

      {N === 0 ? (
        <EmptyState text="Log a few cases with a reaction term filled in, and signal screening will run automatically." />
      ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} style={{ color: C.rose }} />
              <h2 className="font-semibold text-[15px]">Detected signals ({signals.length})</h2>
            </div>
            {signals.length === 0 ? (
              <EmptyState text="No pairs meet the statistical screening threshold yet — that's expected with a small log. Check the watch list below for early patterns." />
            ) : (
              <div className="space-y-3">{signals.map((s) => <SignalCard key={s.drugKey + s.termKey} s={s} strong />)}</div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} style={{ color: C.amberDeep }} />
              <h2 className="font-semibold text-[15px]">Patterns to watch ({watchlist.length})</h2>
            </div>
            {watchlist.length === 0 ? (
              <EmptyState text="Nothing else recurring yet." />
            ) : (
              <div className="space-y-3">{watchlist.slice(0, 8).map((s) => <SignalCard key={s.drugKey + s.termKey} s={s} strong={false} />)}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-lg border border-dashed px-5 py-6 text-center" style={{ borderColor: C.border }}>
      <p className="text-[13px] text-[#94A3B8]">{text}</p>
    </div>
  );
}

function SignalCard({ s, strong }) {
  const accent = strong ? C.rose : C.amberDeep;
  const tint = strong ? C.roseSoft : C.amberSoft;
  const border = strong ? C.roseBorder : C.amberBorder;
  const [explainState, setExplainState] = useState("idle"); // idle | loading | ready | error
  const [explanation, setExplanation] = useState("");

  async function explain() {
    if (explainState === "loading") return;
    setExplainState("loading");
    try {
      const prompt =
        `You are explaining a pharmacovigilance disproportionality-analysis result to someone with no statistics ` +
        `background. In 2-3 short sentences, plain English, no jargon-without-explanation: the drug "${s.drug}" and ` +
        `the reaction "${s.term}" co-occurred in ${s.a} of ${s.N} logged cases. PRR is ` +
        `${s.exclusive ? "not computable because the reaction was exclusive to this drug" : s.prr !== null ? s.prr.toFixed(2) : "n/a"}, ` +
        `ROR is ${s.ror !== null ? s.ror.toFixed(2) : "n/a"}, chi-square is ${s.chi2.toFixed(2)}. Explain what this means ` +
        `and why it was flagged, and end with one clause reminding them this is a statistical screening signal from a ` +
        `small log, not proof the drug causes the reaction.`;
      const text = await askClaudeText(prompt);
      setExplanation(text); setExplainState("ready");
    } catch (e) {
      setExplainState("error");
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: C.border, borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold text-[14.5px]">{s.drug} <span className="text-[#94A3B8] font-normal">→</span> {s.term}</div>
          <div className="text-[12px] text-[#64748B] mt-0.5">{s.a} report{s.a === 1 ? "" : "s"} of this pair, out of {s.N} logged</div>
        </div>
        <span className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: tint, color: accent, border: `1px solid ${border}` }}>
          {strong ? "Signal" : "Watching"}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[#64748B]">
        <span>PRR: <strong className="text-[#0F172A]">{s.exclusive ? "exclusive" : s.prr !== null ? s.prr.toFixed(2) : "n/a"}</strong></span>
        <span>ROR: <strong className="text-[#0F172A]">{s.ror !== null ? s.ror.toFixed(2) : "n/a"}</strong></span>
        <span>χ²: <strong className="text-[#0F172A]">{s.chi2.toFixed(2)}</strong></span>
      </div>
      {s.exclusive && <p className="text-[12px] mt-2" style={{ color: accent }}>Reported only alongside this drug so far, in {s.a} case{s.a === 1 ? "" : "s"}.</p>}

      {explainState === "idle" && (
        <button onClick={explain} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: C.violetDeep }}>
          <Sparkles size={13} /> Explain in plain English
        </button>
      )}
      {explainState === "loading" && (
        <div className="mt-3 flex items-center gap-1.5 text-[12px]" style={{ color: C.violetDeep }}>
          <Sparkles size={13} className="animate-pulse" /> Thinking…
        </div>
      )}
      {explainState === "error" && (
        <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: C.rose }}>
          Couldn't reach the AI service just now. <button onClick={explain} className="underline">Try again</button>
        </div>
      )}
      {explainState === "ready" && (
        <div className="mt-3 rounded-lg p-3 text-[12.5px] leading-relaxed" style={{ background: C.violetSoft, color: C.violetDeep }}>
          {explanation}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interactive "how it works" walkthrough (animated previews, not video files)
// ---------------------------------------------------------------------------
function Demo() {
  const [playing, setPlaying] = useState(null);
  const [demoTab, setDemoTab] = useState("overview");
  const [demoDetailId, setDemoDetailId] = useState(null);
  const features = [
    { id: "voice", title: "Speak in any language", desc: "Talk through what happened. It's transcribed, translated to English, and mapped into the right fields for you to confirm.", icon: Mic, accent: C.violet },
    { id: "multi", title: "Multiple medicines & reactions", desc: "Log every drug taken together and every reaction separately, all inside one case.", icon: Plus, accent: C.indigo },
    { id: "dial", title: "Automatic seriousness check", desc: "As you answer, the ICH seriousness criteria are checked live and the case is flagged before you ever click submit.", icon: ShieldAlert, accent: C.rose },
    { id: "route", title: "Country-aware routing", desc: "Pick a country and see the exact authority, portal, and filing deadline that applies to this case.", icon: FlaskConical, accent: C.sky },
    { id: "chart", title: "Built-in analytics", desc: "Every saved case rolls up into trends by severity, drug, and time — no spreadsheet required.", icon: BarChart3, accent: C.emeraldDeep },
    { id: "signals", title: "Signal detection", desc: "Drug–reaction pairs are automatically screened for disproportionate reporting using PRR and ROR.", icon: Radar, accent: C.amberDeep },
    { id: "narrative", title: "AI regulatory narrative", desc: "One click drafts a ready-to-review CIOMS/MedWatch-style case narrative from a saved report's own fields.", icon: Sparkles, accent: C.violetDeep },
    { id: "explain", title: "Plain-English signal explainer", desc: "Ask AI to explain any flagged signal in plain language, right on the signal card.", icon: Sparkles, accent: C.rose },
    { id: "causality", title: "WHO-UMC causality assessment", desc: "Answer a few questions per reaction and get a suggested causality category (Certain → Unassessable), plus an AI second opinion.", icon: Activity, accent: C.indigo },
    { id: "meddra", title: "MedDRA-style term standardization", desc: "Free-text reactions get matched to a standard Preferred Term and System Organ Class, so 'threw up' and 'vomiting' count as the same signal.", icon: Tag, accent: C.indigoDeep },
    { id: "literature", title: "Literature screening", desc: "Enter a product name plus a link or pasted excerpt — AI drafts a case candidate and previews its effect on signal detection.", icon: BookOpen, accent: C.violet },
  ];
  const demoTabs = [
    { id: "overview", label: "Overview" },
    { id: "dashboard", label: "Live dashboard" },
    { id: "log", label: "Case log" },
    { id: "literature", label: "Literature screening" },
    { id: "analytics", label: "Analytics" },
    { id: "signals", label: "Signal detection" },
  ];
  const demoRecord = demoDetailId ? DEMO_HISTORY.find((r) => r.id === demoDetailId) : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-[20px] font-bold" style={{ color: C.indigoDeeper }}>How it works</h1>
        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold" style={{ background: C.violetSoft, color: C.violetDeep, border: `1px solid ${C.violetBorder}` }}>Dummy data</span>
      </div>
      <p className="text-[13.5px] text-[#64748B] mb-5 max-w-2xl">
        Everything below runs on {DEMO_HISTORY.length} fictional cases across 5 made-up medicines — it's live and
        interactive, but fully sandboxed. Nothing here reads or writes your real case log, and none of it is saved
        anywhere.
      </p>

      <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: C.border }}>
        {demoTabs.map((t) => (
          <button key={t.id} onClick={() => { setDemoTab(t.id); setDemoDetailId(null); }}
            className={"px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition shrink-0 whitespace-nowrap " +
              (demoTab === t.id ? "" : "text-[#94A3B8] border-transparent hover:text-[#64748B]")}
            style={demoTab === t.id ? { color: C.indigo, borderColor: C.indigo } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {demoTab === "overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((f) => <FeatureCard key={f.id} feature={f} playing={playing === f.id} onPlay={() => setPlaying(playing === f.id ? null : f.id)} />)}
        </div>
      )}

      {demoTab === "dashboard" && (
        <div className="-mx-6">
          <Dashboard history={DEMO_HISTORY} signalData={DEMO_SIGNAL_DATA} onNew={() => {}} onOpenLog={() => setDemoTab("log")} onOpenDemo={() => setDemoTab("overview")} onOpenSignals={() => setDemoTab("signals")} demoMode />
        </div>
      )}

      {demoTab === "log" && !demoRecord && (
        <div className="-mx-6">
          <LogView history={DEMO_HISTORY} onOpen={setDemoDetailId} onNew={() => {}} hideNew />
        </div>
      )}
      {demoTab === "log" && demoRecord && (
        <div className="-mx-6 -mt-8">
          <DetailView record={demoRecord} onBack={() => setDemoDetailId(null)} onDelete={() => {}} onDownload={() => {}} />
        </div>
      )}

      {demoTab === "literature" && (
        <div className="-mx-6">
          <LiteratureView history={DEMO_HISTORY} onCreateDraft={() => {}} demoMode />
        </div>
      )}

      {demoTab === "analytics" && (
        <div className="-mx-6">
          <Analytics history={DEMO_HISTORY} />
        </div>
      )}

      {demoTab === "signals" && (
        <div className="-mx-6 space-y-8">
          <SignalsView signalData={DEMO_SIGNAL_DATA} />
          <div className="max-w-4xl mx-auto px-6">
            <SignalWalkthrough signalData={DEMO_SIGNAL_DATA} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal detection process — step-by-step walkthrough using real numbers
// computed from the demo dataset above.
// ---------------------------------------------------------------------------
function SignalWalkthrough({ signalData }) {
  const top = signalData.signals[0];
  if (!top) return null;
  const steps = [
    {
      title: "1 · Ingest",
      desc: `Every saved case contributes its drug names and reaction terms. Across the demo log there are ${signalData.N} cases with at least one drug and one reaction, forming the total case pool (N).`,
    },
    {
      title: "2 · Build the 2×2 table",
      desc: `For "${top.drug}" + "${top.term}", the log is split into four counts: cases with both (a), the drug without that reaction (b), that reaction without the drug (c), and neither (d).`,
    },
    {
      title: "3 · Score disproportionality",
      desc: `PRR compares the reporting rate of "${top.term}" in people on ${top.drug} vs. everyone else. ROR does the same as an odds ratio. Chi-square (χ²) checks whether that gap is unlikely to be chance.`,
    },
    {
      title: "4 · Threshold & flag",
      desc: `A pair is flagged when a ≥ 3, PRR ≥ 2, and χ² ≥ 4 — the standard rule-of-3 screening criteria used in real pharmacovigilance (e.g. FDA/EMA disproportionality screening). This pair clears all three, so it's raised as a signal.`,
    },
  ];
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Radar size={15} style={{ color: C.amberDeep }} />
        <h2 className="font-semibold text-[15px]">Signal detection process, worked example</h2>
      </div>
      <p className="text-[13px] text-[#64748B] mb-5">
        Walking through exactly how <strong>{top.drug} + {top.term}</strong> — the strongest signal in this demo — got flagged.
      </p>

      <div className="space-y-4 mb-6">
        {steps.map((s) => (
          <div key={s.title} className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold" style={{ background: C.amberSoft, color: C.amberDeep }}>
              {s.title[0]}
            </div>
            <div>
              <div className="font-semibold text-[13.5px] mb-0.5">{s.title.slice(4)}</div>
              <p className="text-[13px] text-[#64748B] leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.amberBorder, background: C.amberSoft }}>
        <div className="text-[11px] font-mono uppercase tracking-wide text-[#92610C] mb-2">2×2 contingency table</div>
        <div className="grid grid-cols-3 gap-px text-center text-[12.5px] font-mono bg-[#F0D9A8] rounded overflow-hidden">
          <div className="bg-white p-2"></div>
          <div className="bg-white p-2 font-semibold">{top.term}</div>
          <div className="bg-white p-2 font-semibold">Other reactions</div>
          <div className="bg-white p-2 font-semibold">{top.drug}</div>
          <div className="bg-white p-2">a = {top.a}</div>
          <div className="bg-white p-2">b = {top.b}</div>
          <div className="bg-white p-2 font-semibold">Other drugs</div>
          <div className="bg-white p-2">c = {top.c}</div>
          <div className="bg-white p-2">d = {top.d}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="PRR" value={top.prr ? top.prr.toFixed(2) : "—"} accent={C.rose} hint="≥ 2 required" />
        <StatBox label="ROR" value={top.ror ? top.ror.toFixed(2) : "—"} accent={C.violet} hint="odds ratio" />
        <StatBox label="χ²" value={top.chi2.toFixed(2)} accent={C.amberDeep} hint="≥ 4 required" />
      </div>

      {signalData.signals.length > 1 && (
        <p className="text-[12.5px] text-[#64748B] mt-5">
          {signalData.signals.length - 1} other pair{signalData.signals.length - 1 === 1 ? "" : "s"} in this demo also
          cleared the threshold — see the full list above. Pairs that show up but don't clear it yet appear on the
          watchlist instead of being flagged outright.
        </p>
      )}
    </div>
  );
}

function StatBox({ label, value, accent, hint }) {
  return (
    <div className="rounded-lg border p-3 text-center" style={{ borderColor: C.border }}>
      <div className="text-[19px] font-bold font-mono" style={{ color: accent }}>{value}</div>
      <div className="text-[11px] font-semibold text-[#64748B] mt-0.5">{label}</div>
      <div className="text-[10px] text-[#94A3B8]">{hint}</div>
    </div>
  );
}

function FeatureCard({ feature, playing, onPlay }) {
  const Icon = feature.icon;
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm" style={{ borderColor: C.border }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: `${feature.accent}1A` }}>
          <Icon size={17} style={{ color: feature.accent }} />
        </div>
        <button onClick={onPlay} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium" style={{ borderColor: feature.accent, color: feature.accent }}>
          <PlayCircle size={14} /> {playing ? "Stop" : "Play preview"}
        </button>
      </div>
      <div className="font-semibold text-[14.5px] mb-1">{feature.title}</div>
      <p className="text-[13px] text-[#64748B] mb-4">{feature.desc}</p>
      <div className="h-24 rounded-lg border flex items-center justify-center overflow-hidden" style={{ background: C.bg, borderColor: C.border }}>
        {playing ? <PreviewAnimation id={feature.id} /> : <span className="text-[11.5px] text-[#94A3B8]">Preview paused</span>}
      </div>
    </div>
  );
}

function PreviewAnimation({ id }) {
  if (id === "voice") {
    return (
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full" style={{ background: C.violet }}>
          <Mic size={14} className="text-white" />
          <span className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping" style={{ background: C.violet }} />
        </span>
        <div className="flex gap-1 items-end h-8">
          {[6, 14, 20, 12, 18, 8].map((h, i) => <span key={i} className="w-1.5 rounded-full" style={{ height: h, background: C.violet, animation: `bar 1s ease-in-out ${i * 0.1}s infinite alternate` }} />)}
        </div>
        <style>{`@keyframes bar { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>
      </div>
    );
  }
  if (id === "multi") {
    return (
      <div className="flex items-center gap-2">
        {["Rx A", "Rx B", "+"].map((t, i) => (
          <span key={i} className="px-2.5 py-1.5 rounded-md text-[11px] font-mono font-semibold" style={{ background: i === 2 ? C.indigo : "white", color: i === 2 ? "white" : C.indigoDeeper, border: `1px solid ${C.indigo}`, animation: `fadein .5s ease ${i * 0.15}s both` }}>{t}</span>
        ))}
        <style>{`@keyframes fadein { from { opacity:0; transform: translateY(4px);} to {opacity:1; transform:translateY(0);} }`}</style>
      </div>
    );
  }
  if (id === "dial") {
    return (
      <svg width="100" height="58" viewBox="0 0 100 58">
        <path d="M6 52 A44 44 0 0 1 94 52" fill="none" stroke="#EDEDF7" strokeWidth="8" strokeLinecap="round" />
        <path d="M6 52 A44 44 0 0 1 94 52" fill="none" stroke={C.rose} strokeWidth="8" strokeLinecap="round" strokeDasharray="138" strokeDashoffset="138" style={{ animation: "sweep 1.6s ease-in-out infinite" }} />
        <style>{`@keyframes sweep { 0% { stroke-dashoffset: 138; } 60% { stroke-dashoffset: 30; } 100% { stroke-dashoffset: 30; } }`}</style>
      </svg>
    );
  }
  if (id === "route") {
    return (
      <div className="flex items-center gap-2 text-[12px] font-mono">
        <span className="px-2 py-1 rounded bg-white border" style={{ borderColor: C.border, animation: "fadein2 .5s ease" }}>US</span>
        <ChevronRight size={14} className="text-[#94A3B8]" />
        <span className="px-2 py-1 rounded text-white" style={{ background: C.sky, animation: "fadein2 .9s ease" }}>FDA · 15 days</span>
        <style>{`@keyframes fadein2 { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }`}</style>
      </div>
    );
  }
  if (id === "signals") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-1.5 h-12">
          <span className="w-3 rounded-t" style={{ height: 14, background: "#E2E2F0" }} />
          <span className="w-3 rounded-t" style={{ height: 34, background: C.rose, animation: "grow .6s ease .1s both" }} />
          <span className="w-3 rounded-t" style={{ height: 10, background: "#E2E2F0" }} />
        </div>
        <span className="px-2 py-1 rounded-full text-white text-[10.5px] font-semibold" style={{ background: C.rose, animation: "fadein3 .8s ease .4s both" }}>Signal</span>
        <style>{`@keyframes fadein3{from{opacity:0;transform:scale(.8);}to{opacity:1;transform:scale(1);}}`}</style>
      </div>
    );
  }
  if (id === "chart") {
    return (
      <div className="flex items-end gap-1.5 h-14">
        {[10, 22, 16, 30, 24].map((h, i) => <span key={i} className="w-3 rounded-t" style={{ height: h, background: DRUG_COLORS[i % DRUG_COLORS.length], animation: `grow .6s ease ${i * 0.12}s both` }} />)}
        <style>{`@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>
      </div>
    );
  }
  if (id === "narrative") {
    return (
      <div className="flex items-start gap-2 w-full px-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: C.violetDeep }}>
          <Sparkles size={11} className="text-white" />
        </span>
        <div className="space-y-1.5 flex-1 pt-0.5">
          {[92, 100, 68].map((w, i) => (
            <span key={i} className="block h-2 rounded-full" style={{ width: `${w}%`, background: C.violetBorder, animation: `typeline .5s ease ${i * 0.18}s both` }} />
          ))}
        </div>
        <style>{`@keyframes typeline { from { opacity: 0; transform: scaleX(0); transform-origin: left; } to { opacity: 1; transform: scaleX(1); } }`}</style>
      </div>
    );
  }
  if (id === "explain") {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col gap-1 text-[10.5px] font-mono">
          <span className="px-2 py-1 rounded bg-white border" style={{ borderColor: C.border, color: C.slate600, animation: "fadein2 .4s ease" }}>PRR 13.5 · χ² 11.3</span>
          <span className="px-2 py-1 rounded text-white" style={{ background: C.rose, animation: "fadein2 .8s ease" }}>= worth reviewing</span>
        </div>
        <Sparkles size={16} style={{ color: C.violetDeep, animation: "sparkle 1.2s ease-in-out infinite" }} />
        <style>{`@keyframes fadein2 { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} } @keyframes sparkle { 0%,100% { transform: scale(1) rotate(0deg); opacity: .7; } 50% { transform: scale(1.25) rotate(12deg); opacity: 1; } }`}</style>
      </div>
    );
  }
  if (id === "causality") {
    return (
      <div className="flex items-center gap-2">
        {["Certain", "Probable", "Possible", "Unlikely"].map((label, i) => (
          <span key={label} className="px-2 py-1 rounded-full text-[10px] font-semibold border"
            style={{
              color: i === 1 ? C.emeraldDeep : C.slate400, borderColor: i === 1 ? C.emeraldBorder : C.border,
              background: i === 1 ? C.emeraldSoft : "white",
              animation: `popin .4s ease ${i * 0.12}s both`,
              transform: i === 1 ? "scale(1.08)" : "scale(1)",
            }}>{label}</span>
        ))}
        <style>{`@keyframes popin { from { opacity: 0; transform: scale(.7); } to { opacity: 1; } }`}</style>
      </div>
    );
  }
  if (id === "meddra") {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col gap-1">
          <span className="px-2 py-1 rounded border text-[10.5px] text-[#94A3B8] line-through" style={{ borderColor: C.border, animation: "fadein2 .4s ease both" }}>"threw up"</span>
          <span className="px-2 py-1 rounded border text-[10.5px] text-[#94A3B8]" style={{ borderColor: C.border, animation: "fadein2 .4s ease .15s both" }}>"vomiting a lot"</span>
        </div>
        <ChevronRight size={14} className="text-[#CBD5E1]" style={{ animation: "fadein2 .4s ease .3s both" }} />
        <span className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-white inline-flex items-center gap-1" style={{ background: C.indigoDeeper, animation: "popin .4s ease .5s both" }}>
          <Tag size={10} /> Vomiting
        </span>
        <style>{`@keyframes fadein2 { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} } @keyframes popin { from { opacity: 0; transform: scale(.7); } to { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    );
  }
  if (id === "literature") {
    return (
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10.5px] text-[#64748B]" style={{ borderColor: C.border, animation: "fadein2 .4s ease both" }}>
          <Link2 size={10} /> journal-of-med.org/…
        </div>
        <Sparkles size={14} style={{ color: C.violetDeep, animation: "sparkle2 1.1s ease-in-out infinite" }} />
        <div className="flex flex-col gap-1">
          <span className="px-2 py-1 rounded-full text-white text-[10px] font-semibold inline-flex items-center gap-1" style={{ background: C.violetDeep, animation: "fadein2 .4s ease .35s both" }}>
            <BookOpen size={9} /> Case drafted
          </span>
          <span className="px-2 py-1 rounded-full text-white text-[10px] font-semibold inline-flex items-center gap-1" style={{ background: C.rose, animation: "fadein2 .4s ease .55s both" }}>
            <Radar size={9} /> Signal preview
          </span>
        </div>
        <style>{`@keyframes fadein2 { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} } @keyframes sparkle2 { 0%,100% { transform: scale(1) rotate(0deg); opacity: .7; } 50% { transform: scale(1.25) rotate(12deg); opacity: 1; } }`}</style>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-1.5 h-14">
      {[10, 22, 16, 30, 24].map((h, i) => <span key={i} className="w-3 rounded-t" style={{ height: h, background: DRUG_COLORS[i % DRUG_COLORS.length], animation: `grow .6s ease ${i * 0.12}s both` }} />)}
      <style>{`@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Developer & Contact
// ---------------------------------------------------------------------------
function DeveloperView() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-[20px] font-bold mb-6" style={{ color: C.indigoDeeper }}>Developer</h1>
      <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[20px] font-bold" style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})` }}>
            {DEVELOPER_NAME.trim().charAt(0) === "[" ? "?" : DEVELOPER_NAME.trim().charAt(0)}
          </div>
          <div>
            <div className="font-bold text-[17px]">{DEVELOPER_NAME}</div>
            <div className="text-[13px] text-[#64748B]">{DEVELOPER_ROLE}</div>
          </div>
        </div>
        <p className="text-[13.5px] text-[#465550] leading-relaxed">
          {APP_NAME} was built as a tool for structuring adverse event reports, screening for reporting patterns, and
          making it faster to get a case ready for the right regulator — with voice input to lower the barrier to
          logging a reaction in the first place.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin panel — separate password from the demo login, not linked from any
// visible nav. Reached only via the small "·" beneath the Developer tab.
// ---------------------------------------------------------------------------
function AdminGate({ onUnlock, onCancel }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    if (password.trim() === ADMIN_PASSCODE) { setError(""); onUnlock(); }
    else setError("Incorrect admin password.");
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-6" style={{ background: "rgba(15,23,42,0.55)" }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-2xl" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} style={{ color: C.indigoDeep }} />
          <h1 className="text-[16px] font-bold" style={{ color: C.indigoDeeper }}>Admin access</h1>
        </div>
        <Field label="Admin password">
          <TextInput type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        {error && <p className="text-[12.5px] mb-3" style={{ color: C.rose }}>{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-md border px-3 py-2 text-[13px] font-medium" style={{ borderColor: C.border }}>Cancel</button>
          <button type="submit" className="flex-1 rounded-md text-white px-3 py-2 text-[13px] font-semibold" style={{ background: C.indigo }}>Unlock</button>
        </div>
      </form>
    </div>
  );
}

function AdminPanel({ history, signalData, onClearAll, onDownloadAll, onExitAdmin, lockdown, onToggleLockdown }) {
  const [confirming, setConfirming] = useState(false);
  const seriousCount = history.filter((r) => r.isSerious).length;
  const literatureCount = history.filter((r) => r.source === "literature").length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} style={{ color: C.indigoDeep }} />
          <h1 className="text-[20px] font-bold" style={{ color: C.indigoDeeper }}>Admin</h1>
        </div>
        <button onClick={onExitAdmin} className="text-[12.5px] font-medium text-[#64748B] hover:text-[#0F172A]">Exit admin</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <AdminStat label="Total cases" value={history.length} />
        <AdminStat label="Serious" value={seriousCount} />
        <AdminStat label="Signals flagged" value={signalData.signals.length} />
        <AdminStat label="From literature" value={literatureCount} />
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm mb-4" style={{ borderColor: C.border }}>
        <div className="font-semibold text-[14px] mb-1">Submission control</div>
        <p className="text-[12.5px] text-[#64748B] mb-3">When on, the case intake wizard is disabled for every viewer of this app — useful while you're resetting data or presenting, so nobody submits mid-cleanup. This applies to everyone, not just you.</p>
        <button onClick={() => onToggleLockdown(!lockdown)}
          className="inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[13px] font-medium"
          style={lockdown ? { background: C.amberSoft, borderColor: C.amberBorder, color: C.amberDeep } : { borderColor: C.border }}>
          <span className="w-8 h-4 rounded-full relative transition" style={{ background: lockdown ? C.amberDeep : "#CBD5E1" }}>
            <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition" style={{ left: lockdown ? 18 : 2 }} />
          </span>
          {lockdown ? "Submissions paused for everyone" : "Submissions open"}
        </button>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm mb-4" style={{ borderColor: C.border }}>
        <div className="font-semibold text-[14px] mb-1">Backup</div>
        <p className="text-[12.5px] text-[#64748B] mb-3">Download every saved case as one JSON file before clearing anything.</p>
        <button onClick={onDownloadAll} disabled={history.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[13px] font-medium disabled:opacity-50" style={{ borderColor: C.border }}>
          <Download size={14} /> Download all {history.length} case{history.length === 1 ? "" : "s"}
        </button>
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor: C.roseBorder, background: C.roseSoft }}>
        <div className="font-semibold text-[14px] mb-1" style={{ color: C.rose }}>Danger zone</div>
        <p className="text-[12.5px] mb-3" style={{ color: "#7F1D1D" }}>
          Permanently deletes every case in the shared log for all viewers. Consider downloading a backup first.
        </p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={history.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-50"
            style={{ borderColor: C.roseBorder, color: C.rose, background: "white" }}>
            <Trash2 size={13} /> Clear all saved cases
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-medium" style={{ color: "#7F1D1D" }}>Delete all {history.length} cases? This can't be undone.</span>
            <button onClick={() => { onClearAll(); setConfirming(false); }} className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white" style={{ background: C.rose }}>Yes, delete all</button>
            <button onClick={() => setConfirming(false)} className="rounded-md border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: C.roseBorder }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminStat({ label, value }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center" style={{ borderColor: C.border }}>
      <div className="text-[19px] font-bold" style={{ color: C.indigoDeeper }}>{value}</div>
      <div className="text-[11px] text-[#64748B] mt-0.5">{label}</div>
    </div>
  );
}

function ContactView() {
  const [message, setMessage] = useState("");
  const hasEmail = CONTACT_EMAIL.trim().length > 0;
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} feedback`)}&body=${encodeURIComponent(message)}`;
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-[20px] font-bold mb-1" style={{ color: C.indigoDeeper }}>Contact & feedback</h1>
      <p className="text-[13.5px] text-[#64748B] mb-6">Found a bug, or have an idea for a feature? Let us know.</p>

      <div className="rounded-xl border bg-white p-6 shadow-sm mb-4" style={{ borderColor: C.border }}>
        <Field label="Your message">
          <TextArea placeholder="Tell us what's working, what's not, or what you'd like to see next…" value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        {hasEmail ? (
          <>
            <a href={mailto} className="inline-flex items-center gap-2 rounded-md text-white px-4 py-2.5 text-[14px] font-medium" style={{ background: C.indigo }}>
              <Mail size={15} /> Send via email
            </a>
            <p className="text-[12px] text-[#94A3B8] mt-2">Opens your email app addressed to {CONTACT_EMAIL}.</p>
          </>
        ) : (
          <p className="text-[12.5px] text-[#94A3B8] rounded-md border border-dashed px-3 py-2.5" style={{ borderColor: C.border }}>
            A contact email hasn't been set up yet — check back soon.
          </p>
        )}
      </div>

      {(hasEmail || CONTACT_LINKEDIN) && (
        <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: C.border }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-2">Other ways to reach us</div>
          {hasEmail && (
            <div className="flex items-center gap-2 text-[13.5px] mb-1.5"><Mail size={14} className="text-[#64748B]" /> {CONTACT_EMAIL}</div>
          )}
          {CONTACT_LINKEDIN && (
            <a href={CONTACT_LINKEDIN} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13.5px] hover:underline" style={{ color: C.indigo }}>
              <ExternalLink size={14} /> LinkedIn
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard shell
// ---------------------------------------------------------------------------
function Wizard({ form, update, mergeInto, updateArrayItem, mergeIntoArrayItem, addArrayItem, removeArrayItem,
  step, setStep, canAdvance, seriousnessCount, isSerious, country, onExit, onSubmit, voiceLang, setVoiceLang, similarCases }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
      <div>
        <button onClick={onExit} className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B] mb-6">
          <ArrowLeft size={15} /> Exit
        </button>
        <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-2">Report progress</div>
        <div className="space-y-0.5">
          {STEPS.map((s, i) => <StepDot key={s} index={i} current={step} done={i < step} label={s} onClick={() => i <= step && setStep(i)} />)}
        </div>
        <div className="mt-8 rounded-lg bg-white border p-3 shadow-sm" style={{ borderColor: C.border }}>
          <SeriousnessDial count={seriousnessCount} total={SERIOUSNESS_CRITERIA.length} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-7 md:p-9 shadow-sm" style={{ borderColor: C.border }}>
        {step === 0 && (
          <>
            <StepHeader icon={User} title="Who was affected" subtitle="Basic details — no name needed if you'd rather keep this anonymous." accent={C.indigo} />
            <VoiceFill stepType="patient" language={voiceLang} setLanguage={setVoiceLang} onApply={(o) => mergeInto("patient", o)} />
            <PatientFields form={form} update={update} />
          </>
        )}
        {step === 1 && (
          <>
            <StepHeader icon={Pill} title="The medicine(s)" subtitle="Add every drug taken together, if more than one." accent={C.amberDeep} />
            {form.drugs.map((d, i) => (
              <DrugCard key={d.id} drug={d} index={i} total={form.drugs.length}
                voiceLang={voiceLang} setVoiceLang={setVoiceLang}
                onUpdate={(key, val) => updateArrayItem("drugs", i, key, val)}
                onApplyVoice={(o) => mergeIntoArrayItem("drugs", i, o)}
                onRemove={() => removeArrayItem("drugs", i)} />
            ))}
            <button onClick={() => addArrayItem("drugs", blankDrug)} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3.5 py-2 text-[13px] font-medium" style={{ borderColor: C.indigo, color: C.indigo }}>
              <Plus size={15} /> Add another medicine
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <StepHeader icon={Activity} title="What happened" subtitle="Add every reaction separately, if more than one occurred." accent={C.rose} />
            {form.events.map((ev, i) => (
              <EventCard key={ev.id} event={ev} index={i} total={form.events.length}
                voiceLang={voiceLang} setVoiceLang={setVoiceLang}
                onUpdate={(key, val) => updateArrayItem("events", i, key, val)}
                onApplyVoice={(o) => mergeIntoArrayItem("events", i, o)}
                onRemove={() => removeArrayItem("events", i)} />
            ))}
            <button onClick={() => addArrayItem("events", blankEvent)} className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3.5 py-2 text-[13px] font-medium" style={{ borderColor: C.rose, color: C.rose }}>
              <Plus size={15} /> Add another reaction
            </button>
          </>
        )}
        {step === 3 && <SeriousnessStep form={form} update={update} count={seriousnessCount} />}
        {step === 4 && <ReporterStep form={form} update={update} />}
        {step === 5 && <ReviewStep form={form} country={country} isSerious={isSerious} seriousnessCount={seriousnessCount} similarCases={similarCases} />}

        <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: "#F1F0FB" }}>
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#64748B] disabled:opacity-30">
            <ChevronLeft size={17} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 rounded-md text-white px-5 py-2.5 text-[14px] font-medium disabled:opacity-30 transition" style={{ background: C.indigo }}>
              Continue <ChevronRight size={17} />
            </button>
          ) : (
            <button onClick={onSubmit} className="inline-flex items-center gap-2 rounded-md text-white px-5 py-2.5 text-[14px] font-medium transition" style={{ background: C.emeraldDeep }}>
              <Send size={16} /> Save report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle, accent }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${accent}1A` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <h2 className="text-[19px] font-bold" style={{ color: C.indigoDeeper }}>{title}</h2>
        <p className="text-[13.5px] text-[#94A3B8] mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field groups
// ---------------------------------------------------------------------------
function PatientFields({ form, update }) {
  const p = form.patient;
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Age"><TextInput type="number" min="0" placeholder="e.g. 42" value={p.age} onChange={(e) => update("patient", "age", e.target.value)} /></Field>
        <Field label="Sex">
          <Select value={p.sex} onChange={(e) => update("patient", "sex", e.target.value)}>
            <option value="">Select…</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
          </Select>
        </Field>
        <Field label="Weight (optional)"><TextInput type="number" min="0" placeholder="e.g. 70" value={p.weight} onChange={(e) => update("patient", "weight", e.target.value)} /></Field>
        <Field label="Weight unit">
          <Select value={p.weightUnit} onChange={(e) => update("patient", "weightUnit", e.target.value)}><option value="kg">kg</option><option value="lb">lb</option></Select>
        </Field>
      </div>
      <Field label="Relevant medical history (optional)" hint="Allergies, chronic conditions, pregnancy status, other medicines being taken.">
        <TextArea placeholder="e.g. Type 2 diabetes, penicillin allergy" value={p.conditions} onChange={(e) => update("patient", "conditions", e.target.value)} />
      </Field>
      <Field label="Country of the reporting authority" hint="Decides which regulator's format and timeline we show you at the end.">
        <Select value={p.country} onChange={(e) => update("patient", "country", e.target.value)}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} — {c.authority}</option>)}
        </Select>
      </Field>
      <MaskToggle checked={p.masked} onChange={(v) => update("patient", "masked", v)} label="Mask patient data for privacy" />
    </div>
  );
}

function DrugCard({ drug, index, total, voiceLang, setVoiceLang, onUpdate, onApplyVoice, onRemove }) {
  return (
    <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.border, background: "#FCFCFF" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B]">Medicine {index + 1}</span>
        {total > 1 && (
          <button onClick={onRemove} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: C.rose }}>
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>
      <VoiceFill stepType="drug" language={voiceLang} setLanguage={setVoiceLang} onApply={onApplyVoice} />
      <Field label="Drug name" hint="Brand or generic name, whichever you know."><TextInput placeholder="e.g. Amoxicillin" value={drug.name} onChange={(e) => onUpdate("name", e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-x-4">
        <Field label="Dose"><TextInput type="number" min="0" placeholder="500" value={drug.dose} onChange={(e) => onUpdate("dose", e.target.value)} /></Field>
        <Field label="Unit">
          <Select value={drug.doseUnit} onChange={(e) => onUpdate("doseUnit", e.target.value)}>
            <option>mg</option><option>mcg</option><option>g</option><option>mL</option><option>IU</option><option>tablet(s)</option>
          </Select>
        </Field>
        <Field label="Route">
          <Select value={drug.route} onChange={(e) => onUpdate("route", e.target.value)}>
            <option>Oral</option><option>Intravenous</option><option>Intramuscular</option><option>Subcutaneous</option><option>Topical</option><option>Inhaled</option><option>Other</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="How often taken"><TextInput placeholder="e.g. twice daily" value={drug.frequency} onChange={(e) => onUpdate("frequency", e.target.value)} /></Field>
        <Field label="Taken for"><TextInput placeholder="e.g. sinus infection" value={drug.indication} onChange={(e) => onUpdate("indication", e.target.value)} /></Field>
        <Field label="Start date"><TextInput type="date" value={drug.startDate} onChange={(e) => onUpdate("startDate", e.target.value)} /></Field>
        <Field label="End date"><TextInput type="date" disabled={drug.ongoing} value={drug.endDate} onChange={(e) => onUpdate("endDate", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-[13.5px] text-[#465550] mt-1 cursor-pointer">
        <input type="checkbox" checked={drug.ongoing} onChange={(e) => onUpdate("ongoing", e.target.checked)} className="w-4 h-4" style={{ accentColor: C.indigo }} />
        Still taking this medicine
      </label>
    </div>
  );
}

function EventCard({ event, index, total, voiceLang, setVoiceLang, onUpdate, onApplyVoice, onRemove }) {
  return (
    <div className="rounded-lg border p-4 mb-4" style={{ borderColor: C.border, background: "#FCFCFF" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B]">Reaction {index + 1}</span>
        {total > 1 && (
          <button onClick={onRemove} className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: C.rose }}>
            <Trash2 size={13} /> Remove
          </button>
        )}
      </div>
      <VoiceFill stepType="event" language={voiceLang} setLanguage={setVoiceLang} onApply={onApplyVoice} />
      <Field label="Describe the side effect" hint="What did you notice, and when did it start relative to taking the medicine?">
        <TextArea placeholder="e.g. Widespread itchy rash and mild swelling of the lips, started about 40 minutes after the first dose." value={event.description} onChange={(e) => onUpdate("description", e.target.value)} />
      </Field>
      <Field label="Reaction term" hint="A short standard name for the reaction, e.g. 'rash', 'nausea' — used to spot patterns in Signal detection.">
        <TextInput placeholder="e.g. rash" value={event.term} onChange={(e) => onUpdate("term", e.target.value)} />
      </Field>
      <div className="-mt-2 mb-4">
        <TermCoder description={event.description} term={event.term} value={event.meddra} onApply={(m) => onUpdate("meddra", m)} />
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="Date it started"><TextInput type="date" value={event.onsetDate} onChange={(e) => onUpdate("onsetDate", e.target.value)} /></Field>
        <Field label="Severity">
          <Select value={event.severity} onChange={(e) => onUpdate("severity", e.target.value)}><option>Mild</option><option>Moderate</option><option>Severe</option></Select>
        </Field>
      </div>
      <Field label="Current outcome">
        <Select value={event.outcome} onChange={(e) => onUpdate("outcome", e.target.value)}>
          <option>Recovered / resolved</option><option>Recovering</option><option>Not yet recovered</option><option>Recovered with lasting effects</option><option>Fatal</option><option>Unknown</option>
        </Select>
      </Field>
      <Field label="Listed in the product's label / reference safety info?" hint={'"Unlisted" (unexpected) + serious usually drives faster expedited-reporting timelines.'}>
        <Select value={event.expectedness || ""} onChange={(e) => onUpdate("expectedness", e.target.value)}>
          <option value="">Not assessed</option>
          <option value="listed">Listed (expected)</option>
          <option value="unlisted">Unlisted (unexpected)</option>
          <option value="unknown">Unknown / can't determine</option>
        </Select>
      </Field>
    </div>
  );
}

function SeriousnessStep({ form, update, count }) {
  const specialCount = SPECIAL_SITUATIONS.filter((s) => form.specialSituations?.[s.key]).length;
  return (
    <div>
      <StepHeader icon={ShieldAlert} title="Seriousness check" subtitle="Standard ICH criteria regulators use to set deadlines, for the case overall. Check any that apply — most reports check none." accent={C.rose} />
      <div className="space-y-2.5">
        {SERIOUSNESS_CRITERIA.map((c) => (
          <label key={c.key} className="flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer transition"
            style={form.seriousness[c.key] ? { borderColor: C.roseBorder, background: C.roseSoft } : { borderColor: C.border }}>
            <input type="checkbox" checked={form.seriousness[c.key]} onChange={(e) => update("seriousness", c.key, e.target.checked)} className="w-4 h-4" style={{ accentColor: C.rose }} />
            <span className="text-[14px] text-[#0F172A]">{c.label}</span>
          </label>
        ))}
      </div>
      {count > 0 && (
        <div className="mt-5 flex gap-2.5 items-start rounded-md px-4 py-3 border" style={{ background: C.roseSoft, borderColor: C.roseBorder }}>
          <AlertTriangle size={17} className="shrink-0 mt-0.5" style={{ color: C.rose }} />
          <p className="text-[13px]" style={{ color: "#7A1230" }}>
            This meets the definition of a <strong>serious</strong> adverse event. Most regulators expect reports
            like this filed within about two weeks — don't wait to also contact a doctor or poison control if the
            situation is ongoing.
          </p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t" style={{ borderColor: C.border }}>
        <div className="mb-3">
          <div className="text-[14px] font-semibold text-[#0F172A]">Special situations</div>
          <p className="text-[12.5px] text-[#64748B] mt-0.5">
            Reportable independent of seriousness — each has its own regulatory handling under GVP Module VI. Check
            any that apply.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {SPECIAL_SITUATIONS.map((s) => (
            <label key={s.key} className="flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer transition"
              style={form.specialSituations?.[s.key] ? { borderColor: C.skyBorder, background: C.skySoft } : { borderColor: C.border }}>
              <input type="checkbox" checked={!!form.specialSituations?.[s.key]} onChange={(e) => update("specialSituations", s.key, e.target.checked)} className="w-4 h-4" style={{ accentColor: C.skyDeep }} />
              <span className="text-[13.5px] text-[#0F172A]">{s.label}</span>
            </label>
          ))}
        </div>
        {specialCount > 0 && (
          <p className="text-[12px] text-[#64748B] mt-3">{specialCount} special situation{specialCount === 1 ? "" : "s"} flagged — this will show on the case summary and export.</p>
        )}
      </div>
    </div>
  );
}

function ReporterStep({ form, update }) {
  const r = form.reporter;
  return (
    <div>
      <StepHeader icon={FileText} title="Who's filing this" subtitle="Helps the authority follow up if they need more detail." accent={C.sky} />
      <Field label="You are the...">
        <Select value={r.type} onChange={(e) => update("reporter", "type", e.target.value)}>
          <option>Patient</option><option>Parent or caregiver</option><option>Physician</option><option>Pharmacist</option><option>Nurse</option><option>Other healthcare professional</option><option>Literature report</option>
        </Select>
      </Field>
      <Field label="Name (optional)"><TextInput placeholder="Leave blank to stay anonymous" value={r.name} onChange={(e) => update("reporter", "name", e.target.value)} /></Field>
      <Field label="Contact (optional)" hint="Email or phone, only if you're comfortable being contacted for follow-up.">
        <TextInput placeholder="Leave blank to stay anonymous" value={r.contact} onChange={(e) => update("reporter", "contact", e.target.value)} />
      </Field>
      <MaskToggle checked={r.masked} onChange={(v) => update("reporter", "masked", v)} label="Mask reporter details for confidentiality" />
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b text-[13.5px]" style={{ borderColor: "#F1F0FB" }}>
      <span className="text-[#94A3B8]">{label}</span>
      <span className="text-[#0F172A] font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function ReviewStep({ form, country, isSerious, seriousnessCount, similarCases }) {
  const patient = maskPatient(form.patient);
  const reporter = maskReporter(form.reporter);
  return (
    <div>
      <StepHeader icon={ClipboardList} title="Review & save" subtitle="Check this over — it becomes the structured record you export." accent={C.indigo} />

      {similarCases.length > 0 && (
        <div className="rounded-md border p-4 mb-4 flex gap-2.5" style={{ background: C.amberSoft, borderColor: C.amberBorder }}>
          <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: C.amberDeep }} />
          <div className="text-[12.5px]" style={{ color: "#7A4A00" }}>
            <strong>Heads up:</strong> {similarCases.length} earlier case{similarCases.length > 1 ? "s" : ""} share a drug and reaction
            with this one — most recently {new Date(similarCases[0].createdAt).toLocaleDateString()}. Could be a recurring
            pattern worth flagging, or simply expected. Check <strong>Signals</strong> after saving for the full picture.
          </div>
        </div>
      )}

      <div className="rounded-md border p-4 mb-4" style={{ borderColor: C.border }}>
        <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-1">Patient {form.patient.masked && <span style={{ color: C.violetDeep }}>(masked)</span>}</div>
        <SummaryRow label="Age / sex" value={`${patient.age || "—"} / ${patient.sex || "—"}`} />
        <SummaryRow label="Weight" value={patient.weight ? `${patient.weight} ${patient.weightUnit}` : ""} />
        <SummaryRow label="Medical history" value={patient.conditions} />
      </div>

      {form.drugs.map((d, i) => (
        <div key={d.id} className="rounded-md border p-4 mb-4" style={{ borderColor: C.border }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-1">Medicine {i + 1}</div>
          <SummaryRow label="Drug" value={d.name} />
          <SummaryRow label="Dose / route" value={`${d.dose || "—"} ${d.doseUnit} · ${d.route}`} />
          <SummaryRow label="Duration" value={`${d.startDate || "—"} → ${d.ongoing ? "ongoing" : d.endDate || "—"}`} />
        </div>
      ))}

      {form.events.map((ev, i) => (
        <div key={ev.id} className="rounded-md border p-4 mb-4" style={{ borderColor: C.border }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-1">Reaction {i + 1}</div>
          <SummaryRow label="Term" value={ev.term} />
          <SummaryRow label="Onset" value={ev.onsetDate} />
          <SummaryRow label="Severity" value={ev.severity} />
          <SummaryRow label="Outcome" value={ev.outcome} />
          <p className="text-[13.5px] text-[#0F172A] mt-2 leading-relaxed">{ev.description}</p>
        </div>
      ))}

      <div className="rounded-md border p-4 mb-4" style={{ borderColor: C.border }}>
        <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-1">Reporter {form.reporter.masked && <span style={{ color: C.violetDeep }}>(masked)</span>}</div>
        <SummaryRow label="Role" value={reporter.type} />
        <SummaryRow label="Name" value={reporter.name} />
        <SummaryRow label="Contact" value={reporter.contact} />
      </div>

      <div className="rounded-md p-4 mb-4 border" style={isSerious ? { background: C.roseSoft, borderColor: C.roseBorder } : { background: C.emeraldSoft, borderColor: C.emeraldBorder }}>
        <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-1">Regulatory routing</div>
        <p className="text-[13.5px] text-[#0F172A]">
          For <strong>{country.name}</strong>, this goes to <strong>{country.authority}</strong> via <strong>{country.portal}</strong>.
          Because this report is <strong>{isSerious ? "serious" : "not serious"}</strong> ({seriousnessCount} criteria met), the
          expected filing window is <strong>{isSerious ? country.serious : country.nonSerious}</strong>.
        </p>
      </div>

      <p className="text-[12.5px] text-[#94A3B8] leading-relaxed">
        Saving stores this report in the shared case log — visible to everyone using this app, not just you — and
        feeds it into signal detection. It does not send anything to {country.authority}. Use the export options on
        the saved report to download it or print a copy for filing.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail / export view
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Filing deadline countdown — parses the leading number of days out of the
// country's suggested window (e.g. "15 calendar days") and tracks it against
// when the case was logged. Only renders when the window is a fixed number
// of days; periodic/annual windows don't have a per-case countdown.
// ---------------------------------------------------------------------------
function DeadlineCountdown({ record, country }) {
  const windowText = record.isSerious ? country.serious : country.nonSerious;
  const match = windowText.match(/^(\d+)/);
  const [, refresh] = useState(0);
  useEffect(() => { const id = setInterval(() => refresh(n => n + 1), 60000); return () => clearInterval(id); }, []);
  if (!match) return null;
  const totalDays = parseInt(match[1], 10);
  const elapsedDays = Math.max(0, Date.now() - new Date(record.createdAt).getTime()) / 86400000;
  const remaining = Math.ceil(totalDays - elapsedDays);
  const overdue = remaining < 0;
  const urgent = !overdue && remaining <= 3;
  const pct = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
  const color = overdue ? C.rose : urgent ? C.amberDeep : C.emeraldDeep;
  return <div className="mt-4 rounded-xl border p-4" style={{borderColor: overdue ? C.roseBorder : urgent ? C.amberBorder : C.border, background: overdue ? C.roseSoft : urgent ? C.amberSoft : "#FAFAFC"}}>
    <div className="flex items-center justify-between gap-3 mb-2"><span className="text-[12px] font-semibold flex items-center gap-1.5" style={{color}}><CalendarClock size={14}/> {overdue ? `Overdue by ${Math.abs(remaining)} day${Math.abs(remaining)===1?"":"s"}` : `${remaining} of ${totalDays} days remaining`}</span><span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1" style={{color,background:"white",border:`1px solid ${overdue?C.roseBorder:urgent?C.amberBorder:C.emeraldBorder}`}}>{overdue?"Action required":urgent?"Due soon":"On track"}</span></div>
    <div className="h-2 rounded-full bg-[#EEF0F5] overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:color}}/></div>
    <p className="text-[10.5px] text-[#94A3B8] mt-2 leading-relaxed">Based on the case logged time and configured country window. Verify the actual submission timestamp and your organization's SOP before filing.</p>
  </div>;
}

function DetailView({ record, onBack, onDelete, onDownload, onDownloadE2B, onSaveCausality, onSaveMeddra }) {
  const country = COUNTRIES.find((c) => c.code === record.patient.country) || COUNTRIES[0];
  const patient = maskPatient(record.patient);
  const reporter = maskReporter(record.reporter);
  const drugNames = (record.drugs || []).map((d) => d.name).filter(Boolean).join(" + ") || "Unnamed medicine(s)";
  return (
    <div className="min-h-screen print:bg-white" style={{ background: C.bg }}>
      <div className="max-w-3xl mx-auto px-6 py-8 vigilis-page">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B]"><ArrowLeft size={15} /> Back</button>
          <div className="flex gap-2">
            <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: C.border }}><Download size={14} /> JSON</button>
            <button onClick={onDownloadE2B} title="Simplified, non-certified — for illustration only" className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: C.border }}><FileText size={14} /> E2B-style XML</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: C.border }}><Printer size={14} /> Print</button>
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: C.roseBorder, color: C.rose }}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
        <p className="text-[10.5px] text-[#94A3B8] -mt-4 mb-6 print:hidden">The E2B-style export is a simplified illustration of the ICH E2B(R3) structure, not a validated regulatory submission file.</p>
        <div className="bg-white rounded-2xl border p-8 vigilis-detail-card print:border-none print:p-0 shadow-sm print:shadow-none vigilis-surface" style={{ borderColor: C.border }}>
          <div className="flex items-center justify-between mb-1">
            <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B]">{record.id}</div>
            <span className="font-mono text-[11px] uppercase tracking-wide px-2 py-0.5 rounded"
              style={record.isSerious ? { background: C.roseSoft, color: C.rose } : { background: C.emeraldSoft, color: C.emeraldDeeper }}>
              {record.isSerious ? "Serious" : "Not serious"}
            </span>
          </div>
          <h1 className="text-[22px] font-bold mb-1" style={{ color: C.indigoDeeper }}>{drugNames}</h1>
          <p className="text-[12.5px] text-[#94A3B8] mb-3">Logged {new Date(record.createdAt).toLocaleString()}</p>
           <div className="flex flex-wrap gap-2 mb-5">
             <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{background:record.isSerious?C.roseSoft:C.emeraldSoft,color:record.isSerious?C.rose:C.emeraldDeeper}}>{record.isSerious?<ShieldAlert size={11}/>:<ShieldCheck size={11}/>} {record.isSerious?"Serious case":"Non-serious case"}</span>
             <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{background:C.violetSoft,color:C.violetDeep}}><FileText size={11}/> {record.events?.length||0} reaction{(record.events?.length||0)===1?"":"s"}</span>
             <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{background:C.skySoft,color:C.skyDeep}}><Pill size={11}/> {record.drugs?.length||0} medicine{(record.drugs?.length||0)===1?"":"s"}</span>
             {record.source==="literature"&&<span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{background:C.amberSoft,color:C.amberDeep}}><BookOpen size={11}/> Literature sourced</span>}
           </div>

          {record.source === "literature" && (
            <div className="rounded-lg border p-3 mb-6 flex gap-2.5" style={{ background: C.violetSoft, borderColor: C.violetBorder }}>
              <BookOpen size={14} className="shrink-0 mt-0.5" style={{ color: C.violetDeep }} />
              <div className="text-[12px] leading-relaxed" style={{ color: C.violetDeep }}>
                <strong>Sourced from AI literature screening</strong>{record.literatureSource?.confidence ? ` (${record.literatureSource.confidence} confidence)` : ""}.
                {record.literatureSource?.title && <> Reference: {record.literatureSource.url ? <a href={record.literatureSource.url} target="_blank" rel="noreferrer" className="underline">{record.literatureSource.title}</a> : record.literatureSource.title}.</>}
                {" "}Reviewed and saved by a human on {new Date(record.literatureSource?.screenedAt || record.createdAt).toLocaleDateString()}.
              </div>
            </div>
          )}

          <Section title={`Patient ${patient.masked ? "(masked)" : ""}`}>
            <SummaryRow label="Age / sex" value={`${patient.age} / ${patient.sex}`} />
            <SummaryRow label="Weight" value={patient.weight ? `${patient.weight} ${patient.weightUnit}` : ""} />
            <SummaryRow label="History" value={patient.conditions} />
          </Section>

          {(record.drugs || []).map((d, i) => (
            <Section key={d.id || i} title={`Medicine ${i + 1}`}>
              <SummaryRow label="Name" value={d.name} />
              <SummaryRow label="Dose / route" value={`${d.dose} ${d.doseUnit} · ${d.route}`} />
              <SummaryRow label="Frequency" value={d.frequency} />
              <SummaryRow label="Indication" value={d.indication} />
              <SummaryRow label="Duration" value={`${d.startDate || "—"} → ${d.ongoing ? "ongoing" : d.endDate || "—"}`} />
            </Section>
          ))}

          {(record.events || []).map((ev, i) => (
            <Section key={ev.id || i} title={`Reaction ${i + 1}`}>
              <SummaryRow label="Term" value={ev.term} />
              <SummaryRow label="Onset" value={ev.onsetDate} />
              <SummaryRow label="Severity" value={ev.severity} />
              <SummaryRow label="Outcome" value={ev.outcome} />
              <SummaryRow label="Expectedness" value={
                ev.expectedness === "listed" ? "Listed (expected)" :
                ev.expectedness === "unlisted" ? "Unlisted (unexpected)" :
                ev.expectedness === "unknown" ? "Unknown / can't determine" : ""
              } />
              {ev.expectedness === "unlisted" && (
                <div className="flex items-center gap-1.5 mt-1.5 mb-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: C.roseSoft, color: C.rose }}>
                    <AlertTriangle size={10} /> Unlisted — often drives expedited timelines if also serious
                  </span>
                </div>
              )}
              <p className="text-[13.5px] mt-2 leading-relaxed mb-2">{ev.description}</p>
              <div className="print:hidden mb-3">
                <TermCoder description={ev.description} term={ev.term} value={ev.meddra} compact
                  onApply={(m) => onSaveMeddra && onSaveMeddra(i, m)} />
              </div>
              {ev.meddra?.pt && (
                <p className="hidden print:block text-[12.5px] mb-2"><strong>MedDRA-style term:</strong> {ev.meddra.pt} ({ev.meddra.soc})</p>
              )}
              <div className="print:hidden">
                <CausalityAssessment record={record} event={ev} eventIndex={i} onSave={onSaveCausality} />
              </div>
              {ev.causality?.category && (
                <div className="hidden print:block mt-2 text-[12.5px]">
                  <strong>Causality (WHO-UMC):</strong> {ev.causality.category} — {ev.causality.rationale}
                </div>
              )}
            </Section>
          ))}

          <Section title="Seriousness criteria met">
            {SERIOUSNESS_CRITERIA.filter((c) => record.seriousness[c.key]).length === 0 ? (
              <p className="text-[13.5px] text-[#94A3B8]">None</p>
            ) : (
              <ul className="text-[13.5px] list-disc pl-5 space-y-0.5">
                {SERIOUSNESS_CRITERIA.filter((c) => record.seriousness[c.key]).map((c) => <li key={c.key}>{c.label}</li>)}
              </ul>
            )}
          </Section>
          {SPECIAL_SITUATIONS.some((s) => record.specialSituations?.[s.key]) && (
            <Section title="Special situations">
              <ul className="text-[13.5px] list-disc pl-5 space-y-0.5">
                {SPECIAL_SITUATIONS.filter((s) => record.specialSituations?.[s.key]).map((s) => <li key={s.key}>{s.label}</li>)}
              </ul>
            </Section>
          )}
          <Section title={`Reporter ${reporter.masked ? "(masked)" : ""}`}>
            <SummaryRow label="Role" value={reporter.type} />
            <SummaryRow label="Name" value={reporter.name} />
            <SummaryRow label="Contact" value={reporter.contact} />
          </Section>
          <Section title="Where to file">
            <p className="text-[13.5px] leading-relaxed">
              {country.name} → <strong>{country.authority}</strong> via <strong>{country.portal}</strong>. Suggested window:{" "}
              <strong>{record.isSerious ? country.serious : country.nonSerious}</strong>.
            </p>
            <DeadlineCountdown record={record} country={country} />
          </Section>

          {record.auditLog?.length > 0 && (
            <Section title="Audit trail">
              <ul className="space-y-2">
                {record.auditLog.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px]">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.indigo }} />
                    <div>
                      <span className="text-[#0F172A]">{a.action}</span>
                      <span className="text-[#94A3B8]"> · {a.actor} · {new Date(a.ts).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="print:hidden">
            <NarrativeGenerator record={record} country={country} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI-generated regulatory case narrative
// ---------------------------------------------------------------------------
function NarrativeGenerator({ record, country }) {
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [narrative, setNarrative] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setState("loading"); setCopied(false);
    try {
      const p = maskPatient(record.patient);
      const drugsText = (record.drugs || []).map((d) => `${d.name || "unnamed medicine"} ${d.dose}${d.doseUnit} ${d.route}, ${d.frequency}, taken for ${d.indication || "an unspecified indication"}`).join("; ");
      const eventsText = (record.events || []).map((ev) => `${ev.term || "unspecified reaction"} (${ev.severity}, outcome: ${ev.outcome}) — ${ev.description}`).join("; ");
      const criteriaText = SERIOUSNESS_CRITERIA.filter((c) => record.seriousness[c.key]).map((c) => c.label).join(", ") || "none";
      const specialText = SPECIAL_SITUATIONS.filter((s) => record.specialSituations?.[s.key]).map((s) => s.label).join(", ") || "none";
      const prompt =
        `Write a concise case narrative paragraph for an adverse event report, in the plain professional style used ` +
        `in CIOMS/MedWatch narratives (one paragraph, 4-7 sentences, past tense, no headers, no markdown). ` +
        `Include patient context, the medicine(s) and dose, the reaction(s) with onset/severity/outcome, seriousness ` +
        `criteria met, and any special situations, and note this is intended for filing with ${country.authority}. ` +
        `Do not invent facts beyond what's given; if something is missing just omit it rather than guessing.\n\n` +
        `Patient: age ${p.age || "unknown"}, sex ${p.sex || "unknown"}${p.weight ? `, weight ${p.weight}${p.weightUnit}` : ""}${p.conditions ? `, history: ${p.conditions}` : ""}.\n` +
        `Medicine(s): ${drugsText || "not specified"}.\n` +
        `Reaction(s): ${eventsText || "not specified"}.\n` +
        `Seriousness criteria met: ${criteriaText}.\n` +
        `Special situations: ${specialText}.`;
      const text = await askClaudeText(prompt);
      setNarrative(text); setState("ready");
    } catch (e) {
      setState("error");
    }
  }

  function copyIt() {
    navigator.clipboard?.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-2 rounded-lg border p-4" style={{ background: C.violetSoft, borderColor: C.violetBorder }}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: C.violetDeep }}>
          <Sparkles size={15} /> AI regulatory narrative
        </span>
        {state === "idle" && (
          <button onClick={generate} className="inline-flex items-center gap-1.5 rounded-md text-white px-3 py-1.5 text-[12.5px] font-medium" style={{ background: C.violet }}>
            Generate
          </button>
        )}
        {state === "ready" && (
          <div className="flex gap-2">
            <button onClick={generate} className="text-[12px] font-medium" style={{ color: C.violetDeep }}>Regenerate</button>
            <button onClick={copyIt} className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1 text-[12px] font-medium" style={{ borderColor: C.violetBorder, color: C.violetDeep }}>
              <Copy size={11} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
      {state === "idle" && (
        <p className="text-[12.5px]" style={{ color: C.violetDeep }}>
          Draft a ready-to-review case narrative paragraph from this report's fields, in the style regulators expect.
        </p>
      )}
      {state === "loading" && <p className="text-[12.5px]" style={{ color: C.violetDeep }}>Drafting narrative…</p>}
      {state === "error" && (
        <p className="text-[12.5px]" style={{ color: C.rose }}>Couldn't reach the AI service just now. <button onClick={generate} className="underline">Try again</button></p>
      )}
      {state === "ready" && (
        <p className="text-[13px] leading-relaxed mt-2" style={{ color: "#3B0764" }}>{narrative}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MedDRA-style term coding widget — standardizes a free-text reaction into a
// Preferred Term + System Organ Class, first trying the local dictionary,
// then offering an AI-assisted match against the same curated list.
// ---------------------------------------------------------------------------
function TermCoder({ description, term, value, onApply, compact }) {
  const [state, setState] = useState(value ? "ready" : "idle"); // idle | loading | ready | none
  const [result, setResult] = useState(value || null);

  function runLocal() {
    const source = term || description || "";
    const match = standardizeTerm(source);
    if (match) { setResult(match); setState("ready"); onApply(match); }
    else setState("none");
  }
  async function runAI() {
    setState("loading");
    try {
      const source = [term, description].filter(Boolean).join(" — ") || term || description || "";
      const match = await aiStandardizeTerm(source);
      if (match) { setResult(match); setState("ready"); onApply(match); }
      else setState("none");
    } catch (e) {
      setState("none");
    }
  }
  function clear() { setResult(null); setState("idle"); onApply(null); }

  if (state === "ready" && result) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: C.indigoDeeper, color: "white" }}>
          <Tag size={10} /> {result.pt}
        </span>
        <span className="text-[11px] text-[#94A3B8]">{result.soc}{result.method === "ai" ? " · AI-coded" : ""}</span>
        <button onClick={clear} className="text-[#CBD5E1] hover:text-[#94A3B8]"><X size={12} /></button>
      </div>
    );
  }
  if (state === "loading") {
    return <span className="text-[11.5px] flex items-center gap-1.5" style={{ color: C.violetDeep }}><Sparkles size={12} className="animate-pulse" /> Matching to standard term…</span>;
  }
  if (state === "none") {
    return (
      <span className="text-[11.5px] text-[#94A3B8] flex items-center gap-2 flex-wrap">
        No confident match in the {MEDDRA_TERMS.length}-term dictionary.
        <button onClick={runAI} className="inline-flex items-center gap-1 font-medium underline" style={{ color: C.violetDeep }}><Sparkles size={11} /> Ask AI</button>
      </span>
    );
  }
  return (
    <button onClick={runLocal} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: C.indigoDeep }}>
      <Tag size={12} /> {compact ? "Standardize" : "Standardize to MedDRA-style term"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// WHO-UMC causality assessment UI — per reaction, against a chosen suspect
// medicine. Saves automatically once the two required questions are answered.
// ---------------------------------------------------------------------------
function CausalityAssessment({ record, event, eventIndex, onSave }) {
  const drugs = record.drugs || [];
  const initial = event.causality || {};
  const [drugId, setDrugId] = useState(initial.drugId || (drugs[0] && drugs[0].id) || "");
  const [temporal, setTemporal] = useState(initial.temporal || "");
  const [altExplanation, setAltExplanation] = useState(initial.altExplanation || "");
  const [dechallenge, setDechallenge] = useState(initial.dechallenge || "");
  const [rechallenge, setRechallenge] = useState(initial.rechallenge || "");
  const [aiState, setAiState] = useState(initial.aiOpinion ? "ready" : "idle");
  const [aiOpinion, setAiOpinion] = useState(initial.aiOpinion || "");

  const result = useMemo(() => computeWhoUmcCategory({ temporal, altExplanation, dechallenge, rechallenge }), [temporal, altExplanation, dechallenge, rechallenge]);

  useEffect(() => {
    if (!result || !onSave) return;
    onSave(eventIndex, { drugId, temporal, altExplanation, dechallenge, rechallenge, category: result.category, rationale: result.rationale, aiOpinion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporal, altExplanation, dechallenge, rechallenge, drugId]);

  async function askAI() {
    setAiState("loading");
    try {
      const drug = drugs.find((d) => d.id === drugId) || drugs[0] || {};
      const prompt =
        `You're assisting with a WHO-UMC causality assessment for a suspected adverse drug reaction. ` +
        `Medicine: ${drug.name || "unknown"}${drug.dose ? `, ${drug.dose}${drug.doseUnit || ""}` : ""}${drug.route ? `, ${drug.route}` : ""}${drug.indication ? `, taken for ${drug.indication}` : ""}. ` +
        `Reaction: ${event.term || "unspecified"} — ${event.description || "no description given"}. ` +
        `Onset: ${event.onsetDate || "not given"}. Severity: ${event.severity || "unspecified"}. Outcome: ${event.outcome || "unspecified"}.\n\n` +
        `Using the WHO-UMC causality categories (Certain, Probable/Likely, Possible, Unlikely, Conditional/Unclassified, ` +
        `Unassessable/Unclassifiable), give your best preliminary category and a 1-2 sentence rationale based only on ` +
        `what's given above. Start your reply with "Suggested category: X." then the rationale. Make clear this is a ` +
        `preliminary AI opinion for comparison, not a clinical determination. 2-3 sentences total, no markdown.`;
      const text = await askClaudeText(prompt);
      setAiOpinion(text); setAiState("ready");
      if (onSave && result) onSave(eventIndex, { drugId, temporal, altExplanation, dechallenge, rechallenge, category: result.category, rationale: result.rationale, aiOpinion: text });
    } catch (e) {
      setAiState("error");
    }
  }

  const cat = result ? CAUSALITY_CATEGORIES[result.category] : null;

  return (
    <div className="rounded-lg border p-4 mb-3" style={{ borderColor: C.border, background: "#FCFCFF" }}>
      <div className="flex items-center gap-1.5 mb-3">
        <Activity size={14} style={{ color: C.indigo }} />
        <span className="text-[13px] font-semibold" style={{ color: C.indigoDeeper }}>Causality assessment (WHO-UMC)</span>
      </div>

      {drugs.length > 1 && (
        <Field label="Suspect medicine">
          <Select value={drugId} onChange={(e) => setDrugId(e.target.value)}>
            {drugs.map((d) => <option key={d.id} value={d.id}>{d.name || "Unnamed medicine"}</option>)}
          </Select>
        </Field>
      )}
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Timing consistent with this medicine?">
          <Select value={temporal} onChange={(e) => setTemporal(e.target.value)}>
            <option value="">Select…</option>
            <option value="yes">Yes, plausible timing</option>
            <option value="no">No, timing doesn't fit</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>
        <Field label="Could disease or another drug explain it?">
          <Select value={altExplanation} onChange={(e) => setAltExplanation(e.target.value)}>
            <option value="">Select…</option>
            <option value="no">No clear alternative</option>
            <option value="possibly">Possibly</option>
            <option value="yes">Yes, plausible alternative</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-4">
        <Field label="Response to stopping the medicine (dechallenge)">
          <Select value={dechallenge} onChange={(e) => setDechallenge(e.target.value)}>
            <option value="">Select…</option>
            <option value="improved">Reaction improved</option>
            <option value="no_improvement">No improvement</option>
            <option value="not_applicable">Not applicable / not stopped</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>
        <Field label="Response to restarting the medicine (rechallenge)">
          <Select value={rechallenge} onChange={(e) => setRechallenge(e.target.value)}>
            <option value="">Select…</option>
            <option value="recurred">Reaction recurred</option>
            <option value="did_not_recur">Did not recur</option>
            <option value="not_done">Not done</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>
      </div>

      {result && cat && (
        <div className="rounded-md border p-3 mt-1 mb-3" style={{ background: cat.soft, borderColor: cat.border }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "white", color: cat.color, border: `1px solid ${cat.border}` }}>
              {result.category}
            </span>
          </div>
          <p className="text-[12.5px] leading-relaxed" style={{ color: cat.color }}>{result.rationale}</p>
        </div>
      )}
      {!result && (
        <p className="text-[12px] text-[#94A3B8] mt-1 mb-3">Answer the timing and alternative-explanation questions above to get a suggested WHO-UMC category.</p>
      )}

      <div className="pt-1 border-t" style={{ borderColor: C.border }}>
        {aiState === "idle" && (
          <button onClick={askAI} className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: C.violetDeep }}>
            <Sparkles size={13} /> Get an AI second opinion
          </button>
        )}
        {aiState === "loading" && (
          <div className="mt-3 flex items-center gap-1.5 text-[12px]" style={{ color: C.violetDeep }}><Sparkles size={13} className="animate-pulse" /> Thinking…</div>
        )}
        {aiState === "error" && (
          <div className="mt-3 text-[12px]" style={{ color: C.rose }}>Couldn't reach the AI service just now. <button onClick={askAI} className="underline">Try again</button></div>
        )}
        {aiState === "ready" && (
          <div className="mt-3 rounded-md p-3 text-[12.5px] leading-relaxed border" style={{ background: C.violetSoft, color: C.violetDeep, borderColor: C.violetBorder }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ background: C.violetDeep }}>
                <AlertTriangle size={11} /> AI opinion — not a determination
              </span>
              <button onClick={askAI} className="text-[11.5px] font-medium underline shrink-0">Ask again</button>
            </div>
            {aiOpinion}
            <p className="text-[10.5px] mt-2 pt-2 border-t" style={{ borderColor: C.violetBorder, opacity: 0.85 }}>
              Generated by AI for comparison only. It has not reviewed source records or spoken to anyone involved —
              a qualified clinician must make the actual causality determination.
            </p>
          </div>
        )}
      </div>
      <p className="text-[10.5px] text-[#B3BDC9] mt-3">Simplified decision aid based on WHO-UMC criteria — not a substitute for a qualified clinician's judgement.</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.13em] text-[#64748B] mb-1">{title}</div>
      {children}
    </div>
  );
}
