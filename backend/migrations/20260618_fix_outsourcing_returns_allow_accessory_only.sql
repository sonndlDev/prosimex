ALTER TABLE outsourcing_returns ALTER COLUMN quantity_returned DROP NOT NULL;
ALTER TABLE outsourcing_returns ALTER COLUMN quantity_returned SET DEFAULT 0;

ALTER TABLE outsourcing_returns
ADD COLUMN IF NOT EXISTS gross_weight NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS pallet_weight NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS net_weight NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS missing_weight NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN outsourcing_returns.quantity_returned IS 'SL nhap BP chinh - co the de 0 khi chi nhap PK';
