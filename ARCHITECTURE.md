# Technical Architecture
## White-Label Savings Gamification Platform

### 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├──────────────────────────┬──────────────────────────────────┤
│   Admin Dashboard        │    Member Interface              │
│   (Next.js 14)           │    (Next.js 14 PWA)              │
│   - Institution mgmt     │    - Challenge participation     │
│   - Analytics            │    - Leaderboards                │
│   - Configuration        │    - Progress tracking           │
└──────────────┬───────────┴──────────────┬───────────────────┘
               │                          │
               │      HTTPS/REST          │
               │                          │
┌──────────────┴──────────────────────────┴───────────────────┐
│                     API GATEWAY                              │
│                     (Hono.js)                                │
│   - Authentication/Authorization                             │
│   - Rate limiting                                            │
│   - Request validation                                       │
│   - API versioning                                           │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────┴───────────┬───────────────┬─────────────┐
    │                      │               │             │
┌───┴────────┐  ┌──────────┴─────┐  ┌─────┴──────┐  ┌──┴────────┐
│  Auth      │  │  Core Engine   │  │Integration │  │ Analytics │
│  Service   │  │  Service       │  │  Service   │  │  Service  │
│            │  │                │  │            │  │           │
│ - Login    │  │ - Challenges   │  │ - M-Pesa   │  │ - Metrics │
│ - Roles    │  │ - Gamification │  │ - SMS      │  │ - Reports │
│ - Orgs     │  │ - Scoring      │  │ - WhatsApp │  │ - Insights│
└────────────┘  └────────────────┘  └────────────┘  └───────────┘
       │                │                   │              │
       └────────────────┴───────────────────┴──────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
            ┌───────┴────────┐    ┌──────┴────────┐
            │   PostgreSQL   │    │     Redis     │
            │   (Primary DB) │    │    (Cache)    │
            │                │    │               │
            │ - Users        │    │ - Sessions    │
            │ - Orgs         │    │ - Leaderboard │
            │ - Challenges   │    │ - Rate limits │
            │ - Transactions │    │               │
            └────────────────┘    └───────────────┘

         ┌──────────────────────────────────┐
         │      EXTERNAL SERVICES           │
         ├──────────────┬───────────────────┤
         │  M-Pesa      │  AfricasTalking   │
         │  Daraja API  │  (SMS/WhatsApp)   │
         └──────────────┴───────────────────┘
```

### 🗂️ Project Structure

```
whichidea/
├── apps/
│   ├── web/                    # Admin dashboard (Next.js)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── overview/
│   │   │   │   ├── challenges/
│   │   │   │   ├── members/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   └── api/           # Next.js API routes (if needed)
│   │   ├── components/
│   │   ├── lib/
│   │   └── public/
│   │
│   ├── member/                 # Member PWA (Next.js)
│   │   ├── app/
│   │   │   ├── challenges/
│   │   │   ├── leaderboard/
│   │   │   ├── profile/
│   │   │   └── progress/
│   │   ├── components/
│   │   └── lib/
│   │
│   └── api/                    # Backend API (Hono)
│       ├── src/
│       │   ├── index.ts        # Main Hono app
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── organizations.ts
│       │   │   ├── challenges.ts
│       │   │   ├── members.ts
│       │   │   ├── transactions.ts
│       │   │   ├── leaderboard.ts
│       │   │   └── analytics.ts
│       │   ├── services/
│       │   │   ├── gamification/
│       │   │   │   ├── challenge-engine.ts
│       │   │   │   ├── scoring.ts
│       │   │   │   ├── badges.ts
│       │   │   │   └── leaderboard.ts
│       │   │   ├── integrations/
│       │   │   │   ├── mpesa.ts
│       │   │   │   ├── sms.ts
│       │   │   │   └── whatsapp.ts
│       │   │   └── analytics/
│       │   │       ├── metrics.ts
│       │   │       └── reports.ts
│       │   ├── db/
│       │   │   ├── schema.ts
│       │   │   ├── migrations/
│       │   │   └── seed.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── validation.ts
│       │   └── utils/
│       └── package.json
│
├── packages/
│   ├── database/              # Shared DB schema & types
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── ui/                    # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── styles/
│   │   └── package.json
│   │
│   └── shared/                # Shared utilities
│       ├── src/
│       │   ├── constants.ts
│       │   ├── validators.ts
│       │   └── utils.ts
│       └── package.json
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── GAMIFICATION.md
│
├── scripts/
│   ├── setup-db.sh
│   └── seed-data.ts
│
├── .env.example
├── package.json              # Root package.json (monorepo)
├── turbo.json               # Turborepo config
├── pnpm-workspace.yaml      # PNPM workspace config
└── README.md
```

### 🗄️ Database Schema

**Core Tables:**

```sql
-- Organizations (Chamas, Saccos, etc.)
organizations
  - id (uuid, pk)
  - name (string)
  - type (enum: chama, sacco, mfi, bank)
  - branding (jsonb)  -- logo, colors, etc.
  - subscription_tier (enum)
  - subscription_status (enum)
  - mpesa_config (jsonb, encrypted)
  - created_at
  - updated_at

