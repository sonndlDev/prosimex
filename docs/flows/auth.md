# Auth Flow & Logic

## Tổng quan
Module Auth quản lý việc xác thực, đăng nhập, và phân quyền người dùng trong hệ thống Prosimex.

## Các chức năng chính

1. **Đăng nhập (Login)**
   - **Mục đích:** Cấp quyền truy cập hệ thống cho người dùng hợp lệ.
   - **Logic:**
     - Nhận `username`/`email` và `password`.
     - Kiểm tra user có tồn tại không.
     - Kiểm tra mật khẩu (hashing - bcrypt).
     - Tạo JWT Token (Access Token & có thể có Refresh Token).
     - Trả về token và thông tin cơ bản của user (role, permissions).

2. **Gia hạn Token (Refresh Token)**
   - **Mục đích:** Cấp lại Access Token mới khi token cũ hết hạn mà người dùng không cần đăng nhập lại.
   - **Logic:**
     - Nhận Refresh Token từ request (header/cookie).
     - Verify token.
     - Tạo và trả về Access Token mới.

3. **Đăng xuất (Logout)**
   - **Mục đích:** Kết thúc phiên làm việc của người dùng.
   - **Logic:** Xóa token (client-side) hoặc đưa token vào blacklist (server-side nếu áp dụng).

4. **Quản lý phân quyền (Roles/Permissions)**
   - **Mục đích:** Kiểm tra quyền xem/sửa/xóa dựa trên role (Admin, Manager, Worker, ...).
   - **Logic:** Middleware kiểm tra Role/Permissions đi kèm trên JWT token.

## Database
- `users`: Lưu thông tin tài khoản, password hash, role_id.
- `roles` / `permissions`: Danh mục vai trò và quyền hạn tương ứng.
