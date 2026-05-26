# Phân tích Logic Code: Order & Order Products

## 1. Tạo Đơn hàng (Create Order)
**File chính:** `backend/src/modules/order/order.controller.js` (Hàm `createOrder`)

### Mục đích:
Khởi tạo một đơn đặt hàng có chứa thông tin Master Data, cùng với danh sách các sản phẩm (Order Items) cần sản xuất.

### Chi tiết Logic (Flow):
1. **Bắt và Validate Nhập Liệu:** 
   - Nhận cục Data từ Fe gồm 2 phần: Thông tin chung đơn (`customer_id`, hẹn ngày giao, mô tả) + Mảng các sản phẩm (`products: [{product_id, quantity, price}, ...]`).
2. **Transaction Database:** Do việc insert này đụng DB nhiều lần, cần bọc trong một Database Transaction (Commit or Rollback) để đảm bảo tính nhất quán (nếu lỗi giữa chừng thì hủy bỏ toàn bộ).
3. **Thêm Order (Master):** 
   - Insert vào bảng `orders`. Trả về `order_id` vừa tạo được.
4. **Thêm Order Products (Items):** 
   - Loop mảng `products`. 
   - Chuẩn bị data có chứa `order_id` (vừa lấy ở bước 3) gắn map vào từng item.
   - Insert bulk (chèn hàng loạt) thông tin các sản phẩm vào bảng `order_products` hoặc `order_items`.
5. **Đóng Transaction & Return:** 
   - Transaction commit rỗng.
   - Trả Response Status `200/201` báo FE tạo đơn thành công. Trả về `order_id` để FE có thể nhảy qua trang chi tiết.

---

## 2. Cập nhật trạng thái đơn (Update Order Status)
**File chính:** `backend/src/modules/order/order.controller.js`

### Mục đích:
Đổi status chạy theo vòng đời (Lifecycle: Pending -> In Progress -> Completed/Canceled).

### Chi tiết Logic:
1. **Lấy params:** Nhận `order_id` từ param URL và state thay đổi `status` từ body Request.
2. **Kiểm tra trạng thái cũ:**
   - Query đơn hàng hiện tại.
   - Thêm bộ Ràng buộc (Business Logic Constraints): Ví dụ, "Không thể chuyển đơn từ CANCELED trở thành IN_PROGRESS". Nếu cố tình chuyển -> Báo lỗi `400`.
3. **Update record:** 
   - Edit trường `status` ở bảng `orders`.
4. **Hậu xử lý (Side effects):**
   - Nếu trạng thái đổi thành `COMPLETED`, có thể gọi hàm Update Tồn kho (trừ số lượng/cộng số lượng liên quan).
   - Gọi Notification Service gửi thông báo cho Seller hoặc Admin.
