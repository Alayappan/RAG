# Stage 1: Build Angular application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built application (Angular 18 application builder places browser bundle in browser/)
COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html/
# Fallback copy if output is directly in dist/frontend
RUN if [ ! -f /usr/share/nginx/html/index.html ]; then cp -r /app/dist/frontend/* /usr/share/nginx/html/ 2>/dev/null || true; fi

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
