# ============================================================
# Averroes Frontend — Next.js Docker Image
#
# For development: Used with docker-compose (hot-reload via volume mount)
# For production: Build and serve with `next start`
# ============================================================

FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the Next.js dev server port
EXPOSE 3000

# Default command — overridden by docker-compose for development
CMD ["npm", "run", "dev"]
