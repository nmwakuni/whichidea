# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@8.14.0 --activate
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package files
COPY apps/member/package.json ./apps/member/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter=member...

# Stage 2: Build
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@8.14.0 --activate
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/member/node_modules ./apps/member/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/member ./apps/member
COPY packages/shared ./packages/shared

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN pnpm build:member

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/apps/member/next.config.js ./
COPY --from=builder /app/apps/member/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/member/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/member/.next/static ./apps/member/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/member/public ./apps/member/public

# Set environment
ENV NODE_ENV=production
ENV PORT=3002

USER nextjs
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "apps/member/server.js"]
