# Prosimex MES — Tài liệu Tổng hợp Hệ thống

> **Mục đích:** Tài liệu tham chiếu để phát triển tính năng mới mà không ảnh hưởng chức năng cũ.

---

## 1. Tổng quan Kiến trúc

```
Frontend (React + Vite)          Backend (Node.js + Express)
┌─────────────────────┐          ┌──────────────────────────┐
│ React 18 + Vite     │  HTTP/   │ Express.js               │
│ TailwindCSS         │ WebSocket│ PostgreSQL (pg pool)      │
│ shadcn/ui           │◄────────►│ Socket.io                │
│ React Query         │          │ JWT Auth + RBAC           │
│ React Router v6     │          │ node-cron Scheduler       │
└─────────────────────┘          └──────────────────────────┘
```

- **FE port:** Vite dev server → Nginx (production)
- **BE port:** 3000, bind `0.0.0.0`
- **Timezone:** `Asia/Ho_Chi_Minh` (set toàn bộ hệ thống)
- **API base:** `VITE_API_URL/api`

---

## 2. Cấu trúc Thư mục

### Frontend (`/src`)

```
src/
├── AppRouter.jsx          # Khai báo tất cả routes, phân quyền route
├── main.jsx               # Entry point
├── App.jsx                # Root component
├── context/
│   └── AuthContext.jsx    # State user, login/logout, hasPermission
├── constants/
│   └── permissions.js     # Danh sách modules + actions, hàm kiểm quyền
├── components/
│   ├── ProtectedRoute.jsx # Guard route theo permission
│   ├── GenericTable.jsx   # Bảng dùng chung toàn hệ thống
│   ├── DeleteImpactDialog.jsx  # Dialog xác nhận xóa có impact
│   ├── AccessDeniedBanner.jsx  # Banner báo 403
│   └── NotificationDropdown.jsx
├── hooks/
│   └── useDeleteWithImpact.js  # Hook xử lý delete + check impact
├── layouts/
│   └── MainLayout.jsx     # Sidebar navigation + socket connection
├── services/
│   ├── api.js             # Axios instance + interceptors (token refresh)
│   └── [module].service.js
├── pages/
│   ├── auth/              # Login, Profile, User management
│   ├── dashboard/
│   ├── orders/
│   ├── planning/
│   ├── daily-tickets/
│   ├── outsourcing/
│   ├── inventory/
│   ├── attendance/
│   └── ...
└── utils/
    └── audit.jsx          # Cột audit (created_by, modified_by) dùng chung
```

### Backend (`/src`)

```
src/
├── server.js              # Express app, mount routes, socket, scheduler
├── config/
│   └── db.js              # PostgreSQL pool
├── middlewares/
│   ├── auth.middleware.js # Verify JWT token
│   └── rbac.middleware.js # authorize() — kiểm quyền RBAC
├── modules/               # Mỗi module = controller + routes
│   ├── auth/
│   ├── user/
│   ├── worker/
│   ├── factory/
│   ├── machine/
│   ├── machine-schedule/
│   ├── operation/
│   ├── product-group/
│   ├── product/
│   ├── customer/
│   ├── supplier/
│   ├── order/
│   ├── production-planning/
│   ├── daily-ticket/
│   ├── outsourcing/
│   ├── product-inventory/
│   ├── import-excel/
│   ├── attendance/
│   ├── notification/
│   ├── dashboard/
│   └── delete-impact/
├── utils/
│   ├── cascade-delete.util.js   # Xóa cascade khi xóa master data
│   ├── delete-impact.util.js    # Tính toán impact trước khi xóa
│   ├── permissions.util.js      # normalizePermissions()
│   └── order-product-snapshot.util.js
├── sockets/
│   └── index.js           # Socket.io init, auth, planners_room
└── workers/
    ├── scheduler.js        # node-cron — chạy 14:00 mỗi ngày
    └── dailyTicketWorker.js # Auto-generate daily tickets
```

---

## 3. Hệ thống Xác thực & Phân quyền

### 3.1 Authentication Flow

