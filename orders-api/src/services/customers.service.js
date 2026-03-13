const fetch = require('node-fetch');

const CUSTOMERS_API_URL = process.env.CUSTOMERS_API_URL || 'http://customers-api:3001';
const SERVICE_TOKEN     = process.env.SERVICE_TOKEN     || 'internal-service-secret';

const getCustomerById = async (customerId) => {
  const res = await fetch(`${CUSTOMERS_API_URL}/internal/customers/${customerId}`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_TOKEN}`,
      'Content-Type':  'application/json',
    },
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error(`Customers API error: ${res.status}`);
  }

  const body = await res.json();
  return body.data;
};

module.exports = { getCustomerById };