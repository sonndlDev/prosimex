# Phân tích Logic Code: Auth Module

## 1. Đăng nhập (Login Flow)
**File chính:** `backend/src/modules/auth/auth.controller.js` (Hàm `login`)

### Mục đích:
Xác thực người dùng dựa trên thông tin đăng nhập và cấp quyền truy cập hệ thống.

### Chi tiết Logic (Flow):
1. **Nhận Request:** API nhận payload từ Client chứa `username`/`email` và `password`.
2. **Kiểm tra Input:** Sử dụng Validation middleware hoặc check rỗng các trường bắt buộc.
3. **Query Dữ liệu:** 
   - Tìm kiếm `User` trong bảng `users` bằng `username`/`email`.
   - Nếu `User` không tồn tại -> Báo lỗi `400/401 User not found`.
4. **Xác thực Password:** 
   - Sử dụng thư viện (như `bcrypt`) so sánh `password` trong request do người dùng gõ vào với `password_hash` được lưu ở Database.
   - Nếu sai -> Báo lỗi `401 Invalid credentials`.
5. **Khởi tạo Token:** 
   - Dùng `jsonwebtoken` (JWT) tạo một `AccessToken`.
   - Payload của Token sẽ chứa các thông tin không nhạy cảm (quan trọng): `user_id`, `role`, `permissions`.
6. **Xử lý Session/Cookie (Optional):**
   - Có thể thiết lập trả thêm `RefreshToken` hoặc đưa token vào Cookie bảo mật (`httpOnly`).
7. **Trả về Client:** Response chứa Token và các thông tin cơ bản (Tên, Role) giúp FE lưu trạng thái Redux/Local Storage.

---

## 2. Các Middleware Xác thực (Authentication & Authorization)
**File chính:** Thường nằm ở `backend/src/middlewares/auth.middleware.js`

### A. Middleware `authenticateToken`
**Mục đích:** Chắn ở các private route. Bạn phải có Token thì mới gọi được API.
**Logic:**
1. Trích xuất Token từ Headers: `Authorization: Bearer <token>`.
2. Báo lỗi `401 Unauthorized` nếu không có Token.
3. Sử dụng `jwt.verify(token, SECRET_KEY)`.
4. Trích xuất payload (thông tin user_id, role) từ token và gán nó vào request (dưới dạng `req.user = decoded`).
5. Gọi `next()` để chuyển sang controller tiếp theo. Nếu Token sai/hết hạn -> trả mã lỗi `403/401`.

### B. Middleware Kiểm tra Quyền (`checkRole` / `checkPermission`)
**Mục đích:** Cấp phép người dùng làm gì đó phụ thuộc vào User Role của họ (Role-based Access Control).
**Logic:**
1. Yêu cầu chạy phía sau `authenticateToken` (để có `req.user`).
2. Nhận biến mảng roles cho phép truy cập API này (vd: `['admin', 'manager']`).
3. Kiểm tra xem `req.user.role` (từ token phân giải) có nằm trong danh sách không.
4. Nếu chứa -> `next()`, nếu không chứa -> Trả lỗi `403 Forbidden` (Bạn không có quyền).
