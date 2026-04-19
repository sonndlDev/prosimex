-- Make dinh_muc nullable in product_group_operations
ALTER TABLE product_group_operations ALTER COLUMN dinh_muc DROP NOT NULL;
