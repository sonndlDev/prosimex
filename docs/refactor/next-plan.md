# Next Plan — Verify & Cleanup Refactor

## Cách dùng file này
1. Set `DATABASE_URL` trong `.env`
2. Chạy từng lệnh bên dưới
3. Tick checkbox sau khi pass
4. Nếu fail → fix → chạy lại trước khi tick

---

## Bước 1: Setup

- [ ] Thêm `DATABASE_URL` vào `.env`
- [ ] Chạy `npm install` nếu chưa có dependencies
- [ ] Test kết nối DB: `node -r @babel/register -e "import('./src/config/db.js').then(m => m.default.query('SELECT 1').then(() => console.log('OK')).catch(console.error))"`

---

## Bước 2: Characterization Tests — Capture (chạy 1 lần từ legacy)

Chạy từng lệnh để lưu output của legacy làm fixture chuẩn.

```bash
# Pattern chung:
node -r @babel/register tests/characterization/capture.js <module>
```

- [ ] customer
- [ ] factory
- [ ] supplier
- [ ] operation
- [ ] machine
- [ ] worker
- [ ] product
- [ ] attendance
- [ ] machine-schedule
- [ ] notification
- [ ] auth
- [ ] user
- [ ] dashboard
- [ ] product-group
- [ ] product-inventory
- [ ] production-planning
- [ ] outsourcing
- [ ] daily-ticket
- [ ] order
- [ ] worker-assignment

---

## Bước 3: Characterization Tests — Compare (new vs legacy)

Sau khi capture xong, chạy compare để kiểm tra output mới khớp legacy.

```bash
# Pattern chung:
node -r @babel/register tests/characterization/compare.js <module>
```

- [ ] customer — compare pass
- [ ] factory — compare pass
- [ ] supplier — compare pass
- [ ] operation — compare pass
- [ ] machine — compare pass
- [ ] worker — compare pass
- [ ] product — compare pass
- [ ] attendance — compare pass
- [ ] machine-schedule — compare pass
- [ ] notification — compare pass
- [ ] auth — compare pass
- [ ] user — compare pass
- [ ] dashboard — compare pass
- [ ] product-group — compare pass
- [ ] product-inventory — compare pass
- [ ] production-planning — compare pass
- [ ] outsourcing — compare pass
- [ ] daily-ticket — compare pass
- [ ] order — compare pass
- [ ] worker-assignment — compare pass

---

## Bước 4: Xóa `__legacy__` sau khi verify pass

Chỉ xóa sau khi Bước 3 của module đó đã tick.

- [ ] customer — xóa `__legacy__/`, `customer.controller.legacy.js`
- [ ] factory — xóa `__legacy__/`, `factory.controller.legacy.js`
- [ ] supplier — xóa `__legacy__/`, `supplier.controller.legacy.js`
- [ ] operation — xóa `__legacy__/`, `operation.controller.legacy.js`
- [ ] machine — xóa `__legacy__/`, `machine.controller.legacy.js`
- [ ] worker — xóa `__legacy__/`, `worker.controller.legacy.js`
- [ ] product — xóa `__legacy__/`, `product.controller.legacy.js`
- [ ] attendance — xóa `__legacy__/`, `attendance.controller.legacy.js`
- [ ] machine-schedule — xóa `__legacy__/`, `machine-schedule.controller.legacy.js`
- [ ] notification — xóa `__legacy__/`, `notification.controller.legacy.js`
- [ ] auth — xóa `__legacy__/`, `auth.controller.legacy.js`
- [ ] user — xóa `__legacy__/`, `user.controller.legacy.js`
- [ ] dashboard — xóa `__legacy__/`, `dashboard.controller.legacy.js`
- [ ] product-group — xóa `__legacy__/`, `product-group.controller.legacy.js`
- [ ] product-inventory — xóa `__legacy__/`, `product-inventory.controller.legacy.js`
- [ ] production-planning — xóa `__legacy__/production-planning.repository.legacy.js`, `production-planning.controller.legacy.js`
- [ ] outsourcing — xóa `__legacy__/outsourcing.repository.legacy.js`, `outsourcing.controller.legacy.js`
- [ ] daily-ticket — xóa `__legacy__/daily-ticket.repository.legacy.js`, `daily-ticket.controller.legacy.js`
- [ ] order — xóa `__legacy__/order.repository.legacy.js`, `order.controller.legacy.js`, `order.repository.legacy.js`
- [ ] worker-assignment — xóa `__legacy__/`, `worker-assignment.controller.legacy.js`

---

## Bước 5: Indexes (optional — sau khi xong verify)

Xem chi tiết tại `docs/refactor/INDEXES.md`.

- [ ] Tạo migration file cho indexes
- [ ] Chạy migration trên DB dev
- [ ] Kiểm tra query performance
- [ ] Chạy migration trên DB production

---

## Bước 6: Deploy checklist

- [ ] Tất cả compare tests pass
- [ ] Tất cả `__legacy__/` đã xóa
- [ ] Không còn import từ `*.legacy.js` nào sót lại: `grep -r "legacy" src/modules/ --include="*.js"`
- [ ] Build không lỗi: `npm run build` (nếu có)
- [ ] Deploy lên staging trước
- [ ] Smoke test các API chính
- [ ] Deploy production

---

## Ghi chú khi fail compare

Nếu module X fail compare:
1. Xem diff output — trường nào lệch?
2. Kiểm tra service/hydrator tương ứng
3. Fix → chạy lại compare
4. Ghi lại vào `docs/refactor/DISCREPANCIES.md` nếu là known difference

---

**Ngày tạo:** 2026-10-15
**Trạng thái:** 22/22 module đã refactor code, chờ DB verify
