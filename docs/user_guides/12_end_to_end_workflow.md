# Hướng Dẫn Sử Dụng: Quy trình vận hành End-to-End từ A - Z (Một chu kỳ hoàn chỉnh)

Để giúp bạn hình dung toàn bộ hệ thống phối hợp với nhau như thế nào, đây là **Chu trình 8 bước mô phỏng luồng chạy của 1 đơn hàng thực tế** từ lúc tiếp nhận đến lúc xuất kho.

## Bước 1: Khởi tạo Dữ liệu Nền tảng (Master Data)
*(Chỉ làm 1 lần lúc hệ thống mới hoạt động)*
- **Kho & Sản phẩm (`Products & Warehouse`):** Định nghĩa cấu hình chiếc "Áo Sơ Mi A" cần qua bao nhiêu Công đoạn (Cắt, May, Ủi).
- **Nhân sự & Máy móc (`Workers & Machines`):** Thêm tên 50 công nhân vào hệ thống, thêm 20 máy may vào Xưởng.
- **Đối tác (`Customers`):** Nhập thông tin Công ty Thời Trang X (Khách hàng).

## Bước 2: Tiếp nhận Hợp Đồng (Module Orders)
- Kinh doanh (Sale) vào menu **Đơn Hàng (Orders)**, tạo một đơn mới.
- Chọn Khách hàng "Công ty Thời Trang X". Đặt mua 10.000 chiếc "Áo Sơ Mi A". Ngày giao: Cuối tháng.
- Hệ thống tự động **Chụp cấu hình (Snapshot)** để lưu thông số sản xuất cố định.

## Bước 3: Lên Kế Hoạch Sản Xuất (Module Planning & Schedule)
- Trưởng phòng Kế hoạch (Planner) nhận được Đơn hàng 10k áo trên hệ thống. 
- Vào màn hình **Lập Kế Hoạch (Planning)**: 
  - Tách 10k áo làm 2 Nhóm. Nhóm 1 (5k áo) gán cho **Máy May Số 1** (Thời gian tuần 1). Nhóm 2 (5k áo) gán cho **Máy May Số 2** (Thời gian tuần 2).
  - Phân công chỉ định công nhân: Gán anh Nguyễn Văn A đứng máy Số 1.

## Bước 4: Kiểm tra Lịch & Vật tư (Schedule & Remaining Quantity)
- Planner check màn hình **Lịch Máy (Schedule)** dạng biểu đồ để đảm bảo máy 1 và máy 2 không bị kẹt lịch bảo trì hay trùng đơn khác.
- Click nút xem **Tính khả thi vật tư**: Báo đủ vải tồn kho để chạy đơn. Tiến hành phát lệnh xuống Xưởng.

## Bước 5: Sản xuất & Điểm danh tại Xưởng (Attendance)
- Sáng thứ 2, Công nhân Nguyễn Văn A đến xưởng bấm nút **Check-in** trên màn hình **Điểm Danh (Attendance)**.

## Bước 6: Khai báo số lượng & Duyệt Phiếu (Daily Tickets & Import)
- Hết ca, Công nhân A vào **Daily Tickets**, tạo 1 vé phiếu: Đã may xong 500 cái áo (Sản lượng đạt), 5 cái áo bị đứt chỉ (Sản lượng lỗi). Gửi phiếu.
- (Hoặc Quản đốc dùng chức năng **Import Excel** import báo cáo của cả 50 người cùng lúc).
- Chiều tối, Trưởng Xưởng vào form **Duyệt Phiếu (Approve Tickets)**. Bấm "Duyệt" cho vé của anh A. Số lượng 500 áo thành phẩm tự động được cập nhật.

## Bước 7: Thuê Ngoài - Nếu quá tải (Outsourcing)
- Nhận thấy tiến độ trễ, Quản đốc vào menu **Gia Công (Outsourcing)** phát lệnh nhờ Xưởng Gia công B (Supplier) may hộ 2.000 cái. Khi xưởng B trả đồ về, nhập số lượng vào hệ thống cộng dồn.

## Bước 8: Kết thúc & Cập nhật Kho (Dashboard & Inventory)
- Khi quá trình (Bước 6, Bước 7) liên tục đẩy số KPI trên **Dashboard** ròng rã 2 tuần. Đơn hàng đạt 100% / 10.000 áo.
- Kho thành phẩm **Inventory** tự động tăng 10.000 chiếc.
- Giám đốc kiểm tra **Báo cáo Hoàn Thành (Completion Report)**, đánh giá tỉ lệ Lỗi (Defect) ở mức an toàn. Kế toán đóng đơn, xuất hóa đơn giao cho đối tác. HOÀN TẤT.
