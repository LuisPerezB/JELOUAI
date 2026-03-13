const db = require('../db/connection');

// GET /customers?search=&cursor=&limit=
const getAll = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

    const query = db('customers').whereNull('deleted_at');

    if (search) {
      query.where(function () {
        this.where('name', 'like', `%${search}%`)
            .orWhere('email', 'like', `%${search}%`);
      });
    }

    if (cursor) {
      query.where('id', '>', cursor);
    }

    query
      .select('id', 'name', 'email', 'phone', 'created_at')
      .orderBy('id', 'asc')
      .limit(limit + 1);

    const rows = await query;

    const hasNext   = rows.length > limit;
    const customers = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? customers[customers.length - 1].id : null;

    res.json({
      data: customers,
      pagination: {
        limit,
        next_cursor: nextCursor,
        has_next:    hasNext,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

// GET /customers/:id
const getById = async (req, res) => {
  try {
    const customer = await db('customers')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .select('id', 'name', 'email', 'phone', 'created_at')
      .first();

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ data: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

// POST /customers
const create = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const existing = await db('customers')
      .where({ email })
      .whereNull('deleted_at')
      .first();

    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const [id] = await db('customers').insert({ name, email, phone });

    const customer = await db('customers')
      .where({ id })
      .select('id', 'name', 'email', 'phone', 'created_at')
      .first();

    res.status(201).json({ data: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

// PUT /customers/:id
const update = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const customer = await db('customers')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .first();

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (email && email !== customer.email) {
      const existing = await db('customers')
        .where({ email })
        .whereNull('deleted_at')
        .whereNot({ id: req.params.id })
        .first();

      if (existing) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
    }

    await db('customers')
      .where({ id: req.params.id })
      .update({ name, email, phone });

    const updated = await db('customers')
      .where({ id: req.params.id })
      .select('id', 'name', 'email', 'phone', 'created_at')
      .first();

    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

// DELETE /customers/:id (soft delete)
const remove = async (req, res) => {
  try {
    const customer = await db('customers')
      .whereNull('deleted_at')
      .where({ id: req.params.id })
      .first();

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await db('customers')
      .where({ id: req.params.id })
      .update({ deleted_at: db.fn.now() });

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

module.exports = { getAll, getById, create, update, remove };