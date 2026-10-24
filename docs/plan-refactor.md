# Plan Refactor Backend — SOLID Architecture

> Ngày phân tích: 2026-10-15  
> Phạm vi: `/backend/src/`  
> Mục tiêu: Tách SQL ra khỏi controller, áp dụng SOLID, tăng khả năng bảo trì & test

---

## 1. Hiện trạng (As-Is)

### Thống kê module

| Module | Lines | SQL Complexity |
|--------|-------|---------------|
| `order` | 1,356 | 4-layer CTE, 226+ lines/query |
| `daily-ticket` | 1,210 | 120-line query, 10+ dynamic filters |
| `production-planning` | 916 | Date bucketing, nested subqueries |
| `outsourcing` | 915 | Multi-type workflow (PLATING/PACKAGING) |
| `product-group` | 511 | Nested JSON aggregation |
| Các module còn lại | ~100-200 | CRUD đơn giản |

### Vấn đề cốt lõi

Mỗi controller hiện đang làm **5 việc cùng lúc** (vi phạm SRP):

1. HTTP request parsing
2. Input validation
3. Business logic (tính toán, điều kiện)
4. SQL query (trực tiếp với pool)
5. Error handling + Audit logging

```
Controller → pool.query(rawSQL) → res.json()
```

- **Không có service layer** — `services/exampleService.js` là template trống
- **Không có repository layer** — SQL nhúng thẳng vào controller
- **Không có validators** — Validate inline trong controller
- **SQL khó reuse** — Cùng query xuất hiện ở nhiều nơi
- **Khó test** — Controller phụ thuộc trực tiếp vào `pool`
- **Dynamic WHERE bằng string concat** — Rủi ro khi thay đổi

---

## 2. Kiến trúc mục tiêu (To-Be)

```
HTTP Request
    ↓
Controller (HTTP layer only)
    ↓ calls
Service (business logic)
    ↓ calls
Repository (SQL queries)
    ↓ calls
pool (DB connection)
```

### SOLID mapping

| Principle | Áp dụng như thế nào |
|-----------|---------------------|
| **S** — Single Responsibility | Controller chỉ parse request/response. Service chỉ chứa business logic. Repository chỉ viết SQL. |
| **O** — Open/Closed | Repository base class có thể extend thêm filter/pagination mà không sửa core. |
| **L** — Liskov Substitution | Các repository con (OrderRepository, PlanRepository) thay thế được base mà không phá vỡ giao diện. |
| **I** — Interface Segregation | Mỗi repository chỉ expose method mà consumer thực sự cần, không "god repository". |
| **D** — Dependency Inversion | Service nhận repository qua constructor (hoặc import), không new trực tiếp — dễ mock khi test. |

---

## 3. Cấu trúc thư mục mới

```
backend/src/
├── config/
│   └── db.js                        (giữ nguyên)
├── middlewares/                     (giữ nguyên)
├── utils/                           (giữ nguyên)
├── modules/
│   └── order/
│       ├── order.controller.js      (CHỈ HTTP layer — parse req, gọi service, trả res)
│       ├── order.service.js         (business logic, tính toán completion %)
│       ├── order.repository.js      (tất cả SQL queries)
│       ├── order.routes.js          (giữ nguyên)
│       └── order.validator.js       (validate input — optional phase 2)
```

---

## 4. Scope & Priority

### Phase 1 — Ưu tiên cao (phức tạp nhất, lợi ích lớn nhất)

| Module | Lý do ưu tiên |
|--------|--------------|
| `order` | 1,356 lines, 4-layer CTE lặp lại ở DONE/non-DONE branch |
| `daily-ticket` | 1,210 lines, dynamic filter phức tạp, query 120+ lines |
| `production-planning` | 916 lines, date bucketing logic phức tạp |
| `outsourcing` | 915 lines, multi-type workflow |

### Phase 2 — Độ phức tạp trung bình

| Module | Lý do |
|--------|-------|
| `product-group` | 511 lines, nested JSON aggregation |
| `product-inventory` | 358 lines, transaction handling |
| `import-excel` | 313 lines, bulk insert |
| `user` | 285 lines, permission merging |

### Phase 3 — CRUD đơn giản (low priority)

