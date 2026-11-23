export const ACTION_LABELS = {
  menu: "Hiện menu",
  read: "Xem",
  create: "Thêm",
  update: "Sửa",
  delete: "Xóa",
  auto_approve: "Tự động duyệt phiếu",
};

/** Default actions per module; `menu` controls sidebar visibility. */
const withMenu = (actions) => ["menu", ...actions.filter((a) => a !== "menu")];

export const PERMISSION_GROUPS = [
  {
    groupLabel: "Sản xuất",
    items: [
      { key: "dashboard", label: "Bảng điều khiển", actions: withMenu(["read"]) },
      { key: "planning", label: "Lập kế hoạch", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "daily_tickets", label: "Phiếu SX hàng ngày", actions: withMenu(["read", "create", "update", "delete", "auto_approve"]) },
      { key: "import_excel", label: "Import Excel", actions: withMenu(["read", "create"]) },
      { key: "production_output", label: "Nhập sản lượng", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "schedule", label: "Timeline", actions: withMenu(["read"]) },
      { key: "outsourcing", label: "Phiếu gia công", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "orders", label: "Đơn hàng", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "warehouse", label: "Thông tin kho", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "product_inventory", label: "Tồn kho BTP & TP", actions: withMenu(["read"]) },
      { key: "plan_vs_actual", label: "Báo cáo KH vs TT", actions: withMenu(["read"]) },
    ],
  },
  {
    groupLabel: "Dữ liệu gốc",
    items: [
      { key: "customers", label: "Khách hàng", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "factories", label: "Nhà máy", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "machines", label: "Máy móc", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "operations", label: "Công đoạn", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "suppliers", label: "Nhà cung cấp", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "product_groups", label: "Nhóm mã hàng", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "products", label: "Mã hàng", actions: withMenu(["read", "create", "update", "delete"]) },
    ],
  },
  {
    groupLabel: "Hệ thống",
    items: [
      { key: "attendance", label: "Chấm công (C.Nhân)", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "attendance_management", label: "QL Chấm công", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "workers", label: "Quản lý công nhân", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "users", label: "Người dùng & Quyền", actions: withMenu(["read", "create", "update", "delete"]) },
      { key: "settings", label: "Cài đặt hệ thống", actions: withMenu(["read", "update"]) },
    ],
  },
];

export const allPermissionKeys = () =>
  PERMISSION_GROUPS.flatMap((g) =>
    g.items.flatMap((item) => item.actions.map((action) => `${item.key}:${action}`))
  );

function userPerms(user) {
  return Array.isArray(user?.permissions) ? user.permissions : [];
}

/** Sidebar: user must have `{module}:menu` (ADMIN always sees all). */
export function canShowMenu(user, moduleKey) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const key = moduleKey.replace(/-/g, "_");
  return userPerms(user).includes(`${key}:menu`);
}

/**
 * Page/route access: `:read` or `:menu` for the same module (tránh Unauthorized khi chỉ tick Hiện menu).
 * API backend vẫn yêu cầu `:read` riêng.
 */
export function canAccessPage(user, requiredPermission) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const perms = userPerms(user);
  const normalized = requiredPermission.replace(/-/g, "_");
  if (perms.includes(normalized) || perms.includes(requiredPermission)) return true;

  const [module] = normalized.split(":");
  if (module && perms.includes(`${module}:menu`)) return true;
  // Legacy: module key without suffix counted as read
  if (module && perms.includes(module)) return true;

  return false;
}
