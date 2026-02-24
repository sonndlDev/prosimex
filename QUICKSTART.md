# Hướng Dẫn Sử Dụng Hệ Thống Prosimex MES (Từng Bước)

Tài liệu này hướng dẫn bạn từ lúc cài đặt môi trường đến khi thực hiện quy trình lập kế hoạch sản xuất hoàn chỉnh trên hệ thống.

---

## Bước 1: Thiết Lập Môi Trường (Setup)

### 1. Phía Backend (`/backend`)
1.  **Cài đặt thư viện**: Mở terminal tại thư mục `backend` và chạy:
    ```bash
    npm install
    ```
2.  **Cấu hình biến môi trường**: Mở file `.env` và cập nhật chuỗi `DATABASE_URL` trỏ đúng vào PostgreSQL của bạn.
    *Lưu ý: Đã được cấu hình mặc định trỏ tới IP máy chủ của bạn.*
3.  **Khởi tạo Database**: Chạy lệnh để tạo bảng:
    ```bash
    npm run db:init
    ```
4.  **Tạo tài khoản Admin**: Chạy lệnh để tạo user `admin/admin123`:
    ```bash
    npx babel-node scripts/seed_admin.js
    ```
5.  **Chạy Server**: 
    ```bash
    npm run dev
    ```

### 2. Phía Frontend (`/frontend`)
1.  **Cài đặt thư viện**: Mở terminal tại thư mục `frontend` và chạy:
    ```bash
    npm install
    ```
2.  **Chạy Giao diện**:
    ```bash
    npm run dev
    ```
    *Mặc định hệ thống chạy tại: `http://localhost:5173`*

---

## Bước 2: Quy Trình Nghiệp Vụ Chính (Flow)

Sau khi đăng nhập bằng **admin / admin123**, hãy thực hiện theo thứ tự sau để trải nghiệm tính năng "Lập kế hoạch tự động":

### 1. Thiết lập Cấu trúc (Master Data)
*   **Factories**: Tạo mới một Nhà máy (ví dụ: Factory A).
*   **Machines**: Tạo các Máy thuộc nhà máy đó (ví dụ: Máy Cắt, Máy May).
*   **Product Groups**: Tạo nhóm sản phẩm và thiết lập **Định mức (Dinh Muc)**. Đây là bước quan trọng nhất để hệ thống biết 1 sản phẩm mất bao lâu để sản xuất ở máy nào.
*   **Products**: Tạo sản phẩm cụ thể thuộc nhóm trên.

### 2. Quản lý Đơn hàng (Sales Orders)
*   **Customers**: Thêm khách hàng mới.
*   **Sales Orders**: Tạo đơn đặt hàng mới. Chọn khách hàng, chọn sản phẩm và số lượng, ngày cần giao (Delivery Date).

### 3. Lập kế hoạch Sản xuất (Production Planning)
*   Vào mục **Planning Automation**.
*   Nhấn **Start New Plan**.
*   **Bước 1**: Chọn Đơn hàng vừa tạo.
*   **Bước 2**: Chọn ngày dự kiến bắt đầu sản xuất.
*   **Bước 3**: Nhấn **Calculate Plan**. Hệ thống sẽ tự động tính toán dựa trên định mức và công suất máy để chia việc cho các ngày.

### 4. Theo dõi Tiến độ (Timeline)
*   Vào mục **Machine Timeline**.
*   Bạn sẽ thấy một bảng biểu (Gantt Chart) hiển thị công việc đã được hệ thống "rải" xuống các máy theo thời gian thực. Bạn có thể xem chi tiết từng công việc bằng cách nhấn vào các ô trên lịch.

---

## Bước 3: Quản trị Hệ thống

*   **Users & Roles**: Bạn có thể tạo thêm user cho nhân viên. 
    *   `ADMIN`: Toàn quyền.
    *   `PLANNER`: Chỉ làm việc với đơn hàng và kế hoạch.
    *   `OPERATOR`: Chỉ xem lịch máy.

---

**Chúc bạn có trải nghiệm tốt với Prosimex MES!**
