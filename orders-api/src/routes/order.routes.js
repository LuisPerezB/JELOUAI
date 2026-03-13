const express = require('express');
const router  = express.Router();

const auth     = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createOrderSchema } = require('../schemas/order.schema');
const { getAll, getById, create, confirm, cancel } = require('../controllers/order.controller');

router.get('/',            auth, getAll);
router.get('/:id',         auth, getById);
router.post('/',           auth, validate(createOrderSchema), create);
router.post('/:id/confirm', auth, confirm);
router.post('/:id/cancel',  auth, cancel);

module.exports = router;