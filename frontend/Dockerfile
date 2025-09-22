# Frontend Dockerfile for File Vault System

# Development stage
FROM node:18-alpine AS development

# Set working directory
WORKDIR /app

# Set Node.js memory options and disable TypeScript checking
ENV NODE_OPTIONS="--max_old_space_size=16384"
ENV SKIP_PREFLIGHT_CHECK=true
ENV TSC_COMPILE_ON_ERROR=true
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]

# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application with increased memory and disabled source maps
RUN NODE_OPTIONS="--max-old-space-size=8192" GENERATE_SOURCEMAP=false npm run build

# Production stage
FROM nginx:alpine AS production

# Copy nginx configuration
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script
COPY deployment/start.sh /start.sh
RUN chmod +x /start.sh

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start with our custom script
CMD ["/start.sh"]