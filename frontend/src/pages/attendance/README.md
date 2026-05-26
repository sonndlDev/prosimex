# Attendance Module - Frontend Cổng Thông Tin

Thư mục này chứa các file giao diện (Pages) phục vụ cho module Quản lý điểm danh công nhân trong nhà máy.

## Danh sách trang (Pages)

### 1. `AttendancePage.jsx`
- **Mục đích:** Là trang chủ yếu dành cho thiết bị chấm công hoặc cho phép công nhân/tổ trưởng thực hiện việc check-in, check-out nhanh chóng.
- **Tính năng chính:**
  - Hiển thị danh sách công nhân theo ca/tổ.
  - Nút/Hành động để ghi nhận thời gian bắt đầu làm việc (Check-in) và kết thúc làm việc (Check-out).
  - Có thể hỗ trợ scan mã QR (tuỳ nghiệp vụ) hoặc chọn thủ công từ danh sách.
- **Data Call:** Tương tác với backend API `/attendance` (POST) để ghi nhận dữ liệu realtime.

### 2. `AttendanceManagementPage.jsx`
- **Mục đích:** Bảng điều khiển quản trị (Dành cho Quản đốc / HR) để xem tổng quan, chỉnh sửa và xuất dữ liệu điểm danh.
- **Tính năng chính:**
  - Hiển thị bảng dữ liệu (Table) tất cả lịch sử điểm danh của hệ thống.
  - Bộ lọc: Lọc theo ngày, theo xưởng, theo tên công nhân hoặc mã công nhân.
  - Highlight cảnh báo đi trễ, về sớm hoặc vắng mặt.
  - Sửa đổi bằng tay (Manual override) trong trường hợp máy chấm công lỗi hoặc HR xác nhận có lý do vắng mặt hợp lệ.
- **Data Call:** GET API danh sách attendance với logic phân trang, lọc; PUT API khi edit log điểm danh.