-- Users (both admin and members)
users
  - id (uuid, pk)
  - organization_id (fk)
  - phone_number (string, unique)
  - name (string)
  - email (string, nullable)
  - role (enum: admin, member)
  - avatar_url (string)
  - created_at
  - updated_at

-- Challenges
challenges
  - id (uuid, pk)
  - organization_id (fk)
  - name (string)
  - description (text)
  - type (enum: fixed_amount, percentage, streak, group)
  - target (jsonb)  -- { amount: 1000, frequency: 'weekly' }
  - duration_days (int)
  - start_date (date)
  - end_date (date)
  - status (enum: draft, active, completed, cancelled)
  - participants_count (int)
  - total_saved (decimal)
  - created_by (fk -> users)
  - created_at
  - updated_at

-- Challenge Participations
challenge_participants
  - id (uuid, pk)
  - challenge_id (fk)
  - user_id (fk)
  - team_id (fk, nullable)
  - status (enum: active, completed, failed)
  - progress (jsonb)  -- current streak, amount saved, etc.
  - total_contributed (decimal)
  - rank (int)
  - joined_at
  - completed_at

-- Teams (for group challenges)
teams
  - id (uuid, pk)
  - challenge_id (fk)
  - name (string)
  - total_members (int)
  - total_saved (decimal)
  - rank (int)
  - created_at

-- Transactions (savings deposits)
transactions
  - id (uuid, pk)
  - user_id (fk)
  - organization_id (fk)
  - challenge_id (fk, nullable)
  - amount (decimal)
  - mpesa_receipt (string)
  - transaction_id (string, unique)
  - status (enum: pending, verified, failed)
  - verified_at
  - created_at

-- Achievements/Badges
achievements
  - id (uuid, pk)
  - organization_id (fk, nullable) -- null = system-wide
  - name (string)
  - description (text)
  - icon (string)
  - criteria (jsonb)  -- unlock conditions
  - rarity (enum: common, rare, epic, legendary)
  - created_at

-- User Achievements
user_achievements
  - id (uuid, pk)
  - user_id (fk)
  - achievement_id (fk)
  - earned_at
  - challenge_id (fk, nullable)

-- Leaderboard (materialized view or cached table)
leaderboard
  - id (uuid, pk)
  - challenge_id (fk)
  - user_id (fk)
  - rank (int)
  - score (int)
  - total_saved (decimal)
  - updated_at

-- Notifications
notifications
  - id (uuid, pk)
  - user_id (fk)
  - type (enum: sms, whatsapp, push)
  - title (string)
  - message (text)
  - status (enum: pending, sent, failed)
  - sent_at
  - created_at

-- Analytics Events
events
  - id (uuid, pk)
  - organization_id (fk)
  - user_id (fk, nullable)
  - event_type (string)
  - properties (jsonb)
  - created_at
```

### 🔐 Authentication & Authorization

**Auth Flow:**
1. **Phone-based authentication** (primary for Kenya)
   - SMS OTP verification
   - Session tokens (JWT)
   - Refresh tokens

2. **Multi-tenancy:**
   - Organization ID in JWT
   - Row-level security (RLS) in database
   - All queries scoped to organization

3. **Roles:**
   - `super_admin` - Platform owner (you)
   - `org_admin` - Organization admin (Chama/Sacco leader)
   - `member` - Regular saver

**Middleware Stack:**
```typescript
// Example Hono middleware chain
app.use('*', cors())
app.use('*', logger())
app.use('/api/*', authenticate())
app.use('/api/admin/*', requireRole('org_admin'))
app.use('/api/*', rateLimiter())
app.use('/api/*', validateRequest())
```

### 📊 Gamification Engine

**Scoring System:**
```typescript
interface ScoringRules {
  points_per_kes: number;        // e.g., 1 KES = 1 point
  streak_multiplier: number;     // 1.5x for 7-day streak
  early_bird_bonus: number;      // +50 points for first 3 days
  consistency_bonus: number;     // +100 for completing challenge
  referral_bonus: number;        // +500 per referral
}
```

**Challenge Types:**

1. **Fixed Amount Challenge**
   ```typescript
   {
     type: 'fixed_amount',
     target: { amount: 1000, frequency: 'weekly' },
     duration_days: 84  // 12 weeks
   }
   ```

2. **Percentage Increase**
   ```typescript
   {
     type: 'percentage',
     target: { increase: 10, baseline: 'last_month' }
   }
   ```

3. **Streak Challenge**
   ```typescript
   {
     type: 'streak',
     target: { consecutive_weeks: 12 }
   }
   ```

4. **Group Challenge**
   ```typescript
   {
     type: 'group',
     target: { team_amount: 50000, min_members: 5 }
   }
   ```

### 🔌 M-Pesa Integration

**Flow:**
1. User makes deposit via M-Pesa Paybill/Till
2. Daraja API sends webhook (IPN - Instant Payment Notification)
3. Backend verifies transaction
4. Updates user balance, challenge progress
5. Calculates points, updates leaderboard
6. Sends confirmation notification

**Webhook Handling:**
```typescript
// Idempotency check (prevent double-processing)
// Verify signature
// Process transaction
// Update challenge progress
// Trigger notifications
```

### 📡 API Design

**REST Endpoints:**

```
Authentication:
POST   /api/v1/auth/send-otp
POST   /api/v1/auth/verify-otp
POST   /api/v1/auth/refresh

