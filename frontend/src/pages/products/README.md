# Products & Warehouse Module - Frontend Hàng Hóa

## Danh sách trang (Pages)

### 1. `products/ProductPage.jsx` & `product-groups/ProductGroupPage.jsx`
- **Mục đích:** Quản trị Danh mục Hàng hóa chung.
- **Tính năng:**
  - Định nghĩa 1 sản phẩm là gì (Tên, Size, Quy Cách, Công Ðoạn cần).
  - Gom nhóm (Groups) để dễ truy xuất và gắn Tag (Phân loại: Áo, Quần...).
  - Component `DraggableSequenceTable`: Bảng hỗ trợ kéo thả (Drag-drop) để sắp xếp thứ tự bước làm công đoạn của Sản phẩm.

### 2. `inventory/ProductInventoryPage.jsx` & `warehouse/WarehousePage.jsx`
- **Mục đích:** Quản trị Vật tư / Tồn Kho Thành Phẩm.
- **Tính năng:** 
  - Xem lượng hàng tồn của từng kho.
  - Kiểm kê số tăng/giảm sau mỗi đợt chốt Daily Ticket hoặc Xuất Hàng Mua nguyên vật liệu (Module Supplier). Tích hợp các nút xuất/nhập phiếu kho.
