-- Restore order_ext warehouse data from audit_logs
-- This migration restores warehouse details that were accidentally cleared by updateOrder

UPDATE order_ext oe
SET 
  net_weight_text = COALESCE(oe.net_weight_text, audit.after_data->>'net_weight_text'),
  package_count_text = COALESCE(oe.package_count_text, audit.after_data->>'package_count_text'),
  container_volume_text = COALESCE(oe.container_volume_text, audit.after_data->>'container_volume_text'),
  pallet_info = COALESCE(oe.pallet_info, audit.after_data->>'pallet_info'),
  accessory_status = COALESCE(oe.accessory_status, audit.after_data->>'accessory_status'),
  packaging_spec = COALESCE(oe.packaging_spec, audit.after_data->>'packaging_spec'),
  expected_material_date = COALESCE(oe.expected_material_date, audit.after_data->>'expected_material_date'),
  actual_material_date = COALESCE(oe.actual_material_date, audit.after_data->>'actual_material_date')
FROM (
  SELECT DISTINCT ON (entity_id::int)
    entity_id::int as order_id,
    after_data,
    created_at
  FROM audit_logs
  WHERE entity = 'Order' 
    AND action = 'UPDATE_WAREHOUSE'
    AND after_data IS NOT NULL
  ORDER BY entity_id::int, created_at DESC
) audit
WHERE oe.order_id = audit.order_id
  AND (
    oe.net_weight_text IS NULL OR
    oe.package_count_text IS NULL OR
    oe.container_volume_text IS NULL OR
    oe.pallet_info IS NULL OR
    oe.accessory_status IS NULL OR
    oe.packaging_spec IS NULL OR
    oe.expected_material_date IS NULL OR
    oe.actual_material_date IS NULL
  );
