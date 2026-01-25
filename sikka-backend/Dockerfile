# 🏗️ Multi-stage build for production optimization
FROM node:18-alpine AS builder

# 📦 Install build dependencies
RUN apk add --no-cache python3 make g++

# 📁 Set working directory
WORKDIR /app

# 📋 Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig*.json ./

# 📚 Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# 📄 Copy source code
COPY src/ ./src/

# 🏗️ Build the application
RUN npm run build

# 🧹 Remove devDependencies after build
RUN npm prune --production

# 🚀 Production stage
FROM node:18-alpine AS production

# 🔧 Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 👤 Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# 📁 Set working directory
WORKDIR /app

# 📋 Copy package files
COPY package*.json ./

# 📚 Copy production dependencies from builder
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# 🏗️ Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# 📄 Copy configuration files
COPY --chown=nestjs:nodejs .env.example ./.env.example

# 🏷️ Add labels for better container management
LABEL maintainer="Sikka Transportation Platform" \
      version="1.0.0" \
      description="Sikka Backend API Server" \
      org.opencontainers.image.source="https://github.com/abdoElHodaky/transportapp"

# 👤 Switch to non-root user for security
USER nestjs

# 🌐 Expose application port
EXPOSE 3000

# 🏥 Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 🔧 Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# 🚀 Start the application
CMD ["node", "dist/main.js"]
