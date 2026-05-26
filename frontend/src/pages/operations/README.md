# Outsourcing, Operations, Suppliers & Workers

## 1. `outsourcing/OutsourcingPage.jsx`
- **Mục đích:** Module Gia Công.
- **Tính năng:** Khi nhà máy k làm nổi, UI này dùng để tạo Lệnh thuê gia công. Theo dõi trạng thái đã gửi đi và đã nhận về (Quantity).

## 2. `operations/OperationPage.jsx`
- **Mục đích:** Cấu hình định nghĩa "Công Đoạn".
- **Tính năng:** CRUD danh sách các thao tác làm việc nhỏ (Ví dụ: "Công đoạn cắt mép", "Công đoạn viền"). List này sẽ làm source cho việc cấu thành nên Product.

## 3. `workers/WorkerPage.jsx`
- **Mục đích:** Danh bạ Công Nhân.
- **Tính năng:** Hồ sơ nhân sự nội bộ. CRUD Thông tin cá nhân, tay nghề, ca làm mặc định, và có view nhỏ xem lịch sử hoạt động, điểm danh (nhảy qua module Attendance).

## 4. `suppliers/SuppliersPage.jsx`
- **Mục đích:** Nguồn cung.
- **Tính năng:** Database đối tác liên lạc mua nguyên vật liệu hoặc thuê Outsourcing. Cấu trúc view giống như Customer.

## 5. `import/DailyTicketImportPage.jsx`
- **Mục đích:** Màn Cập nhật hàng loạt (Excel).
- **Tính năng:** Thay đổi nhập từng Ticket bằng tay, trang này có vùng kéo thả / upload file `.xlsx`, `.csv`. Gửi Buffer lên backend parse data ghi nhận tiến độ cuối ngày mà các xưởng trưởng báo Excel.
