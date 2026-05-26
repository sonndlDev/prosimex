# Hướng Dẫn Sử Dụng: Đối Tác Thương Mại & Gia Công Ngoài

## 1. Quản lý Khách Hàng (Customers) & Mua Sắm (Suppliers)
**Đối tượng sử dụng:** Bộ phận Mua Hàng (Purchasing), Nhân viên Kinh Doanh (Sale).

**Thao tác cơ bản:**
1. Ở bảng điều hướng, tìm mục **Khách Hàng (Customers)** hoặc **Nhà Cung Cấp (Suppliers)**.
2. Danh sách dạng danh bạ thư mục sẽ hiện ra. 
3. **Thêm Khách Hàng / Đối tác cung cấp vải, thép:**
   - Click nút "Tạo Mới".
   - Điền đầy đủ Thông tin Pháp nhân, Mã Số Thuế, Số điện thoại hỗ trợ của bên đó, Địa chỉ thanh toán hợp đồng.
4. Những tập dữ liệu này sẽ là nguồn cấp liên lạc chính mỗi khi tạo Đơn Hàng (Bán) hay Tạo Yêu Cầu Thuê Ngoài. Chọn sai hoặc không có tên đối tác thì sẽ không khởi tạo được hợp đồng.

---

## 2. Quản lý Gia Công Ngoài (Outsourcing)
**Đối tượng sử dụng:** Ban Quản Đốc, Cán bộ Hàng hóa.

**Mục đích:** Xảy ra vào những tháng cao điểm, xưởng nhận khối lượng đơn hàng quá khủng mà 100 con máy may làm không kịp. Quản lý sẽ trích một phần nguyên liệu mang sang xưởng hàng xóm nhờ họ may hộ (Thuê Gia Công / Outsourcing).

**Quy trình quản lý phiếu Gia Công:**
1. Chọn module **Gia Công (Outsourcing)**.
2. **Tạo Lệnh Thuê Mới:**
   - Bấm **Thêm Đơn Thuê Gia Công**.
   - Lựa chọn Nhà Cung Cấp (Supplier - xưởng nhờ làm) sẽ nhận việc.
   - Giao việc: Chọn xuất mã Sản Phẩm A, Số lượng yêu cầu: 1.000 cái.
   - Đặt cước hoặc đơn giá thuê dự kiến.
3. **Theo dỗi Giao Nhận:** Khi xe tải bên B giao 500 cái đợt 1 về. Bạn cập nhật vào Lệnh này với thông tin: Số lượng đã nhận = 500, Số lượng thiếu = 500. Trạng thái của lệnh là IN_PROGRESS (Đang thu thập dần).
4. Khi đủ 1.000, bạn đóng lệnh lại thành COMPLETED. Kho tổng của nhà máy sẽ tự động ghi nhận lượng tăng hàng này lên giống hệt như công nhân trong xưởng tự làm vậy.
