# 📜 LeetVerse — Minutes of Meeting (MOM) Generator & Executive Portal

A client-side executive application for **LeetVerse** that combines **Firebase Authentication**, **Google Sheets API Roster Synchronization**, **In-Memory Delegation Management**, and a **Multi-Page Vector/Canvas PDF Export Engine**.

---

## ⚡ Technical Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LeetVerse MOM Client UI                         │
│             (Vanilla ES6+ • CSS Grid/Flexbox • Emerald Theme)          │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Firebase Auth & Identity       │  │  Page Layout Budget Engine   │
│  • Google OAuth Popup (@kiit.ac.in)  │  │  • Block Height Estimator    │
│  • Token Verification via Backend    │  │  • 1-Page / 2-Page / 3-Page  │
│  • Role Scoping: Exec | Lead | Del   │  │  • Zero-Overlap Calculations │
└───────────────────┬──────────────────┘  └──────────────┬───────────────┘
                    │                                    │
                    ▼                                    ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│      Google Sheets Roster Sync       │  │   Dual-Engine PDF Exporter   │
│  • Live Attendance Checklist         │  │  • Engine A: html2canvas 2x  │
│  • Instant Search & Select All/Clear │  │  • Engine B: Native jsPDF    │
│  • Dry-Run Simulation & Confirms     │  │  • Official 180 DPI Branding │
│  • Atomic Attendance Recording       │  │  • Multi-Page Page Numbering │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 🚀 Key Technical Features

### 1. Dynamic Page-Budget Engine (Zero-Overlap Algorithm)
* **The Problem**: Meeting documents fluctuate in length from short 1-page domain synopses to lengthy multi-page society meetings. Naive CSS print engines often clip text or break sections awkwardly across page borders.
* **The Solution**: An in-browser pixel budget calculator (`estimateBlockHeight`, `estimateAttendanceHeight`, `estimateMetaTableHeight`):
  * **Page 1 Target**: 820px usable height budget.
  * **Subsequent Pages**: 920px usable budget.
  * **Smart Partitioning**: Automatically calculates whether discussion, action items, and sign-off blocks fit on Page 1 or dynamically split into Page 2 or Page 3 without overflowing top and bottom brand letterheads.

### 2. Dual-Engine High-DPI PDF Exporter
* **Engine A: Exact DOM Replica (`html2canvas` + `jsPDF`)**:
  * Captures live preview DOM nodes at **2x resolution** (`scale: 2`), applying high-quality JPEG compression (`quality: 0.84`) to produce razor-sharp 300+ DPI A4 documents while keeping total file size compact (~150KB per page).
* **Engine B: Native Vector Fallback (`jsPDF`)**:
  * If DOM rasterization is unsupported or canvas permissions are restricted, the exporter falls back to a clean vector typography pipeline with downsampled 180 DPI official letterheads (`first-page.png` and `other-pages.png`).

### 3. Role-Based Identity & Dynamic Scoping
* **Firebase Authentication (Compat SDK)**: Integrates Google sign-in requiring verified KIIT accounts (`@kiit.ac.in`).
* **Automated Scoping via `/mom/me`**:
  * **Executives**: Automatically unlock all 9 society domains plus the **"General (Whole Society)"** mode for universal meetings.
  * **Leads**: Locked strictly to their assigned primary domain tab.
  * **Delegates**: Granted temporary operational authority with a live countdown banner indicating delegation expiration.
* **Auto-Filled Sign-off**: The `Prepared By` field is locked and auto-populated from the verified Google account.

### 4. Live Roster Attendance Checklist
* **Spreadsheet Sync**: Replaces free-text attendance inputs with a live checklist fetched directly from the domain's Google Sheet tab via `/mom/roster`.
* **Interactive Tooling**: Real-time member search, **Select All**, **Clear**, and a live present/total counter.
* **Instant Pill Translation**: Selected rolls are immediately compiled into emerald attendee badges in the live document preview.

### 5. Pre-flight Simulation & Attendance Recording
* **Dry-Run Validation**: Clicking **Update Attendance** triggers a `dryRun: true` pre-flight check to verify row keys and duplicate states before modifying any sheets.
* **Confirmation Modal**: Presents a comprehensive summary (date, scope, present/absent count, conflict warnings) and lets executives toggle `skipConflicts` when recording multi-tab general meetings.

### 6. In-Memory Delegation Control Center
* Leads and executives can grant time-bounded operational authority (from 6 hours to 7 days) to any student listed in their domain's roster.
* Displays an active delegations table with remaining validity and one-click revocation.

### 7. Zero-Network Environment Compilation (`generate-config.js`)
* Eliminates vulnerable runtime browser calls to `/.env`.
* A lightweight Node.js script reads `.env` and compiles runtime settings into [`config.js`](config.js), keeping credentials decoupled and safely ignored by Git.

---

## 🛠️ Project Structure

```
LEETVERSE-MOM-GENERATOR-/
├── IMAGES/
│   ├── first-page.png          # Official first-page A4 letterhead banner
│   ├── other-pages.png          # Minimal header for subsequent pages
│   └── leetverse-logo.jpg       # Brand logo
├── index.html                   # Semantic markup, auth overlays & preview canvas
├── style.css                    # Emerald theme, A4 viewport styles & print queries
├── script.js                    # Reactive document builder, auth flow & PDF exporter
├── generate-config.js           # CLI compiler: .env -> config.js
├── config.js                    # Generated runtime configuration (Git ignored)
├── config.example.js            # Frontend configuration template
├── .env.example                 # Environment reference
├── .gitignore                   # Security ignore rules
└── package.json                 # Dev scripts
```

---

## 💻 Getting Started

### 1. Configure Environment
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Update your `.env` with your backend URL and Firebase Web credentials:
```ini
MOM_API_BASE=http://localhost:5000/mom
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=leetverse-website.firebaseapp.com
FIREBASE_PROJECT_ID=leetverse-website
FIREBASE_STORAGE_BUCKET=leetverse-website.appspot.com
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

### 2. Run Local Development Server
Compile `config.js` and start the server:
```powershell
npm run dev
```
Open **`http://localhost:5500`** in your browser.

---

## 👥 Contributors

* **Sreshna Patra** | Roll No: `2547007`
* **Abhishek Raj**  | Roll No: `25051469`
