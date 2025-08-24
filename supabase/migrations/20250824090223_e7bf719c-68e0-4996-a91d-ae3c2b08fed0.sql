-- Insert sample data for the salon management system

-- Insert some sample customers
INSERT INTO public.customers (name, email, phone, hair_type, style_preference, notes, created_by) VALUES
('Sarah Johnson', 'sarah.johnson@email.com', '+1-555-0123', 'Curly', 'Long layers with face-framing', 'Prefers natural styling products', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Maria Rodriguez', 'maria.rodriguez@email.com', '+1-555-0234', 'Straight', 'Bob cut', 'Allergic to sulfates', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Jennifer Chen', 'jenny.chen@email.com', '+1-555-0345', 'Wavy', 'Pixie cut', 'Regular customer - monthly appointments', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Emily Davis', 'emily.davis@email.com', '+1-555-0456', 'Thick', 'Shoulder length', 'Color treatment specialist needed', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Amanda Wilson', 'amanda.wilson@email.com', '+1-555-0567', 'Fine', 'Layered cut', 'Prefers eco-friendly products', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b');

-- Insert some sample workers
INSERT INTO public.workers (name, email, phone, role, salary, payment_status, hire_date, created_by) VALUES
('Jessica Martinez', 'jessica@salon.com', '+1-555-1001', 'Senior Hair Stylist', 4500.00, 'paid', '2023-01-15', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Michael Brown', 'michael@salon.com', '+1-555-1002', 'Hair Stylist', 3800.00, 'paid', '2023-03-20', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Lisa Garcia', 'lisa@salon.com', '+1-555-1003', 'Color Specialist', 4200.00, 'pending', '2023-06-10', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('David Thompson', 'david@salon.com', '+1-555-1004', 'Receptionist', 2800.00, 'paid', '2023-02-01', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Rachel Kim', 'rachel@salon.com', '+1-555-1005', 'Junior Stylist', 3200.00, 'pending', '2023-09-15', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Carlos Rodriguez', 'carlos@salon.com', '+1-555-1006', 'Barber', 3500.00, 'overdue', '2023-04-05', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b');

-- Insert inventory categories
INSERT INTO public.inventory_categories (name, description, created_by) VALUES
('Hair Care Products', 'Shampoos, conditioners, and hair treatments', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Styling Products', 'Gels, mousses, sprays, and styling tools', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Color & Chemicals', 'Hair dyes, bleaches, and chemical treatments', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Tools & Equipment', 'Scissors, combs, brushes, and electrical tools', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'),
('Salon Supplies', 'Towels, capes, foils, and general supplies', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b');

-- Insert sample inventory items with proper date casting
INSERT INTO public.inventory_items (name, current_stock, min_stock_level, max_stock_level, unit_price, expiry_date, supplier, barcode, category_id, created_by)
SELECT 
  'Professional Shampoo - 1L', 15, 20, 50, 24.99, '2025-12-31'::date, 'Beauty Supply Co', '123456789012',
  (SELECT id FROM public.inventory_categories WHERE name = 'Hair Care Products' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Moisturizing Conditioner - 1L', 8, 15, 40, 28.50, '2025-10-15'::date, 'Beauty Supply Co', '123456789013',
  (SELECT id FROM public.inventory_categories WHERE name = 'Hair Care Products' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Hair Styling Gel - 250ml', 25, 10, 60, 12.75, '2026-03-20'::date, 'Style Pro Inc', '123456789014',
  (SELECT id FROM public.inventory_categories WHERE name = 'Styling Products' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Hair Spray - Strong Hold', 18, 12, 36, 15.99, '2026-08-10'::date, 'Style Pro Inc', '123456789015',
  (SELECT id FROM public.inventory_categories WHERE name = 'Styling Products' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Hair Dye - Dark Brown', 5, 8, 25, 18.50, '2025-06-30'::date, 'Color Master Ltd', '123456789016',
  (SELECT id FROM public.inventory_categories WHERE name = 'Color & Chemicals' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Bleach Powder - 500g', 3, 6, 20, 22.00, '2025-09-15'::date, 'Color Master Ltd', '123456789017',
  (SELECT id FROM public.inventory_categories WHERE name = 'Color & Chemicals' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Professional Scissors - 6 inch', 12, 5, 15, 89.99, NULL, 'Tool Works Pro', '123456789018',
  (SELECT id FROM public.inventory_categories WHERE name = 'Tools & Equipment' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Hair Brushes - Round', 30, 15, 45, 8.25, NULL, 'Brush & Co', '123456789019',
  (SELECT id FROM public.inventory_categories WHERE name = 'Tools & Equipment' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Salon Towels - White', 0, 25, 100, 3.50, NULL, 'Linen Supply Inc', '123456789020',
  (SELECT id FROM public.inventory_categories WHERE name = 'Salon Supplies' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
UNION ALL SELECT
  'Hair Foils - Aluminum', 2, 10, 50, 12.99, NULL, 'Professional Supply Co', '123456789021',
  (SELECT id FROM public.inventory_categories WHERE name = 'Salon Supplies' LIMIT 1),
  'df16f66a-13d4-4475-b5e0-4eff03ec1a4b';

-- Insert some sample inventory transactions
INSERT INTO public.inventory_transactions (item_id, transaction_type, quantity, unit_price, total_amount, reason, reference_number, created_by)
SELECT 
  i.id, 'in', 25, i.unit_price, (25 * i.unit_price), 'Initial stock purchase', 'PO-2024-001', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
FROM public.inventory_items i 
WHERE i.name = 'Professional Shampoo - 1L'
UNION ALL SELECT
  i.id, 'out', 10, i.unit_price, (10 * i.unit_price), 'Used for customer services', 'USAGE-001', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
FROM public.inventory_items i 
WHERE i.name = 'Professional Shampoo - 1L'
UNION ALL SELECT
  i.id, 'in', 15, i.unit_price, (15 * i.unit_price), 'Restock order', 'PO-2024-002', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
FROM public.inventory_items i 
WHERE i.name = 'Hair Styling Gel - 250ml'
UNION ALL SELECT
  i.id, 'out', 2, i.unit_price, (2 * i.unit_price), 'Color service for customer', 'SERVICE-001', 'df16f66a-13d4-4475-b5e0-4eff03ec1a4b'
FROM public.inventory_items i 
WHERE i.name = 'Hair Dye - Dark Brown';

-- Insert some sample alerts
INSERT INTO public.alerts (type, title, message, severity, entity_type, entity_id, expires_at) VALUES
('low_stock', 'Critical Stock Alert', 'Salon Towels are completely out of stock. Immediate reorder required.', 'critical', 'inventory_item', 
  (SELECT id FROM public.inventory_items WHERE name = 'Salon Towels - White' LIMIT 1), 
  (CURRENT_TIMESTAMP + INTERVAL '7 days')::timestamp with time zone),
('low_stock', 'Low Stock Warning', 'Hair Foils running low. Current stock below minimum level.', 'warning', 'inventory_item', 
  (SELECT id FROM public.inventory_items WHERE name = 'Hair Foils - Aluminum' LIMIT 1), 
  (CURRENT_TIMESTAMP + INTERVAL '5 days')::timestamp with time zone),
('expiring_stock', 'Item Expiring Soon', 'Hair Dye - Dark Brown expires in 4 months. Plan usage accordingly.', 'warning', 'inventory_item', 
  (SELECT id FROM public.inventory_items WHERE name = 'Hair Dye - Dark Brown' LIMIT 1), 
  '2025-06-30'::timestamp with time zone),
('payment_reminder', 'Payment Due', 'Salary payment pending for Lisa Garcia (Color Specialist)', 'warning', 'worker', 
  (SELECT id FROM public.workers WHERE name = 'Lisa Garcia' LIMIT 1), 
  (CURRENT_TIMESTAMP + INTERVAL '3 days')::timestamp with time zone),
('system', 'Welcome Message', 'Welcome to your Salon Management System! Your dashboard is now ready with sample data.', 'info', NULL, NULL, 
  (CURRENT_TIMESTAMP + INTERVAL '30 days')::timestamp with time zone);