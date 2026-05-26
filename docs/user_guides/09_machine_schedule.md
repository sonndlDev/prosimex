# Hướng Dẫn Sử Dụng: Lịch Trình Máy Móc (Machine Schedule)

## 1. Màn hình Xem Trạng Thái Lịch Tổng Tổng (Schedule Page)
**Đối tượng sử dụng:** Bộ phận Lên Kế Hoạch (Planner), Quản đốc Nhà máy.

**Mục đích:** Khác với màn hình Lập Kế Hoạch (Planning) là nơi để 'tạo ra' công việc, màn hình **Lịch Trình Máy (Schedule)** cung cấp một cái nhìn tổng quan dạng **Sơ Đồ Thời Gian (Time-block / Gantt)** để theo dõi trực quan máy nào đang chạy đơn hàng nào, bao giờ xong.

**Quy trình sử dụng sơ đồ Calendar (Lịch):**
1. Truy cập vào menu **Lịch Trình Máy (Schedule)**.
2. Trên màn hình sẽ xuất hiện một bảng Timeline.
   - **Trục dọc (Cột trái):** Danh sách các Máy móc trong xưởng (Ví dụ: Máy Cắt 01, Máy May 02).
   - **Trục ngang (Cột trên):** Mốc thời gian theo Ngày/Tuần/Tháng.
3. **Đọc hiểu thanh dữ liệu:**
   - Các 'khối màu' (Block) nằm ngang trên lịch đại diện cho một Kế hoạch đang được giao cho máy đó.
   - Trỏ chuột (Hover) hoặc Click vào khối màu đó để xem chi tiết: Máy này đang chạy Đơn Hàng số mấy, Sản xuất Sản phẩm gì, người công nhân nào đang đứng máy.
4. **Phát hiện xung đột (Conflict):**
   - Nếu lịch của một Máy đang trống nguyên một tuần, bạn có thể lập tức báo Tổ Kế hoạch dồn đơn thả vào máy đó để tối ưu công suất.
   - Nếu khối màu bị "Đỏ" hoặc có thông báo đè lên nhau, nghĩa là máy đang bị quá tải (bị gán 2 kế hoạch trùng ngày). Bạn cần vào lại tính năng Kế hoạch để sửa lại thời gian.

---

## 2. Kết hợp với tính năng Bảo Trì Máy (Maintenance Delay)
- Tại màn hình Lịch này, nếu một máy được cài đặt sang trạng thái "Bảo Trì - Maintenance" (ở menu Máy Móc), nguyên khoảnh thời gian đó trên lịch trình sẽ bị **Gạch chéo / Đóng băng**.
- Mọi Kế hoạch có dự tính rơi vào khoảnh thời gian gạch chéo đó sẽ bị hệ thống cảnh báo hoãn lại.
