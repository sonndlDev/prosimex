# Daily Ticket (Phiếu Báo Cáo Sản Xuất Hằng Ngày) Flow & Logic

## Tổng quan
Module quản lý dữ liệu sản lượng thi công thực tế hằng ngày của nhà máy. Được ghi nhận bởi đốc công hoặc công nhân, gắn với từng máy móc và sản phẩm.

## Các chức năng chính

1. **Tạo phiếu (Create Daily Ticket)**
   - **Mục đích:** Báo cáo sản lượng làm ra trong ngày (hoặc ca).
   - **Logic:**
     - Gắn với Machine_ID, Plan_ID, Worker_ID.
     - Nhập số lượng đã hoàn thành (Quantity/Amount), số lượng lỗi (Defect).
     - Lưu trữ trạng thái `PENDING` (chờ duyệt) hoặc `APPROVED`.

2. **Duyệt phiếu (Approve Ticket)**
   - **Mục đích:** Quản lý xem xét, xác nhận sản lượng công nhân báo cáo.
   - **Logic:**
     - Chuyển status từ `PENDING` -> `APPROVED`.
     - Khi Approved, số lượng này sẽ được cộng dồn vào tổng tiến độ của Cụm Kế Hoạch (Production Plan) và từ đó nhảy lên Đơn hàng (Order).

3. **Từ chối / Yêu cầu sửa (Reject Ticket)**
   - **Mục đích:** Yêu cầu báo cáo lại do sai sót dữ liệu.
   - **Logic:** Quản lý comment lý do lỗi. Trạng thái về `REJECTED`. Công nhân phải tạo lại hoặc sửa phiếu.

4. **Tổng hợp sản lượng (Daily Report)**
   - **Mục đích:** Tính toán KPI, lương hoặc năng suất cho báo cáo nhà máy (Dashboard).
   - **Logic:** Group_by `Machine` hoặc `Worker_ID` theo biến số thời gian (DATE) để xuất ra biểu đồ làm việc hằng ngày.

## Database
- `daily_production_tickets`: Chứa chi tiết phiếu ngày.
