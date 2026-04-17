# ══════════════════════════════════════════════════════════════
# The Giant Forge Hub — Dockerfile para EasyPanel
# Multi-stage build: deps → builder → runner
# ══════════════════════════════════════════════════════════════

# Stage 1 — Instalar dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2 — Build de producción
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de build (sin secretos — se pasan en runtime en EasyPanel)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3 — Runner mínimo
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Usuarios sin privilegios para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copiar archivos standalone del build
COPY --from=builder /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

# Directorio de datos persistente (SQLite)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

# Punto de entrada
CMD ["node", "server.js"]
