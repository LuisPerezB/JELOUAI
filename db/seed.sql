USE ecommerce;

-- CUSTOMERS
INSERT INTO customers (name, email, phone) VALUES
('Ana García',        'ana.garcia@example.com',    '0991234567'),
('Carlos Mendoza',    'carlos.m@example.com',      '0987654321'),
('Lucía Fernández',   'lucia.f@example.com',       '0976543210'),
('Roberto Castillo',  'roberto.c@example.com',     '0965432109'),
('María Torres',      'maria.t@example.com',       '0954321098');

-- PRODUCTS
INSERT INTO products (sku, name, price_cents, stock) VALUES
('SKU001', 'Audífonos Bluetooth',     4999,  25),
('SKU002', 'Mouse Inalámbrico',       1999,  50),
('SKU003', 'Teclado Mecánico',        8999,  15),
('SKU004', 'Monitor 24"',            29999,   8),
('SKU005', 'Webcam Full HD',          5499,  20),
('SKU006', 'Hub USB-C 7 puertos',     3299,  30),
('SKU007', 'Silla Ergonómica',       49999,   5),
('SKU008', 'Lámpara LED de Escritorio', 2199, 40);

-- ORDERS
INSERT INTO orders (customer_id, status, total_cents) VALUES
(1, 'CONFIRMED',  6998),   -- Ana:  Mouse + Hub
(1, 'CREATED',   29999),   -- Ana:  Monitor
(2, 'CREATED',    4999),   -- Carlos: Audífonos
(3, 'CONFIRMED',  8999),   -- Lucía: Teclado
(3, 'CANCELED',   2199),   -- Lucía: Lámpara (cancelada)
(4, 'CONFIRMED', 54998),   -- Roberto: Silla + Audífonos
(5, 'CREATED',   10997);   -- María: Webcam + Hub + Lámpara

-- ORDER_ITEMS
INSERT INTO order_items (order_id, product_id, qty, unit_price_cents, subtotal_cents) VALUES
-- Orden 1: Ana
(1, 2, 1, 1999,  1999),
(1, 6, 1, 3299,  3299),  -- 6998 total ✓
-- Orden 2: Ana
(2, 4, 1, 29999, 29999), -- 29999 total ✓
-- Orden 3: Carlos
(3, 1, 1, 4999,  4999),  -- 4999 total ✓
-- Orden 4: Lucía
(4, 3, 1, 8999,  8999),  -- 8999 total ✓
-- Orden 5: Lucía (cancelada)
(5, 8, 1, 2199,  2199),  -- 2199 total ✓
-- Orden 6: Roberto
(6, 7, 1, 49999, 49999),
(6, 1, 1, 4999,   4999), -- 54998 total ✓
-- Orden 7: María
(7, 5, 1, 5499,  5499),
(7, 6, 1, 3299,  3299),
(7, 8, 1, 2199,  2199);  -- 10997 total ✓

-- IDEMPOTENCY_KEYS
INSERT INTO idempotency_keys (keyval, target_type, target_id, status, expires_at) VALUES
('key-order-1-ana',     'order', 1, 'completed', CURRENT_TIMESTAMP + INTERVAL 1 DAY),
('key-order-2-ana',     'order', 2, 'pending',   CURRENT_TIMESTAMP + INTERVAL 1 DAY),
('key-order-3-carlos',  'order', 3, 'pending',   CURRENT_TIMESTAMP + INTERVAL 1 DAY),
('key-order-4-lucia',   'order', 4, 'completed', CURRENT_TIMESTAMP + INTERVAL 1 DAY),
('key-order-5-lucia',   'order', 5, 'failed',    CURRENT_TIMESTAMP - INTERVAL 1 HOUR),
('key-order-6-roberto', 'order', 6, 'completed', CURRENT_TIMESTAMP + INTERVAL 1 DAY),
('key-order-7-maria',   'order', 7, 'pending',   CURRENT_TIMESTAMP + INTERVAL 1 DAY);