```
User login
   │
   ▼
POST /api/auth/login
   │ → trả về { token (JWT), refreshToken, user: { id, role, permissions[] } }
   │
   ▼
FE lưu vào localStorage:
   - token
   - refreshToken
   - user (JSON)
   │
   ▼
Mỗi request: api.js interceptor đính Bearer token vào header
   │
   ▼
Token sắp hết hạn (< 5 phút) → proactiveRefresh() gọi /api/auth/refresh-token
   │
   ▼
Token hết hạn + 401 → isRefreshing queue → gọi refresh-token → retry
   │  (nếu refresh fail → xóa localStorage → redirect /login)
   ▼
403 → dispatch CustomEvent "api:forbidden" → AccessDeniedBanner hiển thị
```

### 3.2 JWT Payload

```javascript
{
  id, username, role_name, factory_id,
  permissions: ["module:action", ...]  // merged from user + role
}
```

### 3.3 Permission System

**Format permission key:** `{module}:{action}`

**Actions chuẩn:** `menu | read | create | update | delete | auto_approve`

#### Danh sách modules & permissions

| Module | Label | Actions |
|--------|-------|---------|
| `dashboard` | Bảng điều khiển | menu, read |
| `planning` | Lập kế hoạch | menu, read, create, update, delete |
| `daily_tickets` | Phiếu SX hàng ngày | menu, read, create, update, delete, **auto_approve** |
| `import_excel` | Import Excel | menu, read, create |
| `production_output` | Nhập sản lượng | menu, read, create, update, delete |
| `schedule` | Timeline | menu, read |
| `outsourcing` | Phiếu gia công | menu, read, create, update, delete |
| `orders` | Đơn hàng | menu, read, create, update, delete |
| `warehouse` | Thông tin kho | menu, read, create, update, delete |
| `product_inventory` | Tồn kho BTP & TP | menu, read |
| `plan_vs_actual` | Báo cáo KH vs TT | menu, read |
| `customers` | Khách hàng | menu, read, create, update, delete |
| `factories` | Nhà máy | menu, read, create, update, delete |
| `machines` | Máy móc | menu, read, create, update, delete |
| `operations` | Công đoạn | menu, read, create, update, delete |
| `suppliers` | Nhà cung cấp | menu, read, create, update, delete |
| `product_groups` | Nhóm mã hàng | menu, read, create, update, delete |
| `products` | Mã hàng | menu, read, create, update, delete |
| `attendance` | Chấm công (CN) | menu, read, create, update, delete |
| `attendance_management` | QL Chấm công | menu, read, create, update, delete |
| `workers` | Quản lý công nhân | menu, read, create, update, delete |
| `users` | Người dùng & Quyền | menu, read, create, update, delete |
| `settings` | Cài đặt hệ thống | menu, read, update |

### 3.4 RBAC Logic (Backend)

```
authorize(allowedRoles, requiredPermission) middleware:

1. ADMIN → luôn pass
2. Legacy bypass: PLANNER/OPERATOR nếu allowedRoles chứa role đó
3. Kiểm tra requiredPermission trong JWT permissions (ANY match)
4. Fallback: allowedRoles check
5. Fail → 403 { message, required_permission }
```

### 3.5 Frontend Permission Check

```javascript
// Sidebar: dùng canShowMenu() — cần "{module}:menu"
canShowMenu(user, moduleKey)

// Route guard: dùng canAccessPage() — cần ":read" HOẶC ":menu"
canAccessPage(user, requiredPermission)

// Inline check trong component:
const { hasPermission } = useAuth();
hasPermission("orders:create")  // boolean
```

---

## 4. API Endpoints — Toàn bộ Backend

### Auth `/api/auth`
| Method | Path | Permission |
|--------|------|-----------|
| POST | `/login` | public |
| POST | `/refresh-token` | public |
| GET | `/me` | authenticated |

### Users `/api/users`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN, `users:read` |
| GET | `/roles` | ADMIN, `users:read` |
| POST | `/roles` | ADMIN, `users:create` |
| PUT | `/roles/:id/permissions` | ADMIN, `users:update` |
| DELETE | `/roles/:id` | ADMIN, `users:delete` |
| POST | `/` | ADMIN, `users:create` |
| PUT | `/:id` | ADMIN, `users:update` |
| DELETE | `/:id` | ADMIN, `users:delete` |
| PUT | `/profile/update` | authenticated (own profile) |

### Workers `/api/workers`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | `workers:read` |
| POST | `/` | ADMIN, `workers:create` |
| PUT | `/:id` | ADMIN, `workers:update` |
| DELETE | `/:id` | ADMIN, `workers:delete` |

