# EduNest — Production Deployment Guide

This guide covers deploying **EduNest (School Operating System)** to **Render** using **Render Blueprints (`render.yaml`)** and **Aiven for MySQL** as the managed cloud database.

---

## 🏛️ Architecture Overview

```
                        ┌────────────────────────┐
                        │      End Users /       │
                        │  Parents, Staff, Admin │
                        └───────────┬────────────┘
                                    │ HTTPS
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             Render Static Site (edunest-web)           │
       │     Vite React SPA · TailwindCSS · Lucide Icons        │
       │           https://edunest-web.onrender.com             │
       └────────────────────────────┬───────────────────────────┘
                                    │ REST / JWT
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             Render Web Service (edunest-api)           │
       │     NestJS · Fastify / Express · Swagger Docs          │
       │           https://edunest-api.onrender.com             │
       └────────────────────────────┬───────────────────────────┘
                                    │ TLS / SSL Required
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             Aiven for MySQL (Managed Database)         │
       │  Dedicated Cloud Instance · Automated Backups · SSL   │
       │   mysql://avnadmin:...@...aivencloud.com:port/defaultdb│
       └────────────────────────────────────────────────────────┘
```

---

## Step 1: Provision Cloud Database on Aiven (MySQL)

1. Sign up or log into [Aiven Console](https://console.aiven.io/).
2. Click **Create Service**.
3. Select **MySQL**.
4. Choose your cloud provider & region (e.g. AWS or Google Cloud in Frankfurt `eu-central-1` to match Render Frankfurt for ultra-low latency).
5. Select your plan:
   - For evaluation/testing: **Free plan** or **Startup-4**.
   - For institutional production: **Business-4** (High Availability replica).
6. Give the service a name, e.g. `edunest-production-db`, and click **Create Service**.
7. Once the service state is **RUNNING**, navigate to the **Overview** tab:
   - Copy the **Service URI** (looks like: `mysql://avnadmin:p4ssw0rd@mysql-xxxxx.aivencloud.com:12345/defaultdb`).
   - Append `?ssl-mode=REQUIRED` to the connection string:
     ```text
     mysql://avnadmin:YOUR_PASSWORD@mysql-xxxxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
     ```
   > 🔒 **SSL Mode**: Aiven requires encrypted TLS connections. Prisma handles this natively when `?ssl-mode=REQUIRED` is present in the `DATABASE_URL`.

---

## Step 2: Deploy to Render via Blueprint

The repository contains a pre-configured `render.yaml` blueprint defining both the backend API and the frontend SPA.

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top navigation and select **Blueprint**.
3. Connect your GitHub account and select the **`Al-Ahotanee/EDUNEST`** repository.
4. Render will automatically detect `render.yaml` and parse two services:
   - **`edunest-api`** (Web Service, Node)
   - **`edunest-web`** (Static Site)
5. Fill in the requested Environment Variables:
   - `DATABASE_URL`: Paste your Aiven MySQL Service URI with `?ssl-mode=REQUIRED`.
   - `SUPER_ADMIN_PASSWORD`: Choose a strong password (defaults to `password123` if left blank).
   - `PAYSTACK_SECRET_KEY`: (Optional) Your live Paystack Secret Key for tuition settlement.
   - `PAYSTACK_PUBLIC_KEY`: (Optional) Your live Paystack Public Key.
6. Click **Apply**.
7. Render will build both services:
   - The API will run `prisma migrate deploy` to create all database schemas and tables on Aiven.
   - The web app will compile static assets with zero errors.

---

## Step 3: Seed Database & Platform SuperAdmin

To seed initial tariff packages, demo schools, and master SuperAdmin roles:

### Option A: From Render Shell (Recommended)
1. In Render Dashboard, click into **`edunest-api`**.
2. Select **Shell** from the left tab.
3. Run:
   ```bash
   cd apps/api && npm run prisma:seed
   ```
4. This seeds:
   - Root Platform SuperAdmin: `admin@schoolerp.com` / `password123`
   - Default SaaS Plans (Basic, Standard, Premium, Enterprise)
   - Demo School: *Crown Crest International College*

### Option B: Local Migration to Aiven
You can also run migrations directly from your local terminal against your Aiven database:
```bash
cd apps/api
set DATABASE_URL="mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED"
npx prisma migrate deploy
npm run prisma:seed
```

---

## Step 4: Accessing the Deployed Application

Once the deployment completes:

| Portal | URL | Default Credentials |
| :--- | :--- | :--- |
| **Landing Page** | `https://edunest-web.onrender.com/` | Public |
| **Platform SuperAdmin** | `https://edunest-web.onrender.com/super-admin/login` | `admin@schoolerp.com` / `password123` |
| **School Admin Portal** | `https://edunest-web.onrender.com/login` | `admin@demo.school` / `Admin@123` |
| **Teacher Portal** | `https://edunest-web.onrender.com/login` | `teacher@demo.school` / `Teacher@123` |
| **Student / Parent** | `https://edunest-web.onrender.com/login` | `student@demo.school` / `Student@123` |
| **Affiliate Marketers** | `https://edunest-web.onrender.com/marketer/login` | Registered Marketer Account |
| **Interactive API Docs** | `https://edunest-api.onrender.com/api/docs` | Swagger Open API Specification |

---

## Step 5: Custom Domain Configuration (Optional)

1. In Render Dashboard, select **`edunest-web`** -> **Settings** -> **Custom Domains**.
2. Add your root or subdomain (e.g. `app.edunest.ng`).
3. Point your DNS CNAME record to the Render alias provided.
4. Render provisions a free automated Let's Encrypt SSL certificate.

---

## 🛠️ Verification Checklist

- [x] **Database Connectivity**: Verified via Prisma with TLS 1.3 `ssl-mode=REQUIRED`.
- [x] **CORS Origins**: Configured in `apps/api/src/main.ts` with wildcard fallback and `FRONTEND_URL`.
- [x] **SPA Routing**: Configured in `render.yaml` with rewrite `/* -> /index.html`.
- [x] **Zero Build Warnings**: TypeScript builds compile with exit code `0`.
- [x] **Offline Cache Support**: Local-first IndexedDB synchronization enabled for spotty connectivity.
