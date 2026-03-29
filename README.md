# Warehouse Management System (WMS)

A full-stack, microservices-based **Warehouse Management System** for managing products, suppliers, customers, import/export slips, and inventory tracking. Integrated AI features including **OCR receipt scanning**, **inventory forecasting**, and an **AI chat assistant**.

## Architecture

```
warehouse-management-system/
├── BE/                          # Backend (Java Spring Boot Microservices)
│   ├── auth-service/            # Authentication & Authorization
│   ├── product-service/         # Product Management
│   ├── inventory-service/       # Inventory & Stock Management
│   ├── order-service/           # Order Management
│   ├── ai-service/              # AI Features (OCR, Forecasting, Chat)
│   ├── api-gateway/             # API Gateway
│   └── discovery-server/        # Service Discovery (Eureka)
└── FE/                          # Frontend (Next.js)
```

## Features

### Core Modules
| Module | Description |
|--------|-------------|
| **Product Management** | Products, categories, suppliers, units |
| **Inventory Management** | Import/export slips, stock tracking, inventory checks |
| **Order Management** | Customer orders, import/export orders |
| **User Management** | Role-based access control with 4 roles |

### AI-Powered Features
- **OCR Receipt Scanning**: Automatically extract product info, quantities, and prices from import/export slips
- **Smart Inventory Forecasting**: AI-powered demand prediction
- **AI Chat Assistant**: Natural language queries for warehouse data

### Role-Based Access Control
| Role | Description |
|------|-------------|
| **ADMIN** | Full system access |
| **MANAGER** | Approve/reject workflows |
| **STAFF** | Create and view operations |
| **USER** | Read-only access |

## Tech Stack

### Backend
- **Java 17**, **Spring Boot 3**, **Spring Cloud**
- **MySQL** (per-service databases)
- **Spring Security** with **JWT** Authentication
- **Eureka** Service Discovery
- **API Gateway** for centralized routing
- **Docker** & **Docker Compose**

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React Query** / **Axios**

### AI & Infrastructure
- **Gemini API** (AI Chat, Forecasting)
- **Milvus** (Vector Database for embeddings)
- **OCR** (Tesseract or cloud-based)

## Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0+

### Backend Setup

```bash
# Navigate to BE folder
cd BE

# Build with Maven
./mvnw clean install

# Or run with Docker
docker-compose up -d
```

### Frontend Setup

```bash
# Navigate to FE folder
cd FE

# Install dependencies
npm install

# Run development server
npm run dev
```

### Test Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | ADMIN |
| manager | password123 | MANAGER |
| staff | password123 | STAFF |
| user | password123 | USER |

## API Documentation

### Backend Services

| Service | Port | Description |
|---------|------|-------------|
| Discovery Server | 8761 | Eureka Service Registry |
| API Gateway | 8080 | Centralized routing |
| Auth Service | 8081 | Authentication |
| Product Service | 8082 | Product Management |
| Inventory Service | 8083 | Inventory Operations |
| Order Service | 8084 | Order Processing |
| AI Service | 8085 | AI Features |

## Project Statistics

| Metric | Count |
|--------|-------|
| **Microservices** | 7 |
| **REST Controllers** | 29 |
| **API Endpoints** | 150+ |
| **Database Entities** | 35 |
| **Roles** | 4 |

## License

This project is for educational purposes.
