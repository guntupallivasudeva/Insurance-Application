## Backend Dockerfile (Node.js + Express)
## Multi-stage not required since there is no build step; keep it lean and secure

FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better cache)
COPY package.json package-lock.json ./
# Use npm ci for clean, reproducible installs; omit dev deps for production
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY src ./src

# Environment
ENV NODE_ENV=production \
	PORT=8000

# Create a non-root user (node image already includes 'node' user)
RUN chown -R node:node /app
USER node

# Expose the app port
EXPOSE 8000

# Start the service
CMD ["npm", "start"]

