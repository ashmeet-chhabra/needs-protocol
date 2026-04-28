# Build stage: Install dependencies and compile TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.server.json .
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

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the compiled server
CMD ["node", "dist/server/index.js"]
