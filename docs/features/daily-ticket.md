# Daily Ticket (Phiếu Giao Việc / Báo cáo Hàng Ngày)

## 1. Mô tả

Module **Daily Ticket** quản lý các phiếu giao việc và báo cáo kết quả sản xuất hàng ngày theo từng máy phụ trách. Tại đây, chỉ tiêu phân bổ mỗi ngày sẽ được đối chiếu với sản lượng thực tế làm ra.

## 2. Các Endpoints

- `GET /`: Danh sách phiếu theo ngày, người tạo, loại mã, trạng thái, có hỗ trợ loại trừ các phiếu pending.
- `GET /:id`: Lấy chi tiết một phiếu giao việc cùng các hạng mục (items) tương ứng.
- `POST /`: Khởi tạo ticket thủ công bởi người lập kế hoạch.
- `PUT /:id`: Cập nhật thông tin phiếu.
- `PUT /:id/results`: Cập nhật kết quả số lượng sản xuất thực tế.
- `DELETE /:id`: Xóa mềm một phiếu sản xuất.
- `POST /auto-generate`: Trình khởi chạy (worker logic) tự động sinh hàng loạt phiếu giao việc dựa trên kế hoạch.
- `POST /manual-entry`: Tạo hoặc chỉnh sửa form trực tiếp từ ngoài màn hình thao tác.
- `GET /export/detailed`: Tổng hợp dữ liệu thành tệp Excel chi tiết.
- `POST /:id/approve` & `POST /:id/reject`: Quy trình duyệt phiếu từ kết quả thực.

## 3. Luồng nghiệp vụ cốt lõi (Business Logic Flows)

- **Tự động sinh vé (Auto-generation)**:
  - Khởi động ngầm một dịch vụ đọc dữ liệu bảng `production_plan_days` của ngày hiện tại.
  - Nhóm các công việc có chung tính chất Máy/Thiết bị thiết lập để đúc thành một phiếu mẹ `daily_production_tickets`. Và các khoản mục nằm dưới dạng `daily_production_ticket_items`.
- **Cập nhật Phiếu/Báo cáo kết quả (Update Result)**:
  - Khi vận hành xong, công nhân điền trường `actual_quantity`. Có thể kèm theo ghi chú lỗi nguyên liệu hoặc dừng máy chờ.
- **Workflow Phê Duyệt**:
  - Phiếu khi cập nhật kết quả có thể nằm ở trạng thái chờ duyệt `PENDING_APPROVAL`.
  - Thao tác cấp trên Appprove đẩy dữ liệu chính thức làm cơ sở tính tiến trình Order Completion. Nếu `reject`, gửi lại cho tổ vận hành làm chuẩn.

## 4. Mối quan hệ với các modules khác

- **Production Planning**: Tích hợp chặt chẽ ánh xạ 1-1 khối lượng làm việc từ lịch trình vào phiếu xuất xưởng.
- **Order & Product**: Phiếu ghi nhận số lượng trực tiếp cho Product của Order.
- **Machine**: Kiểm kê năng suất chạy của từng thiết bị trong ca.