Attendance, Auth, Customer, Factory, Machine, Operation, Product, Supplier, Worker — refactor sau khi Phase 1+2 xong và có pattern rõ ràng.

---

## 5. Chi tiết refactor từng module (Phase 1)

### 5.1 Order Module

**Vấn đề hiện tại:**
- `getOrders`: 226+ line query với 4-layer CTE, lặp lại gần như nguyên xi cho branch DONE vs non-DONE
- `getOrderCompletionReport`: subquery `inventory_input` trùng lặp ở 2 nơi
- Business logic tính `completion_percentage` nhúng trong controller

**Sau refactor:**

```
order.repository.js
  - getOrdersBase(filters)          → shared CTE builder
  - getOrderById(id)
  - getCompletionReportRows(id, isDone)
  - getOrderSummaryRows(id, isDone)

order.service.js
  - getOrders(filters)              → gọi repo, format kết quả
  - getOrderCompletionReport(id)    → gọi repo, tính completion_percentage
  - getOrderSummaryReport(id)       → gọi repo, tính summary

order.controller.js
  - getOrders(req, res)             → parse filters → service.getOrders → res.json
  - getOrderCompletionReport(req, res)
```

**SQL improvement:** Tách 2 branch DONE/non-DONE thành 2 named query functions, tránh `isDone ? \`...\` : \`...\`` dài 300 lines trong 1 string.

---

### 5.2 Daily Ticket Module

**Vấn đề hiện tại:**
- `getTickets`: 120-line query với 10+ filter params, dynamic WHERE bằng string push
- Business logic trộn lẫn với query building

**Sau refactor:**

```
daily-ticket.repository.js
  - buildTicketsQuery(filters)      → returns { text, params }
  - getTickets(filters, pagination)
  - getTicketById(id)

daily-ticket.service.js
  - getTickets(filters)
  - createTicket(data)
  - approveTicket(id, userId)
  - getPlanVsActualReport(filters)
```

**SQL improvement:** Helper `buildWhereClause(filters)` → trả về `{ clause, params }` — reusable.

---

### 5.3 Production Planning Module

**Sau refactor:**

```
production-planning.repository.js
  - getPlans(filters, pagination)
  - createPlan(data, client?)
  - updatePlan(id, data, client?)

production-planning.service.js
  - getPlans(filters)
  - createOrderGeneralPlan(data)    → date bucketing logic ở đây
  - clonePlan(id)
```

---

### 5.4 Outsourcing Module

**Sau refactor:**

```
outsourcing.repository.js
  - getTickets(filters, type?)
  - createTicket(data, items, client)

outsourcing.service.js
  - createTicket(type, data)        → validate type (PLATING/PACKAGING)
  - processReturn(ticketItemId, qty)
```

---

## 6. Base Repository Pattern

```javascript
// base.repository.js
export class BaseRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async transaction(callback) {
    const client = await this.pool.connect();
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

---

## 7. Impact Assessment

| Risk | Mức độ | Biện pháp |
|------|--------|-----------|
| Breaking API response | Thấp | Chỉ refactor internal, không đổi output |
| Transaction bị miss | Trung bình | Giữ nguyên transaction wrapper pattern |
| SQL logic bị đổi vô tình | Trung bình | Code review kỹ từng query sau khi tách |
| Performance regression | Thấp | Không thay đổi SQL, chỉ thay đổi nơi đặt |

---

## 8. Lợi ích sau refactor

| Vấn đề hiện tại | Sau refactor |
|-----------------|--------------|
| Controller 1,356 lines | Controller < 100 lines, Service < 200, Repository < 300 |
| SQL lặp lại nhiều nơi | Tập trung 1 nơi trong repository |
| Khó test vì phụ thuộc pool | Service & repository có thể mock |
| Sửa SQL dễ sai do quá dài | Mỗi query là 1 named function rõ ràng |
| Business logic ẩn trong SQL | Business logic tường minh trong service layer |

---

## 9. Câu hỏi còn mở

1. **Scope**: Refactor toàn bộ 22 modules hay chỉ Phase 1 (4 modules phức tạp)?
2. **Testing**: Có thêm unit test không, hay chỉ manual test?
3. **SQL refactor**: Chỉ tách vị trí (safe), hay cũng muốn tối ưu SQL logic (riskier)?
