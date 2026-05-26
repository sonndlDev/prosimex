# Phân tích Logic Code: Production Planning

## 1. Tạo Kế hoạch (Create Production Plan)
**File chính:** `backend/src/modules/production-planning/production-planning.controller.js`

### Mục đích:
Chia rã (break-down) Đơn hàng thành các Lệnh sản xuất, gán cho công nhân/máy phù hợp trong khoảng thời gian nhất định.

### Chi tiết Logic (Flow):
1. **Lấy Data:** `order_id` / `order_product_id`, `machine_id`, `worker_ids` (mảng), `start_date`, `end_date`, `planned_quantity`.
2. **Kiểm tra độ hợp lệ của Kế hoạch (Validation Tối Quan Trọng):**
   - Số lượng Kế hoạch vs Số lượng Đơn: Tổng số `planned_quantity` của các bản Plan chia nhỏ không được vượt quá số Quantity đang chờ làm của Đơn Hàng. (Prevent over-planning lỗi số học).
   - Kiểm tra Lịch Máy (Machine Conflict): Gọi 1 module hoặc helper check xem `machine_id` này có đang bận xử lý Plan nào khác đoạn từ `start_date` tới `end_date` chưa? Nếu đụng độ -> Rút cảnh báo `400 Conflict`.
   - Kiểm tra Worker: (Tương tự kiểm tra Máy).
3. **Insert DB Plan:** Đẩy Data vào `production_plans`. Lưu `plan_id`.
4. **Insert DB Worker_Assignments:** 
   - Với mảng `worker_ids`. Map và chèn từng dòng vào bảng trung gian (VD: `worker_plan_assignments`) kèm `plan_id` để biết "Ai được gắn vào kế hoạch này".
5. **Gửi Response & Notify:** Hoàn tất, trả data cho User kèm báo Notification xuống cho máy POS hiện xưởng (để người đứng máy biết họ có Job).

---

## 2. Theo dõi tiến độ Kế hoạch (Monitor / Calculate Plan Progress)
**Purpose:** Làm sao FE biết 1 kế hoạch đang được thực hiện bao nhiêu % (ví dụ: Kế hoạch yêu cầu 100 cái, đã làm 45 cái).

### Chi tiết Logic:
- Tự động lấy số liệu: Không tự cập nhật thủ công tiến độ vào kế hoạch.
- Sử dụng Job / Query trực tiếp:
  - Khi xem kế hoạch X, hệ thống sẽ `SUM(quantity)` tất cả các Record Ticket (thông qua Module `Daily-Ticket`) mà map với `plan_id = X` và `status = APPROVED`.
  - Từ số tổng đó chia / cho tham số cố định `planned_quantity` * 100 => Suy ra % Hoàn thành.
  - Nếu % đạt 100, backend tự động chạy side-effect chuyển `status` của `Production Plan` thành `COMPLETED`.