### Worker Assignments `/api/worker-assignments`
| Method | Path | Note |
|--------|------|------|
| *(xem routes file)* | | |

### Factories `/api/factories`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER, `factories:read` |
| POST | `/` | ADMIN, `factories:create` |
| PUT | `/:id` | ADMIN, `factories:update` |
| DELETE | `/:id` | ADMIN, `factories:delete` |

### Machines `/api/machines`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `machines:read` |
| POST | `/` | ADMIN/PLANNER, `machines:create` |
| PUT | `/:id` | ADMIN/PLANNER, `machines:update` |
| DELETE | `/:id` | ADMIN, `machines:delete` |

### Machine Schedule `/api/machine-schedule`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/calendar` | ADMIN/PLANNER/OPERATOR, `schedule:read` |

### Operations `/api/operations`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `operations:read` |
| POST | `/` | ADMIN/PLANNER, `operations:create` |
| PUT | `/:id` | ADMIN/PLANNER, `operations:update` |
| DELETE | `/:id` | ADMIN, `operations:delete` |

### Product Groups `/api/product-groups`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `product_groups:read` |
| POST | `/` | ADMIN/PLANNER, `product_groups:create` |
| PUT | `/:id` | ADMIN/PLANNER, `product_groups:update` |
| DELETE | `/:id` | ADMIN, `product_groups:delete` |
| GET | `/:id/operations` | ADMIN/PLANNER/OPERATOR, `product_groups:read` |
| POST | `/:id/operations` | ADMIN/PLANNER, `product_groups:create` |
| PUT | `/:id/operations/reorder` | ADMIN/PLANNER, `product_groups:update` |
| PUT | `/:id/operations/:operationId` | ADMIN/PLANNER, `product_groups:update` |
| DELETE | `/:id/operations/:operationId` | ADMIN/PLANNER, `product_groups:delete` |

### Products `/api/products`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `products:read` |
| POST | `/` | ADMIN/PLANNER, `products:create` |
| PUT | `/:id` | ADMIN/PLANNER, `products:update` |
| DELETE | `/:id` | ADMIN, `products:delete` |

### Customers `/api/customers`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `customers:read` |
| POST | `/` | ADMIN/PLANNER, `customers:create` |
| PUT | `/:id` | ADMIN/PLANNER, `customers:update` |
| DELETE | `/:id` | ADMIN, `customers:delete` |

### Suppliers `/api/suppliers`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | `suppliers:read` |
| POST | `/` | `suppliers:create` |
| PUT | `/:id` | `suppliers:update` |
| DELETE | `/:id` | `suppliers:delete` |

### Orders `/api/orders`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `orders:read` |
| GET | `/product-snapshots` | ADMIN/PLANNER/OPERATOR, `orders:read` |
| GET | `/:id/completion-report` | ADMIN/PLANNER/OPERATOR, `orders:read` |
| GET | `/:id/summary-report` | ADMIN/PLANNER/OPERATOR, `orders:read` |
| GET | `/:id` | ADMIN/PLANNER/OPERATOR, `orders:read` |
| POST | `/` | ADMIN/PLANNER, `orders:create` |
| PUT | `/:id` | ADMIN/PLANNER, `orders:update` |
| PUT | `/:id/warehouse-details` | ADMIN/PLANNER, `orders:update` |
| DELETE | `/:id` | ADMIN, `orders:delete` |

### Production Planning `/api/production-plans`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `planning:read` |
| GET | `/planned-status` | ADMIN/PLANNER/OPERATOR, `planning:read` |
| POST | `/` | ADMIN/PLANNER, `planning:create` |
| POST | `/batch-order` | ADMIN/PLANNER, `planning:create` |
| POST | `/clone/:id` | ADMIN/PLANNER, `planning:create` |
| PUT | `/:id` | ADMIN/PLANNER, `planning:update` |
| PUT | `/:id/stop` | ADMIN/PLANNER, `planning:update` |
| DELETE | `/:id` | ADMIN/PLANNER, `planning:delete` |

