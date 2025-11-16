# Deployment Guide - SaveGame Platform

## Prerequisites

- Vercel account (for frontends)
- Railway account (for API + Database)
- M-Pesa Daraja API credentials (sandbox or production)
- AfricasTalking account (for SMS)

---

## 1. Database Setup (Railway)

### Create PostgreSQL Database

1. Go to [Railway.app](https://railway.app)
2. Create new project → Provision PostgreSQL
3. Copy the `DATABASE_URL` connection string

### Run Migrations

```bash
# Set DATABASE_URL in your environment
export DATABASE_URL="postgresql://..."

# Run migrations
cd packages/database
pnpm db:push

# Or run the SQL file directly
psql $DATABASE_URL < ../../schema.sql
```

### Seed Initial Data

```bash
# Create system achievements
psql $DATABASE_URL <<SQL
INSERT INTO achievements (organization_id, name, description, icon, rarity, criteria, sort_order) VALUES
  (NULL, 'First Steps', 'Made your first savings deposit', '🎯', 'common', '{"type": "first_save"}', 1),
  (NULL, 'Week Warrior', 'Saved for 7 consecutive days', '🔥', 'common', '{"type": "streak", "days": 7}', 2),
  (NULL, 'Month Master', 'Saved for 30 consecutive days', '💪', 'rare', '{"type": "streak", "days": 30}', 3),
  (NULL, 'Champion', 'Completed your first challenge', '🏆', 'common', '{"type": "challenges_completed", "count": 1}', 4),
  (NULL, 'Top Dog', 'Ranked #1 in any challenge', '👑', 'epic', '{"type": "rank", "position": 1}', 6);
SQL
```

---

## 2. API Deployment (Railway)

### Deploy API

1. Create new Railway project (or use existing)
2. Add service → GitHub repo → Select `apps/api`
3. Set build/start commands:
   - Build: `cd ../.. && pnpm install && pnpm build --filter=api`
   - Start: `cd apps/api && node dist/index.js`

### Environment Variables

Set these in Railway dashboard:

```bash
# Database
DATABASE_URL=postgresql://... (from Railway PostgreSQL)

# Redis (add Redis service to Railway project)
REDIS_URL=redis://...

# Auth
JWT_SECRET=your-super-secret-32-char-key-here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# API
NODE_ENV=production
API_PORT=3002
CORS_ORIGIN=https://admin.yourdomain.com,https://app.yourdomain.com

# M-Pesa (Sandbox or Production)
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_PASSKEY=your-mpesa-passkey
MPESA_SHORTCODE=174379
MPESA_CALLBACK_URL=https://api.yourdomain.com/api/v1/webhooks/mpesa

# AfricasTalking
AT_API_KEY=your-africastalking-api-key
AT_USERNAME=your-username
AT_SENDER_ID=SAVEGAME

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Custom Domain (Optional)

1. Railway Settings → Networking → Add Custom Domain
2. Point your domain to Railway

---

## 3. Admin Dashboard Deployment (Vercel)

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
cd apps/web
vercel --prod
```

Or connect GitHub repo in Vercel dashboard:

1. New Project → Import from GitHub
2. Select root directory: `apps/web`
3. Framework: Next.js
4. Build command: `cd ../.. && pnpm install && pnpm build --filter=web`
5. Install command: `pnpm install`

### Environment Variables

Set in Vercel dashboard:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Custom Domain

1. Vercel Project Settings → Domains
2. Add: `admin.yourdomain.com`
3. Update DNS records as instructed

---

## 4. Member PWA Deployment (Vercel)

Same as Admin Dashboard:

```bash
cd apps/member
vercel --prod
```

Or via Vercel dashboard:

- Root directory: `apps/member`
- Build command: `cd ../.. && pnpm install && pnpm build --filter=member`

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Custom Domain

Add: `app.yourdomain.com`

---

## 5. M-Pesa Configuration

### Sandbox Setup

1. Go to [Daraja Portal](https://developer.safaricom.co.ke/)
2. Create App → Get Consumer Key & Secret
3. Test STK Push in sandbox

### Production Setup

1. Get approved Paybill/Till number
2. Register C2B URLs:
   - Validation URL: `https://api.yourdomain.com/api/v1/webhooks/mpesa`
   - Confirmation URL: `https://api.yourdomain.com/api/v1/webhooks/mpesa`

3. Update environment variables with production credentials

---

## 6. Post-Deployment Setup

### Create First Organization

```bash
# Connect to production database
psql $DATABASE_URL

# Create organization
INSERT INTO organizations (name, slug, type, subscription_tier, subscription_status)
VALUES ('My Test Chama', 'test-chama', 'chama', 'starter', 'trial')
RETURNING id;

# Create admin user (replace org_id with returned ID)
INSERT INTO users (organization_id, phone_number, first_name, last_name, role, phone_verified)
VALUES ('<org_id>', '+254712345678', 'Admin', 'User', 'org_admin', true)
RETURNING id;
```

### Test the Flow

1. Admin Login:
   - Go to `https://admin.yourdomain.com`
   - Login with admin phone number
   - Create a challenge

2. Member Login:
   - Go to `https://app.yourdomain.com`
   - Login with member phone number
   - Join the challenge

3. Test M-Pesa:
   - Initiate payment from member app
   - Complete on phone
   - Verify webhook received
   - Check points updated

---

## 7. Monitoring & Logs

### Railway

- View logs in Railway dashboard
- Set up alerts for errors
- Monitor resource usage

### Vercel

- View function logs in Vercel dashboard
- Set up error tracking (Sentry)
- Monitor Core Web Vitals

### Database

```bash
# Check API health
curl https://api.yourdomain.com/health

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM users;"
```

---

## 8. Scaling Considerations

### Performance

- **Database**: Upgrade Railway plan or migrate to managed PostgreSQL (Supabase, Neon)
- **Redis**: Use Upstash Redis for production-grade caching
- **CDN**: Vercel automatically provides CDN for static assets

### High Availability

- **API**: Enable auto-scaling in Railway
- **Database**: Set up read replicas for heavy read workloads
- **Monitoring**: Add Sentry, Posthog, or Datadog

---

## 9. Backup & Recovery

### Database Backups

```bash
# Daily backup (cron job)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20240116.sql
```

### Automated Backups

Railway PostgreSQL includes automatic daily backups. Check Railway dashboard.

---

## 10. Cost Estimates

### MVP (< 100 users)

- Railway (API + DB + Redis): ~$20-30/month
- Vercel (2 projects): Free tier sufficient
- M-Pesa: Pay per transaction
- SMS: ~$0.01-0.05 per SMS
- **Total**: ~$20-50/month

### Growth (100-1000 users)

- Railway: ~$50-100/month
- Vercel Pro: $20/month
- SMS: ~$50-200/month
- **Total**: ~$120-320/month

### Scale (1000+ users)

- Database: Migrate to managed service ($100+/month)
- Redis: Upstash Pro ($40+/month)
- API: Multiple instances ($100+/month)
- **Total**: $300-1000+/month

---

## 11. Security Checklist

- [ ] JWT secret is strong (32+ characters)
- [ ] HTTPS enabled on all domains
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] M-Pesa credentials encrypted
- [ ] Database not publicly accessible
- [ ] Environment variables secure
- [ ] Regular security updates
- [ ] Audit logs enabled
- [ ] Backup strategy in place

---

## 12. Troubleshooting

### API not responding

1. Check Railway logs
2. Verify DATABASE_URL is correct
3. Check environment variables

### M-Pesa webhook not working

1. Verify callback URL is publicly accessible
2. Check M-Pesa dashboard for errors
3. Review API logs for webhook POST

### SMS not sending

1. Verify AfricasTalking API key
2. Check account balance
3. Review API logs

### Frontend can't reach API

1. Verify CORS_ORIGIN includes frontend URLs
2. Check NEXT_PUBLIC_API_URL is correct
3. Test API health endpoint

---

## Need Help?

- Check logs in Railway/Vercel dashboards
- Review error messages
- Test API endpoints with curl/Postman
- Verify environment variables

---

**Deployment Complete! 🎉**

Your SaveGame platform is now live and ready for users.
