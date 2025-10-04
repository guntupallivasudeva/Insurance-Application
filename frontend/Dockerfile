# frontend/Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build -- --output-path=./dist/frontend --base-href=/ --configuration production

# We can use a lightweight server like Nginx for production,
# but for simplicity, we'll use a simple http-server.
FROM nginx:1.27-alpine

# Remove default Nginx site content
RUN rm -rf /usr/share/nginx/html/*

# Copy built Angular app (browser output) with proper ownership to web root
COPY --from=build --chown=nginx:nginx /app/dist/frontend/browser /usr/share/nginx/html

# Ensure directories/files have readable perms
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; \
	&& find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# Use SPA routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]