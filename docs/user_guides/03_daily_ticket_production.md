# Hướng Dẫn Sử Dụng: Khai Báo Tính Công (Daily Tickets)

Đây là chức năng thiết yếu nhất mà người ở dưới Xưởng phải thao tác hằng ngày.

## 1. Màn Hình Phiếu Sản Lượng (Daily Ticket Page)
**Đối tượng sử dụng:** Công nhân, Tổ trưởng ca trực.

**Quy trình khai báo số lượng đã làm rra được:**
1. Chọn menu **Báo Cáo Sản Lượng (Hiển thị biểu tượng Phiếu Cầm tay)**.
2. Để báo hệ thống biết hôm nay bạn đã làm được bao nhiêu cái mâm, bao nhiêu cái áo: Ấn nút **Tạo Phiếu Mới (Khởi tạo Ticket)**.
3. Trong biểu mẫu:
   - Hệ thống thường sẽ gợi ý trước bạn đang làm **Kế Hoạch Nào**, đang đứng ở **Máy nào**.
   - Mục **Sản Lượng Đạt (Quantity):** Gõ số lượng bạn đã hoàn thiện đạt yêu cầu. (vd: 50).
   - Mục **Sản Lượng Lỗi (Defect):** Gõ số lượng bạn làm hư hỏng trong ca làm đó (vd: 2 cái lỗi).
   - Bấm **Gửi Phiếu**. 
4. Lúc này phần số lượng bạn gửi sẽ nằm trong trạng thái **Chờ Duyệt (Pending)**.

*(Lưu ý: Nếu bạn có file Excel sẵn ở máy tự thống kê, bạn có thể nhảy sang trang `Import Excel` -> Kéo thả file Excel vào mảng trắng -> Hệ thống sẽ tự tạo 100 Phiếu Ticket cùng lúc).*

---

## 2. Giao Diện Duyệt Phiếu (Approval Ticket Page)
**Đối tượng sử dụng:** Đốc Công, Bộ phận Kiểm Tra (QA/QC), Quản lý.

**Quy trình Phê Duyệt / Hủy Bỏ Phiếu tính lương cho công nhân:**
1. Hằng buổi chiều hoặc hết ca, Quản lý vào màn hình **Duyệt Phiếu Sản Lượng**.
2. Toàn bộ các vé nhân viên vừa "Gửi Phiếu" ở bước 1 sẽ nằm chồng lên nhau thàng một list cần kiểm tra.
3. Kế rà soát:
   - Nếu số liệu trùng khớp với số hàng thật: Bấm **Duyệt (Approve / Nút Xanh)**. Ngay lập tức thông số này sẽ chạy thẳng lên báo kết quả KPI cho Kế hoạch Sản Xuất tổng và đổi máu% trên màn hình Báo Cáo.
   - Nếu nhân viên gõ sai (thực tế làm 50 cái, nhân viên vô tình gõ 500 cái): Bấm **Từ chối (Reject / Nút Đỏ)**. Bảng nhỏ hiện lên yêu cầu bạn gõ lý do: "Gõ sai số lượng do dư số 0". 
4. Người công nhân khi nhận được thư Rerect trên màn hình sẽ biết lí do và phải lập lại phiếu mới gửi lại từ đầu.
