# orders/ & planning/ Module - Frontend Đơn Hàng & Kế Hoạch

## Kế hoạch (Planning)
**Thư mục:** `/planning`

### 1. `PlanningPage.jsx`
- **Mục đích:** Giao diện quan trọng nhất nơi Điều phối viên chia chẻ Đơn Hàng vào Xưởng.
- **Tính năng:** Bảng Kế hoạch (Gantt Chart hoặc Data Grid lớn). Shows từng hàng là 1 Lệnh Sản Xuất, cột là Ngày. Kéo / thả hoăc Select Ngày cho Plans.
- **Các Components:**
  - `PlanningFormDialog.jsx`: Modal nhập thông tin số lượng, chọn máy, chọn ca, chọn ngày.
  - `WorkerAssignmentDialog.jsx`: Modal phân công (Search và tích vào Tên Công Nhân được gắn vào việc này). Nhấn Save sẽ bind data qua API.

---

## Đơn Đặt Hàng (Orders)
**Thư mục:** `/orders`

### 1. `OrderPage.jsx`
- **Mục đích:** List các Đơn đặt của Khách.
- **Tính năng:** Hiển thị List tổng thổng, theo dõi trạng thái xem "Sắp Trễ Giao", "Còn Pending", "Rảnh". Mở Modal CRUD nhập đơn lớn.

### 2. `OrderProductSnapshotPage.jsx` (Dữ liệu chốt chặn)
- **Mục đích:** Ghi nhận "Snapshot" (bản lưu) của thông tin kỹ thuật hàng ở thời điểm Khách chốt deal. Đề phòng sau này lỡ có người đổi Data cấu hình Sản phẩm ở Module Product.

### 3. Components
- `OrderSummaryDialog.jsx` & `WarehouseDetailsDialog.jsx`: Popup xem số tổng / Xem tồn kho nguyên vật liệu xem có khả thi để làm đơn này không.
- `CompletionPercentageCell.jsx`: Cột UI Chart dạng Thanh ngang nhỏ hiển thị % (Ví dụ Vạch xanh 75%).
