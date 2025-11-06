# Stage 1: Build the React application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package.json and package-lock.json
COPY test-app/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY test-app/ ./

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine
# Copy the built assets from the 'builder' stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Command to run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
