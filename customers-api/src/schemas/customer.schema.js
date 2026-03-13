const { z } = require('zod');

const createCustomerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().length(10, 'El teléfono debe tener exactamente 10 dígitos').regex(/^\d+$/, 'El teléfono solo debe contener números'),
});

const updateCustomerSchema = z.object({
  name:  z.string().min(2).max(255).optional(),
  email: z.string().email('Email inválido').max(255).optional(),
  phone: z.string().length(10).regex(/^\d+$/, 'El teléfono solo debe contener números').optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});

module.exports = { createCustomerSchema, updateCustomerSchema };