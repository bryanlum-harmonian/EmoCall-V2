# Use Node.js 20 slim image for smaller size
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for building TypeScript)
RUN npm ci

# Copy application code
COPY . .

# Build server (TypeScript to JavaScript)
RUN npm run server:build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Note: static-build/web directory must be committed to git
# or built during Docker build for assets to be available

# Expose port (Cloud Run uses PORT env var)
ENV PORT=8080
EXPOSE 8080

# Start the production server
CMD ["npm", "run", "server:prod"]
