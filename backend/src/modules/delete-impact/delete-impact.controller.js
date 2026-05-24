import pool from "../../config/db.js";
import {
  getDeleteImpact,
  getBulkDeleteImpact,
  DELETE_IMPACT_ENTITY_TYPES,
  DELETE_IMPACT_PERMISSIONS,
} from "../../utils/delete-impact.util.js";
import { normalizePermissions } from "../../utils/permissions.util.js";

function canViewImpact(req, entityType) {
  if (req.user?.role_name === "ADMIN") return true;
  const permission = DELETE_IMPACT_PERMISSIONS[entityType];
  if (!permission) return false;
  const perms = normalizePermissions(req.user?.permissions);
  return perms.includes(permission);
}

export const getEntityDeleteImpact = async (req, res) => {
  try {
    const { entity, id } = req.params;

    if (!DELETE_IMPACT_ENTITY_TYPES.includes(entity)) {
      return res.status(400).json({ message: "Loại dữ liệu không hợp lệ" });
    }
    if (!canViewImpact(req, entity)) {
      return res.status(403).json({ message: "Không có quyền xem thông tin xóa" });
    }

    const impact = await getDeleteImpact(pool, entity, id);
    if (!impact) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    }

    res.json(impact);
  } catch (error) {
    console.error("getEntityDeleteImpact error:", error);
    res.status(500).json({ message: "Lỗi khi kiểm tra dữ liệu liên quan" });
  }
};

export const getBulkEntityDeleteImpact = async (req, res) => {
  try {
    const { entity, ids } = req.body;

    if (!DELETE_IMPACT_ENTITY_TYPES.includes(entity)) {
      return res.status(400).json({ message: "Loại dữ liệu không hợp lệ" });
    }
    if (!canViewImpact(req, entity)) {
      return res.status(403).json({ message: "Không có quyền xem thông tin xóa" });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Danh sách ID không hợp lệ" });
    }

    const numericIds = ids.map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v));
    const impact = await getBulkDeleteImpact(pool, entity, numericIds);
    if (!impact) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    }

    res.json(impact);
  } catch (error) {
    console.error("getBulkEntityDeleteImpact error:", error);
    res.status(500).json({ message: "Lỗi khi kiểm tra dữ liệu liên quan" });
  }
};
