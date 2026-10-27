# TravelDesk Monorepo (React Native + Next.js + TypeScript)

This repository is organized as a **TypeScript Monorepo** powered by npm workspaces, bringing together the React Native Mobile Application and the Next.js Fleet Management API backend.

---

## 📁 Monorepo Structure

```
MobileApp/
├── apps/
│   ├── backend/               # Next.js App Router (TypeScript) REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # MySQL schema (mapped to Hibernate table schemas)
│   │   │   └── seed.ts        # Database seeder matching Java DataInitializer
│   │   ├── src/
│   │   │   ├── app/api/       # Next.js route handlers
│   │   │   │   ├── auth/      # /api/auth/register-owner & /api/auth/login
│   │   │   │   ├── vehicles/  # /api/vehicles & /api/vehicles/[id]
│   │   │   │   ├── drivers/   # /api/drivers & /api/drivers/[id]
│   │   │   │   ├── trips/     # /api/trips & /api/trips/[id]
│   │   │   │   ├── expenses/  # /api/expenses & /api/expenses/[id]
│   │   │   │   ├── attendance/# /api/attendance & /api/attendance/[id]
│   │   │   │   ├── salaries/  # /api/salaries & /api/salaries/[id]
│   │   │   │   ├── analytics/ # /api/analytics
│   │   │   │   ├── products/  # /api/products & /api/products/[id]
│   │   │   │   └── health/    # /api/health
│   │   │   └── lib/           # db, auth (JWT + bcrypt), CORS, date utils
│   │   ├── package.json       # @traveldesk/backend
│   │   └── tsconfig.json
│   │
│   └── mobile/                # Expo / React Native App (TypeScript)
│       ├── src/               # Screens, navigation, contexts, components
│       ├── package.json       # @traveldesk/mobile
│       └── tsconfig.json
│
├── packages/
│   └── shared/                # Shared TypeScript types, DTOs & constants
│       ├── src/index.ts       # Shared interfaces (Vehicle, Driver, Trip, etc.)
│       ├── package.json       # @traveldesk/shared
│       └── tsconfig.json
│
├── package.json               # Root monorepo workspace configuration
└── tsconfig.json
```

---

## 🚀 Quick Start Commands (from `MobileApp/`)

### Backend
```bash
# Start backend in development mode (runs on port 8080)
npm run backend

# Build backend for production
npm run build:backend

# Start backend production server
npm run start:backend

# Regenerate Prisma client
npm run prisma:generate

# Run seed script
npm run prisma:seed
```

### Mobile App
```bash
# Start Expo development server
npm run mobile
# or
npm start
```

### Type Checking
```bash
npm run check
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck and MySQL DB connectivity status |
| `POST` | `/api/auth/register-owner` | Register fleet owner |
| `POST` | `/api/auth/login` | Owner & Driver JWT authentication |
| `GET`, `POST` | `/api/vehicles` | List & create fleet vehicles |
| `GET`, `PUT`, `DELETE` | `/api/vehicles/[id]` | Get, update, delete vehicle |
| `GET`, `POST` | `/api/drivers` | List & create drivers (with vehicle assignment) |
| `GET`, `PUT`, `DELETE` | `/api/drivers/[id]` | Get, update, delete driver |
| `GET`, `POST` | `/api/trips` | List trips (with filters: `today`, `this_week`, etc.) & create |
| `GET`, `PUT`, `DELETE` | `/api/trips/[id]` | Get, update, delete trip |
| `GET`, `POST` | `/api/expenses` | List expenses (category, date filters) & create |
| `GET`, `PUT`, `DELETE` | `/api/expenses/[id]` | Get, update, delete expense |
| `GET`, `POST` | `/api/attendance` | List attendance & mark attendance |
| `PUT`, `DELETE` | `/api/attendance/[id]` | Update or delete attendance record |
| `GET`, `POST` | `/api/salaries` | List & auto-calculate/create driver salary |
| `PUT`, `DELETE` | `/api/salaries/[id]` | Update salary payment / recalculate |
| `GET` | `/api/analytics` | Aggregated metrics for `daily`, `weekly`, `monthly` |
| `GET`, `POST` | `/api/products` | Legacy product CRUD |
| `GET`, `PUT`, `DELETE` | `/api/products/[id]` | Legacy product CRUD by ID |
