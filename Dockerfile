# ── Build stage: compile React frontend ──────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build
# Output lands in /app/client/../public → /app/public (see vite.config.js outDir)

# ── Runtime stage: lean Node server ───────────────────────────────────────────
FROM node:20-slim AS runtime

WORKDIR /app

# Copy server deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy server source
COPY server.js ./

# Copy built frontend from build stage
COPY --from=build /app/public ./public

# Cloud Run sets PORT automatically (default 8080)
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
