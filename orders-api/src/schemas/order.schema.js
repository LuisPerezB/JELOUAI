const { z } = require('zod');

const createOrderSchema = z.object({
  customer_id: z.number().int().positive('customer_id debe ser un entero positivo'),
  items: z.array(
    z.object({
      product_id: z.number().int().positive('product_id debe ser un entero positivo'),
      qty:        z.number().int().positive('qty debe ser mayor a 0'),
    })
  ).min(1, 'Debe incluir al menos un item'),
});

module.exports = { createOrderSchema };