# TriageVoice AI 🩺🎙️
> **Real-Time Voice-Driven Emergency Medical Triage & Clinical Handoff Engine**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646cff.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)
[![FHIR](https://img.shields.io/badge/FHIR-R4_Compliant-orange.svg)](https://hl7.org/fhir/R4/)
[![Tests](https://img.shields.io/badge/Tests-53_Passing-brightgreen.svg)]()

> ⚠️ **DISCLAIMER: PROTOTYPE ONLY — NOT FOR REAL CLINICAL USE**
> TriageVoice AI is an investigational software prototype designed for demonstration and simulation purposes. It is **not** an FDA/CE-cleared medical device and must never be used to make diagnostic or treatment decisions in real patients.

---

## 1. Product Vision & Problem Statement

Pre-hospital emergency handoffs (from paramedic or EMT to emergency department receiving staff) are high-stress, rapid, and prone to communication lapses or lost critical data.

**TriageVoice AI** provides emergency responders with a real-time, voice-assisted intake workflow:
1. **Voice or Scenario Input**: The responder speaks a structured or natural-language handoff into the browser microphone or selects one of the 4 clinical benchmark scenarios.
2. **Clinical Fact Extraction (Gemma 4: gemma-4-26b-a4b-it)**: Generates structured clinical data without hallucinations:
   - Patient demographics (synthetic ID, estimated age, gender)
   - Chief complaint & history of present illness
   - Standardized vitals (Heart rate, Blood Pressure systolic/diastolic, SpO2, Respiratory Rate, Temperature)
   - Clinical history, known allergies, current medications, and pre-hospital interventions
   - Unverified urgency category suggestion (ESI 1–5 simulation)
3. **Automated Safety Rules & Validation**: Deterministic physiological plausibility rules flag conflicting or dangerous vitals (e.g. Diastolic ≥ Systolic, critically low SpO2, narrow pulse pressure).
4. **Mandatory Human-in-the-Loop Review**: Clinical staff must review and explicitly select a validated triage category before dispatch is permitted.
5. **Standardized FHIR R4 Dispatch**: Converts confirmed intakes into standard HL7 FHIR R4 transaction bundles (`Patient`, `Encounter`, `Condition`, `Observation` with LOINC & UCUM codes) and dispatches them to receiving hospital emergency systems.

---

## 2. System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          TriageVoice AI                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   [ Client Browser ]                                                   │
│   ├── Voice-to-Text (Real-Time Web Speech API + Audio Transcription)  │
│   ├── Responsive Clinical UI (Tailored Modern Dark/Light Theme)       │
│   ├── Vital Cards with Visual Confidence & Source Flags                │
│   ├── Mandatory Review & Confirmation Modal                            │
│   └── Simulated Hospital Dashboard (FHIR Bundle Inspector)             │
│            │                                                           │
│            ▼ HTTP / REST (/api)                                        │
│                                                                        │
│   [ Express Backend ]                                                  │
│   ├── POST /api/triage/transcribe (Audio file / buffer speech-to-text) │
│   │     ├── Google GenAI Voice Transcription                           │
│   │     └── Simulated Clinical Handoff Audio Transcripts (Demo Mode)   │
│   ├── POST /api/triage/extract (Clinical data extraction)              │
│   │     ├── Gemma 4 (gemma-4-26b-a4b-it) Extraction Engine             │
│   │     └── Deterministic Fallback Fixtures (Demo Mode)                │
│   ├── GET  /api/triage/intakes & PATCH /api/triage/intakes/:id         │
│   ├── POST /api/triage/intakes/:id/confirm (Human review sign-off)     │
│   │     └── Safety Rules Engine (Physiological plausibility checks)    │
│   ├── POST /api/triage/intakes/:id/dispatch (Guarded FHIR generation)  │
│   │     └── FHIR R4 Service (LOINC & UCUM standardized bundle)         │
│   └── GET  /api/mock-fhir/records (Hospital receiving queue)           │
│                                                                        │
│   [ Shared Module: @triagevoice/shared ]                               │
│   └── Zod schemas, TypeScript types, validation contracts              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Clinical & Safety Features

### 🛡️ Safety Engine & Plausibility Validation
The deterministic safety engine validates vital signs against clinical plausibility thresholds:
- **Implausible Blood Pressure**: Flags if `Diastolic >= Systolic` (blocks confirmation).
- **Narrow Pulse Pressure**: Flags if `Systolic - Diastolic < 20 mmHg` (haemodynamic compromise warning).
- **Oxygen Saturation**: Critical alert for SpO2 ≤ 88%; warning for 89–92%; blocks if outside 50–100%.
- **Heart Rate**: Critical alert for HR ≤ 40 or ≥ 180 bpm; blocks if outside 30–250 bpm.
- **Respiratory Rate**: Critical alert for RR ≤ 8 or ≥ 40 breaths/min.
- **Missing Vital Checks**: Informative flags when key vitals were not stated in the handoff.

### 🧑‍⚕️ Mandatory Human-in-the-Loop Gate
- The AI's suggested triage category is labeled **UNVERIFIED SUGGESTION**.
- The backend API **rejects dispatch with HTTP 422** if an intake has not been formally reviewed and confirmed by a clinician.
- Clinicians must pick an explicit triage category (`Immediate`, `Emergent`, `Urgent`, `Less-Urgent`, `Non-Urgent`).

### 📦 HL7 FHIR R4 Interoperability
When dispatched, the intake compiles into a valid FHIR R4 Bundle containing:
- **Patient**: Synthetic identifier, estimated age/birthDate, gender.
- **Encounter**: Status `in-progress`, class `EMER` (Emergency), ESI triage category extension.
- **Condition**: Chief complaint mapped to clinical finding.
- **Observation** entries:
  - Heart Rate: LOINC `8867-4`, unit `bpm`
  - Blood Pressure (Systolic & Diastolic components): LOINC `85354-9`, unit `mmHg`
  - Oxygen Saturation: LOINC `2708-6`, unit `%`
  - Respiratory Rate: LOINC `9279-1`, unit `/min`
  - Body Temperature: LOINC `8310-5`, unit `Cel`

---

## 4. Quickstart Guide

### Prerequisites
- **Node.js** >= 20.0
- **npm** >= 10.0

### Step 1: Clone and Install
```bash
git clone https://github.com/yashr5120/Med-triage.git
cd Med-triage
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
# Windows PowerShell
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Configuration variables in `.env`:
```env
# Optional: Provide Google Gemini API Key for live AI extraction
GEMINI_API_KEY=

# Model to use for clinical extraction (default: gemma-4-26b-a4b-it)
GEMMA_MODEL=gemma-4-26b-a4b-it

# Transcription model for voice-to-text processing (default: gemini-2.0-flash)
TRANSCRIBE_MODEL=gemini-2.0-flash

# Backend server port
PORT=8080

# Demo mode (automatically forced to true if GEMINI_API_KEY is empty)
DEMO_MODE=true

# Frontend dev server port
VITE_PORT=5173
VITE_API_URL=http://localhost:8080
```

### Step 3: Run Development Servers
```bash
npm run dev
```
This runs both:
- **Backend API**: `http://localhost:8080`
- **Frontend App**: `http://localhost:5173`

---

## 5. Running Tests & Verifications

The workspace includes a test suite covering safety rules, FHIR bundling, API endpoints, and client format utilities:

```bash
# Run all vitest suites (server + client)
npm test

# Run TypeScript typechecks across all packages
npm run typecheck

# Build all packages for production
npm run build
```

### Test Coverage Highlights:
- **`safetyRules.test.ts` (19 tests)**: Plausible and implausible vital boundaries, narrow pulse pressure, missing fields, blocking vs warning behavior.
- **`fhirService.test.ts` (12 tests)**: FHIR R4 Bundle structure, LOINC code mappings, null vital omission, dispatch preconditions.
- **`api.test.ts` (16 tests)**: Supertest HTTP integration for health checks, scenario extraction, safety alert generation, confirmation enforcement, and dispatch guard.
- **`format.test.ts` (6 tests)**: Client-side badges, triage category formats, and CSS class mappings.

---

## 6. End-to-End Demo Walkthrough

### Scenario 1: Respiratory Distress (Critical / Immediate)
1. Open `http://localhost:5173` in your browser.
2. Click **New Intake** in the navigation sidebar.
3. Select **Respiratory Distress** from the preset scenarios.
4. The transcript will populate with a handoff describing a 58-year-old male with severe dyspnea, SpO2 84%, and history of COPD.
5. Click **Extract Clinical Data**.
6. On the **Intake Review** page:
   - Notice SpO2 is highlighted in red (Critically Low - 84%).
   - Notice safety alert banner flags respiratory failure risk.
   - Click **Confirm & Validate Intake**, set category to **Immediate (ESI 1-sim)**, and confirm.
   - Click **Dispatch to Hospital (FHIR)**.
7. Open **Hospital Dashboard** in the sidebar:
   - Observe the arriving handoff card for the patient.
   - Click to inspect the 6 generated FHIR R4 resources (Patient, Encounter, Condition, Observations).

### Scenario 2: Incomplete Handoff (Safety Alert Demonstration)
1. In **New Intake**, select **Incomplete Handoff**.
2. Notice the handoff is missing blood pressure, heart rate, and patient age.
3. Click **Extract Clinical Data**.
4. Observe the Review page:
   - Vital cards display `MISSING` badges.
   - Safety checks provide informational prompts for missing vitals.
   - Manually enter or edit the missing values before confirming and dispatching.

---

## 7. Project Structure

```text
Med-triage/
├── package.json              # Monorepo root workspace configuration
├── .env.example              # Environment variables template
├── shared/                   # Shared TypeScript models and Zod schemas
│   ├── package.json
│   └── src/
│       ├── index.ts          # Module export root
│       └── schemas.ts        # TriageIntake, Vitals, Alerts, FHIR schemas
├── server/                   # Node.js + Express backend
│   ├── package.json
│   ├── vitest.config.ts
│   ├── src/
│   │   ├── app.ts            # Express application setup & middleware
│   │   ├── config.ts         # Environment settings
│   │   ├── index.ts          # Server entry point
│   │   ├── data/             # Benchmark scenarios & mock fixtures
│   │   ├── routes/           # REST endpoints (/triage, /mock-fhir, /health)
│   │   ├── services/         # Gemma AI, Safety Rules, FHIR R4 services
│   │   └── store/            # In-memory intake & FHIR storage
│   └── tests/                # Vitest unit & integration test suites
└── client/                   # React 19 + Vite frontend
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── App.tsx           # Router and root layout
        ├── index.css         # Clinical UI design system & CSS variables
        ├── components/       # Reusable UI (Sidebar, Badges, Modals)
        ├── pages/            # Dashboard, NewIntake, IntakeReview, Hospital, Settings
        ├── services/         # Typed API client
        └── test/             # Frontend Vitest suites
```

---

## 8. License

This prototype is distributed for educational and demonstration purposes. See project documentation for further details.
