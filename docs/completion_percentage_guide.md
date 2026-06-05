# Hướng Dẫn Tính % Hoàn Thành Đơn Hàng

## 1. Vấn đề cần giải quyết

Khi quản lý đơn hàng sản xuất, chúng ta cần biết **đơn hàng đã hoàn thành bao nhiêu phần trăm** để:
- Báo cáo cho khách hàng
- Lên kế hoạch sản xuất
- Theo dõi tiến độ

**Câu hỏi:** Làm sao tính % hoàn thành chính xác khi mỗi mã hàng có số công đoạn khác nhau?

---

## 2. Các công đoạn sản xuất

Một mã hàng có thể trải qua các công đoạn sau:

| Công đoạn | Mô tả | Bắt buộc? |
|-----------|-------|-----------|
| **SX** | Sản xuất (công đoạn cuối) | ✅ Luôn có |
| **ĐI XMS** | Đi xi mạ (gửi đi mạ) |  Tùy mã hàng |
| **XMS VỀ** | Xi mạ về (nhận hàng đã mạ) | ❌ Tùy mã hàng |
| **ĐÓNG GÓI** | Đóng gói sản phẩm | ❌ Tùy mã hàng |

**Ví dụ:**
- Mã hàng A: cần cả 4 công đoạn
- Mã hàng B: chỉ cần SX và ĐÓNG GÓI (không xi mạ)
- Mã hàng C: chỉ cần SX (không xi mạ, không đóng gói)

---

## 3. Cách tính % hoàn thành

### Công thức đơn giản

```
% hoàn thành = (Số công đoạn đã hoàn thành / Tổng số công đoạn) × 100%
```

### Ví dụ cụ thể

**Mã hàng có 4 công đoạn (SX, ĐI XMS, XMS VỀ, ĐÓNG GÓI):**

| Công đoạn | Số lượng yêu cầu | Số lượng thực tế | Tiến độ |
|-----------|-----------------|-----------------|---------|
| SX | 612 | 612 | ✅ 100% |
| ĐI XMS | 612 | 612 | ✅ 100% |
| XMS VỀ | 612 | 0 | ❌ 0% |
| ĐÓNG GÓI | 612 | 0 | ❌ 0% |

**Tính toán:**
- Số công đoạn hoàn thành: 2 (SX + ĐI XMS)
- Tổng số công đoạn: 4
- **% hoàn thành = 2/4 × 100% = 50%**

---

## 4. Các trường hợp thường gặp

### Trường hợp 1: Mã hàng chỉ có 2 công đoạn

**Ví dụ:** Mã hàng chỉ cần SX và ĐÓNG GÓI

| Công đoạn | Số lượng yêu cầu | Số lượng thực tế | Tiến độ |
|-----------|-----------------|-----------------|---------|
| SX | 612 | 612 | ✅ 100% |
| ĐÓNG GÓI | 612 | 300 | ️ 49% |

**Tính toán:**
- Số công đoạn hoàn thành: 1 (SX) + 0.49 (ĐÓNG GÓI) = 1.49
- Tổng số công đoạn: 2
- **% hoàn thành = 1.49/2 × 100% = 74.5%**

✅ **Đúng:** Vì mã hàng này chỉ có 2 công đoạn, không phải 4.

---

### Trường hợp 2: Chưa làm đến công đoạn cuối (SX = 0)

**Ví dụ:** Đã đi xi mạ nhưng chưa sản xuất xong

| Công đoạn | Số lượng yêu cầu | Số lượng thực tế | Tiến độ |
|-----------|-----------------|-----------------|---------|
| SX | 612 | 0 | ❌ 0% |
| ĐI XMS | 612 | 612 | ✅ 100% |
| XMS VỀ | 612 | 612 | ✅ 100% |
| ĐÓNG GÓI | 612 | 0 | ❌ 0% |

**Tính toán:**
- Số công đoạn hoàn thành: 0 + 1 + 1 + 0 = 2
- Tổng số công đoạn: 4
- **% hoàn thành = 2/4 × 100% = 50%**

⚠️ **Lưu ý:** Dù SX = 0, nhưng các công đoạn khác đã làm → vẫn tính 50%.

---

### Trường hợp 3: Công đoạn không có trong quy trình

**Ví dụ:** Mã hàng không cần xi mạ

| Công đoạn | Số lượng yêu cầu | Số lượng thực tế | Có trong quy trình? |
|-----------|-----------------|-----------------|-------------------|
| SX | 612 | 612 | ✅ |
| ĐI XMS | - | - | ❌ Không có |
| XMS VỀ | - | - | ❌ Không có |
| ĐÓNG GÓI | 612 | 612 | ✅ |

**Tính toán:**
- Số công đoạn hoàn thành: 1 + 1 = 2
- Tổng số công đoạn: 2 (chỉ SX và ĐÓNG GÓI)
- **% hoàn thành = 2/2 × 100% = 100%**

