# Hướng Dẫn Sử Dụng: Khóa Cấu Hình Đơn Hàng (Order Product Snapshot)

## Tính Năng Snapshot (Chốt Cấu Hình Vật Tư Đơn Hàng)
**Đối tượng sử dụng:** Quản lý Dự án, Kế toán, Tổ Kỹ thuật.

**Tình huống nghiệp vụ:**
Giả sử nhà máy nhận một Đơn Hàng may **"Áo Sơ Mi (Phiên Bản A)"** vào tháng 1. Lúc này Phiên bản A quy định cần đính 5 cái nút áo.
Tuy nhiên đến tháng 3, bộ phận Thiết kế lại âm thầm vào kho dữ liệu sửa "Áo Sơ Mi (Phiên Bản A)" thành mẫu mới chỉ dùng *4 cái nút áo*.
-> Nếu nhà máy đang sản xuất Đơn Hàng của tháng 1 mà dựa theo thông số bị sửa ở tháng 3, thì sẽ sai hoàn toàn với cam kết với Khách cũ. 

-> **Đó là lý do tính năng Order Product Snapshot (Chụp nhanh) ra đời.**

**Quy trình Hoạt động của Snapshot:**
1. Khi Bộ phận Kinh doanh nhấn nút **Lưu** tạo một Đơn Hàng mới trên hệ thống.
2. Hệ thống sẽ **tự động** "chụp ảnh" toàn bộ thông số định mức, số lượng vật liệu, BOM (Bill of Materials) hiện tại cấu thành nên các Sản phẩm có trong đơn hàng đó.
3. Chức năng này chạy ngầm phía sau (`OrderProductSnapshotPage.jsx` hoặc các dialog hiển thị detail).
4. **Cách xem dữ liệu chốt (Snapshot):**
   - Mở Đơn Hàng.
   - Chọn Xem Chi Tiết Vật Tư / Ghi nhận cấu hình (Warehouse Details Dialog).
   - Hệ thống sẽ hiển thị định dạng và số lượng vật liệu đúng nguyên bản như lúc Khách Ký Hợp Đồng. Dù ai có thay đổi dữ liệu Sản phẩm gốc bên ngoài, Đơn hàng này vẫn lấy dữ liệu Snapshot cũ để sản xuất, đảm bảo tính bất di bất dịch của Hợp đồng.
