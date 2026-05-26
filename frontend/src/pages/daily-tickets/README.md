# Daily Tickets Module - Frontend Giao Diện Phiếu Sản Xuất

Thư mục cực kỳ quan trọng dùng để cập nhật sản lượng, theo dõi sản xuất hằng ngày.

## Danh sách trang (Pages)

### 1. `DailyTicketPage.jsx`
- **Mục đích:** Sổ nhật ký báo cáo phiếu hằng ngày.
- **Tính năng:** Hiển thị danh sách phiếu chung, trạng thái (Pending/Approved/Rejected). Giúp User (Công nhân/Tổ trưởng) tạo Phiếu báo cáo mới trong ngày, ghi nhận mình đã ráp được x sản phẩm, y bị lỗi móp méo. 

### 2. `ApprovalTicketPage.jsx`
- **Mục đích:** Giao diện dùng cho Cấp quản lý (Quản đốc, QC) để kiểm tra mảng sản lượng.
- **Tính năng:**
  - List riêng các `PENDING` ticket cần để duyệt.
  - Người dùng có thể ấn "Duyệt" (Approve) hoặc "Từ chối" (Reject) kèm lý do. Mọi ticket Approved sẽ chốt số liệu.

### 3. `PlanVsActualPage.jsx`
- **Mục đích:** Trang báo cáo đối chiếu / so sánh (Kế hoạch vs Thực Tế).
- **Tính năng:** Data Chart & Table mix lại để manager nhận biết được Kế hoạch là 1000 sản phẩm nhưng các Daily Ticket tổng cộng lại mới chỉ 300 sản phẩm (=> KPI báo đỏ do chậm trễ hoặc báo xanh đáp ứng).

### 4. `ProductionOutputPage.jsx`
- **Mục đích:** Giao diện tập trung xuất báo cáo sản lượng ròng, cho phép lọc chi tiết xưởng nào, máy nào làm được bao nhiêu.

## Các Component hỗ trợ (Folder: `components/`)
- `DailyTicketFormDialog`: Popup Modal điền form báo cáo (Chọn Tên Máy, Chọn Mức sản lượng đạt).
- `DailyTicketResultDialog`: Popup hiển thị chi tiết khi Click vào một vé báo cáo thành công.
- `DailyTicketPrintView`: Component tuỳ biến để tối ưu cho trình duyệt in (`Window.print()`) in phiếu ra giấy cứng (Mã vạch, số liệu).
- `DailyTicketReportDialog`: Modal phân tích lý do khi từ chối vé hoặc báo thông số bất thường.
