# Machine Schedule (Quản Lý Máy Móc) Flow & Logic

## Tổng quan
Module theo dõi, sắp xếp lịch hoạt động của thiết bị/máy móc trong nhà xưởng, hạn chế tình trạng 1 máy bị gán 2 việc cùng lúc (Conflict).

## Các chức năng chính

1. **Quản lý danh sách máy (CRUD Machine)**
   - **Mục đích:** Thêm/Sửa/Xóa và xem trạng thái các máy sản xuất.
   - **Logic:** Thông tin máy (ID, tên, trạng thái hiện tại: `RUNNING`, `MAINTENANCE`, `IDLE`).

2. **Lên lịch máy (Machine Scheduling)**
   - **Mục đích:** Khi có kế hoạch sản xuất (Production Plan), máy móc sẽ được gắn thời gian sử dụng.
   - **Logic:** 
     - Input: Machine_ID, Start_Time, End_Time.
     - Validate: Query xem lịch trình này có bị overlap (chồng chéo) lên schedule khác đang gán cho cùng 1 máy không.
     - Nếu hợp lệ thì Lưu trữ.

3. **Báo cáo tình trạng bảo trì (Maintenance)**
   - **Mục đích:** Báo hỏng, ngắt máy đưa vào chu kì bảo dưỡng.
   - **Logic:** Set status máy -> `MAINTENANCE`. Mọi kế hoạch hoặc ticket dính đến máy này trong tgian bảo trì cần cảnh báo / hoặc tạm ngưng (pause/block).

## Database
- `machines` (hoặc thiết bị liên quan): Thông tin cấu hình máy.
- `machine_schedule` (hoặc thông qua bảng Plans/Tickets): Thể hiện timeline đang chạy của máy.
