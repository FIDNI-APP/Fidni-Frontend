# Build stage
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json, package-lock.json
COPY package*.json ./

# Configure Tiptap Pro registry and token
RUN npm config set "@tiptap-pro:registry" https://registry.tiptap.dev/ && \
    npm config set "@tiptap-cloud:registry" https://registry.tiptap.dev/ && \
    npm config set "//registry.tiptap.dev/:_authToken" "tGfd2UZcfGYMS3Du6+sMZaYfBuXJ8WMCzIaQ71tVybQR/kDU8mVla/akmobCPob6"

# Create .npmrc file with Tiptap configuration
RUN echo "@tiptap-pro:registry=https://registry.tiptap.dev/" > .npmrc && \
    echo "@tiptap-cloud:registry=https://registry.tiptap.dev/" >> .npmrc && \
    echo "//registry.tiptap.dev/:_authToken=tGfd2UZcfGYMS3Du6+sMZaYfBuXJ8WMCzIaQ71tVybQR/kDU8mVla/akmobCPob6" >> .npmrc

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Configure environment for production build
ENV NODE_ENV=production
RUN npm install -g typescript
RUN npm install -g vite
RUN npm install -g pnpm

# Build the app with more verbose logging
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