### Daily Tickets `/api/daily-tickets`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | `daily_tickets:read` |
| GET | `/report/plan-vs-actual` | `plan_vs_actual:read` |
| POST | `/auto-generate` | `daily_tickets:read` |
| POST | `/manual-output` | `production_output:create` |
| GET | `/export/detailed` | `daily_tickets:read` |
| GET | `/:id` | `daily_tickets:read` |
| POST | `/` | `daily_tickets:create` |
| PUT | `/:id` | `daily_tickets:update` |
| PUT | `/:id/approve` | `daily_tickets:update` |
| PUT | `/:id/reject` | `daily_tickets:update` |
| PUT | `/:id/results` | `daily_tickets:update` |
| DELETE | `/:id` | `daily_tickets:delete` |

### Outsourcing `/api/outsourcing`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/MANAGER, `outsourcing:read` |
| GET | `/export-detailed` | ADMIN/PLANNER/MANAGER, `outsourcing:read` |
| POST | `/` | ADMIN/PLANNER/MANAGER, `outsourcing:create` |
| GET | `/:ticket_code` | ADMIN/PLANNER/MANAGER, `outsourcing:read` |
| POST | `/:ticket_id/returns` | ADMIN/PLANNER/MANAGER, `outsourcing:create` |
| PUT | `/:id` | ADMIN/PLANNER/MANAGER, `outsourcing:update` |
| DELETE | `/:id` | ADMIN/PLANNER/MANAGER, `outsourcing:delete` |

### Product Inventory `/api/product-inventory`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | ADMIN/PLANNER/OPERATOR, `product_inventory:read` |
| POST | `/` | ADMIN/PLANNER, `product_inventory:create` |
| PUT | `/:id` | ADMIN/PLANNER, `product_inventory:update` |
| DELETE | `/:id` | ADMIN/PLANNER, `product_inventory:delete` |

### Attendance `/api/attendance`
| Method | Path | Permission |
|--------|------|-----------|
| POST | `/check-in` | authenticated |
| POST | `/check-out` | authenticated |
| GET | `/today` | authenticated |
| GET | `/logs` | authenticated |

### Import Excel `/api/import-excel`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/master-data/history` | ADMIN/PLANNER, `import_excel:read` |
| POST | `/master-data` | ADMIN/PLANNER, `import_excel:create` |

### Dashboard `/api/dashboard`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/metrics` | `dashboard:read` |
| GET | `/activities` | `dashboard:read` |

### Notifications `/api/notifications`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/` | authenticated |
| PUT | `/read-all` | authenticated |
| PUT | `/:id/read` | authenticated |

### Delete Impact `/api/delete-impact`
| Method | Path | Permission |
|--------|------|-----------|
| GET | `/:entity/:id` | authenticated |
| POST | `/bulk` | authenticated |

---

## 5. Frontend — Trang & Chức năng

| Route | Page | Permission Required |
|-------|------|-------------------|
| `/` | DashboardPage | `dashboard:read` |
| `/orders` | OrderPage | `orders:read` |
| `/orders/product-snapshots` | OrderProductSnapshotPage | `orders:read` |
| `/planning` | PlanningPage | `planning:read` |
| `/schedule` | SchedulePage | `schedule:read` |
| `/daily-tickets` | DailyTicketPage | `daily_tickets:read` |
| `/daily-tickets/approval` | ApprovalTicketPage | `daily_tickets:read` |
| `/production-output` | ProductionOutputPage | `production_output:read` |
| `/outsourcing` | OutsourcingPage | `outsourcing:read` |
| `/warehouse` | WarehousePage | `warehouse:read` |
| `/product-inventory` | ProductInventoryPage | `product_inventory:read` |
| `/plan-vs-actual` | PlanVsActualPage | `plan_vs_actual:read` |
| `/customers` | CustomerPage | `customers:read` |
| `/suppliers` | SuppliersPage | `suppliers:read` |
| `/factories` | FactoryPage | `factories:read` |
| `/machines` | MachinePage | `machines:read` |
| `/product-groups` | ProductGroupPage | `product_groups:read` |
| `/products` | ProductPage | `products:read` |
| `/operations` | OperationPage | `operations:read` |
| `/import` | DailyTicketImportPage | `import_excel:read` |
| `/attendance` | AttendancePage | `attendance:read` |
| `/attendance/management` | AttendanceManagementPage | `attendance_management:read` |
| `/workers` | WorkerPage | `workers:read` |
| `/users` | UserPage | `users:read` |
| `/profile` | ProfilePage | authenticated |

