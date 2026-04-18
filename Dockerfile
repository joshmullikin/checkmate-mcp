# Build stage
FROM node:24-slim AS builder

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
RUN npm prune --omit=dev

# Production stage
FROM node:24-slim

WORKDIR /app

# Run as non-root
RUN groupadd -r app && useradd -r -g app app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY ui/ ./ui/

# Runtime only needs node + app files; remove package-manager tooling and its bundled deps.
RUN rm -rf /usr/local/lib/node_modules/npm \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER app

# Expose port
EXPOSE 3003

# Start the server (env vars passed via docker run -e or --env-file)
CMD ["node", "dist/server.js"]
