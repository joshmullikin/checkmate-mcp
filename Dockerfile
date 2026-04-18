# Build stage
FROM cgr.dev/chainguard/node:latest-dev AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY server.ts ./
COPY src/ ./src/
COPY ui-src/ ./ui-src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies before copying node_modules to runtime image
# (Chainguard builder runs as non-root; temporarily escalate to prune)
USER root
RUN npm prune --omit=dev
USER node

# Production stage
FROM cgr.dev/chainguard/node:latest

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY ui/ ./ui/

# Expose port
EXPOSE 3003

# Start the server (env vars passed via docker run -e or --env-file)
CMD ["node", "dist/server.js"]
