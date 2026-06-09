UPDATE orders SET status = 'IN_PROGRESS' WHERE status IN ('DRAFT', 'PLANNED', 'CANCELLED') AND deleted_at IS NULL;
