# Factories & Machines Module - Frontend Nhà Máy & Máy Móc

## Danh sách trang (Pages)

### 1. `factories/FactoryPage.jsx`
- **Mục đích:** Khai báo cấu trúc phần cứng diện tích nhà máy.
- **Tính năng:**
  - Quản lý các phân khu xưởng (Ví dụ: Xưởng Cắt, Xưởng May, Xưởng Đóng Gói).
  - List CRUD hiển thị phân khu. Thông tin này cần để map với máy móc nào đang nằm ở Xưởng nào.

### 2. `machines/MachinePage.jsx`
- **Mục đích:** Giao diện thiết bị tài sản máy tham gia sản xuất.
- **Tính năng:**
  - Hiển thị danh sách thiết bị có trong hệ thống (Tên, Mã hiệu, Năng suất lý thuyết).
  - Hiển thị trạng thái máy (Đang chạy, Đang nghỉ, hoặc Bảo Trì hỏng).
  - Có các Action để Toggle trạng thái bảo trì/sửa chữa thiết bị (Chứ không cho phép xóa data nếu đang hoạt động).
