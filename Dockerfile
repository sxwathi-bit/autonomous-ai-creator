# Multi-stage Dockerfile for Autonomous AI Creator Full-Stack Application

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package dependency manifests
COPY package.json package-lock.json* ./
COPY packages/database/prisma/schema.prisma ./packages/database/prisma/schema.prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client & Build TypeScript bundle and Vite static assets
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma || true
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules and built output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
