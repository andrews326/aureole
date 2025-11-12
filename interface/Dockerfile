# Frontend build stage
FROM node:20 AS build

WORKDIR /app
COPY interface/package*.json ./
RUN npm install
COPY interface/ .
RUN npm run build

# Production stage - serve with Nginx
FROM nginx:1.27-alpine

# Copy built frontend
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom nginx config (optional)
COPY interface/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
