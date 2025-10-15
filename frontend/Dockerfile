# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build argument for API URL
ARG NEXT_PUBLIC_API_URL_BACKEND
ENV NEXT_PUBLIC_API_URL_BACKEND=$NEXT_PUBLIC_API_URL_BACKEND

COPY package*.json ./
RUN npm ci

COPY . .

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
