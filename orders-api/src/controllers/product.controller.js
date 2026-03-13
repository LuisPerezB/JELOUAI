const db = require('../db/connection');

// GET /products?search=&cursor=&limit=
const getAll = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

    const query = db('products').whereNull('deleted_at');

    if (search) {
      query.where(function () {
        this.where('name', 'like', `%${search}%`)
            .orWhere('sku',  'like', `%${search}%`);
      });
    }

    if (cursor) {
      query.where('id', '>', cursor);
    }

    query
      .select('id', 'sku', 'name', 'price_cents', 'stock', 'created_at')
      .orderBy('id', 'asc')
      .limit(limit + 1);

    const rows = await query;

    const hasNext    = rows.length > limit;
    const products   = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? products[products.length - 1].id : null;

    res.json({
      data: products,
      pagination: { limit, next_cursor: nextCursor, has_next: hasNext },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// GET /products/:id
const getById = async (req, res) => {
  try {
    const product = await db('products')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .select('id', 'sku', 'name', 'price_cents', 'stock', 'created_at')
      .first();

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// POST /products
const create = async (req, res) => {
  try {
    const { sku, name, price_cents, stock } = req.body;

    const existing = await db('products').where({ sku }).whereNull('deleted_at').first();
    if (existing) {
      return res.status(409).json({ error: 'El SKU ya está registrado' });
    }

    const [id] = await db('products').insert({ sku, name, price_cents, stock });

    const product = await db('products')
      .where({ id })
      .select('id', 'sku', 'name', 'price_cents', 'stock', 'created_at')
      .first();

    res.status(201).json({ data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// PATCH /products/:id (solo precio y/o stock)
const patch = async (req, res) => {
  try {
    const product = await db('products')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .first();

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const allowed = {};
    if (req.body.price_cents !== undefined) allowed.price_cents = req.body.price_cents;
    if (req.body.stock       !== undefined) allowed.stock       = req.body.stock;

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: 'Debes enviar price_cents y/o stock' });
    }

    await db('products').where({ id: req.params.id }).update(allowed);

    const updated = await db('products')
      .where({ id: req.params.id })
      .select('id', 'sku', 'name', 'price_cents', 'stock', 'created_at')
      .first();

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// DELETE /products/:id (soft delete)
const remove = async (req, res) => {
  try {
    const product = await db('products')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .first();

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await db('products')
      .where({ id: req.params.id })
      .update({ deleted_at: db.fn.now() });

    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

module.exports = { getAll, getById, create, patch, remove };