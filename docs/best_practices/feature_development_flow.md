# Quy Trình Flow Chuẩn Khi Code Thêm Chức Năng Mới (Step-by-Step Workflow)

Để dễ hình dung hơn, dưới đây là **Flow cụ thể của Dev (từng bước một)** khi có một yêu cầu chức năng mới. 

**Bài toán ví dụ:** Module Khai báo sản phẩm hằng ngày (`Daily Ticket`) đang chạy ổn định. Nay sếp yêu cầu thêm tính năng: **"Tính Tiền Thưởng (Bonus)"** ngay lúc Công nhân bấm Xác nhận vé đó. Nếu làm sai, tính năng gửi vé cũ sẽ sập, nhà máy đình trệ.

Dưới đây là Flow 6 bước an toàn tuyệt đối:

---

## 🚀 Bước 1: Tiếp nhận & Tìm vùng rủi ro (Impact Analysis)
Trước khi gõ bất kỳ dòng code nào, Dev phải xác định xem tính năng "Tiền Thưởng" này sẽ chọc vào đâu:
- Nó cần lưu vào Database ở đâu? (Bảng `daily_production_tickets`).
- Nó ảnh hưởng đến API nào? (API `POST /daily-ticket`).
- Nó ảnh hưởng trang UI nào? (`DailyTicketPage.jsx`).
-> **Mục tiêu:** Liệt kê những vùng cấm, cần thao tác cẩn thận kẻo làm gãy luồng chính.

---

## 🚀 Bước 2: Tạo Nhánh Mới (Branching - Không làm trực tiếp)
Không bao giờ code thẳng lên bản đang chạy (nhánh `Main` / `Dev`).
- Dev gõ lệnh: `git checkout -b feature/daily-ticket-bonus`.
- Nhánh này giống như một "Vũ trụ song song". Tại đây Dev muốn vọc phá gì thì vọc, hệ thống thật không hề hấn gì.

---

## 🚀 Bước 3: Cập nhật Database (Database Migration)
**Quy tắc:** Thêm đồ mới, không phá đồ cũ.
- Dev **KHÔNG** vào thẳng cơ sở dữ liệu hiện tại để sửa.
- Dev tạo một file kịch bản SQL mới (gọi là *Migration file*).
- **Code viết:** `ALTER TABLE daily_production_tickets ADD COLUMN bonus_amount INT DEFAULT 0;` (Khởi tạo cột tiền thưởng với mặc định là 0 để không làm lỗi các vé cũ trước đây chưa có cột này).

---

## 🚀 Bước 4: Viết Code Backend (Xử lý Logic)
**Quy tắc:** Mở rộng độc lập.
1. Tại API đang chạy `POST /daily-ticket/create`: Dev lấy tham số mới `bonus`.
2. **Không** thay đổi/đập bỏ phần code tính toán kiểm tra vé của bộ cũ. 
3. Nếu Logic Tính thưởng quá dài và phức tạp (phải xét level 1, bậc 2, giờ làm thêm), Dev viết hẳn ra một hàm mới:
   - File cũ: `daily-ticket.controller.js`.
   - Hàm mới: `calculateBonusForWorker()`. 
4. Cuối API lưu vé `update/insert`, bọc hàm mới vào khối try/catch (Bắt lỗi):
   ```javascript
   // Khối code Cũ đang chạy yên bình...
   const ticket = await createTicket(data); 

   // Khối code Mới bọc cẩn thận
   try {
       await calculateBonusForWorker(ticket.id, data.bonus);
   } catch(error) {
       console.log("Lỗi tính thưởng, nhưng kệ, Vé vẫn lưu thành công để công nhân về nhà");
   }
   ```
-> Nếu lỡ tính thưởng bị lỗi, Server vẫn trả về `Status 200: Gửi vé xuất xưởng thành công`. Flow cũ không bị sập.

---

## 🚀 Bước 5: Viết Code Frontend (Giao diện UI)
**Quy tắc:** Chèn (Inject) Component mới song song với Form cũ.
1. Xây riêng một Component nhỏ tên là `<BonusInputCard />` ở một folder mới.
2. Tại `DailyTicketFormDialog.jsx` (Form khai báo cũ), gọi và chỉ hiển thị nó phía dưới cùng.
3. Nếu form nhập Tiền thưởng này bị lỗi React (văng màn hình trắng), ta dùng **Error Boundary** bọc nó lại. Khi hỏng, ô Nhập Tiền Thưởng thì biến mất, nhưng cái Form nhập Trọng Lượng cũ vẫn đứng sừng sững gánh cho anh em công nhân xài.

---

## 🚀 Bước 6: Kiểm thử (Testing) & Phát hành
1. Dev chạy lại "Hệ thống giả lập Test".
2. Chạy kịch bản: **Tạo vé Daily Ticket KHÔNG CÓ thưởng (luồng cũ)** -> Nếu qua (Passed) nghĩa là đồ cũ an toàn!
3. Gửi Yêu cầu Hợp nhất *(Pull Request)* cho Dev khác đọc chéo dò lỗi.
4. Đẩy (Deploy) lên Server Testing. Nhờ đội QA (Tester) test lại trên giao diện.
5. Merge vào hệ thống thật. -> Khởi chạy êm ái!
