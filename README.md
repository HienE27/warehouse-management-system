# Warehouse Management System (WMS)

Full-stack **Warehouse Management System** built with **Spring Boot microservices** and **Next.js**. The system covers products, suppliers, customers, **import/export warehouse slips**, stock tracking, orders, and **AI-assisted** workflows (OCR for slips, inventory forecasting, chat assistant).

---

## Repository layout

```
warehouse-management-system/
├── backend/                 # Java Spring Boot — microservices + Docker
│   ├── auth-service/
│   ├── product-service/
│   ├── inventory-service/
│   ├── order-service/
│   ├── ai-service/
│   ├── api-gateway/
│   ├── discovery-server/    # Netflix Eureka
│   ├── docker-compose.yml
│   └── pom.xml              # Maven parent (multi-module)
└── frontend/                # Next.js (App Router) + TypeScript
    ├── src/
    ├── public/
    └── package.json
```

---

## Highlights

| Area | What you get |
|------|----------------|
| **Architecture** | **7** runnable microservices + **API Gateway** + **Eureka** discovery |
| **Security** | **JWT**, **Spring Security**, **RBAC** with **4 roles** |
| **Inventory** | Import/export slips, stock by warehouse, inventory checks |
| **AI** | **Gemini**-based OCR for **import/export slips**, product image OCR, chat, forecasting; **Milvus** for vector similarity on slip metadata |
| **Ops** | **Docker Compose** for local/stack deployment |

---

## Microservices (`backend/`)

| Service | Port (default) | Responsibility |
|---------|----------------|----------------|
| **discovery-server** | 8761 | Eureka registry |
| **api-gateway** | 8080 | Single entry point, routing to services |
| **product-service** | 8081 | Products, categories, suppliers, units, images |
| **inventory-service** | 8082 | Imports, exports, stock, stores, inventory checks |
| **order-service** | 8083 | Orders, customers |
| **auth-service** | 8087 | Login, JWT, users, roles, permissions, activity logs, email (SMTP) |
| **ai-service** | 8090 | Chat, descriptions, forecasts, OCR APIs, Milvus integration |

> **Note:** `promotion-service` and `settings-cms-service` exist in the repo but are **disabled** in the parent `pom.xml` (not part of the default build).

---

## Tech stack

### Backend

- **Java 17**
- **Spring Boot 3.5.x**, **Spring Data JPA**, **Hibernate**
- **Spring Security** + **JWT** (jjwt)
- **Spring Cloud** — **Netflix Eureka Client**, **Spring Cloud Gateway**
- **MySQL** (`mysql-connector-j`)
- **Spring Mail** (forgot password / verification when enabled)
- **WebClient** (reactive HTTP to Gemini and internal calls)
- **Docker** / **Docker Compose**
- **Maven** (multi-module parent POM)

### Frontend

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Material Tailwind**
- **TanStack React Query**
- **Axios**
- **Zod**
- **TipTap** (rich text)
- **jsPDF** / **jspdf-autotable**, **xlsx** (exports)

### AI & data

- **Google Gemini API** (vision + text)
- **Milvus 2.x** (vector DB; used with OCR / slip metadata — see `docker-compose.yml` in `backend/`)

---

## Features (functional)

### Core

- **Products**: CRUD, images, discounts, links to inventory
- **Categories, suppliers, units**
- **Customers** (order domain)
- **Import slips** / **Export slips**: create, edit, workflows, integration with stock
- **Stock** and **warehouses (stores)**
- **Inventory checks** (kiểm kê)
- **Orders** and related APIs
- **Users / roles / permissions** and **activity logs** (cross-service logging via auth-service)

### AI-powered

- **OCR — import/export slips**: read slip or form screenshots; extract supplier/customer, line items, quantities, prices, warehouse per line; optional **similar-slip** hints via embeddings + **Milvus**
- **OCR — product images**: extract name, SKU, price, specs from labels or photos
- **Chat assistant**: answers using aggregated product / stock / order context (with auth)
- **Product description generator** (marketing-style JSON: short / SEO / long)
- **Inventory forecast** endpoint (structured risk / overstock suggestions; Gemini with rule-based fallback)

---

## Roles (RBAC)

| Role | Typical use |
|------|-------------|
| **ADMIN** | Full administration |
| **MANAGER** | Approvals, operational oversight |
| **STAFF** | Day-to-day data entry and viewing |
| **USER** | Limited / read-oriented access |

Seed users and SQL samples may exist under `backend/` (e.g. `test_users_and_roles.sql`). **Change default passwords before any public deployment.**

---

## Prerequisites

- **JDK 17**
- **Node.js 20+** (recommended for Next 16)
- **MySQL 8** (schema `qlkh` or as configured)
- **Docker Desktop** (optional but recommended for Compose stack + Milvus)
- **Gemini API key** (for AI features)

---

## Quick start

### 1. Database

Create a MySQL database and user matching your config (see `backend/docker-compose.yml` and each service `application.yaml`). Default Compose examples often use database name **`qlkh`**.

### 2. Backend

```bash
cd backend

# Run whole stack (Eureka, gateway, services, Milvus stack) — adjust env / MySQL host
docker compose up -d --build
```

For **local IDE** runs, start **discovery-server** first, then other services, and point them at Eureka and MySQL.

Copy environment secrets (do **not** commit real keys):

- Create `backend/.env` for Compose (see repo docs: `SMTP-GMAIL-SETUP.md`, `HUONG_DAN_UPDATE_API_KEY.md`).
- Set **`GEMINI_API_KEY`** for `ai-service` when using AI.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Point the frontend API base URL to the **API Gateway** (default **http://localhost:8080**) via your existing env/config pattern in `frontend/`.

---

## Documentation (backend/)

| File | Topic |
|------|--------|
| `SMTP-GMAIL-SETUP.md` | Gmail / MailHog for auth emails |
| `HUONG_DAN_UPDATE_API_KEY.md` | Rotating Gemini API key |
| `README-MILVUS.md` | Milvus-related notes |
| `VECTOR-EMBEDDING-EXPLANATION.md` | Embeddings concept |

---

## Project scale (indicative)

| Metric | Approx. |
|--------|--------|
| Microservices (active) | **7** |
| REST controllers | **~29** |
| HTTP endpoints | **150+** |
| JPA entities (across services) | **30+** |
| RBAC roles | **4** |

---

## Security notes

- Never commit **`.env`**, real **JWT secrets**, or **database passwords**.
- Rotate **Gemini** keys and restrict **MySQL** to trusted networks in production.
- Use **HTTPS** and hardened **CORS** in production.

---

## License

Educational / thesis use unless you attach another license.

---

## Author

**HienE27** — [github.com/HienE27](https://github.com/HienE27)
