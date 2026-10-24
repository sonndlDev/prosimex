# Backend SOLID Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách SQL và business logic ra khỏi controller, áp dụng Controller → Service → Repository pattern cho 4 module phức tạp nhất của prosimex MES backend.

**Architecture:** Controller chỉ parse HTTP request và trả response. Service chứa business logic (tính toán, điều kiện, validation). Repository chứa tất cả SQL query và giao tiếp với pool. Không có breaking change nào với API response format hoặc routes.

**Tech Stack:** Node.js 18+, ESM (`import/export`), PostgreSQL (pg Pool), Express.js. Không có test framework — verify bằng curl.

## Global Constraints

- KHÔNG đổi API response format hay HTTP status codes — chỉ di chuyển code nội bộ
- KHÔNG sửa routes files (`*.routes.js`) trừ khi cần đổi import
- KHÔNG đổi SQL logic — chỉ di chuyển nguyên vẹn sang repository
- Tất cả files dùng ESM: `export const`, `import ... from`
- Pool: `import pool from '../../config/db.js'` (relative từ module folder)
- Base repository path: `backend/src/shared/base.repository.js` — import từ module là `../../shared/base.repository.js`
- Soft delete: mọi query phải giữ `deleted_at IS NULL` filter
- Audit log: mọi mutation phải INSERT vào `audit_logs`
- Transaction: dùng `this.transaction(callback)` từ BaseRepository

---

## Cấu trúc file sẽ tạo / sửa

```
backend/src/
├── shared/
│   └── base.repository.js              [TẠO MỚI — Task 0]
├── modules/
│   ├── order/
│   │   ├── order.repository.js         [TẠO MỚI — Task 1]
│   │   ├── order.service.js            [TẠO MỚI — Task 1]
│   │   ├── order.controller.js         [SỬA — Task 1, giảm xuống ~80 lines]
│   │   ├── order.controller.legacy.js  [TẠO TẠM — Task 1, xóa sau khi full refactor]
│   │   └── order.routes.js             [KHÔNG SỬA]
│   ├── daily-ticket/
│   │   ├── daily-ticket.repository.js  [TẠO MỚI — Task 2]
│   │   ├── daily-ticket.service.js     [TẠO MỚI — Task 2]
│   │   ├── daily-ticket.controller.js  [SỬA — Task 2]
│   │   ├── daily-ticket.controller.legacy.js  [TẠO TẠM — Task 2]
│   │   └── daily-ticket.routes.js      [KHÔNG SỬA]
│   ├── production-planning/
│   │   ├── production-planning.repository.js  [TẠO MỚI — Task 3]
│   │   ├── production-planning.service.js     [TẠO MỚI — Task 3]
│   │   ├── production-planning.controller.js  [SỬA — Task 3]
│   │   ├── production-planning.controller.legacy.js  [TẠO TẠM — Task 3]
│   │   └── production-planning.routes.js      [KHÔNG SỬA]
│   └── outsourcing/
│       ├── outsourcing.repository.js   [TẠO MỚI — Task 4]
│       ├── outsourcing.service.js      [TẠO MỚI — Task 4]
│       ├── outsourcing.controller.js   [SỬA — Task 4]
│       ├── outsourcing.controller.legacy.js  [TẠO TẠM — Task 4]
│       └── outsourcing.routes.js       [KHÔNG SỬA]
```

---

## Task 0: Base Repository

**Files:**
- Tạo: `backend/src/shared/base.repository.js`

**Interfaces:**
- Produces: `BaseRepository` class với `query(text, params)` và `transaction(callback)`
- Không có consumer hiện tại — Task 1-4 sẽ import

- [ ] **Step 1: Tạo thư mục và file base.repository.js**

```javascript
// backend/src/shared/base.repository.js
import pool from '../config/db.js';

export class BaseRepository {
  async query(text, params) {
    return pool.query(text, params);
  }

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
```

- [ ] **Step 2: Verify import path**

```bash
# Từ backend/
node --input-type=module <<'EOF'
import { BaseRepository } from './src/shared/base.repository.js'
console.log('OK', typeof BaseRepository)
EOF
```

Expected: `OK function`

**Checker 0:** Import path `../config/db.js` resolve đúng từ `shared/` → `backend/src/config/db.js`.

---

## Task 1: Order Module

**Files:**
- Tạo: `backend/src/modules/order/order.repository.js`
- Tạo: `backend/src/modules/order/order.service.js`
- Sửa: `backend/src/modules/order/order.controller.js`
- Tạo tạm: `backend/src/modules/order/order.controller.legacy.js`

**Interfaces:**
- Consumes: `BaseRepository` từ `../../shared/base.repository.js`
- Consumes: `insertOrderProductWithSnapshot`, `refreshOrderProductSnapshots`, `snapshotOrderProducts` từ `../../utils/order-product-snapshot.util.js`
- Controller vẫn export đúng các function mà `order.routes.js` đang import: `getOrders`, `getOrderById`, `getOrderCompletionReport`, `getOrderSummaryReport`, `createOrder`, `updateOrder`, `deleteOrder`, `updateWarehouseDetails`, `getOrderProductSnapshots`

### 1A: Order Repository

- [ ] **Step 1A-1: Tạo order.repository.js với buildWhereClause và read queries**

