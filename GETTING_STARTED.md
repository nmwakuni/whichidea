# Getting Started - SaveGame Platform

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+ (20 recommended)
- pnpm 8+
- PostgreSQL 14+
- Redis 7+ (optional for development)

### 1. Clone & Install

```bash
# Install dependencies
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Copy example env
cp .env.example .env

# Edit .env with your values
nano .env
```

**Minimum required for development:**

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/savegame
JWT_SECRET=your-secret-key-change-this
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### 3. Set Up Database

```bash
# Create database
createdb savegame

# Run schema
psql savegame < schema.sql

# Or use Drizzle
cd packages/database
pnpm db:push
```

### 4. Start Development Servers

```bash
# Start all apps
pnpm dev

# Or start individually
pnpm dev:api      # API on :3002
pnpm dev:web      # Admin on :3000
pnpm dev:member   # Member PWA on :3001
```

### 5. Create Test Data

```bash
# Connect to database
psql savegame

# Create organization
INSERT INTO organizations (name, slug, type, subscription_tier, subscription_status)
VALUES ('Test Chama', 'test-chama', 'chama', 'starter', 'active')
RETURNING id;

# Create admin user (use returned org ID)
INSERT INTO users (organization_id, phone_number, first_name, last_name, role, phone_verified)
VALUES ('<org_id>', '+254712345678', 'Admin', 'User', 'org_admin', true);

# Create member user
INSERT INTO users (organization_id, phone_number, first_name, last_name, role, phone_verified)
VALUES ('<org_id>', '+254722222222', 'John', 'Doe', 'member', true);
```

### 6. Test the Apps

**Admin Dashboard:** http://localhost:3000
- Login with: `+254712345678`
- OTP will be logged to console (check API logs)

**Member PWA:** http://localhost:3001
- Login with: `+254722222222`
- OTP will be logged to console

**API:** http://localhost:3002/health

---

## Project Structure

```
whichidea/
├── apps/
│   ├── api/          # Hono API server
│   ├── web/          # Admin dashboard (Next.js)
│   └── member/       # Member PWA (Next.js)
├── packages/
│   ├── database/     # Drizzle ORM schemas
│   ├── shared/       # Shared utilities
│   └── ui/           # Shared components
├── docs/             # Documentation
└── scripts/          # Helper scripts
```

---

## Development Workflow

### Making Changes

1. **Database Changes:**
   ```bash
   # Update schema in packages/database/src/schema/
   # Then push changes
   cd packages/database
   pnpm db:push
   ```

2. **API Changes:**
   ```bash
   # Edit files in apps/api/src/
   # Server auto-reloads with tsx watch
   ```

3. **Frontend Changes:**
   ```bash
   # Edit files in apps/web/ or apps/member/
   # Next.js auto-reloads
   ```

### Testing

```bash
# Run all tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

---

## Key Features to Test

### 1. Authentication
- Send OTP to phone
- Verify OTP and login
- Token refresh

### 2. Challenges (Admin)
- Create challenge
- Edit challenge
- Publish challenge
- View participants

### 3. Challenges (Member)
- View active challenges
- Join challenge
- See leaderboard
- Track progress

### 4. Transactions
- Manual transaction entry (admin)
- View transaction history
- Points calculation

### 5. Analytics
- Overview dashboard
- Savings trends
- Engagement metrics

---

## Common Issues

### Port Already in Use

```bash
# Kill process on port
lsof -ti:3002 | xargs kill -9
```

### Database Connection Error

1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL is correct
3. Check database exists: `psql -l`

### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules
pnpm install
```

### TypeScript Errors

```bash
# Rebuild packages
pnpm build
```

---

## Next Steps

1. ✅ Set up local development
2. 📚 Read [ARCHITECTURE.md](./ARCHITECTURE.md)
3. 📋 Review [MVP_PLAN.md](./MVP_PLAN.md)
4. 🚀 Start building features
5. 🎯 Deploy to production (see [DEPLOYMENT.md](./DEPLOYMENT.md))

---

## Getting Help

- **Documentation:** See `/docs` folder
- **API Docs:** http://localhost:3002/health
- **Database:** Check `schema.sql`
- **Issues:** Check existing commits for examples

---

## Tips

- Use `pnpm dev` from root to start all apps
- Check API logs for OTP codes in development
- Use Drizzle Studio to explore database: `pnpm db:studio`
- Enable debug logging: `DEBUG=true pnpm dev:api`

Happy coding! 🚀
