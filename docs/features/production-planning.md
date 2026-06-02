# Production Planning (Kế hoạch sản xuất)

## 1. Mô tả
Module **Production Planning** chịu trách nhiệm phân bổ lệnh sản xuất (từ Order), gán máy móc và rải lịch làm việc chi tiết từng ngày theo cấu hình định mức cho các công đoạn sản xuất.

## 2. Các Endpoints
- `GET /`: Lấy danh sách các kế hoạch sản xuất với chức năng phân trang, lọc theo order, product, và machine.
- `GET /planned-status`: Lấy trạng thái đã lên kế hoạch theo mã đơn hàng.
- `POST /`: Tạo mới một kế hoạch sản xuất.
- `POST /batch-order`: Tạo liền nhiều kế hoạch đồng thời cho toàn bộ quy trình của một Order/Product (Batch creation).
- `POST /clone/:id`: Nhân bản một kế hoạch sản xuất.
- `PUT /:id`: Cập nhật thông tin kế hoạch sản xuất.
- `PUT /:id/stop`: Dừng nhanh một kế hoạch đang thực hiện.
- `DELETE /:id`: Xóa (soft delete) một kế hoạch.

## 3. Luồng nghiệp vụ cốt lõi (Business Logic Flows)
- **Tạo Kế hoạch Sản xuất**:
  - Dựa trên `order_id`, `product_id`, `machine_id`, `inventory_input` (số lượng từ kho tồn) hệ thống tính toán `remaining_quantity` (số lượng còn lại phải làm).
  - Kết hợp với `dinh_muc` (định mức quy trình) từ `product_group_operations` để quy đổi ra số giờ làm việc cần thiết.
  - Phân bổ timeline chia làm nhiều ngày (Days scheduling: lên thời gian từng ngày, có làm tăng ca overtime không), đổ dữ liệu gộp ngầm định vào `production_plan_days`.
  - Cập nhật trạng thái của Đơn hàng liên quan (`orders`) sang `PLANNED`.
- **Machine Scheduling (Điều độ thiết bị)**:
  - Khi tạo kế hoạch trên một thiết bị cắt/dập cụ thể, một bản ghi được sinh ra trong `machine_schedules` để trực quan hóa lịch dùng thiết bị và cảnh báo trùng lặp.
- **Batch Create và Nhân bản (Clone)**:
  - Hỗ trợ thao tác tạo kế hoạch sỉ cho các khâu phức tạp, sao chép lịch làm việc từ quá khứ.

## 4. Mối quan hệ với các modules khác
- **Order / Product**: Kế hoạch sinh ra để phục vụ quá trình chế tạo sản phẩm của một đơn.
- **Machine**: Lịch sử dụng thiết bị được kiểm soát và ghi nhận kín vòng.
- **Daily Ticket**: Lấy `production_plan_days` làm dữ liệu nền tảng gốc để sinh tự động Phiếu giao việc của từng ngày/từng máy.
- **Worker**: Các công nhân được quản định biên chế tới từng kế hoạch cụ thể theo ngày.
