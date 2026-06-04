ALTER TABLE outsourcing_ticket_items
ADD COLUMN IF NOT EXISTS accessory_quantity NUMERIC(15, 2) DEFAULT 0;

COMMENT ON COLUMN outsourcing_ticket_items.accessory_quantity IS 'SL xuất phụ kiện/hàng lỗi - chỉ theo dõi, không ăn vào báo cáo';
