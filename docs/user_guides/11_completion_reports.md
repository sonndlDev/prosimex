# Hướng Dẫn Sử Dụng: Báo Cáo Chuyên Sâu Tỷ Lệ Hoàn Thành & Lỗi

## 1. Báo cáo tỷ lệ hoàn thành (Completion Report Dialog)
**Đối tượng sử dụng:** Bộ phận Kiểm Soát Chất Lượng (QC).

**Mục đích:** Để nghiệm thu xem một Đơn Hàng có thực sự đủ điều kiện đóng thùng giao cho khách hay không.

**Quy trình:**
1. Trong màn hình Đơn Hàng (Order Page), tìm phần theo dõi Tiến độ.
2. Mở hộp thoại **Báo Cáo Hoàn Thành (Completion Report Dialog)**.
3. Bảng này sẽ tổng hợp dữ liệu từ hàng ngàn Phiếu Daily Ticket (Đã được Approved).
4. Nó sẽ phân tích chi tiết:
   - Trong 1.000 sản phẩm yêu cầu, có bao nhiêu hàng Tốt.
   - Có bao nhiêu hàng Lỗi (Defect).
5. Nếu số hàng Lỗi vượt phần trăm cho phép (Ví dụ Khách cho phép lỗi 1%, thực tế lỗi 5%), QA phải yêu cầu tổ chức chạy thêm Kế hoạch sản xuất bù.

---

## 2. Kiểm Soát Khối Lượng Tồn Còn Lại (Remaining Quantity Dialog)
**Đối tượng sử dụng:** Kế Toán, Quản lý vật tư.

**Quy trình:**
1. Mỗi khi một lệnh lấy vật tư chạy, màn hình **Số lượng còn lại (Remaining Quantity)** sẽ ước tính thời gian thực.
2. Ví dụ bạn muốn tạo lập chạy Kế Hoạch 5.000 đôi giày, yêu cầu 10.000 miếng da bò.
3. Bấm vào nút `Xem vật tư`, hộp thoại nhảy ra báo Đỏ: "Hiện Tồn Kho chỉ còn 8.000 miếng, Sẽ Hụt 2.000 miếng".
4. Quản lý lập tức dựa vào đây, qua Module Supplier (Nhà cung cấp) để gọi mua vật liệu gấp, tránh tình trạng Công nhân và Máy bật lên mà không có nguyên liệu làm.
