# Hướng Dẫn Sử Dụng: Quản lý Đơn Hàng & Lập Kế Hoạch 

## 1. Màn Hình Đơn Hàng (Order Page)
**Đối tượng sử dụng:** Nhân viên Kinh doanh, Quản lý điều phối.

**Quy trình quản lý Đơn Hàng:**
1. Mở menu **Đơn Hàng (Orders)**. 
2. Màn hình chia làm các danh sách trạng thái của đơn: Đang chờ, Đang thực hiện, Đã Xong.
3. **Tạo Đơn Hàng Mới:**
   - Nhấn nút **Thêm Đơn Hàng**.
   - Bảng điền thông tin hiện lên: Chọn Khách hàng (ai đặt), Đặt món gì (Sản phẩm), Số lượng bao nhiêu, Ngày gửi hàng (Deadline).
   - Nhấn **Lưu & Khởi tạo**.
4. **Theo dõi tiến độ đơn:** 
   - Trên mỗi dòng Đơn hàng ở giao diện list, bạn sẽ thấy cột **% Hoàn thành**. Cột này tự động đổi thành thanh màu khi Công Nhân ở xưởng chốt phiếu sản phẩm cho số hàng này.
   - Click vào "Chi tiết vật tư" để xem kho có đủ nguyên liệu để bắt đầu sản xuất không.

---

## 2. Lập Kế Hoạch Sản Xuất (Planning Page)
**Đối tượng sử dụng:** Trưởng xưởng, Người xếp lịch.

**Mục đích:** Khi Đơn hàng 500 cái áo được tạo ở trên, bạn phải chia số lượng này cho 5 máy may, mỗi máy 100 cái áo vào một khoảng thời gian nhất định – Đó gọi là Kế hoạch (Plan).

**Quy trình lập kế hoạch:**
1. Chọn menu **Lập Kế Hoạch (Planning)**.
2. Bạn sẽ thấy một biểu đồ lịch (Gantt Chart hoặc dạng Lưới).
3. **Tạo việc giao cho Máy:**
   - Bạn nhấn vào biểu tượng **Tạo Kế Hoạch Mới**.
   - Popup yêu cầu bạn kéo Data từ một Đơn Hàng xuống. 
   - Nhập **Số Lượng** (ví dụ 100 cái).
   - Chọn **Máy móc** sẽ thực hiện.
   - Chọn **Ngày bắt đầu** và **Ngày kết thúc**.
   - Nhấp **Lưu Kế Hoạch**.
4. **Giao việc cho Công Nhân (Assign Worker):** 
   - Sau khi Plan vừa được tạo xuất hiện trên lịch, click đúp hoặc ấn nút "Gắn Công Nhân".
   - Bạn check vào danh sách tên 2-3 công nhân chịu trách nhiệm cho lệnh này. Hệ thống sẽ báo trực tiếp xuống điện thoại/tablet của họ.

*(Lưu ý: Hệ thống sẽ báo lỗi màu đỏ (Báo trùng) nếu bạn điều 1 Máy làm 2 kế hoạch chồng chéo cùng 1 lúc).*