---

## 6. Luồng Logic Quan trọng

### 6.1 Auto-generate Daily Tickets (Scheduler)

```
Scheduler chạy lúc 14:00 mỗi ngày (Asia/Ho_Chi_Minh)
   │
   ▼
generateDailyTickets(targetDate = ngày mai)
   │
   ▼
Query production_plan_days có working_date = targetDate
   │  (chỉ plans chưa DONE, có machine_id)
   ▼
Tìm machine_id đã có ticket ngày đó → SKIP
   │
   ▼
Tạo daily_production_tickets cho machine_id mới
   │
   ▼
Emit socket event → frontend nhận real-time
```

> ⚠️ **Khi thêm trường mới vào production_plans:** Cần cập nhật query trong `dailyTicketWorker.js`

### 6.2 Delete với Impact Check

```
User click xóa
   │
   ▼
useDeleteWithImpact.openDelete(row)
   │
   ▼
GET /api/delete-impact/:entity/:id
   │  (hoặc POST /api/delete-impact/bulk nếu nhiều ids)
   ▼
Hiển thị DeleteImpactDialog — danh sách records liên quan
   │
   ▼
User confirm → gọi deleteFn() → onSuccess() refresh data
```

**Entities có impact check:** `product`, `customer`, `machine`, `operation`, `product_group`, `factory`, `worker`, `order`, `production_plan`, `supplier`

### 6.3 Cascade Delete Chain

```
Factory xóa
  ├── Machines (cascade)
  │     ├── production_plans (soft delete)
  │     │     └── machine_schedules (hard delete)
  │     ├── machine_schedules (hard delete)
  │     └── product_group_operations (soft delete)
  ├── Product Groups (cascade)
  │     ├── product_group_operations (soft delete)
  │     └── Products (cascade, xem bên dưới)
  ├── Products (cascade)
  │     ├── order_products (hard delete)
  │     ├── production_plans (soft delete)
  │     ├── daily_production_ticket_items (hard delete)
  │     ├── outsourcing_ticket_items (hard delete)
  │     └── product_inventory (soft delete)
  └── Orders (soft delete + xóa order_products + xóa plans)

Machine xóa
  ├── production_plans (soft delete)
  ├── machine_schedules (hard delete)
  └── product_group_operations (soft delete)

Product Group xóa
  ├── product_group_operations (soft delete)
  └── Products (cascade như trên)

Customer xóa
  └── orders.customer_id = NULL (detach, không xóa)

Worker xóa
  └── worker_plan_assignments (hard delete)
```

### 6.4 Token Refresh Strategy

```
Request thường:
  - Check token còn > 5 phút: dùng luôn
  - Token sắp hết (< 5 min): proactiveRefresh() trước khi gửi

Request thất bại 401:
  - Đang refresh → queue request, chờ token mới rồi retry
  - Chưa refresh → bắt đầu refresh → processQueue
  - Refresh fail → clear localStorage → redirect /login

Response 403:
  - Dispatch CustomEvent "api:forbidden"
  - AccessDeniedBanner hiển thị message + required_permission
```

### 6.5 Real-time Notifications (Socket.io)

```
FE kết nối Socket.io tại MainLayout (khi authenticated)
   │
   ▼
Handshake: auth.token = JWT
   │
   ▼
Backend verify JWT → gán socket.user
   │
   ▼
Nếu PLANNER/ADMIN hoặc có "daily_tickets:auto_approve"
   → join "planners_room"
   │
   ▼
Khi auto-generate tickets:
   → emit vào "planners_room"
   → FE nhận → invalidate React Query cache → hiển thị toast/notification
```

---

## 7. Patterns & Conventions

### 7.1 GenericTable Component
Bảng dùng chung với các tính năng:
- Sort, filter, pagination
- Column resize
- Bulk select + bulk delete
- Export
- Custom cell render qua `format(value, row)` callback

**Cách thêm trang mới với bảng:** Dùng `<GenericTable columns={[...]} rows={data} ... />`

### 7.2 Audit Column
Cột "Lịch sử" dùng chung, import từ `utils/audit.jsx`:
```javascript
import { getAuditColumn } from "@/utils/audit";
const columns = [...yourColumns, getAuditColumn()];
```
Tự động hiển thị `creator_name / modifier_name` + timestamp với tooltip.

