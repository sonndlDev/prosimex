# Production Planning Flow & Logic

## Tổng quan
Kế hoạch sản xuất là khâu quan trọng giúp phân bổ máy móc, nhân lực (Worker) và định mức (đơn đặt hàng) để đảm bảo tiến độ nhà máy.

## Các chức năng chính

1. **Lập kế hoạch sản xuất (Create Plan)**
   - **Mục đích:** Chỉ định lệnh sản xuất cho máy móc cụ thể.
   - **Logic:**
     - Lựa chọn đơn hàng/sản phẩm (từ module Order).
     - Phân bổ vào máy (Machine_ID), phân bổ công nhân (Worker_ID).
     - Thiết lập ngày bắt đầu và ngày kết thúc dự kiến, kèm theo định mức số lượng cần sản xuất.

2. **Cập nhật / Điều chỉnh kế hoạch (Update Plan)**
   - **Mục đích:** Thay đổi kế hoạch do phát sinh (máy hỏng, thiếu công nhân).
   - **Logic:** Điều chỉnh các thông số trong database và hệ thống sẽ validate lại các xung đột lịch trình (conflict schedule).

3. **Giao việc và Tạo Daily Tickets**
   - **Mục đích:** Mỗi ngày hệ thống hoặc quản lý sẽ chốt sản lượng qua Daily Production Tickets.
   - **Logic:** Dựa vào Plan đã lên, chia nhỏ thành các ticket hằng ngày để đốc công/user báo cáo sản lượng dễ dàng hơn.

4. **Theo dõi tiến độ (Monitoring)**
   - **Mục đích:** So sánh giữa "Thực tế sản xuất" và "Kế hoạch".
   - **Logic:** Tổng hợp sản lượng thực tế (từ Daily Tickets) -> so sánh với `planned_work_quantity` -> Cập nhật % hoàn thành của Plan.

## Database
- `production_plans`: Bảng lưu kế hoạch tổng thể.
- `worker_plan_assignments`: Phân bổ công nhân vào các kế hoạch.
- `daily_production_tickets`: Chốt báo cáo tiến độ chi tiết từng ngày.
