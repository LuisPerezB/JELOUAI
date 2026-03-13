const express = require('express');
const router = express.Router();
const { serviceAuthMiddleware } = require('../middlewares/auth.middleware');
const { getById } = require('../controllers/customer.controller');

router.get('/customers/:id', serviceAuthMiddleware, getById);

module.exports = router;