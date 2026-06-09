ALTER TABLE order_ext
ADD COLUMN IF NOT EXISTS pallet_info TEXT,
ADD COLUMN IF NOT EXISTS accessory_condition TEXT;
