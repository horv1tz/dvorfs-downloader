# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Environment variables will be set at build time if needed
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package.json for dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Also install typescript which may be needed at runtime
RUN npm install typescript@^5

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
