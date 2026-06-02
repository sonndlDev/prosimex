# Outsourcing (Gia công ngoài)

## 1. Mô tả
Module **Outsourcing** đóng vai trò điều phối xuất vật liệu/bán thành phẩm cho các đơn vị đối tác gia công xử lí mạ/đóng gói, và quản lí quá trình nhập/trả hàng.

## 2. Các Endpoints
- `GET /`: Danh mục tổng quan các phiếu xuất gia công ngoài xử lý.
- `GET /export-detailed`: Trích xuất file excel chi tiết tiến độ trả hàng.
- `POST /`: Tạo biểu mẫu vé (ticket) xuất hàng gia công.
- `GET /:ticket_code`: Đọc chi tiết vé theo định danh mã vé (Code).
- `POST /:ticket_id/returns`: Ghi dữ liệu cho một lần lô hàng gia công hoàn trả về.
- `PUT /:id`: Chỉnh sửa dữ liệu vé xuất.
- `DELETE /:id`: Đóng/Hủy hồ sơ xuất.

## 3. Luồng nghiệp vụ cốt lõi (Business Logic Flows)
- **Tạo Phiếu Xuất (Create Ticket)**:
  - Khởi tạo lượng sản phẩm tồn kho cần đưa đi xử lý với khóa định vị về Order, Product.
  - Phân loại hình thức gia công `PLATING` (Mạ điện) hay `PACKAGING` (Đóng gói).
  - Chọn đầu mối đối tác trực tiếp `Supplier` nhận thầu.
- **Tiếp nhận hàng trả (Returns Entry)**:
  - Một phiếu xuất có thể được giải quyết làm nhiều chặng trả về.
  - Mỗi lần trả hàng tạo thêm một dòng báo cáo con ghi rõ Số lượng vào (`quantity_in`), phân loại hàng loại bỏ nếu có. Trạng thái của ticket sẽ tính toán xem đã cân bằng với số lượng đem xuất nguyên thủy chưa.
- **Tích phân hệ thống**:
  - Module là nguồn tham chiếu trọng tâm trong công thức kiểm tra tỉ lệ hoàn thành Order Percentage, ghi nợ cho `total_plating_out` và `total_packaging_out`.

## 4. Mối quan hệ với các modules khác
- **Order & Product**: Xuất kho dựa trên số liệu chuẩn của sản phẩm nằm trong đơn yêu cầu.
- **Supplier**: Định tuyến nơi lưu xuất tới nhà thầu dịch vụ phụ trợ.
