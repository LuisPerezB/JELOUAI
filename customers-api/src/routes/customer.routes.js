const express = require('express');
const router  = express.Router();

const { authMiddleware }  = require('../middlewares/auth.middleware');
const validate            = require('../middlewares/validate.middleware');
const { createCustomerSchema, updateCustomerSchema } = require('../schemas/customer.schema');
const { getAll, getById, create, update, remove }    = require('../controllers/customer.controller');

router.get('/',       authMiddleware, getAll);
router.get('/:id',    authMiddleware, getById);
router.post('/',      authMiddleware, validate(createCustomerSchema), create);
router.put('/:id',    authMiddleware, validate(updateCustomerSchema), update);
router.delete('/:id', authMiddleware, remove);

module.exports = router;