Organizations:
GET    /api/v1/organizations/:id
PATCH  /api/v1/organizations/:id
POST   /api/v1/organizations/:id/branding

Challenges:
GET    /api/v1/challenges
POST   /api/v1/challenges
GET    /api/v1/challenges/:id
PATCH  /api/v1/challenges/:id
DELETE /api/v1/challenges/:id
POST   /api/v1/challenges/:id/join
GET    /api/v1/challenges/:id/leaderboard

Members:
GET    /api/v1/members
POST   /api/v1/members
GET    /api/v1/members/:id
GET    /api/v1/members/:id/achievements
GET    /api/v1/members/:id/progress

Transactions:
GET    /api/v1/transactions
POST   /api/v1/transactions/verify  # M-Pesa webhook

Analytics:
GET    /api/v1/analytics/overview
GET    /api/v1/analytics/savings-trends
GET    /api/v1/analytics/engagement
```

### 🚀 Performance Optimizations

1. **Caching Strategy:**
   - Leaderboard: Redis cache, update every 30 seconds
   - User profile: Cache for 5 minutes
   - Challenge list: Cache until modified
   - Analytics: Pre-compute daily

2. **Database Indexes:**
   ```sql
   CREATE INDEX idx_transactions_user_date
     ON transactions(user_id, created_at DESC);

   CREATE INDEX idx_participants_challenge
     ON challenge_participants(challenge_id, rank);

   CREATE INDEX idx_leaderboard_challenge
     ON leaderboard(challenge_id, rank);
   ```

3. **Real-time Updates:**
   - WebSockets for live leaderboard updates
   - Server-Sent Events (SSE) for notifications
   - Optimistic UI updates on client

### 🔒 Security Considerations

1. **Data Encryption:**
   - M-Pesa credentials encrypted at rest
   - TLS/SSL for all communications
   - Environment variables for secrets

2. **Rate Limiting:**
   - 100 req/min per IP
   - 1000 req/min per org
   - Special limits for webhooks

3. **Input Validation:**
   - Zod schemas for all inputs
   - Sanitize user-generated content
   - Phone number validation

4. **Audit Logging:**
   - Track all admin actions
   - Log transaction modifications
   - Monitor suspicious patterns

### 📱 Mobile Strategy

**Progressive Web App (PWA):**
- Install prompt on first visit
- Offline challenge progress viewing
- Push notifications (web push)
- Add to home screen

**Future: Native Apps**
- React Native wrapper around PWA
- Better notification support
- App store presence

### 🌍 Multi-tenancy Architecture

Each organization is completely isolated:
- Separate database schemas (logical separation)
- Branded subdomain: `{org-slug}.savegame.co`
- Custom colors, logos, messaging
- Data never crosses org boundaries

### 📈 Observability

**Monitoring:**
- Sentry for error tracking
- Posthog for product analytics
- Custom dashboards for:
  - API response times
  - M-Pesa webhook success rate
  - Challenge completion rates
  - User engagement metrics

**Alerts:**
- M-Pesa webhook failures
- High error rates
- Unusual transaction patterns
- Server downtime

### 🔄 Deployment Strategy

**Environments:**
1. **Development** - Local
2. **Staging** - Pre-production testing
3. **Production** - Live

**CI/CD Pipeline:**
```yaml
1. Push to GitHub
2. Run tests (unit + integration)
3. Build all apps
4. Deploy API to Railway
5. Deploy frontends to Vercel
6. Run smoke tests
7. Notify team
```

**Hosting:**
- **Vercel:** Next.js apps (web + member)
- **Railway/Render:** Hono API + PostgreSQL
- **Upstash:** Redis cache
- **Cloudflare:** CDN + DDoS protection

### 🧪 Testing Strategy

1. **Unit Tests:** Core business logic
2. **Integration Tests:** API endpoints
3. **E2E Tests:** Critical user flows (Playwright)
4. **Load Tests:** M-Pesa webhook handling

---

This architecture is designed to:
✅ Scale from 1 to 1000 organizations
✅ Handle M-Pesa spikes during month-end
✅ Maintain <200ms API response times
✅ Support 100K+ concurrent users
✅ Cost <$500/month until $10K MRR
