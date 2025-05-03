# Build stage
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json, package-lock.json, and .npmrc
COPY package*.json .npmrc ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage to nginx serve directory
COPY --from=build /app/dist /usr/share/nginx/html

# Create nginx.conf if it doesn't exist
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]