ALTER TABLE outsourcing_returns
ADD COLUMN IF NOT EXISTS accessory_quantity_returned NUMERIC(15, 2) DEFAULT 0;

COMMENT ON COLUMN outsourcing_returns.accessory_quantity_returned IS 'SL nhập phụ kiện - chỉ theo dõi, không ăn vào báo cáo';
