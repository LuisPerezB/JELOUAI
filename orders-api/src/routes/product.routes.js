const express = require('express');
const router  = express.Router();

const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createProductSchema, updateProductSchema } = require('../schemas/product.schema');
const { getAll, getById, create, patch, remove }   = require('../controllers/product.controller');

router.get('/',       auth, getAll);
router.get('/:id',    auth, getById);
router.post('/',      auth, validate(createProductSchema), create);
router.patch('/:id',  auth, validate(updateProductSchema), patch);
router.delete('/:id', auth, remove);

module.exports = router;