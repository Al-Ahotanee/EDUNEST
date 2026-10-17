# 🏫 SchoolOS — Enterprise School ERP System

A production-ready, multi-tenant enterprise ERP system for nursery, primary, and secondary schools.  
Built with **NestJS + Prisma + MySQL** (backend) and **React + Vite + TailwindCSS** (frontend).

---

## 🚀 Tech Stack

| Layer         | Technology                                              |
|---------------|--------------------------------------------------------|
| Frontend      | React 18, Vite, TypeScript, TailwindCSS, TanStack Query |
| UI Components | Shadcn-inspired custom component library               |
| State         | Zustand (auth), TanStack Query (server state)          |
| Forms         | React Hook Form + Zod validation                       |
| Charts        | Recharts                                               |
| Backend       | NestJS, TypeScript, Prisma ORM                         |
| Database      | MySQL 8 (cloud), IndexedDB/Dexie (offline local)       |
| Auth          | JWT + Refresh Tokens + RBAC                            |
| Offline Sync  | Dexie.js + Background Sync + Custom Sync Engine        |
| DevOps        | Docker, Docker Compose, Nginx, GitHub Actions          |

---

## 📁 Project Structure

```
school-erp/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/           # JWT auth, login, register, refresh
│   │   │   ├── academic/       # Sessions, terms, classes, subjects
│   │   │   ├── attendance/     # Bulk mark, history, statistics
│   │   │   ├── cbt/            # CBT exams, question bank
│   │   │   ├── common/         # Guards, decorators, filters, DTOs
│   │   │   ├── finance/        # Invoices, payments, fee structures
│   │   │   ├── health/         # Health records, clinic visits
│   │   │   ├── hostel/         # Room allocation, hostel management
│   │   │   ├── hr/             # Staff, departments, leave, payroll
│   │   │   ├── inventory/      # Assets, stock management
│   │   │   ├── library/        # Books, borrowing, returns
│   │   │   ├── notifications/  # Push, email, SMS notifications
│   │   │   ├── prisma/         # Prisma service
│   │   │   ├── reports/        # Analytics and reporting
│   │   │   ├── results/        # Score entry, grading, report cards
│   │   │   ├── schools/        # School/tenant management
│   │   │   ├── students/       # Student CRUD, guardians, enrollment
│   │   │   ├── timetable/      # Class schedules
│   │   │   └── users/          # User management
│   │   └── prisma/
│   │       ├── schema.prisma   # Complete 40+ table schema
│   │       └── seed.ts         # Demo data seeder
│   │
│   └── web/                    # React Frontend
│       └── src/
│           ├── components/
│           │   ├── layout/     # Sidebar, Topbar, AppLayout
│           │   ├── shared/     # OfflineBanner, SyncIndicator
│           │   └── ui/         # Button, Input, DataTable, Modal, etc.
│           ├── lib/
│           │   ├── syncEngine.ts  # Offline-first sync engine
│           │   └── utils.ts       # Helpers, formatters
│           ├── pages/
│           │   ├── auth/       # Login, Register
│           │   ├── academic/   # Sessions, classes, subjects
│           │   ├── attendance/ # Mark & history
│           │   ├── dashboard/  # KPI dashboard with charts
│           │   ├── finance/    # Invoices, payments, fee structures
│           │   ├── hr/         # Staff, leave, payroll
│           │   ├── reports/    # Analytics dashboard
│           │   ├── results/    # Score entry, report cards
│           │   ├── settings/   # School profile, security
│           │   └── students/   # Student management
│           ├── services/
│           │   └── api.ts      # Axios API client, all endpoints
│           └── store/
│               └── authStore.ts  # Auth state (Zustand + persist)
│
├── docker/
│   └── nginx/nginx.conf        # Reverse proxy config
├── .github/workflows/ci-cd.yml # GitHub Actions CI/CD
├── docker-compose.yml          # Full stack compose
├── .env.example                # Environment template
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8+
- Redis (for queues)
- Docker & Docker Compose (for containerized setup)

---

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/yourorg/school-erp.git
cd school-erp
cp .env.example .env
# Edit .env with your secrets

# 2. Start all services
docker-compose up -d

# 3. Run migrations and seed
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx prisma db seed

# App is running at:
#   Web:    http://localhost:80
#   API:    http://localhost:3000
#   Docs:   http://localhost:3000/api/docs
#   MinIO:  http://localhost:9001
```

