# Hướng Dẫn Sử Dụng: Tiện Ích Tải Lên Hàng Loạt Với Excel

## Tính năng Import (Nhập Liệu Dữ Liệu Lên Hệ Thống Bằng Excel)
**Đối tượng sử dụng:** Quản lý hành chính Xưởng, Kế toán.

**Mục đích:** 
Thay vì Công nhân/Tổ trưởng dùng điện thoại báo cáo sản lượng nhập tay từng phiếu một (1 vé/1 lần) trên hệ thống, thì cuối buổi chiều, Tổ trưởng sẽ xuất 1 file Danh sách Excel ghi nhận mọi sản lượng của nhóm 50 người, mang file Excel đó lên hệ thống thả vào, tự động máy chủ sẽ tạo ra 50 phiếu dữ liệu chuẩn xác chớp nhoáng.

**Quy trình Import Daily Tickets:**
1. Tìm theo menu **Tiện Ích -> Dữ Liệu Excel / Import Daily Ticket**.
2. **Lấy file mẫu gốc:** 
   - Trên màn hình sẽ có nút "Tải File Template Mẫu". Bấm vào đây để có file cấu trúc .xlsx chuẩn của công ty (gồm các Cột Cố Định như: Mã Nhân Viên, Mã Máy, Mã Kế Hoạch, Sản Lượng, Số Sản Phẩm Lỗi).
3. **Ghi Data:** Quản lý xưởng sao chép số liệu tổng hợp trong ngày của mình vào theo đúng định dạng cột trên file mẫu này. 
4. **Tải tệp lên:** 
   - Lưu lại tệp Excel ở máy tính.
   - Kéo thả tệp đó vào Khu vực Upload (Vùng đứt nét có biểu tượng đám mây).
   - Hệ thống sẽ Load dữ liệu của bạn lên Bảng Review nhỏ.
5. **Kiểm tra báo lỗi (Validation):** 
   - Nếu bạn gõ sai Mã nhân viên dính chữ cái, hoặc copy nhầm Mã Kế hoạch không tồn tại, cột ở hàng đó sẽ Báo Đỏ ngay trong bảng Review.
   - Nếu Data hợp lệ, chúng sẽ được tích Xanh.
6. **Lưu hoàn tất:** Nhấn nút Xác Nhận (Submit). Hệ thống đổ dữ liệu tạo thành các vé thành công, đẩy KPI sản xuất tiến độ lên tự động. 
