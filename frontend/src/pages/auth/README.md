# Auth & User Module - Frontend Giao Diện Quản Lý Tài Khoản

Thư mục chứa toàn bộ màn hình liên quan đến Đăng nhập, Quản lý tài khoản, Vai trò và Quyền trong hệ thống của User nội bộ (Admin, Manager,...).

## Danh sách trang (Pages)

### 1. `LoginPage.jsx`
- **Mục đích:** Giao diện xác thực bước đầu để thao tác trên hệ thống.
- **Tính năng & Logic:**
  - Cung cấp Form (Username/Email x Password).
  - Gọi API POST login, nếu thành công -> Lưu JWT Token vào LocalStorage/Cookie, Lưu thông tin Roles vào Global State (Redux/Zustand hoặc Context).
  - Điều hướng ngay lập tức (Redirect) về `Dashboard` hoặc Trang được ủy quyền. Nếu lỗi, hiển thị thông báo.

### 2. `ProfilePage.jsx`
- **Mục đích:** Giao diện cá nhân cho người dùng đang đăng nhập (My Profile).
- **Tính năng:** Xem thông tin User hiện tại, đổi mật khẩu, hoặc cập nhật thông tin liên hệ.
  
### 3. `UserPage.jsx`
- **Mục đích:** Phân hệ quản lý Hệ thống Tài khoản người dùng ERP (Thường chỉ Admin mới thấy).
- **Tính năng:**
  - Hiển thị bảng (Table) list danh sách user trong hệ thống.
  - Phân quyền (Assign Role): Cấp quyền Admin, Quản đốc, Nhân sự, v.v.
  - Nút thêm mới tài khoản cho nhân sự mới, Khóa/Mở tài khoản.

### 4. `UnauthorizedPage.jsx`
- **Mục đích:** Trang báo lỗi khi người dùng cố truy cập một Page mà không đủ vai trò (Role không hợp lệ).
- **Tính năng:** Hiển thị trang cảnh báo "403 - Bạn không có quyền truy cập". Cung cấp nút `Quay lại trang chủ`.
