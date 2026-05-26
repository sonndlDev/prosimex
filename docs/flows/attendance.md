# Attendance Flow & Logic

## Tổng quan
Module Attendance quản lý việc điểm danh, ghi nhận giờ làm việc của công nhân.

## Các chức năng chính (Controller: `attendance.controller.js`)

1. **Điểm danh vào (Check-in)**
   - **Mục đích:** Ghi nhận thời gian bắt đầu làm việc của công nhân.
   - **Logic:** 
     - Nhận dữ liệu (worker_id, thời gian).
     - Kiểm tra công nhân đã điểm danh vào chưa.
     - Lưu thông tin vào database.

2. **Điểm danh ra (Check-out)**
   - **Mục đích:** Ghi nhận thời gian kết thúc làm việc của công nhân.
   - **Logic:**
     - Nhận dữ liệu (worker_id, thời gian).
     - Kiểm tra công nhân đã điểm danh vào chưa, có trùng lặp check-out không.
     - Cập nhật thông tin điểm danh ra vào database.

3. **Lấy danh sách điểm danh**
   - **Mục đích:** Lấy thông tin điểm danh theo ngày, theo công nhân.
   - **Logic:** Truy vấn database bảng điểm danh, trả về danh sách lịch sử. Tự động tính toán tổng số giờ làm việc dựa trên chênh lệch giữa check-in và check-out.

4. **Khai báo vắng mặt (Absent)**
   - **Mục đích:** Ghi nhận việc công nhân xin nghỉ phép/vắng mặt.
   - **Logic:** Lưu lý do và ngày vắng mặt vào hệ thống.

## Database (Các bảng liên quan)
- `workers`: Lưu thông tin công nhân.
- Bảng `attendance` (hoặc tương tự): Lưu trữ lịch sử check-in, check-out, và vắng mặt của công nhân.
