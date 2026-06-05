# Phân Tích & Đề Xuất: Tính % Hoàn Thành Đơn Hàng

## 1. Bối cảnh

- Đơn hàng có nhiều mã hàng
- Mỗi mã hàng có các công đoạn riêng (SX, ĐI XMS, XMS VỀ, ĐÓNG GÓI...)
- Không phải mã hàng nào cũng trải qua tất cả công đoạn
- Cần hiển thị % hoàn thành đơn hàng chính xác

## 2. Vấn đề của code hiện tại

```javascript
// Code cũ: tính từ operations_detail (TẤT CẢ công đoạn)
totalProgress = SUM(min(actual/required, 1.0)) cho MOI công đoạn
totalStages = COUNT(*) FROM product_group_operations
% = totalProgress / totalStages × 100
```

**Vấn đề:** Bao gồm cả các công đoạn in-house (cắt, đột, uốn, hàn...) không nằm trong 4 cột hiển thị → % không khớp với dữ liệu hiển thị.

---

## 3. Các phương án đã phân tích

### Phương án 1: Trung bình cộng đơn giản

```javascript
stepCount = số bước CÓ TRONG QUY TRÌNH (SX + ĐI XMS nếu có + XMS VỀ nếu có + ĐÓNG GÓI nếu có)
totalProgress = SUM(min(value/required, 1.0)) cho từng bước
% = totalProgress / stepCount × 100
```

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Đơn giản, dễ hiểu | Mỗi bước trọng số như nhau, không phân biệt tầm quan trọng |
| Dễ giải thích cho user | SX = 0 nhưng các bước khác có dữ liệu → % vẫn > 0 |

---

### Phương án 2: Trọng số cố định

```javascript
weights = { SX: 0.4, ĐI XMS: 0.2, XMS VỀ: 0.2, ĐÓNG GÓI: 0.2 }
% = Σ(progress × weight) × 100
```

| Ưu điểm | Nhược điểm |
|---------|-----------|
| SX được ưu tiên cao nhất | Cần giải thích trọng số cho user |
| Nếu SX = 0 → tối đa 60% | Trọng số cố định có thể không phù hợp mọi mã hàng |

---

### Phương án 3: Theo trình tự (khắt khe)

```javascript
Chỉ tính bước N nếu bước N-1 đã >= 100%
```

| Ưu điểm | Nhược điểm |
|---------|-----------|
| Phản ánh đúng tiến độ thực tế | Quá khắt khe: SX = 99% → % = 0% |

---

### Phương án 4: Chia cho số bước có value > 0 (user đề xuất)

```javascript
Chỉ chia cho các bước có value > 0
```

| Ưu điểm | Nhược điểm |
|---------|-----------|
| - | "Lạm phát" phần trăm khi ít bước có dữ liệu |
| - | Không phân biệt "có trong quy trình" vs "có dữ liệu" |

**Ví dụ:** SX: 100, ĐI XMS: 200, XMS VỀ: 0, ĐÓNG GÓI: 0 (required = 612)
- Phương án 4: (16.3% + 32.7%) / 2 = **24.5%** ← quá cao
- Phương án 1: (16.3% + 32.7% + 0% + 0%) / 4 = **12.25%** ← đúng thực tế

---

## 4. Đề xuất của Senior (Technology + Production Management)

### Nguyên tắc cốt lõi

1. **% phải phản ánh đúng tiến độ thực tế** — không được "lạm phát"
2. **Công đoạn cuối (SX) là quan trọng nhất** — vì nó quyết định sản phẩm có hoàn thành hay không
3. **Phải nhất quán** — cùng một dữ liệu, cùng một kết quả dù xem ở đâu
4. **Dễ giải thích** — user (QC, planner) phải hiểu tại sao ra con số đó

### Phương án đề xuất: Trung bình cộng theo quy trình (Phương án 1 cải tiến)

```javascript
// Bước 1: Xác định các bước CÓ TRONG QUY TRÌNH của mã hàng này
let stepCount = 0;
let totalProgress = 0;

// SX (công đoạn cuối) - LUÔN có
stepCount++;
totalProgress += Math.min(sx / required, 1.0);

// ĐI XMS - chỉ nếu có trong operations_detail
if (operationsDetail.some(op => op.operation_name.match(/đi mạ|đi xi/i))) {
  stepCount++;
  totalProgress += Math.min(platingOut / required, 1.0);
}

// XMS VỀ - chỉ nếu có trong operations_detail
if (operationsDetail.some(op => op.operation_name.match(/về mạ|xi mạ về|về xi/i))) {
  stepCount++;
  totalProgress += Math.min(platingReturned / required, 1.0);
}

// ĐÓNG GÓI - chỉ nếu có trong operations_detail
if (operationsDetail.some(op => op.operation_name.match(/đóng gói|đong goi/i))) {
  stepCount++;
  totalProgress += Math.min(packagingOut / required, 1.0);
}

// Bước 2: Tính %
const percentage = stepCount > 0 ? (totalProgress / stepCount) * 100 : 0;
```

### Tại sao chọn phương án này?

| Tiêu chí | Đánh giá |
|----------|---------|
| Phản ánh đúng tiến độ | ✅ Mỗi bước có trọng số bằng nhau, không bị lạm phát |
| Phù hợp sản xuất | ✅ Chỉ tính các bước thực sự có trong quy trình |
| Dễ giải thích | ✅ "2/4 bước hoàn thành = 50%" — ai cũng hiểu |
| Nhất quán | ✅ Cùng dữ liệu → cùng kết quả |
| Xử lý edge cases | ✅ SX=0 → 0%, mã chỉ có 2 bước → chia cho 2 |

### Ví dụ minh họa

| Mã hàng | SX | ĐI XMS | XMS VỀ | ĐÓNG GÓI | Quy trình | % |
|---------|-----|--------|--------|---------|-----------|-----|
| A | 612/612 | 612/612 | 612/612 | 612/612 | 4 bước | 100% |
| B | 612/612 | 612/612 | 0/612 | 0/612 | 4 bước | 50% |
| C | 0/612 | 0/612 | 0/612 | 0/612 | 4 bước | 0% |
| D | 612/612 | - | - | 612/612 | 2 bước (SX+ĐÓNG GÓI) | 100% |
| E | 300/612 | - | - | - | 1 bước (chỉ SX) | 49% |

### % hoàn thành đơn hàng (overall)

```javascript
// Weighted average theo số lượng yêu cầu
totalRequired = SUM(required_quantity)
weightedSum = SUM(percentage × required_quantity)
overall% = weightedSum / totalRequired
```

---

## 5. Lưu ý khi triển khai

1. **Frontend và Backend phải dùng cùng logic** — hiện tại cả 2 đều gọi cùng 1 API nên chỉ cần sửa backend
2. **SQL query trong order list** (dòng 100-158) cũng có cùng vấn đề — cần sửa tương tự nếu muốn % trong danh sách đơn hàng chính xác
3. **Không hardcode số bước** — luôn đếm từ operations_detail để tự động thích ứng với mọi product group
