# Ecommerce B2B - Monorepo

Sistema de backoffice de pedidos B2B compuesto por dos APIs REST y un Lambda orquestador.

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐
│  Customers API  │     │   Orders API    │
│  :3001          │◄────│   :3002         │
│  (JWT + Service │     │   (JWT)         │
│   Token)        │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └──────────┬────────────┘
                    │
             ┌──────▼──────┐
             │    MySQL    │
             │    :3306    │
             └─────────────┘
                    ▲
         ┌──────────┘
         │
┌────────┴────────┐
│    Lambda       │
│  Orchestrator   │
│  :3000          │
│ (serverless-    │
│  offline)       │
└─────────────────┘
```

## Estructura del repositorio

```
/
├── customers-api/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── schemas/
│   │   ├── db/
│   │   └── app.js
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── knexfile.js
│   ├── package.json
│   └── openapi.yaml
├── orders-api/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── db/
│   │   └── app.js
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── knexfile.js
│   ├── package.json
│   └── openapi.yaml
├── lambda-orchestrator/
│   ├── handler.js
│   ├── serverless.yml
│   ├── .env.example
│   ├── package.json
│   └── openapi.yaml
├── db/
│   ├── schema.sql
│   └── seed.sql
├── docker-compose.yml
└── README.md
```

## Requisitos

- Node.js 22+
- Docker y Docker Compose
- npm

## Levantamiento local con Docker Compose

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd <repo>
```

### 2. Copiar variables de entorno

```bash
cp customers-api/.env.example customers-api/.env
cp orders-api/.env.example orders-api/.env
```

### 3. Build y levantar servicios

```bash
docker compose up --build -d
```

### 4. Verificar que los servicios están corriendo

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

Respuesta esperada:
```json
{ "status": "ok", "service": "customers-api" }
{ "status": "ok", "service": "orders-api" }
```

### 5. Levantar el Lambda orquestador

```bash
cd lambda-orchestrator
cp .env.example .env
npm install
npm run dev
```

El orquestador estará disponible en `http://localhost:3000`.

---

## Endpoints

### Customers API — `http://localhost:3001`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/token` | — | Obtener JWT |
| GET | `/customers` | JWT | Listar con search/cursor/limit |
| GET | `/customers/:id` | JWT | Detalle de cliente |
| POST | `/customers` | JWT | Crear cliente |
| PUT | `/customers/:id` | JWT | Actualizar cliente |
| DELETE | `/customers/:id` | JWT | Soft delete |
| GET | `/internal/customers/:id` | SERVICE_TOKEN | Uso interno (Orders API) |

### Orders API — `http://localhost:3002`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/token` | — | Obtener JWT |
| GET | `/products` | JWT | Listar con search/cursor/limit |
| GET | `/products/:id` | JWT | Detalle de producto |
| POST | `/products` | JWT | Crear producto |
| PATCH | `/products/:id` | JWT | Actualizar precio/stock |
| DELETE | `/products/:id` | JWT | Soft delete |
| GET | `/orders` | JWT | Listar con status/from/to/cursor/limit |
| GET | `/orders/:id` | JWT | Detalle con items |
| POST | `/orders` | JWT | Crear orden |
| POST | `/orders/:id/confirm` | JWT | Confirmar (idempotente) |
| POST | `/orders/:id/cancel` | JWT | Cancelar y restaurar stock |

### Lambda Orchestrator — `http://localhost:3000`

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/orchestrator/create-and-confirm-order` | Crear y confirmar orden en un solo request |

---

## Autenticación

### JWT (usuarios)
```bash
curl -X POST http://localhost:3001/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Usar el token en los requests:
```
Authorization: Bearer <token>
```

### SERVICE_TOKEN (comunicación interna)
Usado por Orders API para llamar a Customers API:
```
Authorization: Bearer internal-service-secret
```

---

## Flujo principal

### 1. Crear cliente
```bash
curl -X POST http://localhost:3001/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Pérez","email":"juan@example.com","phone":"0991234567"}'
```

### 2. Crear orden
```bash
curl -X POST http://localhost:3002/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":1,"items":[{"product_id":2,"qty":1}]}'
```

### 3. Confirmar orden (idempotente)
```bash
curl -X POST http://localhost:3002/orders/1/confirm \
  -H "Authorization: Bearer <token>" \
  -H "X-Idempotency-Key: confirm-order-1-v1"
```

### 4. Orquestar todo en un solo request
```bash
curl -X POST http://localhost:3000/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [{"product_id": 2, "qty": 1}],
    "idempotency_key": "abc-123",
    "correlation_id": "req-789"
  }'
```

---

## Reglas de negocio

- **Stock**: Al crear una orden se descuenta el stock en transacción atómica. Al cancelar se restaura.
- **Idempotencia**: `POST /orders/:id/confirm` requiere header `X-Idempotency-Key`. Reintentos con la misma key devuelven la misma respuesta.
- **Cancelación**:
  - Estado `CREATED`: cancelable en cualquier momento.
  - Estado `CONFIRMED`: cancelable solo dentro de los primeros 10 minutos.
- **Soft delete**: clientes y productos no se eliminan físicamente, se marca `deleted_at`.

---

## Scripts NPM

Cada servicio tiene los siguientes scripts:

```bash
npm start        # Producción
npm run dev      # Desarrollo con nodemon
npm run build    # No requiere build (Node.js)
npm run migrate  # Correr migraciones Knex
npm run seed     # Cargar datos de prueba
npm test         # Tests (pendiente)
```

El orquestador:
```bash
npm run dev      # serverless-offline en :3000
npm run deploy   # Deploy a AWS
```

---

## Variables de entorno

### customers-api / orders-api

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | 3001/3002 |
| `DB_HOST` | Host MySQL | localhost |
| `DB_PORT` | Puerto MySQL | 3306 |
| `DB_USER` | Usuario MySQL | appuser |
| `DB_PASSWORD` | Password MySQL | secret |
| `DB_NAME` | Base de datos | ecommerce |
| `JWT_SECRET` | Clave JWT | supersecretkey |
| `JWT_EXPIRES_IN` | Expiración JWT | 1h |
| `SERVICE_TOKEN` | Token interno | internal-service-secret |

### lambda-orchestrator

| Variable | Descripción | Default |
|----------|-------------|---------|
| `CUSTOMERS_API_URL` | URL Customers API | http://127.0.0.1:3001 |
| `ORDERS_API_URL` | URL Orders API | http://127.0.0.1:3002 |
| `SERVICE_TOKEN` | Token interno | internal-service-secret |
| `AUTH_USERNAME` | Usuario para JWT | admin |
| `AUTH_PASSWORD` | Password para JWT | admin123 |

---

## Documentación OpenAPI

Cada servicio tiene su `openapi.yaml`. Para visualizarlo:

1. Abre [editor.swagger.io](https://editor.swagger.io)
2. Pega el contenido del archivo `openapi.yaml` correspondiente