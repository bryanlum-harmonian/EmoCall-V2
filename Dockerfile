# Use Node.js 20 slim image for smaller size
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use ci for clean install)
RUN npm ci --only=production

# Copy application code
COPY . .

# Build server (TypeScript to JavaScript)
RUN npm run server:build

# Note: Static web build should be done before Docker build
# with EXPO_PUBLIC_DOMAIN set to your Cloud Run URL
# Or you can build it here if EXPO_PUBLIC_DOMAIN is set at build time

# Expose port (Cloud Run uses PORT env var)
ENV PORT=8080
EXPOSE 8080

# Start the production server
CMD ["npm", "run", "server:prod"]
