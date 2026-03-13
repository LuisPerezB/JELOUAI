const { z } = require('zod');

const createProductSchema = z.object({
  sku:         z.string().min(1).max(255),
  name:        z.string().min(1).max(255),
  price_cents: z.number().positive('price_cents debe ser un número positivo'),
  stock:       z.number().int().min(0, 'stock no puede ser negativo'),
});

const updateProductSchema = z.object({
  name:        z.string().min(1).max(255).optional(),
  price_cents: z.number().positive().optional(),
  stock:       z.number().int().min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});

module.exports = { createProductSchema, updateProductSchema };