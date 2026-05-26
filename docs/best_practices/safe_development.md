# Hướng Dẫn Phát Triển Hệ Thống Mới Không Gây Ảnh Hưởng (Best Practices for Safely Updating)

Khi hệ thống đồ sộ như ERP/MES đang chạy ổn định, việc đắp thêm tính năng mới mà để lòi ra BUG ở chức năng cũ là thảm họa. Bạn phải tuân thủ nghiêm ngặt các quy tắc kỹ thuật sau tại Frontend, Backend và Database.

---

## 1. Về mặt Backend (API & Business Logic)

### A. Nguyên tắc Mở/Đóng (Open/Closed Principle)
Thêm code mới, HẠN CHẾ SỬA / XÓA code cũ.
Ví dụ: Lúc trước tạo Orders chỉ cần gọi hàm `createOrder()`. Bây giờ sếp yêu cầu khi tạo order phải Tính Thêm Thuế. 
**Không tốt:** Sửa trực tiếp vào hàm `createOrder()` và bắt buộc Client phải nộp thêm Param `tax` (Sẽ làm hỏng tất cả các màn hình, tool đang tạo order cũ).
**Khuyên dùng:** 
- Giữ nguyên `createOrder()`.
- Viết 1 hàm mới `createOrderWithTax()`. Hoặc nếu viết vào hàm `createOrder()` cũ, mặc định param `tax` = null, và bên trong chỉ if(tax) thì tính thêm.

### B. Route Versioning (Phiên bản hóa API)
Khi cấu trúc của chức năng bị thay mới (Breaking change):
- Thay vì bạn đè/sửa file ở `src/routes/v1/order.js`.
- Hãy tạo mới: `src/routes/v2/order.js`.
- Việc này giúp các App/Điện thoại xưởng Đang chạy bản V1 thì cứ gọi V1 bình thường, trong lúc Web mới (chạy V2) gọi hàm của V2. Tránh làm sập App cũ.

### C. Sử Dụng Unit Test & E2E Test
- Tính năng cũ (Đăng Nhập, Trừ Tổng Kho, Điểm Danh) phải luôn có các tệp Test tự động chạy gác cổng (`jest`, `mocha`). 
- Khi bạn code thêm tính năng mới (Ví dụ: Thưởng hiệu suất). Bạn cứ code xong, lúc Push code hệ thống tự chạy bộ Test của tính năng Kho/Login. Nếu nó chửi đỏ quét thì có nghĩa code mới của bạn chọc bậy vào flow cũ rồi -> Không cho Deploy mẻ đó ra Production.

---

## 2. Về mặt Database SQL 

### A. Tuyệt đối không UPDATE/DROP Cột đang dùng
Bạn muốn đổi cột `status` từ dạng (String: `IN_PROGRESS`) thành định dạng chuẩn (Int: `2` hoặc boolean).
- **Tuyệt đối không chạy lệnh `ALTER COLUMN status SET TYPE int`**: Hành động này khiến tất cả query cũ đang Check = 'IN_PROGRESS' bị banh chành!
- **Cách cập nhật an toàn:** Tạo một cột mới tinh tên là `status_id (Int)`. Viết 1 script đồng bộ data ngầm từ `status -> status_id`. Cho Frontend lấy data ngầm từ cả 2 cột. Khi dev và Frontend đã cập nhật thay đổi mượt mà xong. Bạn mới đi XÓA hẳn cột chuỗi chữ `status` kia ở cuối cùng.

### B. Tránh phá vỡ Logic Cascade Delete
Việc thêm Khóa ngoại (Foreign Key) bừa bãi có thể khiến một action bình thường (Delete Lịch Trình) tự nhiên nó Cascade bay cọ luôn lịch sử làm việc/Tính Lương (Ticket) của công nhân ngày hôm qua đó! 
Luôn dùng `ON DELETE SET NULL` hoặc Xóa mềm (Thêm cờ `is_deleted = true`) thay vì xóa Dữ Liệu cứng ra khỏi ổ đĩa Database (Hard Delete).

---

## 3. Về mặt Frontend (React/Vue)

### A. Tách Nhỏ Component & Cô lập State
Lúc cần thêm button/form vào giao diện Lập Kế Hoạch cũ. Bạn **Đừng nhét toàn bộ JSX, code call API bự đùng vào** cái File file `PlanningPage.jsx` vốn đã rất yên bình.
- Hãy bọc tính năng mới vào 1 component riêng (VD: `<AIPlannerHelper />`), rồi chỉ Import nó vào. State có hỏng tung tóe thì chỉ chét hỏng giao diện của `<AIPlannerHelper />`, form chính của `PlanningPage` không bị vỡ.

### B. Phân Nhánh Git (Branching Model & Git Flow)
Bạn không làm việc trên nhánh `main` hay `develop` chính.
- Check out 1 nhánh mới: `git checkout -b feature/tinh-luong-thuong`.
- Làm gì thì làm trên nhánh này. Mọi thứ xàm lồng trên đây không dính dáng gì code chính. Lúc xong, tạo **Pull Request (PR)**, cần có 1 lập trình viên khác (Leader/Senior) ngó xem qua. Chỉ duyệt Merge Pull Request khi họ tin là code của bạn không giẫm chân lên các hàm đang chạy an toàn!
