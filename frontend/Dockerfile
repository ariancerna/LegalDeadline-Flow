# Etapa 1: compila Angular.
FROM node:22-alpine AS build
WORKDIR /app
# Tope de memoria para compilar también en servidores de 1 GB (con memoria de intercambio).
ENV NODE_OPTIONS=--max-old-space-size=768
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: sirve los archivos estáticos con nginx sin privilegios (puerto 8080).
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 8080
