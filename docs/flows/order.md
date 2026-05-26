# Order Flow & Logic

## Tổng quan
Module Order quản lý toàn bộ vòng đời của một đơn hàng, từ lúc tạo mới, giao việc cho đến khi hoàn thành đơn.

## Các chức năng chính

1. **Tạo đơn hàng mới (Create Order)**
   - **Mục đích:** Ghi nhận yêu cầu sản xuất/đơn đặt hàng mới vào hệ thống.
   - **Logic:**
     - Lấy thông tin đơn hàng (Customer, Sản phẩm, Số lượng, Ngày dự kiến giao).
     - Link đơn hàng với các Product tương ứng.
     - Lưu thông tin vào DB với trạng thái ban đầu (ví dụ: `PENDING`).

2. **Cập nhật thông tin đơn hàng (Update Order)**
   - **Mục đích:** Chỉnh sửa thông tin đơn hàng khi có thay đổi.
   - **Logic:** Validate dữ liệu, cập nhật bảng nội dung. (Chỉ cho phép cập nhật khi đơn hàng chưa đi vào trạng thái cấm sửa đổi).

3. **Danh sách đơn hàng (Get Orders)**
   - **Mục đích:** Hiển thị và lọc danh sách đơn hàng cho dashboard.
   - **Logic:** Hỗ trợ phân trang (pagination), tìm kiếm (search), và lọc theo trạng thái (status) hoặc thời gian (date range).

4. **Quản lý trạng thái (Order Status Lifecycle)**
   - **Mục đích:** Theo dõi tiến độ.
   - **Logic:** Chuyển đổi qua lại giữa các trạng thái: `PENDING` -> `IN_PROGRESS` -> `COMPLETED` / `CANCELED`. Việc thay đổi này sẽ thường trigger các notification cho các bên liên quan.

## Database
- `orders`: Thông tin chung của đơn hàng.
- `order_products`: Mối quan hệ N-N giữa đơn hàng và các mặt hàng cần sản xuất.
