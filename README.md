# EduNest — Institutional School Operating System

<div align="center">
  <img src="apps/web/public/edunest-logo.png" alt="EduNest Logo" width="160" />
  <h3>Enterprise Multi-Tenant Operating System for Educational Institutions</h3>
  <p>Local-First Offline Resilience · Continuous Assessment Broadsheets · CBT Exam Suite · Automated Bursary Reconciliation</p>

  [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
  [![Aiven MySQL](https://img.shields.io/badge/Database-Aiven%20MySQL-blue)](https://aiven.io/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
</div>

---

## 🏛️ System Architecture

EduNest is an enterprise-grade monorepo engineered for high security, offline resilience, and multi-tenant isolation:

```
EDUNEST/
├── apps/
│   ├── api/                  # NestJS 10 REST API · Prisma ORM · Swagger OpenAPI
│   │   ├── prisma/           # Database Schema (Multi-Tenant MySQL) & Migrations
│   │   └── src/              # Academic, Finance, CBT, SuperAdmin, HR, Library Modules
│   └── web/                  # React 18 · Vite · TailwindCSS · Offline IndexedDB
│       ├── public/           # Logo Assets, Favicons, PWA Manifest
│       └── src/              # Pages, SuperAdmin Console, Broadsheets, Portals
├── render.yaml               # Render Blueprint (API Web Service + SPA Static Site)
├── DEPLOYMENT.md             # Complete Aiven MySQL & Render Cloud Guide
└── README.md
```

---

## 🌟 Key Capabilities

1. **Continuous Assessment (CA) Broadsheets & Transcripts**:
   - Automated formula scoring: Test 1 + Test 2 + Midterm + Final Exams.
   - Dynamic class rank calculation, grade point averages, and instant PDF report cards.
2. **Local-First Offline Resilience**:
   - Class attendance, CBT tests, and score entry work seamlessly offline in low-connectivity areas.
   - Automatic delta sync with zero data loss once internet is restored.
3. **Automated Bursary & Paystack Settlement**:
   - Termly fee schedules, early payment discounts, automated invoice generation.
   - Paystack and bank transfer payment reconciliation with cryptographic receipts.
4. **CBT Examination Engine**:
   - Anti-cheating browser focus locks, randomized question pools, timed submissions, and auto-grading.
5. **Root SaaS Platform Governance**:
   - Dedicated SuperAdmin console to approve new institutions, manage subscription plans, inspect global payments, recruit affiliate marketers, and broadcast announcements.

---

## 🚀 Portals & Default Credentials

| Portal | URL Route | Default Credentials | Description |
| :--- | :--- | :--- | :--- |
| **Landing Page** | `/` | *Public* | Minimalist marketing & pilot onboarding |
| **Platform SuperAdmin** | `/super-admin/login` | `admin@schoolerp.com` / `password123` | Platform oversight, pricing, school approvals |
| **School Admin Portal** | `/login` | `admin@demo.school` / `Admin@123` | Master academic & financial operations |
| **Teacher Portal** | `/login` | `teacher@demo.school` / `Teacher@123` | Classroom attendance, CA scores, timetable |
| **Student / Parent** | `/login` | `student@demo.school` / `Student@123` | Termly broadsheet, tuition payments |
| **Affiliate Marketers** | `/marketer/login` | *Partner Account* | Referral links, signups, and commission logs |
| **Interactive API Docs** | `/api/docs` | *Public / Bearer* | Swagger OpenAPI 3.0 specification |

---

## ☁️ 1-Click Deployment (Render + Aiven MySQL)

EduNest is ready for cloud deployment using **Render Blueprints** and **Aiven Managed MySQL**:

1. **Create Database on Aiven**:
   - Provision a MySQL service on [Aiven.io](https://console.aiven.io/).
   - Copy your Service URI: `mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED`.
2. **Deploy on Render**:
   - Fork or push this repository to GitHub: `https://github.com/Al-Ahotanee/EDUNEST`.
   - In Render Dashboard, click **New +** -> **Blueprint**.
   - Select this repository.
   - Provide your `DATABASE_URL` from Aiven.
   - Click **Apply**!
3. Detailed instructions are in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 💻 Local Development

### 1. Backend API
```bash
cd apps/api
npm install
# Configure your local or Aiven MySQL in .env
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run start:dev
```

### 2. Frontend Web
```bash
cd apps/web
npm install
npm run dev
```

---

## 📄 License
MIT © EduNest Platform Team. Fully NDPR and ISO 27001 Security Compliant.
