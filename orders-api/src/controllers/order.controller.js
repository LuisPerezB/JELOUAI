const db                  = require('../db/connection');
const { getCustomerById } = require('../services/customers.service');

// GET /orders/:id
const getById = async (req, res) => {
  try {
    const order = await db('orders')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const items = await db('order_items')
      .where({ order_id: order.id })
      .join('products', 'order_items.product_id', 'products.id')
      .select(
        'order_items.id',
        'order_items.product_id',
        'products.name as product_name',
        'products.sku',
        'order_items.qty',
        'order_items.unit_price_cents',
        'order_items.subtotal_cents'
      );

    res.json({ data: { ...order, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener orden' });
  }
};

// GET /orders?status=&from=&to=&cursor=&limit=
const getAll = async (req, res) => {
  try {
    const status = req.query.status || null;
    const from   = req.query.from   || null;
    const to     = req.query.to     || null;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

    const query = db('orders').whereNull('deleted_at');

    if (status) query.where({ status });
    if (from)   query.where('created_at', '>=', new Date(from));
    if (to)     query.where('created_at', '<=', new Date(to));
    if (cursor) query.where('id', '>', cursor);

    query
      .select('id', 'customer_id', 'status', 'total_cents', 'created_at')
      .orderBy('id', 'asc')
      .limit(limit + 1);

    const rows = await query;

    const hasNext  = rows.length > limit;
    const orders   = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? orders[orders.length - 1].id : null;

    res.json({
      data: orders,
      pagination: { limit, next_cursor: nextCursor, has_next: hasNext },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
};

// POST /orders
const create = async (req, res) => {
  const { customer_id, items } = req.body;

  try {
    // 1. Validar cliente en Customers API
    const customer = await getCustomerById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // 2. Verificar productos y stock
    const productIds = items.map((i) => i.product_id);
    const products   = await db('products')
      .whereIn('id', productIds)
      .whereNull('deleted_at');

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: 'Uno o más productos no existen' });
    }

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap[item.product_id];
      if (product.stock < item.qty) {
        return res.status(409).json({
          error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
        });
      }
    }

    // 3. Calcular totales
    const orderItems = items.map((item) => {
      const product = productMap[item.product_id];
      return {
        product_id:       item.product_id,
        qty:              item.qty,
        unit_price_cents: product.price_cents,
        subtotal_cents:   product.price_cents * item.qty,
      };
    });

    const total_cents = orderItems.reduce((sum, i) => sum + i.subtotal_cents, 0);

    // 4. Transacción: crear orden + items + descontar stock
    let result;
    await db.transaction(async (trx) => {
      const [order_id] = await trx('orders').insert({ customer_id, status: 'CREATED', total_cents });

      await trx('order_items').insert(orderItems.map((i) => ({ ...i, order_id })));

      for (const item of items) {
        await trx('products').where({ id: item.product_id }).decrement('stock', item.qty);
      }

      const order = await trx('orders').where({ id: order_id }).first();
      const savedItems = await trx('order_items')
        .where({ order_id })
        .join('products', 'order_items.product_id', 'products.id')
        .select(
          'order_items.id',
          'order_items.product_id',
          'products.name as product_name',
          'products.sku',
          'order_items.qty',
          'order_items.unit_price_cents',
          'order_items.subtotal_cents'
        );

      result = { ...order, customer, items: savedItems };
    });

    res.status(201).json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear orden' });
  }
};

// POST /orders/:id/confirm  (idempotente con X-Idempotency-Key)
const confirm = async (req, res) => {
  const idempotencyKey = req.headers['x-idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Header X-Idempotency-Key requerido' });
  }

  try {
    // 1. Verificar idempotency key existente
    const existing = await db('idempotency_keys')
      .where({ keyval: idempotencyKey })
      .first();

    if (existing) {
      return res.status(200).json({ idempotent: true, data: existing.response_body });
    }

    // 2. Verificar orden
    const order = await db('orders')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .first();

    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status === 'CONFIRMED') return res.status(409).json({ error: 'La orden ya está confirmada' });
    if (order.status === 'CANCELED')  return res.status(409).json({ error: 'No se puede confirmar una orden cancelada' });

    // 3. Transacción: confirmar + guardar idempotency key
    let result;
    await db.transaction(async (trx) => {
      await trx('orders').where({ id: req.params.id }).update({ status: 'CONFIRMED' });

      const confirmed = await trx('orders').where({ id: req.params.id }).first();

      const items = await trx('order_items')
        .where({ order_id: order.id })
        .join('products', 'order_items.product_id', 'products.id')
        .select(
          'order_items.id',
          'order_items.product_id',
          'products.name as product_name',
          'products.sku',
          'order_items.qty',
          'order_items.unit_price_cents',
          'order_items.subtotal_cents'
        );

      result = { ...confirmed, items };

      await trx('idempotency_keys').insert({
        keyval:        idempotencyKey,
        target_type:   'order',
        target_id:     order.id,
        status:        'completed',
        response_body: JSON.stringify(result),
        expires_at:    db.raw('DATE_ADD(NOW(), INTERVAL 1 DAY)'),
      });
    });

    res.json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar orden' });
  }
};

// POST /orders/:id/cancel
const cancel = async (req, res) => {
  try {
    const order = await db('orders')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .first();

    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status === 'CANCELED') return res.status(409).json({ error: 'La orden ya está cancelada' });

    // CONFIRMED: solo cancelable dentro de 10 minutos
    if (order.status === 'CONFIRMED') {
      const confirmedAt = new Date(order.updated_at || order.created_at);
      const diffMinutes = (Date.now() - confirmedAt.getTime()) / 1000 / 60;

      if (diffMinutes > 10) {
        return res.status(409).json({
          error: 'No se puede cancelar una orden confirmada después de 10 minutos',
        });
      }
    }

    // Transacción: cancelar + restaurar stock
    let result;
    await db.transaction(async (trx) => {
      await trx('orders').where({ id: req.params.id }).update({ status: 'CANCELED' });

      const items = await trx('order_items').where({ order_id: order.id });

      for (const item of items) {
        await trx('products').where({ id: item.product_id }).increment('stock', item.qty);
      }

      result = await trx('orders').where({ id: req.params.id }).first();
    });

    res.json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar orden' });
  }
};

module.exports = { getAll, getById, create, confirm, cancel };