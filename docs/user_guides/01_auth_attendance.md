# Hướng Dẫn Sử Dụng: Điểm Danh & Hệ Thống Tài Khoản (Attendance & Auth)

## 1. Đăng nhập hệ thống (Login Page)
**Đối tượng sử dụng:** Tất cả người dùng.

**Quy trình thao tác:**
1. Truy cập vào đường dẫn/link hệ thống của nhà máy.
2. Tại màn hình chính, hệ thống yêu cầu bạn điền **Tên tài khoản (Username/Email)** và **Mật khẩu (Password)**.
3. Nhấp nút **Đăng nhập**. 
4. Nếu nhập đúng, hệ thống sẽ tự động chuyển bạn đến trang `Bảng Điều Khiển (Dashboard)`. Nếu sai, một thông báo lỗi màu đỏ sẽ hiện ra yêu cầu nhập lại.

---

## 2. Điểm danh hằng ngày (Attendance Page)
**Đối tượng sử dụng:** Công nhân, Tổ trưởng, Người đứng máy.

**Quy trình thao tác check-in/check-out:**
1. Tìm đến menu bên trái, nhấp vào **Điểm Danh (Attendance)**.
2. Trên màn hình sẽ hiển thị danh sách công nhân trong phân xưởng / nhóm của bạn, hoặc chỉ hiển thị thông tin của cá nhân bạn (tùy thuộc vào quyền hạn).
3. **Khi bắt đầu ca làm (Check-in):** 
   - Ấn vào nút **Vào Ca (Check-in)** màu xanh lá. 
   - Hệ thống sẽ ghi nhận và khóa thời gian bắt đầu của bạn.
4. **Khi kết thúc ca làm (Check-out):** 
   - Ấn vào nút **Ra Ca (Check-out)** màu đỏ.
   - Hệ thống tính toán sự chênh lệch thời gian để ra tổng giờ làm thực tế.

*(Lưu ý: Nếu quên Check-in hoặc Check-out, bạn cần liên hệ ngay với Quản đốc để họ điều chỉnh lại lịch sử bằng chức năng Quản lý bên dưới).*

---

## 3. Quản lý Lịch sử Điểm Danh (Attendance Management)
**Đối tượng sử dụng:** Quản lý xưởng, Nhân sự (HR), Admin.

**Quy trình thao tác sửa đổi/theo dõi:**
1. Nhấp vào menu **Quản Lý Điểm Danh**.
2. Một bảng lớn (Table) xuất hiện chứa toàn bộ dữ liệu ra/vào ca của mọi người.
3. **Tìm kiếm & Lọc:** Bạn có thể dùng ô tìm kiếm để gõ tên một công nhân, hoặc ô chọn Ngày tháng để xem dữ liệu hôm qua/hôm nay.
4. **Sửa dữ liệu do sai sót:** 
   - Tìm đến dòng của công nhân bị lỗi máy chấm, kéo sang phải và ấn vào biểu tượng chiếc Bút (Edit).
   - Nhập tay mốc giờ đúng, ghi chú lý do sửa đổi và ấn **Lưu (Save)**.

---

## 4. Quản lý Tài Khoản & Phân Quyền (User Page)
**Đối tượng sử dụng:** Quản trị viên (Admin).

**Quy trình cấp/lấy quyền tài khoản:**
1. Chọn menu **Quản Lý Tài Khoản**.
2. **Thêm thành viên mới:** Nhấp vào nút **Tạo Mới**, điền Tên đăng nhập, Mật khẩu khởi tạo và chọn Nhóm Quyền (Vai trò: Vd Công Nhân, Quản lý, Kế toán). 
3. **Khóa tài khoản:** Nếu có nhân viên nghỉ việc, tìm tên nhân viên đó dòng kẻ bảng, bấm biểu tượng Thùng rác/Khóa ẩn để hủy toàn bộ quyền truy cập hệ thống của họ vĩnh viễn. 
