import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../config/db.js";
import { mergeEffectivePermissions } from "../../utils/permissions.util.js";

const userSelectWithRole = `
  SELECT u.*, r.name as role_name, r.permissions as role_permissions
  FROM users u
  JOIN roles r ON u.role_id = r.id
`;

const buildAuthPayload = (user) => {
  const permissions = mergeEffectivePermissions(user.permissions, user.role_permissions);
  return {
    id: user.id,
    username: user.username,
    role_name: user.role_name,
    factory_id: user.factory_id,
    permissions,
  };
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      `${userSelectWithRole} WHERE u.username = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
      [username],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const authPayload = buildAuthPayload(user);
    const accessToken = jwt.sign(
      authPayload,
      process.env.JWT_SECRET || "secretKey",
      { expiresIn: "4h" },
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || "refreshSecretKey",
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role_name,
        factory_id: user.factory_id,
        permissions: authPayload.permissions,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `${userSelectWithRole} WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const effectivePermissions = mergeEffectivePermissions(user.permissions, user.role_permissions);
    res.json({
      id: user.id,
      username: user.username,
      role: user.role_name,
      factory_id: user.factory_id,
      permissions: effectivePermissions,
      is_active: user.is_active,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
    });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "refreshSecretKey",
      async (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "Invalid refresh token" });
        }

        // Fetch user to get latest permissions/role
        const result = await pool.query(
          `${userSelectWithRole} WHERE u.id = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
          [decoded.id],
        );

        const user = result.rows[0];
        if (!user) {
          return res
            .status(401)
            .json({ message: "User not found or inactive" });
        }

        const authPayload = buildAuthPayload(user);
        const newAccessToken = jwt.sign(
          authPayload,
          process.env.JWT_SECRET || "secretKey",
          { expiresIn: "4h" },
        );

        const effectivePermissions = authPayload.permissions;
        res.json({
          token: newAccessToken,
          user: {
            id: user.id,
            username: user.username,
            role: user.role_name,
            factory_id: user.factory_id,
            permissions: effectivePermissions,
            full_name: user.full_name,
            phone: user.phone,
            email: user.email,
          },
        });
      },
    );
  } catch (error) {
    console.error("RefreshToken error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
