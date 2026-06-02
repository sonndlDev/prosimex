# Machine (Quản lý Thiết bị/Máy móc)

## 1. Mô tả

Module **Machine** làm nhiệm vụ lưu trữ sơ yếu lý lịch các loại máy móc móc cơ khí, thiết bị trong xưởng. Nó đóng vai trò là "Resource Node" quan trọng để cấp phát tài nguyên năng lực sản xuất khi thiết lập Planning.

## 2. Các Endpoints

- `GET /`: Gọi xuống danh sách toàn bộ máy móc hoặc phân bổ theo phòng ban/sắp xếp theo trạng thái chạy hỏng.
- `POST /`: Lưu đăng ký máy móc sản xuất mới.
- `PUT /:id`: Sửa đổi thuộc tính cấu hình/trạng thái cơ khí của một thiết bị.
- `DELETE /:id`: Gỡ máy khỏi hoạt động hiện hành (Soft delete).

## 3. Luồng nghiệp vụ cốt lõi (Business Logic Flows)

- **Quản lý Thông Tin Cơ Sở (CRUD)**: Create, Read, Update, Delete một máy bao gồm mã số, loại máy, xưởng phụ trách vật lý.
- **Điều phối trạng thái khả dụng**: Thiết bị lưu trữ nhãn Trạng thái máy móc, giúp hệ thống xác định tình trạng (Available, Trong sửa chữa Maintenance, Mất điện/Hỏng Broken, v.v..) để tự động cảnh cáo lúc gán định mức.

## 4. Mối quan hệ với các modules khác

- **Production Planning**: Là mục tiêu chính để lập biểu đồ Gantt/Timeline biểu diễn "Machine Schedules". Hàm phân bổ kiểm tra tránh xung đột lệnh cho thiết bị trong cùng 1 khoảng gian.
- **Daily Ticket**: Các báo cáo vận hành thường ngày ánh xạ với đích đến là máy nào chạy cho ra thành phẩm.
- **Product Group Operations (Định mức thao tác)**: Thông tin thiết bị được móc nối để lưu mặc định một Công đoạn A sử dụng tốt nhất trên Máy B.
