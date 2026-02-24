# Hướng Dẫn Tạo Dữ Liệu Trong Prosimex MES

Hệ thống MES hoạt động dựa trên các lớp dữ liệu liên kết với nhau. Bạn cần tạo dữ liệu theo đúng thứ tự sau:

---

## 1. Thiết lập Lớp Hạ Tầng (Infrastructure)
*   **Nhà máy (Factories)**: Tạo một địa điểm sản xuất.
*   **Máy móc (Machines)**: Tạo các máy thuộc nhà máy. Quan trọng: Nhập đúng **"Capacity per day"** (tổng số lượng máy có thể làm trong 1 ngày).
*   **Công đoạn (Operations)**: Định nghĩa các bước kỹ thuật (Cắt, May, Đóng gói...).

## 2. Thiết lập Quy trình Kỹ thuật (Engineering/Routing)
Đây là phần cốt lõi để tính toán kế hoạch:
1.  Vào mục **Product Groups**.
2.  Tạo một nhóm (ví dụ: "Sản xuất Linh kiện").
3.  Nhấn nút **"Routing"** trên dòng dữ liệu vừa tạo.
4.  Thêm các công đoạn (Operations), chọn máy tương ứng:
    *   **Dinh Muc**: Số lượng sản phẩm máy làm được trong **1 giờ** (Ví dụ: 100 sản phẩm/giờ).
    *   **Sequence**: Số thứ tự thực hiện (1, 2, 3...).

## 3. Lớp Kinh doanh (Business)
*   **Khách hàng (Customers)**: Thông tin đối tác.
*   **Sản phẩm (Products)**: Tạo sản phẩm cụ thể và chọn **Nhóm mã hàng** đã thiết lập ở bước 2.

## 4. Thực thi (Execution)
1.  **Sales Orders**: 
    *   Tạo đơn hàng, nhập đầy đủ: Mã đơn, Tên đơn, Khách hàng, Sản phẩm, PO khách hàng, Ngày nhận/Ngày giao, Số lượng, Địa điểm sản xuất, Người phụ trách và Ghi chú.
    *   Hệ thống sẽ tự sinh mã PO theo quy tắc: `PO_{id}_PO_KhachHang`.
2.  **Quản lý Timeline (Machine Timeline)**:
    *   Xem lịch chạy máy theo dạng lịch tháng (Trục X: Ngày, Trục Y: Máy).
    *   Hỗ trợ hiển thị chồng lấp nhiều đơn hàng chạy trên cùng 1 máy trong 1 ngày.
3.  **Lập kế hoạch (Planning)**: 
    *   Chọn đơn hàng -> Chọn công đoạn của mã hàng.
    *   Nhập số lượng **Tồn kho**. 
    *   Số lượng còn lại và Tổng số công (giờ) sẽ tự động tính: `(Số lượng đơn - Tồn kho) / Định mức`.
    *   Chọn Ngày bắt đầu: Hệ thống liệt kê danh sách ngày cần làm (mặc định 8h/ngày). Bạn có thể tích chọn **Tăng ca** cho từng ngày.
    *   Nhấn **Xác nhận** để ghi lịch vào máy.

---
*Mẹo: Nếu muốn tạo nhanh toàn bộ ví dụ trên, hãy sử dụng script mẫu đi kèm dự án.*
