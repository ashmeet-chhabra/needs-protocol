# Build stage: Install dependencies and compile TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.server.json ./
COPY server ./server

# Install ALL dependencies (including dev) to compile TypeScript
RUN npm ci

# Compile TypeScript to JavaScript
RUN npx tsc --project tsconfig.server.json

# Production stage: Lightweight runtime
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Cloud Run uses PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

# Health check (fixed path to /api/health and using fetch for Node 18+)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

# Start the compiled server
CMD ["node", "dist/server/index.js"]