### 7.3 Service Pattern
Mỗi module có file service riêng:
```javascript
// services/[module].service.js
import api from "./api";
export const moduleService = {
  getAll: (params) => api.get("/module", { params }),
  create: (data) => api.post("/module", data),
  update: (id, data) => api.put(`/module/${id}`, data),
  delete: (id) => api.delete(`/module/${id}`),
};
```

### 7.4 React Query Pattern
Tất cả data fetching dùng `@tanstack/react-query`:
- Cache invalidation sau mutation
- `queryClient.invalidateQueries([key])` sau create/update/delete

### 7.5 Soft Delete vs Hard Delete
- **Soft delete:** `deleted_at = CURRENT_TIMESTAMP` — dùng cho master data chính (products, plans, orders...)
- **Hard delete:** Xóa vật lý — dùng cho bảng junction/mapping (order_products, machine_schedules...)

---

## 8. Quy tắc khi phát triển tính năng mới

### 8.1 Thêm Module mới (FE + BE)

**Backend:**
1. Tạo thư mục `src/modules/{module-name}/`
2. Tạo `{module}.controller.js` + `{module}.routes.js`
3. Mount route trong `server.js`: `app.use('/api/{module}', routeModule)`
4. Dùng `authorize(roles, 'module_name:action')` middleware

**Frontend:**
1. Thêm permission vào `src/constants/permissions.js` (PERMISSION_GROUPS)
2. Thêm service file `src/services/{module}.service.js`
3. Tạo page `src/pages/{module}/`
4. Thêm route vào `AppRouter.jsx` với `<ProtectedRoute requiredPermission="module:read" />`
5. Thêm menu item vào `MainLayout.jsx` (menuItems array)

### 8.2 Thêm Permission mới

1. Thêm vào `PERMISSION_GROUPS` trong `permissions.js`
2. Cập nhật routes BE dùng permission key đó
3. Chạy migrate permissions nếu cần (xem `migrate_permissions.js`)

### 8.3 Thêm trường mới vào bảng có Cascade

Khi thêm trường vào các bảng: `production_plans`, `daily_production_tickets`, `orders`, `products`...
- Kiểm tra `cascade-delete.util.js` — UPDATE các query nếu cần
- Kiểm tra `dailyTicketWorker.js` — cập nhật SELECT query nếu trường mới cần trong auto-generate
- Kiểm tra `delete-impact.util.js` — cập nhật impact queries nếu cần

### 8.4 Không phá vỡ các chức năng sau

| Chức năng nhạy cảm | File liên quan | Lưu ý |
|-------------------|---------------|-------|
| Auto-generate daily tickets | `dailyTicketWorker.js`, `scheduler.js` | Không đổi cron expression, không đổi logic skip machine_id đã có |
| Token refresh queue | `services/api.js` interceptors | Không sửa logic `isRefreshing` + `failedQueue` |
| Socket planners_room | `sockets/index.js` | Không đổi room name "planners_room" |
| Cascade delete chain | `cascade-delete.util.js` | Luôn test xóa factory → kiểm tra toàn bộ chain |
| Permission check | `permissions.js`, `rbac.middleware.js` | Không đổi format key `module:action` |
| Audit columns | `utils/audit.jsx` | Đảm bảo các bảng mới có `created_time`, `modified_time`, `creator_name`, `modifier_name` |

---

## 9. Database — Bảng Chính và Quan hệ

```
factories
  └─< machines
        └─< production_plans
              ├─< production_plan_days
              ├─< machine_schedules
              └─< daily_production_tickets
                    └─< daily_production_ticket_items

product_groups (thuộc factory)
  └─< product_group_operations (product_group ↔ operation + machine)
  └─< products
        └─< order_products
        └─< product_inventory

customers
  └─< orders
        └─< order_products
        └─< production_plans

operations
  └─< product_group_operations

outsourcing_tickets
  └─< outsourcing_ticket_items

workers
  └─< worker_plan_assignments

users / roles / role_permissions
attendance_logs
notifications
```

---

## 10. Environment Variables

### Backend (`.env`)
```
JWT_SECRET=...
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
NODE_ENV=development|production
TZ=Asia/Ho_Chi_Minh  (set trong server.js)
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3000
```