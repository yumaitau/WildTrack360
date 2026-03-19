# Mangeled version of https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
ARG NODE_VERSION=lts-slim

# ============================================
# Stage 1: Build Next.js application
# ============================================

FROM node:${NODE_VERSION} as build-stage

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for caching
COPY package*.json ./

# Copy Prisma schema before npm install so postinstall hooks can find it
COPY prisma ./prisma

# Install OpenSSL
RUN apt-get update -y && apt-get install -y openssl

# Install dependencies (this will also run prisma generate via postinstall)
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose out the build args
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
ARG NEXT_PUBLIC_ROOT_DOMAIN
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ORG
ARG NEXT_PUBLIC_SENTRY_PROJECT
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ORG=$NEXT_PUBLIC_SENTRY_ORG
ENV NEXT_PUBLIC_SENTRY_PROJECT=$NEXT_PUBLIC_ENTRY_PROJECT

# Build the application
RUN npm run build

# ============================================
# Stage 2: Run Next.js application
# ============================================

FROM node:${NODE_VERSION}

# Install OpenSSL
RUN apt-get update -y && apt-get install -y openssl

# Set working directory
WORKDIR /usr/src/app

# Copy built assets and necessary files from the build stage
COPY --from=build-stage --chown=node:node /usr/src/app/.next ./.next
COPY --from=build-stage --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build-stage --chown=node:node /usr/src/app/package*.json ./
COPY --from=build-stage --chown=node:node /usr/src/app/prisma ./prisma
COPY --from=build-stage --chown=node:node /usr/src/app/public ./public

# Switch to non-root user for security best practices
USER node

# Expose port 3000 to allow HTTP traffic
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/internal/ping || exit 1

# Start the application
CMD ["npm", "run", "prod_start"]
