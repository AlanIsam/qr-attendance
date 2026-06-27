FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG TURSO_DATABASE_URL
ARG TURSO_AUTH_TOKEN
ARG JWT_SECRET

ENV TURSO_DATABASE_URL=$TURSO_DATABASE_URL
ENV TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN
ENV JWT_SECRET=$JWT_SECRET

RUN npx prisma generate
RUN npm install @prisma/adapter-libsql @libsql/client --no-save
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Turso/LibSQL packages that standalone mode may not trace
COPY --from=builder /app/node_modules/@prisma/adapter-libsql ./node_modules/@prisma/adapter-libsql
COPY --from=builder /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=builder /app/node_modules/libsql ./node_modules/libsql

# Copy generated Prisma client
COPY --from=builder /app/src/generated ./src/generated

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
