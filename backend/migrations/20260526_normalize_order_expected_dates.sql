-- Normalize order expected shipping/container dates from JSONB (order_ext)
-- Goal: make date range filtering index-friendly at 1-5M+ orders
-- PostgreSQL 15
-- 2026-05-26

-- 1) New table
CREATE TABLE IF NOT EXISTS order_expected_dates (
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('shipping', 'container')),
  expected_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id, kind, expected_date)
);

-- 2) Index for range scans
CREATE INDEX IF NOT EXISTS idx_order_expected_dates_kind_date_order
  ON order_expected_dates(kind, expected_date, order_id);

-- 3) Backfill from existing JSONB arrays in order_ext
INSERT INTO order_expected_dates (order_id, kind, expected_date)
SELECT
  oe.order_id,
  'shipping' AS kind,
  (d.value)::date AS expected_date
FROM order_ext oe
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(oe.expected_shipping_date, '[]'::jsonb)) d(value)
WHERE d.value IS NOT NULL
  AND d.value <> ''
  AND d.value ~ '^\\d{4}-\\d{2}-\\d{2}$'
ON CONFLICT DO NOTHING;

INSERT INTO order_expected_dates (order_id, kind, expected_date)
SELECT
  oe.order_id,
  'container' AS kind,
  (d.value)::date AS expected_date
FROM order_ext oe
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(oe.expected_container_shipping_date, '[]'::jsonb)) d(value)
WHERE d.value IS NOT NULL
  AND d.value <> ''
  AND d.value ~ '^\\d{4}-\\d{2}-\\d{2}$'
ON CONFLICT DO NOTHING;
