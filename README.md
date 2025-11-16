# SaveGame - White-Label Savings Gamification Platform

> Transform savings into an engaging game. Built for Chamas, Saccos, and MFIs across Africa.

## 🎯 What is SaveGame?

SaveGame is a B2B SaaS platform that enables financial institutions to gamify their savings products through challenges, leaderboards, and achievements - driving 20-40% higher engagement and savings rates.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20 recommended)
- pnpm 8+
- PostgreSQL 14+
- Redis 7+
- M-Pesa Daraja API credentials (sandbox for dev)
- AfricasTalking account (for SMS)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Set up database
pnpm db:setup

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Start development servers
pnpm dev
```

This will start:
- Admin dashboard: http://localhost:3000
- Member PWA: http://localhost:3001
- API server: http://localhost:3002

## 📁 Project Structure

```
whichidea/
├── apps/
│   ├── web/              # Admin dashboard (Next.js)
│   ├── member/           # Member PWA (Next.js)
│   └── api/              # Backend API (Hono)
├── packages/
│   ├── database/         # Shared DB schema
│   ├── ui/               # Shared components
│   └── shared/           # Utilities
├── docs/                 # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── MVP_PLAN.md
├── schema.sql           # Database schema
└── scripts/             # Helper scripts
```

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TailwindCSS
- shadcn/ui
- Zustand (state management)

**Backend:**
- Hono.js
- PostgreSQL (Supabase/Railway)
- Redis (Upstash)
- Drizzle ORM

**Integrations:**
- M-Pesa Daraja API
- AfricasTalking (SMS/WhatsApp)
- Resend (Email)

**Hosting:**
- Vercel (Frontends)
- Railway (Backend + DB)
- Upstash (Redis)

## 📚 Documentation

- [Product Requirements](./PRD.md) - Full product spec
- [Technical Architecture](./ARCHITECTURE.md) - System design
- [MVP Plan](./MVP_PLAN.md) - 8-week implementation roadmap
- [Database Schema](./schema.sql) - Complete DB structure

## 🎮 Core Features

### For Organizations (Admin Dashboard)
- ✅ Multi-tenant organization management
- ✅ Custom branding (logo, colors)
- ✅ Member management
- ✅ Challenge creation & management
- ✅ Real-time analytics
- ✅ M-Pesa integration
- ✅ SMS/WhatsApp notifications

### For Members (PWA)
- ✅ Phone-based authentication
- ✅ Challenge participation
- ✅ Real-time leaderboards
- ✅ Progress tracking
- ✅ Achievement badges
- ✅ Transaction history
- ✅ Team competitions

### Gamification Engine
- ✅ Multiple challenge types (fixed, streak, percentage, group)
- ✅ Points & scoring system
- ✅ 10+ achievement badges
- ✅ Leaderboard rankings
- ✅ Streak tracking
- ✅ Team competitions

## 🔐 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/savegame
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# M-Pesa
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_PASSKEY=your-passkey
MPESA_SHORTCODE=174379

# AfricasTalking
AT_API_KEY=your-api-key
AT_USERNAME=sandbox

# App
NODE_ENV=development
API_URL=http://localhost:3002
WEB_URL=http://localhost:3000
MEMBER_URL=http://localhost:3001
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific suite
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## 📦 Scripts

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm dev:web          # Admin dashboard only
pnpm dev:member       # Member PWA only
pnpm dev:api          # API server only

# Build
pnpm build            # Build all apps
pnpm build:web        # Build admin dashboard
pnpm build:member     # Build member PWA
pnpm build:api        # Build API

# Database
pnpm db:setup         # Initialize database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed data
pnpm db:studio        # Open Drizzle Studio
pnpm db:reset         # Reset database (⚠️ destructive)

# Linting & Formatting
pnpm lint             # Lint all code
pnpm format           # Format all code
pnpm type-check       # TypeScript checks

# Deployment
pnpm deploy           # Deploy to production
```

## 🚀 Deployment

### Vercel (Frontends)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy admin dashboard
cd apps/web
vercel --prod

# Deploy member PWA
cd apps/member
vercel --prod
```

### Railway (Backend)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy API
cd apps/api
railway up
```

## 📊 Database Management

### Migrations

```bash
# Create new migration
pnpm db:migrate:create my-migration-name

# Run pending migrations
pnpm db:migrate

# Rollback last migration
pnpm db:migrate:rollback
```

### Seeding

```bash
# Seed development data
pnpm db:seed

# Seed production data (careful!)
pnpm db:seed:prod
```

## 🔌 API Documentation

API docs available at: `http://localhost:3002/docs`

Key endpoints:
- `POST /api/v1/auth/send-otp` - Send OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `GET /api/v1/challenges` - List challenges
- `POST /api/v1/challenges` - Create challenge
- `GET /api/v1/leaderboard/:challengeId` - Get leaderboard
- `POST /api/v1/transactions/verify` - M-Pesa webhook

Full API documentation: [API.md](./docs/API.md)

## 🛡️ Security

- ✅ JWT authentication
- ✅ Rate limiting (100 req/min per IP)
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (sanitization)
- ✅ CORS configuration
- ✅ Encrypted M-Pesa credentials
- ✅ Audit logging

## 📈 Monitoring

- **Error Tracking:** Sentry
- **Analytics:** Posthog
- **Uptime:** UptimeRobot
- **Logs:** Railway logs / Vercel logs

## 🤝 Contributing

This is currently a solo project, but contributions welcome!

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Proprietary - All rights reserved

## 🙋 Support

- Email: support@savegame.co
- WhatsApp: +254-XXX-XXXXXX
- Docs: https://docs.savegame.co

## 🗺️ Roadmap

### ✅ Phase 1 - MVP (Current)
- Core gamification features
- M-Pesa integration
- Admin dashboard
- Member PWA

### 🚧 Phase 2 - Growth (Q2 2024)
- WhatsApp bot
- Advanced analytics
- Referral system
- Multi-currency support

### 📅 Phase 3 - Scale (Q3-Q4 2024)
- Mobile native apps
- API marketplace
- AI insights
- Multi-country expansion

### 🔮 Phase 4 - Platform (2025)
- Full Chama OS
- Investment tracking
- Loan management
- White-label apps

## 💰 Business Model

**Pricing:**
- Starter: $200/month (up to 100 members)
- Growth: $500/month (up to 500 members)
- Enterprise: $2,000+/month (unlimited)

**Alternative:** 1-2% of savings volume

**Target:** 100 organizations by end of year 1

## 📞 Contact

**Developer:** Your Name
- Twitter: @yourhandle
- LinkedIn: linkedin.com/in/yourprofile
- Email: you@email.com

---

Made with ❤️ in Nairobi, Kenya 🇰🇪
