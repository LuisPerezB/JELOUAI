# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev
# ---- Runtime stage ----
FROM node:22-alpine

WORKDIR /app

# Copiar dependencias del builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Usuario no root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

CMD ["node", "src/app.js"]