```javascript
// backend/src/modules/order/order.repository.js
import { BaseRepository } from '../../shared/base.repository.js';

export class OrderRepository extends BaseRepository {
  buildWhereClause(filters) {
    const {
      factory_id, search, status, customer_id, product_id,
      person_in_charge, location, startDate, endDate, dateType = 'received',
    } = filters;

    let clause = 'WHERE o.deleted_at IS NULL';
    const params = [];

    if (factory_id) {
      params.push(factory_id);
      clause += ` AND o.factory_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      clause += ` AND (o.name ILIKE $${params.length} OR o.order_code ILIKE $${params.length} OR c.name ILIKE $${params.length} OR o.po_customer ILIKE $${params.length})`;
    }
    if (status && status !== 'ALL') {
      if (status === 'INCOMPLETE') {
        clause += ` AND o.status != 'DONE'`;
      } else {
        params.push(status);
        clause += ` AND o.status = $${params.length}`;
      }
    }
    if (customer_id && customer_id !== 'ALL') {
      params.push(customer_id);
      clause += ` AND o.customer_id = $${params.length}`;
    }
    if (product_id && product_id !== 'ALL') {
      params.push(product_id);
      clause += ` AND EXISTS (
        SELECT 1 FROM order_products op_f
        JOIN products p_f ON op_f.product_id = p_f.id AND p_f.deleted_at IS NULL
        WHERE op_f.order_id = o.id AND op_f.product_id = $${params.length}
      )`;
    }
    if (person_in_charge) {
      params.push(`%${person_in_charge}%`);
      clause += ` AND o.person_in_charge ILIKE $${params.length}`;
    }
    if (location) {
      params.push(`%${location}%`);
      clause += ` AND o.production_location ILIKE $${params.length}`;
    }
    if (startDate && endDate) {
      if (dateType === 'shipping' || dateType === 'container') {
        const jsonbCol = dateType === 'shipping'
          ? 'oe.expected_shipping_date'
          : 'oe.expected_container_shipping_date';
        clause += ` AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(${jsonbCol}) d WHERE d::date >= $${params.length + 1} AND d::date <= $${params.length + 2})`;
        params.push(startDate, endDate);
      } else {
        let dateCol = 'o.received_date';
        if (dateType === 'production_start') dateCol = 'oe.production_start_date';
        params.push(startDate);
        clause += ` AND ${dateCol} >= $${params.length}`;
        params.push(endDate);
        clause += ` AND ${dateCol} <= $${params.length}`;
      }
    }

    return { clause, params };
  }

  async countOrders(filters) {
    const { clause, params } = this.buildWhereClause(filters);
    const result = await this.query(`
      SELECT COUNT(*)
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      ${clause}
    `, params);
    return parseInt(result.rows[0].count);
  }

  async findOrders(filters, pagination) {
    const { clause, params } = this.buildWhereClause(filters);
    const { limit, offset } = pagination;
    // SQL copied verbatim from order.controller.js lines 103-226 (CTE with product_stage_data, product_actuals, product_percentages, order_completion)
    const sql = `
      WITH product_stage_data AS (
        SELECT 
          op.order_id, op.product_id, op.quantity as required,
          COALESCE(op.product_group_id, p_active.product_group_id) as effective_group_id,
          COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) as has_xi_ma,
          COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) as has_dong_goi,
          CASE
            WHEN COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) AND COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 4
            WHEN COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 2
            ELSE 0
          END as stage_count,
          COALESCE(ss.final_pgo_id, (
            SELECT pgo.id FROM product_group_operations pgo 
            WHERE pgo.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
            AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order DESC LIMIT 1
          ), NULL) as final_pgo_id
        FROM order_products op
        JOIN products p_active ON op.product_id = p_active.id AND p_active.deleted_at IS NULL
        LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
          AND psc.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
        LEFT JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
      ),
      product_actuals AS (
        SELECT 
          psd.order_id, psd.product_id, psd.required, psd.stage_count, psd.has_xi_ma, psd.has_dong_goi,
          CASE WHEN psd.has_xi_ma THEN COALESCE((
            SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
            JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
            WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
            AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
          ), 0)::numeric ELSE 0 END as xi_ma_di,
          CASE WHEN psd.has_xi_ma THEN COALESCE((
            SELECT SUM(or_t.quantity_returned) FROM outsourcing_returns or_t
            JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
            JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
            WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
            AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
          ), 0)::numeric ELSE 0 END as xi_ma_ve,
          CASE WHEN psd.has_dong_goi THEN COALESCE((
            SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
            JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
            WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
            AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
          ), 0)::numeric ELSE 0 END as dong_goi,
          COALESCE((
            SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti
            JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
            WHERE dti.order_id = psd.order_id AND dti.product_id = psd.product_id
            AND dt.deleted_at IS NULL
            AND (psd.final_pgo_id IS NULL OR dti.product_group_operation_id = psd.final_pgo_id)
          ), 0)::numeric as sx
        FROM product_stage_data psd
      ),
      product_percentages AS (
        SELECT pa.order_id, pa.product_id, pa.required, pa.stage_count,
          CASE
            WHEN pa.stage_count = 4 THEN
              ROUND((LEAST(pa.xi_ma_di, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.xi_ma_ve, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 4.0, 2)
            WHEN pa.stage_count = 2 THEN
              ROUND((LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 2.0, 2)
            WHEN pa.stage_count = 0 AND pa.required > 0 THEN
              ROUND(LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0), 2)
            ELSE 0
          END as product_percentage
        FROM product_actuals pa
      ),
      order_completion AS (
        SELECT order_id, ROUND(SUM(product_percentage) / COUNT(*), 2) as completion_percentage
        FROM product_percentages GROUP BY order_id
      )
      SELECT o.*, c.name as customer_name,
             COALESCE(cu.full_name, cu.username) as creator_name,
             COALESCE(mu.full_name, mu.username) as modifier_name,
             oe.production_start_date, oe.expected_shipping_date,
             oe.expected_container_shipping_date, oe.customer_confirmation_result,
             oe.pallet_info, oe.accessory_status, oe.expected_material_date, oe.actual_material_date,
             COALESCE(oc.completion_percentage, 0) as completion_percentage,
             COALESCE(
               json_agg(json_build_object(
                 'product_id', op.product_id,
                 'product_name', COALESCE(op.product_name, p.name),
                 'quantity', op.quantity,
                 'product_group_id', COALESCE(op.product_group_id, p.product_group_id),
                 'product_group_name', pg.name
               )) FILTER (WHERE op.product_id IS NOT NULL),
               '[]'
             ) as products
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users mu ON o.modified_by = mu.id
      LEFT JOIN order_completion oc ON o.id = oc.order_id
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN product_groups pg ON COALESCE(op.product_group_id, p.product_group_id) = pg.id
      ${clause}
      GROUP BY o.id, c.name, cu.full_name, cu.username, mu.full_name, mu.username,
               oe.production_start_date, oe.expected_shipping_date,
               oe.expected_container_shipping_date, oe.customer_confirmation_result,
               oe.pallet_info, oe.accessory_status, oe.expected_material_date, oe.actual_material_date,
               oc.completion_percentage
      ORDER BY o.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const result = await this.query(sql, [...params, limit, offset]);
    return result.rows;
  }

  async findById(id) {
    const sql = `
      SELECT o.*, c.name as customer_name,
             COALESCE(cu.full_name, cu.username) as creator_name,
             COALESCE(mu.full_name, mu.username) as modifier_name,
             oe.production_start_date, oe.expected_shipping_date,
             oe.expected_container_shipping_date, oe.customer_confirmation_result,
             oe.pallet_info, oe.accessory_status, oe.expected_material_date, oe.actual_material_date,
             COALESCE(
               json_agg(json_build_object(
                 'product_id', op.product_id,
                 'product_name', COALESCE(op.product_name, p.name),
                 'quantity', op.quantity,
                 'product_group_id', COALESCE(op.product_group_id, p.product_group_id),
                 'product_group_name', pg.name
               )) FILTER (WHERE op.product_id IS NOT NULL),
               '[]'
             ) as products
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users mu ON o.modified_by = mu.id
      LEFT JOIN order_products op ON o.id = op.order_id
      LEFT JOIN products p ON op.product_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN product_groups pg ON COALESCE(op.product_group_id, p.product_group_id) = pg.id
      WHERE o.id = $1 AND o.deleted_at IS NULL
      GROUP BY o.id, c.name, cu.full_name, cu.username, mu.full_name, mu.username,
               oe.production_start_date, oe.expected_shipping_date,
               oe.expected_container_shipping_date, oe.customer_confirmation_result,
               oe.pallet_info, oe.accessory_status, oe.expected_material_date, oe.actual_material_date
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0] ?? null;
  }

  async findStatusById(id) {
    const result = await this.query(
      'SELECT status FROM orders WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async getCompletionReportDone(orderId) {
    // SQL từ order.controller.js isDone branch (~lines 389-680)
    const sql = `
      WITH product_stages AS (
          SELECT ss.product_id, ss.total_stages, ss.final_pgo_id, ss.has_xi_ma, ss.has_dong_goi, ss.stage_count
          FROM order_product_snapshots ss WHERE ss.order_id = $1
      ),
      inhouse_totals AS (
        SELECT dti.product_id, dti.product_group_operation_id, SUM(dti.actual_quantity) as qty
        FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dti.order_id = $1 AND dt.deleted_at IS NULL
        GROUP BY dti.product_id, dti.product_group_operation_id
      ),
      sx_totals AS (
        SELECT it.product_id, SUM(it.qty) as total_sx
        FROM inhouse_totals it
        JOIN product_stages ps ON ps.product_id = it.product_id
        WHERE ps.final_pgo_id IS NULL OR ps.final_pgo_id = it.product_group_operation_id
        GROUP BY it.product_id
      ),
      plating_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_plating_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      plating_returns AS (
        SELECT oti.product_id, SUM(or_t.quantity_returned) as total_plating_returned
        FROM outsourcing_returns or_t
        JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
        JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      packaging_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_packaging_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      )
      SELECT
        p.id as product_id,
        COALESCE(op.product_name, p.name) as product_code,
        op.quantity as required_quantity,
        ps.has_xi_ma, ps.has_dong_goi, ps.stage_count,
        COALESCE(st.total_sx, 0) as sx_quantity,
        (SELECT COALESCE(SUM(pp2.inventory_input), 0) FROM production_plans pp2
         WHERE pp2.order_id = $1 AND pp2.product_id = p.id AND pp2.deleted_at IS NULL
         AND (ps.final_pgo_id IS NULL OR pp2.product_group_operation_id = ps.final_pgo_id)) as inventory_input,
        COALESCE(pt.total_plating_out, 0) as plating_out_quantity,
        COALESCE(pr.total_plating_returned, 0) as plating_returned_quantity,
        COALESCE(pkt.total_packaging_out, 0) as packaging_out_quantity
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN product_stages ps ON p.id = ps.product_id
      JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
      LEFT JOIN sx_totals st ON p.id = st.product_id
      LEFT JOIN plating_totals pt ON p.id = pt.product_id
      LEFT JOIN plating_returns pr ON p.id = pr.product_id
      LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
      WHERE op.order_id = $1
    `;
    const result = await this.query(sql, [orderId]);
    return result.rows;
  }

  async getCompletionReportLive(orderId) {
    // SQL từ order.controller.js non-DONE branch (~lines 686-800)
    const sql = `
      WITH product_stages AS (
          SELECT
              op.product_id,
              COALESCE(op.product_group_id, p.product_group_id) AS effective_group_id,
              (SELECT pgo.id FROM product_group_operations pgo WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order ASC LIMIT 1) as start_pgo_id,
              (SELECT pgo.id FROM product_group_operations pgo WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order DESC LIMIT 1) as final_pgo_id,
              (SELECT o2.name FROM product_group_operations pgo JOIN operations o2 ON pgo.operation_id = o2.id WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order DESC LIMIT 1) as final_op_name,
              EXISTS (SELECT 1 FROM outsourcing_tickets ot JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id WHERE oti.order_id = $1 AND oti.product_id = op.product_id AND ot.type = 'PLATING' AND ot.deleted_at IS NULL) as has_xi_ma,
              EXISTS (SELECT 1 FROM outsourcing_tickets ot JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id WHERE oti.order_id = $1 AND oti.product_id = op.product_id AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL) as has_dong_goi
          FROM order_products op
          JOIN products p ON op.product_id = p.id
          WHERE op.order_id = $1
      ),
      plating_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_plating_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      plating_returns AS (
        SELECT oti.product_id, SUM(or_t.quantity_returned) as total_plating_returned
        FROM outsourcing_returns or_t
        JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
        JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      packaging_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_packaging_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      )
      SELECT
          p.id as product_id,
          COALESCE(op.product_name, p.name) as product_name,
          op.quantity as required_quantity,
          ps.final_op_name, ps.has_xi_ma, ps.has_dong_goi,
          COALESCE((SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti JOIN daily_production_tickets dt ON dt.id = dti.ticket_id WHERE dti.order_id = $1 AND dti.product_id = p.id AND dti.product_group_operation_id = ps.start_pgo_id AND dt.deleted_at IS NULL), 0) as started_quantity,
          COALESCE((SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti JOIN daily_production_tickets dt ON dt.id = dti.ticket_id WHERE dti.order_id = $1 AND dti.product_id = p.id AND dti.product_group_operation_id = ps.final_pgo_id AND dt.deleted_at IS NULL), 0) as finished_quantity,
          COALESCE((SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti JOIN daily_production_tickets dt ON dt.id = dti.ticket_id WHERE dti.order_id = $1 AND dti.product_id = p.id AND dt.deleted_at IS NULL), 0) as total_sx_quantity,
          COALESCE(pt.total_plating_out, 0) as plating_out_quantity,
          COALESCE(pr.total_plating_returned, 0) as plating_returned_quantity,
          COALESCE(pkt.total_packaging_out, 0) as packaging_out_quantity,
          (SELECT COALESCE(SUM(pp2.inventory_input), 0) FROM production_plans pp2
           WHERE pp2.order_id = $1 AND pp2.product_id = p.id AND pp2.deleted_at IS NULL
           AND (ps.final_pgo_id IS NULL OR pp2.product_group_operation_id = ps.final_pgo_id)) as inventory_input
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN product_stages ps ON p.id = ps.product_id
      LEFT JOIN plating_totals pt ON p.id = pt.product_id
      LEFT JOIN plating_returns pr ON p.id = pr.product_id
      LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
      WHERE op.order_id = $1
    `;
    const result = await this.query(sql, [orderId]);
    return result.rows;
  }

  async getProductSnapshots(orderId) {
    const result = await this.query(`
      SELECT ops.*, p.name as product_name, p.code as product_code
      FROM order_product_snapshots ops
      JOIN products p ON ops.product_id = p.id AND p.deleted_at IS NULL
      WHERE ops.order_id = $1
      ORDER BY p.name
    `, [orderId]);
    return result.rows;
  }

  async insertOrder(client, data) {
    const {
      order_code, name, customer_id, firstProductId, po_customer,
      received_date, delivery_date, totalQuantity, production_location,
      person_in_charge, note, factory_id, created_by,
    } = data;
    const result = await client.query(
      `INSERT INTO orders (order_code, name, customer_id, product_id, po_customer,
        received_date, delivery_date, quantity, production_location, person_in_charge,
        note, factory_id, created_by, modified_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13) RETURNING id`,
      [order_code, name, customer_id, firstProductId, po_customer,
       received_date, delivery_date || null, totalQuantity, production_location,
       person_in_charge, note, factory_id, created_by]
    );
    return result.rows[0].id;
  }

  async upsertOrderExt(client, orderId, extData) {
    const { production_start_date, expected_shipping_date, expected_container_shipping_date,
            customer_confirmation_result, pallet_info, accessory_status,
            expected_material_date, actual_material_date } = extData;
    const shippingDateVal = Array.isArray(expected_shipping_date)
      ? JSON.stringify(expected_shipping_date)
      : JSON.stringify(expected_shipping_date ? [expected_shipping_date] : []);
    const containerDateVal = Array.isArray(expected_container_shipping_date)
      ? JSON.stringify(expected_container_shipping_date)
      : JSON.stringify(expected_container_shipping_date ? [expected_container_shipping_date] : []);
    await client.query(
      `INSERT INTO order_ext (order_id, production_start_date, expected_shipping_date,
         expected_container_shipping_date, customer_confirmation_result, pallet_info,
         accessory_status, expected_material_date, actual_material_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (order_id) DO UPDATE SET
         production_start_date = COALESCE(EXCLUDED.production_start_date, order_ext.production_start_date),
         expected_shipping_date = COALESCE(EXCLUDED.expected_shipping_date, order_ext.expected_shipping_date),
         expected_container_shipping_date = COALESCE(EXCLUDED.expected_container_shipping_date, order_ext.expected_container_shipping_date),
         customer_confirmation_result = COALESCE(EXCLUDED.customer_confirmation_result, order_ext.customer_confirmation_result),
         pallet_info = COALESCE(EXCLUDED.pallet_info, order_ext.pallet_info),
         accessory_status = COALESCE(EXCLUDED.accessory_status, order_ext.accessory_status),
         expected_material_date = COALESCE(EXCLUDED.expected_material_date, order_ext.expected_material_date),
         actual_material_date = COALESCE(EXCLUDED.actual_material_date, order_ext.actual_material_date)`,
      [orderId, production_start_date || null, shippingDateVal, containerDateVal,
       customer_confirmation_result || null, pallet_info || null,
       accessory_status || null, expected_material_date || null, actual_material_date || null]
    );
  }

  async insertAuditLog(client, { userId, action, entity, entityId, beforeData, afterData }) {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entity, entityId, beforeData, afterData]
    );
  }

  async softDelete(client, id, modifiedBy) {
    const result = await client.query(
      `UPDATE orders SET deleted_at = NOW(), modified_by = $2
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, modifiedBy]
    );
    return result.rows[0] ?? null;
  }
}

export const orderRepository = new OrderRepository();
```

**Checker 1A.1:** Methods: `buildWhereClause`, `countOrders`, `findOrders`, `findById`, `findStatusById`, `getCompletionReportDone`, `getCompletionReportLive`, `getProductSnapshots`, `insertOrder`, `upsertOrderExt`, `insertAuditLog`, `softDelete` — tất cả đều có.

**Checker 1A.2:** File không có `import pool` — BaseRepository quản lý pool.

**Checker 1A.3:** `getCompletionReportDone` và `getCompletionReportLive` đều có filter `final_pgo_id IS NULL OR pp2.product_group_operation_id = ps.final_pgo_id` trong subquery `inventory_input`.

### 1B: Order Service

- [ ] **Step 1B-1: Tạo order.service.js**

```javascript
// backend/src/modules/order/order.service.js
import { orderRepository } from './order.repository.js';
import {
  insertOrderProductWithSnapshot,
} from '../../utils/order-product-snapshot.util.js';

function calcCompletionPercentage(row) {
  const required = parseFloat(row.required_quantity) || 0;
  if (required <= 0) return 0;

  const stageCount = parseInt(row.stage_count) || 0;
  const sxRaw = parseFloat(row.sx_quantity) || 0;
  const inventory = parseFloat(row.inventory_input) || 0;
  const sxEffective = sxRaw + inventory;
  const platingOut = parseFloat(row.plating_out_quantity) || 0;
  const platingReturned = parseFloat(row.plating_returned_quantity) || 0;
  const packagingOut = parseFloat(row.packaging_out_quantity) || 0;

  if (stageCount === 4) {
    return (
      Math.min(platingOut, required) * 100 / required
      + Math.min(platingReturned, required) * 100 / required
      + Math.min(packagingOut, required) * 100 / required
      + Math.min(sxEffective, required) * 100 / required
    ) / 4;
  }
  if (stageCount === 2) {
    return (
      Math.min(packagingOut, required) * 100 / required
      + Math.min(sxEffective, required) * 100 / required
    ) / 2;
  }
  return Math.min(sxEffective, required) * 100 / required;
}

export const orderService = {
  async getOrders(filters, pagination) {
    const [total, rows] = await Promise.all([
      orderRepository.countOrders(filters),
      orderRepository.findOrders(filters, pagination),
    ]);
    return { total, rows };
  },

  async getOrderById(id) {
    return orderRepository.findById(id);
  },

  async getCompletionReport(orderId) {
    const statusRow = await orderRepository.findStatusById(orderId);
    if (!statusRow) return null;

    const isDone = statusRow.status === 'DONE';
    const rows = isDone
      ? await orderRepository.getCompletionReportDone(orderId)
      : await orderRepository.getCompletionReportLive(orderId);

    const enriched = rows.map((row) => ({
      ...row,
      sx_quantity: parseFloat(row.sx_quantity) || 0,
      completion_percentage: calcCompletionPercentage(row),
    }));

    const totalPct = enriched.reduce((sum, r) => sum + r.completion_percentage, 0);
    const overall = enriched.length > 0 ? totalPct / enriched.length : 0;

    return {
      data: enriched,
      overall_completion_percentage: Math.round(overall * 100) / 100,
    };
  },

  async getProductSnapshots(orderId) {
    return orderRepository.getProductSnapshots(orderId);
  },

  async createOrder(body, userId) {
    const items = body.product_items
      || (body.product_ids ? body.product_ids.map((id) => ({ product_id: id, quantity: body.quantity || 0 })) : []);
    const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) || body.quantity || 0;
    const firstProductId = items.length > 0 ? items[0].product_id : null;

    return orderRepository.transaction(async (client) => {
      const orderId = await orderRepository.insertOrder(client, {
        ...body, firstProductId, totalQuantity, created_by: userId,
      });

      for (const item of items) {
        await insertOrderProductWithSnapshot(client, orderId, item.product_id, item.quantity);
      }

      await client.query('UPDATE orders SET po_auto_code = $1 WHERE id = $2', [body.po_auto_code || null, orderId]);

      const hasExt = body.production_start_date || body.expected_shipping_date
        || body.expected_container_shipping_date || body.customer_confirmation_result
        || body.pallet_info || body.accessory_status || body.expected_material_date || body.actual_material_date;
      if (hasExt) await orderRepository.upsertOrderExt(client, orderId, body);

      const newOrderRes = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
      const newOrder = newOrderRes.rows[0];

      await orderRepository.insertAuditLog(client, {
        userId, action: 'CREATE', entity: 'Order', entityId: orderId,
        beforeData: null, afterData: newOrder,
      });

      return newOrder;
    });
  },

  async deleteOrder(id, userId) {
    return orderRepository.transaction(async (client) => {
      const beforeRes = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL', [id]
      );
      if (beforeRes.rowCount === 0) return null;

      const deleted = await orderRepository.softDelete(client, id, userId);

      await orderRepository.insertAuditLog(client, {
        userId, action: 'DELETE', entity: 'Order', entityId: id,
        beforeData: beforeRes.rows[0], afterData: deleted,
      });

      return deleted;
    });
  },
};
```

**Checker 1B.1:** `calcCompletionPercentage` là pure function — không gọi DB, không có side effect.
**Checker 1B.2:** Không có `pool.query` hay `pool.connect` trong file.
**Checker 1B.3:** `createOrder` và `deleteOrder` dùng `orderRepository.transaction()`.

### 1C: Slim Order Controller

- [ ] **Step 1C-1: Sửa order.controller.js thành slim HTTP layer**

```javascript
// backend/src/modules/order/order.controller.js
import { orderService } from './order.service.js';

export const getOrders = async (req, res) => {
  try {
    const {
      factory_id, page = 1, limit = 10, search = '',
      startDate, endDate, dateType = 'received',
      status, customer_id, product_id, person_in_charge, location,
    } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;

    const { total, rows } = await orderService.getOrders(
      { factory_id, search, status, customer_id, product_id, person_in_charge, location, startDate, endDate, dateType },
      { limit: limitInt, offset: (pageInt - 1) * limitInt }
    );

    res.json({
      data: rows,
      pagination: { total, page: pageInt, limit: limitInt, totalPages: Math.ceil(total / limitInt) },
    });
  } catch (error) {
    console.error('getOrders Error:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('getOrderById Error:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

export const getOrderCompletionReport = async (req, res) => {
  try {
    const report = await orderService.getCompletionReport(req.params.id);
    if (!report) return res.status(404).json({ message: 'Order not found' });
    res.json(report);
  } catch (error) {
    console.error('getOrderCompletionReport Error:', error);
    res.status(500).json({ message: 'Error fetching completion report' });
  }
};

export const getOrderProductSnapshots = async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ message: 'order_id is required' });
    const rows = await orderService.getProductSnapshots(order_id);
    res.json(rows);
  } catch (error) {
    console.error('getOrderProductSnapshots Error:', error);
    res.status(500).json({ message: 'Error fetching snapshots' });
  }
};

export const createOrder = async (req, res) => {
  try {
    const newOrder = await orderService.createOrder(req.body, req.user.id);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('createOrder Error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const deleted = await orderService.deleteOrder(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully', order: deleted });
  } catch (error) {
    console.error('deleteOrder Error:', error);
    res.status(500).json({ message: 'Error deleting order' });
  }
};

// updateOrder, updateWarehouseDetails, getOrderSummaryReport chưa refactor — giữ nguyên trong legacy
export { updateOrder, updateWarehouseDetails, getOrderSummaryReport } from './order.controller.legacy.js';
```

- [ ] **Step 1C-2: Tạo order.controller.legacy.js**

Copy nguyên vẹn `updateOrder`, `updateWarehouseDetails`, `getOrderSummaryReport` từ file controller gốc (không sửa gì). Thêm comment đầu file:

```javascript
// TEMPORARY: Functions chưa refactor — xóa file này sau khi extract sang service/repository.
import pool from '../../config/db.js';
import {
  ORDER_PRODUCT_JSON_FIELDS,
  insertOrderProductWithSnapshot,
  refreshOrderProductSnapshots,
  snapshotOrderProducts,
} from '../../utils/order-product-snapshot.util.js';

// ... paste updateOrder, updateWarehouseDetails, getOrderSummaryReport nguyên vẹn
```

**Checker 1C.1:** `order.routes.js` không cần sửa — vẫn import đúng 9 functions như cũ.
**Checker 1C.2:** `order.controller.js` mới không có `pool.query` hay `pool.connect` (ngoại trừ `export ... from legacy`).

### 1D: Verify Order Module

- [ ] **Step 1D-1: Restart backend**

```bash
# Từ backend/
node src/server.js
```

Quan sát log — không có "Cannot find module", "SyntaxError", "TypeError".

- [ ] **Step 1D-2: Test GET orders**

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/orders?page=1&limit=3" | jq '{total: .pagination.total, count: (.data | length)}'
```

Expected: `{ "total": <N>, "count": 3 }`

- [ ] **Step 1D-3: Test completion report**

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/orders/<ORDER_ID>/completion-report" \
  | jq '{overall: .overall_completion_percentage, first_product: .data[0].product_code}'
```

Expected: Response hợp lệ, không có 500.

- [ ] **Step 1D-4: Test create order**

```bash
curl -X POST -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"order_code":"TEST001","name":"Test","customer_id":1,"product_items":[{"product_id":1,"quantity":100}]}' \
  "http://localhost:3000/api/orders"
```

Expected: 201 với order object.

**Checker 1D:** Tất cả 4 curl trả response đúng, không có 500 error. `audit_logs` có record mới sau POST.

---

## Task 2: Daily Ticket Module

**Files:**
- Tạo: `backend/src/modules/daily-ticket/daily-ticket.repository.js`
- Tạo: `backend/src/modules/daily-ticket/daily-ticket.service.js`
- Sửa: `backend/src/modules/daily-ticket/daily-ticket.controller.js`
- Tạo tạm: `backend/src/modules/daily-ticket/daily-ticket.controller.legacy.js`

**Interfaces:**
- Consumes: `BaseRepository` từ `../../shared/base.repository.js`
- `daily-ticket.routes.js` import: `getTickets`, `getTicketById`, `createTicket`, `updateTicket`, `deleteTicket`, `approveTicket`, `rejectTicket`, `generateTickets` — tất cả phải vẫn export được

### 2A: Daily Ticket Repository

- [ ] **Step 2A-1: Tạo daily-ticket.repository.js**

```javascript
// backend/src/modules/daily-ticket/daily-ticket.repository.js
import { BaseRepository } from '../../shared/base.repository.js';

export class DailyTicketRepository extends BaseRepository {
  buildWhereClause(filters) {
    const { startDate, endDate, status, is_manual, created_by, ticket_code, operation_name, search, exclude_pending } = filters;

    let clause = `WHERE dt.deleted_at IS NULL
      AND (o.id IS NULL OR o.deleted_at IS NULL)
      AND (p.id IS NULL OR p.deleted_at IS NULL)`;
    const params = [];

    if (startDate) { params.push(startDate); clause += ` AND dt.ticket_date >= $${params.length}`; }
    if (endDate) { params.push(endDate); clause += ` AND dt.ticket_date <= $${params.length}`; }
    if (status && status !== 'ALL') {
      params.push(status); clause += ` AND dt.status = $${params.length}`;
    } else if (exclude_pending === 'true') {
      clause += ` AND dt.status NOT IN ('PENDING_APPROVAL', 'REJECTED')`;
    }
    if (is_manual === 'true') clause += ` AND dt.is_manual = true`;
    if (created_by) { params.push(parseInt(created_by, 10)); clause += ` AND dt.created_by = $${params.length}`; }
    if (ticket_code) {
      const match = ticket_code.match(/\d{8}(\d+)/);
      if (match) { params.push(match[1]); clause += ` AND CAST(dt.id AS TEXT) = $${params.length}`; }
      else { params.push(`%${ticket_code}%`); clause += ` AND CAST(dt.id AS TEXT) ILIKE $${params.length}`; }
    }
    if (operation_name) {
      params.push(`%${operation_name}%`);
      clause += ` AND (dti.operation_name ILIKE $${params.length} OR op.name ILIKE $${params.length})`;
    }
    if (search) {
      params.push(`%${search}%`);
      clause += ` AND (o.name ILIKE $${params.length} OR o.po_customer ILIKE $${params.length} OR p.name ILIKE $${params.length} OR CAST(dt.id AS TEXT) ILIKE $${params.length} OR cu.username ILIKE $${params.length} OR cu.full_name ILIKE $${params.length})`;
    }

    return { clause, params };
  }

  async countTickets(filters) {
    const { clause, params } = this.buildWhereClause(filters);
    const result = await this.query(`
      SELECT COUNT(DISTINCT dt.id)
      FROM daily_production_tickets dt
      LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
      LEFT JOIN orders o ON dti.order_id = o.id
      LEFT JOIN products p ON dti.product_id = p.id
      LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
      LEFT JOIN operations op ON pgo.operation_id = op.id
      LEFT JOIN users cu ON dt.created_by = cu.id
      ${clause}
    `, params);
    return parseInt(result.rows[0].count);
  }

  async findTickets(filters, pagination) {
    const { clause, params } = this.buildWhereClause(filters);
    const { limit, offset } = pagination;
    // SELECT copied from daily-ticket.controller.js lines 75-200
    const sql = `
      SELECT 
        dt.id, dt.id as master_id,
        dt.status as ticket_status,
        dt.ticket_date, dt.is_manual, dt.notes,
        dt.created_at, dt.updated_at,
        COALESCE(cu.full_name, cu.username) as created_by_name,
        COALESCE(au.full_name, au.username) as approved_by_name,
        dt.approved_at, dt.rejected_reason,
        json_agg(
          DISTINCT jsonb_build_object(
            'item_id', dti.id,
            'order_id', dti.order_id,
            'order_name', o.name,
            'order_code', o.order_code,
            'po_customer', o.po_customer,
            'product_id', dti.product_id,
            'product_name', p.name,
            'planned_quantity', dti.planned_quantity,
            'actual_quantity', dti.actual_quantity,
            'operation_name', COALESCE(dti.operation_name, op.name),
            'machine_name', m.name,
            'worker_name', w.name,
            'product_group_operation_id', dti.product_group_operation_id
          )
        ) FILTER (WHERE dti.id IS NOT NULL) as items
      FROM daily_production_tickets dt
      LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
      LEFT JOIN orders o ON dti.order_id = o.id
      LEFT JOIN products p ON dti.product_id = p.id
      LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
      LEFT JOIN operations op ON pgo.operation_id = op.id
      LEFT JOIN machines m ON dti.machine_id = m.id
      LEFT JOIN workers w ON dti.worker_id = w.id
      LEFT JOIN users cu ON dt.created_by = cu.id
      LEFT JOIN users au ON dt.approved_by = au.id
      ${clause}
      GROUP BY dt.id, cu.full_name, cu.username, au.full_name, au.username
      ORDER BY dt.ticket_date DESC, dt.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const result = await this.query(sql, [...params, limit, offset]);
    return result.rows;
  }

  async findById(id) {
    const result = await this.query(`
      SELECT dt.*,
        COALESCE(cu.full_name, cu.username) as created_by_name,
        json_agg(jsonb_build_object(
          'item_id', dti.id, 'order_id', dti.order_id, 'product_id', dti.product_id,
          'planned_quantity', dti.planned_quantity, 'actual_quantity', dti.actual_quantity,
          'product_group_operation_id', dti.product_group_operation_id,
          'machine_id', dti.machine_id, 'worker_id', dti.worker_id
        )) FILTER (WHERE dti.id IS NOT NULL) as items
      FROM daily_production_tickets dt
      LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
      LEFT JOIN users cu ON dt.created_by = cu.id
      WHERE dt.id = $1 AND dt.deleted_at IS NULL
      GROUP BY dt.id, cu.full_name, cu.username
    `, [id]);
    return result.rows[0] ?? null;
  }

  async updateStatus(client, id, status, approvedBy, rejectedReason) {
    const sets = ['status = $2', 'updated_at = NOW()'];
    const params = [id, status];
    if (approvedBy) { params.push(approvedBy); sets.push(`approved_by = $${params.length}`, 'approved_at = NOW()'); }
    if (rejectedReason) { params.push(rejectedReason); sets.push(`rejected_reason = $${params.length}`); }
    const result = await client.query(
      `UPDATE daily_production_tickets SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );
    return result.rows[0] ?? null;
  }

  async insertAuditLog(client, { userId, action, entity, entityId, beforeData, afterData }) {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entity, entityId, beforeData, afterData]
    );
  }
}

export const dailyTicketRepository = new DailyTicketRepository();
```

**Checker 2A.1:** `buildWhereClause` xử lý đủ 9 filters từ controller gốc.
**Checker 2A.2:** Không import `pool` trực tiếp.

### 2B: Daily Ticket Service

- [ ] **Step 2B-1: Tạo daily-ticket.service.js**

```javascript
// backend/src/modules/daily-ticket/daily-ticket.service.js
import { dailyTicketRepository } from './daily-ticket.repository.js';

export const dailyTicketService = {
  async getTickets(filters, pagination) {
    const [total, rows] = await Promise.all([
      dailyTicketRepository.countTickets(filters),
      dailyTicketRepository.findTickets(filters, pagination),
    ]);
    return { total, rows };
  },

  async getTicketById(id) {
    return dailyTicketRepository.findById(id);
  },

  async approveTicket(id, userId) {
    return dailyTicketRepository.transaction(async (client) => {
      const before = await client.query(
        'SELECT * FROM daily_production_tickets WHERE id = $1 AND deleted_at IS NULL', [id]
      );
      if (before.rowCount === 0) return null;

      const updated = await dailyTicketRepository.updateStatus(client, id, 'APPROVED', userId, null);

      await dailyTicketRepository.insertAuditLog(client, {
        userId, action: 'APPROVE', entity: 'DailyTicket', entityId: id,
        beforeData: before.rows[0], afterData: updated,
      });

      return updated;
    });
  },

  async rejectTicket(id, userId, reason) {
    return dailyTicketRepository.transaction(async (client) => {
      const before = await client.query(
        'SELECT * FROM daily_production_tickets WHERE id = $1 AND deleted_at IS NULL', [id]
      );
      if (before.rowCount === 0) return null;

      const updated = await dailyTicketRepository.updateStatus(client, id, 'REJECTED', null, reason);

      await dailyTicketRepository.insertAuditLog(client, {
        userId, action: 'REJECT', entity: 'DailyTicket', entityId: id,
        beforeData: before.rows[0], afterData: updated,
      });

      return updated;
    });
  },
};
```

**Checker 2B:** Không có SQL string trong file.

### 2C: Slim Daily Ticket Controller

- [ ] **Step 2C-1: Sửa daily-ticket.controller.js**

```javascript
// backend/src/modules/daily-ticket/daily-ticket.controller.js
import { dailyTicketService } from './daily-ticket.service.js';
import { getIo } from '../../sockets/index.js';

export const getTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, search,
            status, is_manual, created_by, ticket_code, operation_name, exclude_pending } = req.query;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const { total, rows } = await dailyTicketService.getTickets(
      { startDate, endDate, search, status, is_manual, created_by, ticket_code, operation_name, exclude_pending },
      { limit: limitInt, offset: (pageInt - 1) * limitInt }
    );
    res.json({ data: rows, pagination: { total, page: pageInt, limit: limitInt, totalPages: Math.ceil(total / limitInt) } });
  } catch (error) {
    console.error('getTickets Error:', error);
    res.status(500).json({ message: 'Error fetching tickets' });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await dailyTicketService.getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (error) {
    console.error('getTicketById Error:', error);
    res.status(500).json({ message: 'Error fetching ticket' });
  }
};

export const approveTicket = async (req, res) => {
  try {
    const updated = await dailyTicketService.approveTicket(req.params.id, req.user.id);
    if (!updated) return res.status(404).json({ message: 'Ticket not found' });
    const io = getIo();
    if (io) io.emit('ticket:approved', { ticketId: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error('approveTicket Error:', error);
    res.status(500).json({ message: 'Error approving ticket' });
  }
};

export const rejectTicket = async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await dailyTicketService.rejectTicket(req.params.id, req.user.id, reason);
    if (!updated) return res.status(404).json({ message: 'Ticket not found' });
    res.json(updated);
  } catch (error) {
    console.error('rejectTicket Error:', error);
    res.status(500).json({ message: 'Error rejecting ticket' });
  }
};

// createTicket, updateTicket, deleteTicket, generateTickets — giữ trong legacy
export { createTicket, updateTicket, deleteTicket, generateTickets } from './daily-ticket.controller.legacy.js';
```

- [ ] **Step 2C-2: Tạo daily-ticket.controller.legacy.js**

Copy nguyên vẹn `createTicket`, `updateTicket`, `deleteTicket`, `generateTickets` từ controller gốc.

### 2D: Verify Daily Ticket Module

- [ ] **Step 2D-1: Test GET tickets**

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/daily-tickets?page=1&limit=3" | jq '.pagination'
```

Expected: `{ "total": <N>, "page": 1, "limit": 3 }`

**Checker 2D:** Server không error. GET list trả đúng structure.

---

## Task 3: Production Planning Module

**Files:**
- Tạo: `backend/src/modules/production-planning/production-planning.repository.js`
- Tạo: `backend/src/modules/production-planning/production-planning.service.js`
- Sửa: `backend/src/modules/production-planning/production-planning.controller.js`
- Tạo tạm: `backend/src/modules/production-planning/production-planning.controller.legacy.js`

**Interfaces:**
- `production-planning.routes.js` import: `getProductionPlans`, `createProductionPlan`, `updateProductionPlan`, `deleteProductionPlan`, `createGeneralPlan`, `clonePlan` (kiểm tra routes file trước khi viết legacy)

### 3A: Repository

- [ ] **Step 3A-1: Tạo production-planning.repository.js**

```javascript
// backend/src/modules/production-planning/production-planning.repository.js
import { BaseRepository } from '../../shared/base.repository.js';

export class ProductionPlanningRepository extends BaseRepository {
  buildWhereClause(filters) {
    const { order_ids, product_ids, machine_ids, operation_ids, startDate, endDate, product_id, machine_id } = filters;
    let clause = 'WHERE pp.deleted_at IS NULL';
    const params = [];

    const toArr = (v) => v ? (Array.isArray(v) ? v : v.split(',').filter(Boolean)) : [];

    const orderIdsArr = toArr(order_ids);
    if (orderIdsArr.length > 0) { params.push(orderIdsArr); clause += ` AND pp.order_id = ANY($${params.length})`; }

    const productIdsArr = toArr(product_ids);
    if (productIdsArr.length > 0) { params.push(productIdsArr); clause += ` AND pp.product_id = ANY($${params.length})`; }
    else if (product_id) { params.push(product_id); clause += ` AND pp.product_id = $${params.length}`; }

    const machineIdsArr = toArr(machine_ids);
    if (machineIdsArr.length > 0) { params.push(machineIdsArr); clause += ` AND pp.machine_id = ANY($${params.length})`; }
    else if (machine_id) { params.push(machine_id); clause += ` AND pp.machine_id = $${params.length}`; }

    const opIdsArr = toArr(operation_ids);
    if (opIdsArr.length > 0) {
      params.push(opIdsArr);
      clause += ` AND pp.product_group_operation_id IN (
        SELECT pgo_f.id FROM product_group_operations pgo_f
        WHERE pgo_f.operation_id = ANY($${params.length}) AND pgo_f.deleted_at IS NULL
      )`;
    }

    if (startDate || endDate) {
      let cond = `EXISTS (SELECT 1 FROM production_plan_days ppd_f WHERE ppd_f.production_plan_id = pp.id AND ppd_f.deleted_at IS NULL`;
      if (startDate) { params.push(startDate); cond += ` AND ppd_f.working_date::DATE >= $${params.length}`; }
      if (endDate) { params.push(endDate); cond += ` AND ppd_f.working_date::DATE <= $${params.length}`; }
      cond += ')';
      clause += ` AND ${cond}`;
    }

    return { clause, params };
  }

  async countPlans(filters) {
    const { clause, params } = this.buildWhereClause(filters);
    const result = await this.query(`
      SELECT COUNT(DISTINCT pp.id)
      FROM production_plans pp
      LEFT JOIN orders o ON pp.order_id = o.id AND o.deleted_at IS NULL
      LEFT JOIN products p ON pp.product_id = p.id AND p.deleted_at IS NULL
      ${clause}
    `, params);
    return parseInt(result.rows[0].count);
  }

  async findPlans(filters, pagination) {
    const { clause, params } = this.buildWhereClause(filters);
    const { limit, offset } = pagination;
    // SELECT copied from production-planning.controller.js
    const sql = `
      SELECT pp.*,
        o.name as order_name, o.order_code,
        p.name as product_name,
        m.name as machine_name,
        pg.name as product_group_name,
        op.name as operation_name,
        COALESCE(
          json_agg(jsonb_build_object(
            'id', ppd.id,
            'working_date', ppd.working_date,
            'planned_quantity', ppd.planned_quantity
          ) ORDER BY ppd.working_date) FILTER (WHERE ppd.id IS NOT NULL AND ppd.deleted_at IS NULL),
          '[]'
        ) as days
      FROM production_plans pp
      LEFT JOIN orders o ON pp.order_id = o.id AND o.deleted_at IS NULL
      LEFT JOIN products p ON pp.product_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN machines m ON pp.machine_id = m.id AND m.deleted_at IS NULL
      LEFT JOIN product_groups pg ON pp.product_group_id = pg.id
      LEFT JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
      LEFT JOIN operations op ON pgo.operation_id = op.id
      LEFT JOIN production_plan_days ppd ON ppd.production_plan_id = pp.id
      ${clause}
      GROUP BY pp.id, o.name, o.order_code, p.name, m.name, pg.name, op.name
      ORDER BY pp.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const result = await this.query(sql, [...params, limit, offset]);
    return result.rows;
  }

  async insertAuditLog(client, { userId, action, entity, entityId, beforeData, afterData }) {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entity, entityId, beforeData, afterData]
    );
  }
}

export const productionPlanningRepository = new ProductionPlanningRepository();
```

**Checker 3A:** `toArr()` helper xử lý đúng: `"1,2,3"` → `["1","2","3"]`, `["1","2"]` → `["1","2"]`, `undefined` → `[]`.

### 3B: Service

- [ ] **Step 3B-1: Tạo production-planning.service.js**

```javascript
// backend/src/modules/production-planning/production-planning.service.js
import { productionPlanningRepository } from './production-planning.repository.js';

export const productionPlanningService = {
  async getPlans(filters, pagination) {
    const [total, rows] = await Promise.all([
      productionPlanningRepository.countPlans(filters),
      productionPlanningRepository.findPlans(filters, pagination),
    ]);
    return { total, rows };
  },
};
```

### 3C: Slim Controller

- [ ] **Step 3C-1: Sửa production-planning.controller.js**

```javascript
// backend/src/modules/production-planning/production-planning.controller.js
import { productionPlanningService } from './production-planning.service.js';

export const getProductionPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const { total, rows } = await productionPlanningService.getPlans(
      filters, { limit: limitInt, offset: (pageInt - 1) * limitInt }
    );
    res.json({ data: rows, pagination: { total, page: pageInt, limit: limitInt, totalPages: Math.ceil(total / limitInt) } });
  } catch (error) {
    console.error('getProductionPlans Error:', error);
    res.status(500).json({ message: 'Error fetching plans' });
  }
};

// Mutations trong legacy
export { createProductionPlan, updateProductionPlan, deleteProductionPlan,
         createGeneralPlan, clonePlan } from './production-planning.controller.legacy.js';
```

> **Lưu ý:** Trước khi viết legacy file, chạy `grep "^export const\|^export async" backend/src/modules/production-planning/production-planning.controller.js` để lấy đúng danh sách functions cần copy.

- [ ] **Step 3C-2: Tạo production-planning.controller.legacy.js**

Copy tất cả mutations nguyên vẹn.

### 3D: Verify

- [ ] **Step 3D-1: Test**

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/production-plans?page=1&limit=3" | jq '.pagination'
```

**Checker 3D:** Response có `{ data: [...], pagination: {...} }` không có 500.

---

## Task 4: Outsourcing Module

**Files:**
- Tạo: `backend/src/modules/outsourcing/outsourcing.repository.js`
- Tạo: `backend/src/modules/outsourcing/outsourcing.service.js`
- Sửa: `backend/src/modules/outsourcing/outsourcing.controller.js`
- Tạo tạm: `backend/src/modules/outsourcing/outsourcing.controller.legacy.js`

### 4A: Repository

- [ ] **Step 4A-1: Tạo outsourcing.repository.js**

```javascript
// backend/src/modules/outsourcing/outsourcing.repository.js
import { BaseRepository } from '../../shared/base.repository.js';

export class OutsourcingRepository extends BaseRepository {
  buildWhereClause(filters) {
    const { type, search, order_id, product_id, date } = filters;
    let clause = 'WHERE t.deleted_at IS NULL';
    const params = [];

    if (type) { params.push(type); clause += ` AND t.type = $${params.length}`; }
    if (search) { params.push(`%${search}%`); clause += ` AND (t.ticket_code ILIKE $${params.length} OR s.name ILIKE $${params.length})`; }
    if (order_id) { params.push(order_id); clause += ` AND i.order_id = $${params.length}`; }
    if (product_id) { params.push(product_id); clause += ` AND i.product_id = $${params.length}`; }
    if (date) {
      params.push(date);
      if (type === 'PACKAGING') clause += ` AND DATE(t.created_at) = $${params.length}`;
      else clause += ` AND (DATE(t.dispatch_date) = $${params.length} OR DATE(t.created_at) = $${params.length})`;
    }

    return { clause, params };
  }

  async findDetailedItems(filters) {
    const { clause, params } = this.buildWhereClause(filters);
    // SQL with returns_agg CTE from outsourcing.controller.js
    const sql = `
      WITH returns_agg AS (
        SELECT r.ticket_item_id,
          MAX(r.returned_at) AS last_returned_at,
          SUM(r.quantity_returned) AS total_returned,
          SUM(r.accessory_quantity_returned) AS total_accessory_returned,
          SUM(r.gross_weight) AS return_gross_weight,
          SUM(r.pallet_weight) AS return_pallet_weight,
          SUM(r.net_weight) AS return_net_weight,
          SUM(r.missing_weight) AS return_missing_weight,
          string_agg(r.notes, '; ' ORDER BY r.returned_at) FILTER (WHERE r.notes IS NOT NULL AND r.notes != '') AS return_notes
        FROM outsourcing_returns r GROUP BY r.ticket_item_id
      )
      SELECT t.dispatch_date, t.ticket_code,
        COALESCE(NULLIF(BTRIM(CONCAT_WS(' - ', o.order_code, o.name)), ' - '), o.order_code, o.name) as order_display,
        p.name as product_name,
        i.order_quantity, i.processing_type, i.package_count,
        i.quantity_out, i.accessory_quantity, i.unit_net_weight,
        i.gross_weight, i.pallet_weight, i.net_weight, i.notes,
        t.expected_return_date,
        ra.last_returned_at, ra.total_returned, ra.total_accessory_returned,
        ra.return_gross_weight, ra.return_pallet_weight, ra.return_net_weight,
        ra.return_missing_weight, ra.return_notes
      FROM outsourcing_ticket_items i
      JOIN outsourcing_tickets t ON i.ticket_id = t.id
      JOIN orders o ON i.order_id = o.id AND o.deleted_at IS NULL
      JOIN products p ON i.product_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN suppliers s ON t.supplier_id = s.id AND s.deleted_at IS NULL
      LEFT JOIN returns_agg ra ON ra.ticket_item_id = i.id
      ${clause}
      ORDER BY t.dispatch_date DESC, t.created_at DESC
    `;
    const result = await this.query(sql, params);
    return result.rows;
  }

  async insertAuditLog(client, { userId, action, entity, entityId, beforeData, afterData }) {
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entity, entityId, beforeData, afterData]
    );
  }
}

export const outsourcingRepository = new OutsourcingRepository();
```

**Checker 4A:** `date` filter: `type === 'PACKAGING'` dùng `created_at`, còn lại dùng cả `dispatch_date` OR `created_at`.

### 4B: Service

- [ ] **Step 4B-1: Tạo outsourcing.service.js**

```javascript
// backend/src/modules/outsourcing/outsourcing.service.js
import { outsourcingRepository } from './outsourcing.repository.js';

export const outsourcingService = {
  async getDetailedItems(filters) {
    return outsourcingRepository.findDetailedItems(filters);
  },
};
```

### 4C: Slim Controller

- [ ] **Step 4C-1: Sửa outsourcing.controller.js**

> **Trước tiên:** Chạy `grep "^export const\|^export async" backend/src/modules/outsourcing/outsourcing.controller.js` để lấy đúng function names cho legacy.

```javascript
// backend/src/modules/outsourcing/outsourcing.controller.js
import { outsourcingService } from './outsourcing.service.js';

export const exportDetailedItems = async (req, res) => {
  try {
    const { type, search = '', order_id, product_id, date } = req.query;
    const rows = await outsourcingService.getDetailedItems({ type, search, order_id, product_id, date });
    res.json(rows);
  } catch (error) {
    console.error('exportDetailedItems Error:', error);
    res.status(500).json({ message: 'Error exporting items' });
  }
};

// Mutations — copy từ legacy (chạy grep trước để lấy đúng function names)
export { createTicket, updateTicket, deleteTicket, addReturn,
         getTickets, getTicketById } from './outsourcing.controller.legacy.js';
```

- [ ] **Step 4C-2: Tạo outsourcing.controller.legacy.js**

Copy tất cả functions trừ `exportDetailedItems` từ controller gốc.

### 4D: Verify

- [ ] **Step 4D-1: Test**

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3000/api/outsourcing/export-detailed?type=PLATING" | jq 'length'
```

Expected: số nguyên (kể cả 0), không có 500.

---

## Acceptance Checklist Toàn Bộ

Sau khi hoàn thành tất cả 4 tasks, verify từng item:

- [ ] **C1:** Server khởi động không có import error, syntax error, hay unresolved dependency
- [ ] **C2:** `GET /api/orders?page=1&limit=5` → `{ data: [...], pagination: { total, page, limit, totalPages } }`
- [ ] **C3:** `GET /api/orders/:id/completion-report` → `{ data: [...], overall_completion_percentage }` — field `inventory_input` có trong mỗi row
- [ ] **C4:** `GET /api/daily-tickets?page=1&limit=5` → `{ data: [...], pagination: {...} }`
- [ ] **C5:** `GET /api/production-plans?page=1&limit=5` → `{ data: [...], pagination: {...} }`
- [ ] **C6:** `GET /api/outsourcing/export-detailed?type=PLATING` → array, không có 500
- [ ] **C7:** `POST /api/orders` với body hợp lệ → 201 + có record mới trong `audit_logs`
- [ ] **C8:** `grep -r "pool\.query\|pool\.connect" backend/src/modules/order/order.controller.js` → chỉ match trong legacy file (nếu cần)
- [ ] **C9:** Không có circular import: Repository → BaseRepository → pool. Service → Repository. Controller → Service.

---

## Rủi ro và biện pháp

| Rủi ro | Biện pháp |
|--------|-----------|
| SQL bị thay đổi khi copy sang repository | Copy dạng template literal nguyên vẹn, chỉ đổi `queryParams` → `params` |
| Transaction bị miss | Service luôn gọi `repository.transaction()`, không gọi query riêng lẻ |
| Circular import | Repository không import Service, Service không import Controller |
| Legacy file quên xóa | Thêm comment `// TEMPORARY:` đầu file |
| Import path Base sai | `shared/` ở `backend/src/shared/` → từ module: `../../shared/base.repository.js` |
| Routes import fail | Kiểm tra `grep "from '.\/order\.controller'"` trong routes trước khi sửa |
