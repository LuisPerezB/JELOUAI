require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fetch = require('node-fetch');

const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL || 'http://localhost:3001';
const ORDERS_API_URL    = process.env.ORDERS_API_URL    || 'http://localhost:3002';
const SERVICE_TOKEN     = process.env.SERVICE_TOKEN     || 'internal-service-secret';
const AUTH_USERNAME     = process.env.AUTH_USERNAME     || 'admin';
const AUTH_PASSWORD     = process.env.AUTH_PASSWORD     || 'admin123';

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const internalHeader = () => ({
  'Authorization': `Bearer ${SERVICE_TOKEN}`,
  'Content-Type':  'application/json',
});


const getJwtToken = async () => {
  const res = await fetch(`${ORDERS_API_URL}/auth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: AUTH_USERNAME, password: AUTH_PASSWORD }),
  });

  if (!res.ok) throw new Error(`No se pudo obtener JWT: ${res.status}`);
  const body = await res.json();
  return body.token;
};

const validateCustomer = async (customerId) => {
  const url = `${CUSTOMERS_API_URL}/internal/customers/${customerId}`;
  const res = await fetch(url, { headers: internalHeader() });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Customers API error: ${res.status}`);
  const body = await res.json();
  return body.data;
};

const createOrder = async (customerId, items, jwt) => {
  const url = `${ORDERS_API_URL}/orders`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ customer_id: customerId, items }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Orders API error: ${res.status}`);
  }
  const body = await res.json();
  return body.data;
};

const confirmOrder = async (orderId, idempotencyKey, jwt) => {
  const url = `${ORDERS_API_URL}/orders/${orderId}/confirm`;
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Authorization':    `Bearer ${jwt}`,
      'Content-Type':     'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Orders confirm error: ${res.status}`);
  }
  const body = await res.json();
  return body.data;
};

module.exports.createAndConfirmOrder = async (event) => {
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return response(400, { success: false, error: 'Body JSON inválido' });
  }

  const { customer_id, items, idempotency_key, correlation_id } = body || {};

  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    return response(400, { success: false, correlationId: correlation_id || null, error: 'customer_id e items son requeridos' });
  }

  if (!idempotency_key) {
    return response(400, { success: false, correlationId: correlation_id || null, error: 'idempotency_key es requerido' });
  }

  try {
    // Obtener JWT antes de cualquier llamada a la API para evitar múltiples autenticaciones
    const jwt = await getJwtToken();

    const customer = await validateCustomer(customer_id);
    if (!customer) {
      return response(404, { success: false, correlationId: correlation_id || null, error: 'Cliente no encontrado' });
    }

    const order     = await createOrder(customer_id, items, jwt);
    const confirmed = await confirmOrder(order.id, idempotency_key, jwt);

    return response(201, {
      success:       true,
      correlationId: correlation_id || null,
      data: {
        customer,
        order: {
          id:          confirmed.id,
          status:      confirmed.status,
          total_cents: confirmed.total_cents,
          items:       confirmed.items,
        },
      },
    });
  } catch (err) {
    return response(500, { success: false, correlationId: correlation_id || null, error: err.message });
  }
};