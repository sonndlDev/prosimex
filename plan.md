Dưới đây là một bản tổng hợp chi tiết về luồng thực thi (flow) và cách thức tính toán của chức năng Tạo kế hoạch sản xuất đang hoạt động trong dự án Prosimex. Chức năng này được xây dựng chủ đạo xoay quanh khái niệm "Công" / "Ca" (Shifts) (tương ứng với 1 ngày làm tiêu chuẩn).

1. Luồng nhập liệu và tính toán cốt lõi (Giao diện Frontend)
   Logics tính toán chính diễn ra chủ yếu ở Frontend (PlanningFormDialog.jsx & shared.jsx). Khi lập kế hoạch, hệ thống sẽ thực hiện theo các bước sau:

Bước 1: Tính số lượng thực tế cần làm

Sản lượng Đơn hàng (Order Qty): Lấy từ số lượng sản phẩm của khách hàng yêu cầu trong Order.
Tồn kho đầu vào (Inventory Qty): Lượng hàng đã có sẵn mà người điều phối nhập vào.
Số lượng cần sản xuất (Remaining Qty) = Order Qty - Inventory Qty (sẽ gán là 0 nếu tồn kho đủ bao bọc lượng cần).
Bước 2: Sử dụng Định mức để tính "Tổng Công/Ca"
Hệ thống sử dụng khái niệm Định mức (Dinh muc / Norm). Giữ nguyên tắc: Định mức ở đây là Số SP làm ra trong 1 Ca tiêu chuẩn 8 tiếng.

Số CÔNG cần thiết (totalDaysNeeded) = Số lượng cần SX (Remaining Qty) / Định mức (Dinh muc).
(Ví dụ: Bạn cần sản xuất 1000 bao. Máy A có định mức làm 250 bao/ca ➡️ Bạn sẽ cần tổng cộng 4 Công).
Bước 3: Tự động phân bổ lịch chạy (Auto-Calculate Schedule)
Khi có Ngày bắt đầu (start date) và Tổng Công cần thiết, hệ thống gọi hàm autoCalculateSchedule rải khối lượng Công này lần lượt xuống các ngày:

Nguyên tắc nhảy lịch: Lặp tiến lên từng ngày, bỏ qua ngày Chủ Nhật.
Khả năng làm việc 1 ngày của 1 Máy:
Hành chính (NORMAL_CAPACITY) = 1.0 Công (8 tiếng làm việc).
Có khai báo Tăng ca (OVERTIME_CAPACITY) = 1.43 Công (Tương đương
≈
11.44
≈11.44 tiếng).
Phân bổ: Rải mức Công cần thiết vào ngày trên cho đến khi hết 0.0001 Công còn lại.
Chú ý: Kế hoạch hỗ trợ gắn nhiều máy (Multi-machine). Nếu gắn 2 máy, tổng Công 1 ngày là 2.0 Công. Nó tự động cưa đôi lượng phân bổ cho 2 máy song song trong ngày hôm đó.
Bước 4: Điều tiết bù trừ động (Rebalancing)
Sau khi lịch được sinh tự động, người dùng có thể tự sửa lại số Công/Sản phẩm trong 1 ngày bất kỳ. Nếu bị lẻ, hàm rebalanceDays sẽ lấy phần Công thừa sinh ra ở ngày đó hoặc phần Công sửa bị thiếu đẩy gối nối tiếp (bù trừ) vào các phần tử của ngày tiếp theo đảm bảo tổng Công giữ nguyên.

2. Luồng bảo lưu và cảnh báo tại (Máy chủ Backend)
   Khi Submit ấn tạo cấu hình, quá trình lưu lên Database thông qua createProductionPlan (tại production-planning.controller.js) diễn ra trong một Transaction:

Bước 1: Xác thực lại thông số và khối lượng công việc

Hệ thống query vào bảng order_products hoặc orders một lần nữa để chốt Order Qty không bị lệch với client.
remaining_quantity = Qty đơn hàng - Tồn kho.
Kiểm tra mảng các Ngày (days) do Frontend gửi lên. Tổng công công suất (total_required_work) sẽ được bằng cách gộp SUM tất cả thông số .hours (Giá trị đơn vị Công do Frontend báo xuống) của mỗi ngày trong mảng days.
planned_end_date: Tự nội suy bằng dòng ngày cuối cùng của mảng days có hours > 0.
Bước 2: Ghi dữ liệu đồng loạt

Bảng production_plans: Tạo bản ghi tổng master. Lưu Ngày bắt đầu, Kết thúc, Tồn kho, Máy làm chính và Định mức final.
Bảng production_plan_days: Sử dụng Bulk Insert đổ sập một lần toàn bộ mảng days vào bảng chi tiết ngày làm. Cột số liệu Công phân bổ xuống (d.hours 1.0 hoặc 1.43) được cắm thẳng vào trường planned_work_quantity.
Bảng machine_schedules: Render ra một bản ghi block lịch từ Start -> End Date. Block lịch biểu này nhằm tạo cảnh báo nếu cố tình đặt máy đó làm ca khác chồng chéo biểu đồ Gantt trên dashboard.
Bước 3: Gây hiệu ứng phụ và hoàn tất (Hooks & Audits)

Table orders được chọc trực tiếp, chuyển cột status thành PLANNED (được nhận diện là đã lập kế hoạch).
Đẩy nhật ký khởi tạo vào bảng audit_logs (ưu tiên cho việc theo vết lịch sử).
Commit Transaction hoàn tất API cho giao diện. Ngưng Frontend trả ra Toast thông báo.