✅ **Đúng:** Không tính các công đoạn không có trong quy trình.

---

## 5. So sánh các cách tính

### Cách 1: Chia cho số công đoạn CÓ TRONG QUY TRÌNH (✅ KHUYẾN NGHỊ)

**Nguyên tắc:** Chỉ chia cho số công đoạn thực sự có trong quy trình của mã hàng đó.

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Phản ánh đúng tiến độ | - |
| Dễ hiểu, dễ giải thích | - |
| Xử lý đúng mọi trường hợp | - |

---

### Cách 2: Chia cho số công đoạn CÓ DỮ LIỆU > 0 ( KHÔNG KHUYẾN NGHỊ)

**Nguyên tắc:** Chỉ chia cho số công đoạn có số lượng > 0.

**Ví dụ:** SX: 100, ĐI XMS: 200, XMS VỀ: 0, ĐÓNG GÓI: 0

| Cách tính | Kết quả | Đánh giá |
|-----------|---------|---------|
| Cách 1 (chia cho 4) | (16% + 33% + 0% + 0%) / 4 = **12.25%** | ✅ Đúng thực tế |
| Cách 2 (chia cho 2) | (16% + 33%) / 2 = **24.5%** | ❌ Quá cao |

**Vấn đề:** Cách 2 làm "lạm phát" phần trăm, gây hiểu lầm về tiến độ thực tế.

---

## 6. % hoàn thành đơn hàng (tổng)

Khi đơn hàng có nhiều mã hàng, tính trung bình theo trọng số:

```
% đơn hàng = Σ(% mỗi mã × số lượng yêu cầu) / Tổng số lượng yêu cầu
```

**Ví dụ:**

| Mã hàng | Số lượng | % hoàn thành | Trọng số |
|---------|---------|-------------|---------|
| A | 1000 | 100% | 1000 × 100% = 100,000 |
| B | 500 | 50% | 500 × 50% = 25,000 |
| C | 200 | 0% | 200 × 0% = 0 |

**Tính toán:**
- Tổng trọng số: 100,000 + 25,000 + 0 = 125,000
- Tổng số lượng: 1000 + 500 + 200 = 1700
- **% đơn hàng = 125,000 / 1700 = 73.5%**

---

## 7. Khuyến nghị cuối cùng

### Nguyên tắc vàng

1. **Chỉ tính các công đoạn CÓ TRONG QUY TRÌNH** của mã hàng đó
2. **Mỗi công đoạn có trọng số như nhau** (đơn giản, dễ hiểu)
3. **SX luôn được tính** (vì mã hàng nào cũng cần sản xuất)
4. **Các công đoạn khác chỉ tính nếu có trong quy trình**

### Tại sao chọn cách này?

✅ **Phản ánh đúng tiến độ thực tế** — không bị "lạm phát"  
✅ **Dễ giải thích** — "2/4 bước hoàn thành = 50%"  
✅ **Nhất quán** — cùng dữ liệu, cùng kết quả  
✅ **Xử lý đúng mọi trường hợp** — mã 1 bước, 2 bước, SX=0...

---

## 8. Câu hỏi thường gặp

### Q: Tại sao không chia cho 4 (tổng số công đoạn có thể có)?

**A:** Vì không phải mã hàng nào cũng có 4 công đoạn. Nếu mã hàng chỉ có 2 công đoạn mà chia cho 4 → % bị thấp hơn thực tế.

### Q: Nếu SX = 0 nhưng các công đoạn khác có dữ liệu thì tính sao?

**A:** Vẫn tính bình thường. Ví dụ: SX=0, ĐI XMS=100%, XMS VỀ=100%, ĐÓNG GÓI=0 → % = 50%.

### Q: Làm sao biết công đoạn nào có trong quy trình?

**A:** Dựa vào danh sách công đoạn được định nghĩa cho product group của mã hàng đó (trong hệ thống).

### Q: Tại sao không dùng trọng số khác nhau cho mỗi công đoạn?

**A:** Vì phức tạp, khó giải thích. Cách đơn giản nhất (mỗi công đoạn bằng nhau) là dễ hiểu nhất cho mọi người.

---

## 9. Tổng kết

**Công thức cuối cùng:**

```
% hoàn thành = (Tổng tiến độ các công đoạn / Số công đoạn trong quy trình) × 100%
```

**Trong đó:**
- **Tổng tiến độ** = SUM(min(số thực tế / số yêu cầu, 100%)) cho từng công đoạn
- **Số công đoạn trong quy trình** = đếm từ danh sách công đoạn của mã hàng

**Ví dụ nhanh:**
- Mã có 4 công đoạn, đã xong 2 → 50%
- Mã có 2 công đoạn, đã xong 1 → 50%
- Mã có 3 công đoạn, đã xong 3 → 100%

✅ **Đơn giản, chính xác, dễ hiểu!**