---

### Option B — Local Development

```bash
# 1. Install dependencies
npm install
cd apps/api && npm install
cd ../web && npm install

# 2. Configure environment
cp .env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL, JWT_SECRET, etc.

# 3. Setup database
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed

# 4. Start API (terminal 1)
cd apps/api
npm run start:dev

# 5. Start Web (terminal 2)
cd apps/web
echo "VITE_API_URL=http://localhost:3000/api/v1" > .env
npm run dev
```

---

## 🔑 Demo Credentials

| Role        | Email                  | Password    |
|-------------|------------------------|-------------|
| Super Admin | admin@demo.com         | password123 |
| Teacher     | teacher@demo.com       | password123 |

**Tenant Slug:** `demo-school`

---

## 📱 Implemented Modules

### ✅ Fully Implemented
| Module        | Backend API | Frontend UI | Offline Support |
|---------------|-------------|-------------|-----------------|
| Authentication | ✅ | ✅ | ✅ |
| Dashboard     | ✅ | ✅ | — |
| Students      | ✅ | ✅ | ✅ |
| Academic      | ✅ | ✅ | — |
| Attendance    | ✅ | ✅ | ✅ |
| Results       | ✅ | ✅ | ✅ |
| Finance       | ✅ | ✅ | ✅ |
| HR & Staff    | ✅ | ✅ | — |
| Reports       | ✅ | ✅ | — |
| Settings      | ✅ | ✅ | — |

### 🔄 Backend Ready, Frontend Placeholder
| Module     | Backend API | Frontend |
|------------|-------------|----------|
| CBT Exams  | ✅ Partial  | Placeholder |
| Library    | ✅ Partial  | Placeholder |
| Hostel     | ✅ Partial  | Placeholder |
| Health     | ✅ Partial  | Placeholder |
| Inventory  | ✅ Partial  | Placeholder |
| Timetable  | ✅ Partial  | Placeholder |

---

## 🏛️ Architecture

### Multi-Tenant
Every school is a **Tenant** with complete data isolation. All queries are scoped by `tenantId` and `schoolId`.

### Offline-First
The web app uses **IndexedDB (Dexie.js)** as a local cache. All write operations are queued and synced automatically when internet is restored. Conflict resolution uses **last-write-wins** with timestamp tracking.

### RBAC
12 system roles with granular permission control across 18 modules × 6 actions = 108 permissions.

---

## 🔒 Security

- JWT with 15-minute access tokens + 7-day refresh tokens
- Bcrypt password hashing (salt rounds: 12)
- Helmet.js for HTTP security headers
- Rate limiting (100 req/min per IP)
- Tenant isolation on all database queries
- Audit logs for all write operations
- CORS, XSS, SQL injection protection via Prisma ORM

---

## 📊 API Documentation

Swagger UI available at: `http://localhost:3000/api/docs`

Key endpoint groups:
- `/api/v1/auth` — Authentication
- `/api/v1/students` — Student management
- `/api/v1/academic` — Sessions, classes, subjects
- `/api/v1/attendance` — Attendance tracking
- `/api/v1/results` — Results and report cards
- `/api/v1/finance` — Invoices and payments
- `/api/v1/hr` — Staff and payroll
- `/api/v1/reports` — Analytics

---

## 🚢 Production Deployment

### VPS Setup (Ubuntu 22.04)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone and deploy
git clone https://github.com/yourorg/school-erp.git /opt/school-erp
cd /opt/school-erp
cp .env.example .env
nano .env  # Set production secrets

docker-compose -f docker-compose.yml up -d
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx prisma db seed
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
# Update nginx.conf with SSL paths
docker-compose restart nginx
```

---

## 🗺️ Roadmap

### Phase 2 (Next)
- [ ] CBT full implementation (question bank, auto-grading, timers)
- [ ] Library management full UI
- [ ] Hostel management full UI
- [ ] WhatsApp notification integration
- [ ] Paystack/Flutterwave payment gateway

### Phase 3 (Future)
- [ ] React Native mobile app
- [ ] Electron desktop app (Windows offline)
- [ ] AI academic analytics
- [ ] Biometric attendance integration
- [ ] WAEC/NECO result integration
- [ ] Blockchain certificate verification

---

## 📄 License

MIT — © 2025 NextGen IT Solutions, Jigawa State, Nigeria.  
Built by **Shafiu Garba Waziri** — Principal Software Engineer.
