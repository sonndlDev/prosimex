# Dashboard Module - Frontend Giao Diện Tổng Quan

## Danh sách trang (Pages)

### 1. `DashboardPage.jsx`
- **Mục đích:** Trang chủ đầu tiên khi User login thành công, màn hình chỉ huy thu nhỏ (Control Center) cho lãnh đạo nhà xưởng.
- **Tính năng đặc trưng:**
  - Lưới hiển thị các thẻ KPI (Cards): Tổng Đơn hàng đang chạy, Số công nhân vắng mặt, Lượng máy móc chết hỏng, v.v.
  - Biểu đồ Bar Chart/Line Chart (áp dụng Recharts hoặc Chartjs) thể hiện xu hướng sản lượng trong tuần qua.
  - Liệt kê "Kế hoạch chậm trễ" hoặc "Ticket đang chờ duyệt khẩn cấp".
- **Giao tiếp Dữ liệu:** Gọi API backend `GET /dashboard/summary` có thể lấy data kết hợp (Aggregation).
