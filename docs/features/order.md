# Order (Đơn hàng)

## 1. Mô tả

Module **Order** quản lý thông tin các đơn hàng từ khách hàng, bao gồm sản phẩm, số lượng, ngày giao hàng, và trạng thái sản xuất.

## 2. Các Endpoints

- `GET /`: Lấy danh sách đơn hàng có phân trang, lọc (theo xưởng, trạng thái, ngày, khách hàng).
- `GET /product-snapshots`: Lấy chi tiết đơn hàng dưới dạng snapshot sản phẩm.
- `GET /:id/completion-report`: Báo cáo tiến độ hoàn thành đơn hàng.
- `GET /:id/summary-report`: Báo cáo tổng hợp đơn hàng.
- `GET /:id`: Lấy thông tin chi tiết của một đơn hàng.
- `POST /`: Tạo đơn hàng mới.
- `PUT /:id`: Cập nhật đơn hàng.
- `PUT /:id/warehouse-details`: Cập nhật thông tin chi tiết kho cho đơn hàng.
- `DELETE /:id`: Xóa đơn hàng (Soft delete).

## 3. Luồng nghiệp vụ cốt lõi (Business Logic Flows)

- **Tạo đơn hàng mới (Create Order)**:
  - Lưu thông tin chung của đơn hàng (`orders` table).
  - Tạo liên kết sản phẩm và lưu snapshot giá trị (`order_products` và snapshot logic) nhằm lưu lại trạng thái thuộc tính của sản phẩm tại thời điểm tạo đơn.
  - Hỗ trợ lưu thông tin thông quan (nhà kho, cung ứng xuất khẩu) vào bảng phụ `order_ext`.
- **Tính toán tiến độ hoàn thành (Completion calculation)**:
  - Tỉ lệ hoàn thành được tính dựa trên **tổng khối lượng yêu cầu** so với **thực tế sản xuất** (từ phiếu giao việc) cộng với **thực tế gia công ngoài** (xi mạ, đóng gói).
- **Cập nhật & Xóa**:
  - Hỗ trợ cập nhật thông tin chung, sản phẩm trong đơn, và thông tin giao hàng/kho bãi.
  - Xóa mềm (Soft delete) đơn hàng bằng cách cập nhật trường `deleted_at`.

## 4. Mối quan hệ với các modules khác

- **Customer**: Đơn hàng gắn với một khách hàng cụ thể.
- **Product & Product Group**: Bảng Order lưu trữ các sản phẩm được đặt và thông tin nhóm sản phẩm.
- **Production Planning**: Đơn hàng là cơ sở để lập kế hoạch sản xuất. Trạng thái có thể chuyển sang `PLANNED` khi lên kế hoạch xong.
- **Daily Ticket & Outsourcing**: Cung cấp dữ liệu (số lượng sản xuất thực tế, số lượng gia công ngoài) để thống kê tiến độ đơn hàng.
