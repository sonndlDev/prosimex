# Tổng hợp Flow & Logic các Module còn lại

Các module khác bổ trợ hoàn thiện quy trình nhà máy ERP/MES.

## 1. Customer & Supplier (Khách Hàng & Nhà Cung Cấp)
- **Mục đích:** Quản lý đối tác để làm điểm đầu và cuối của chuỗi cung ứng.
- **Logic:** Customer dùng trong module `Order` (ai là người đặt hàng). Supplier dùng trong quản lý nguyên vật liệu hoặc Gia công ngoài (Outsourcing). Cung cấp đầy đủ hàm API CRUD cơ bản.

## 2. Outsourcing (Gia Công Ngoài)
- **Mục đích:** Những công đoạn nhà máy không làm (hoặc thiếu công suất) sẽ thuê đối tác ngoài (Supplier) xử lý.
- **Logic:** 
  - Tạo `Outsourcing Ticket`: Chỉ định Supplier, Sản phẩm, Số lượng, Đơn giá.
  - Quản lý quá trình chuyển giao hàng (Xuất đi - Nhập về).
  - Tích hợp ghi nhận chi phí/giá trị cho đơn hàng tổng.

## 3. Product & Product Inventory (Sản Phẩm & Tồn Kho)
- **Mục đích:** Quản lý danh mục Sản phẩm cấu thành nên Đơn hàng và quản lý kho.
- **Logic:**
  - Định nghĩa BOM (Bill of Materials) nếu có.
  - Kiểm đếm, update lượng tồn kho (Inventory) mỗi khi có Daily Ticket được hoàn thành (Nhập kho = Cộng dồn) hoặc Hàng xuất xưởng (Xuất kho = Trừ đi).

## 4. Notification & Dashboard
- **Mục đích:** Cung cấp thông tin cảnh báo realtime và số liệu tổng quan điều hành.
- **Logic:**
  - Dashboard API: Tổng hợp từ nhiều Module (Số đơn hàng đang chạy, sản lượng hôm nay, số máy đang lỗi, v.v...) sử dụng Aggregation Database Queries để có thời gian phản hồi nhanh.
  - Sockets/Notification: Khi Ticket bị Reject, Kế hoạch thay đổi sẽ trigger gửi Push/Websocket Notification cho client liên quan.
