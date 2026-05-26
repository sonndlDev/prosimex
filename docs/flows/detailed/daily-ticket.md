# Phân tích Logic Code: Daily Ticket

## 1. Tạo Phiếu Khai Báo (Create Daily Ticket)
**File chính:** `backend/src/modules/daily-ticket/daily-ticket.controller.js`

### Mục đích:
Công nhân (hoặc tổ trưởng) tại nhà máy nhập liệu khai báo họ đã làm ra được bao nhiêu thành phẩm ứng với 1 ca / 1 ngày và cho Kế hoạch nào.

### Chi tiết Logic:
1. **Lấy Request Data:**
   - Dữ liệu gửi lên: `plan_id`, `machine_id`, `worker_id` (nếu là cá nhân), `quantity` (SL đạt), `defect_quantity` (SL lỗi hỏng), `ticket_date` (ngày làm).
2. **Logic Ràng Buộc:**
   - Phiếu phải thuộc một Plan hợp lệ. Kiểm tra Plan ID có đang ở trạng thái `IN_PROGRESS` không (chứ Plan `PENDING` hoặc báo `COMPLETED` thì không được báo cáo vượt số lượng nữa).
   - Kiểm tra ngày `ticket_date` phải đúng là thuộc phạm vi timeline của Plan đó (hoặc linh động nếu business allow).
3. **Insert Ticket DB:**
   - Tạo dòng dữ liệu trong bảng `daily_production_tickets`.
   - Trạng thái mặc định đẩy làm phiếu là `PENDING` (chờ quản lý QA/Đốc công duyệt – Tùy đặc thù có áp dụng duyệt hay không).

---

## 2. Phê duyệt/Từ chối Phiếu (Approve/Reject Ticket)
**Mục đích:** Admin / Đốc công check Data có sai lệch k trước khi tính tiền hay tính KPI vào hệ thống.

### Chi tiết Logic (Flow Approve):
1. Nhận ID ticket cần duyệt. Đọc Ticket DB.
2. Đổi status: `PENDING` -> `APPROVED`.
3. Khi ticket được `APPROVED`. Trigger event gửi lên thằng CHA (Production Plan) báo thông tin là "Anh ơi em duyệt 50 cái sp hoàn thành nha". Lục lại phần 2 của Planning Flow để thấy quy trình SUM update %.

### Chi tiết Logic (Flow Reject):
1. Chuyển ticket DB `status` bằng `REJECTED`. 
2. Record kèm `reject_reason` (lý do chối phiễu) do User text vào.
3. Không trigger cộng số lượng vào Production Plan. Trả báo lỗi Notification về cho Worker/Tổ máy bắt điền lại.
