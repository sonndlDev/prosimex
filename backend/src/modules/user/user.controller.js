/**
 * @file user.controller.js
 * HTTP adapter for the user module.
 * Read logic (getUsers, getRoles) delegates to userService.
 * Mutations (createUser, updateUser, deleteUser, createRole,
 * deleteRole, updateRolePermissions, updateProfile) are re-exported
 * unchanged from the legacy controller.
 */

import { userService } from './user.service.js';

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await userService.getUsers({ search }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRoles = async (req, res) => {
  try {
    const roles = await userService.getRoles();
    res.json(roles);
  } catch (error) {
    console.error('getRoles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Re-export mutations from legacy — no behaviour change
export {
  createUser,
  updateUser,
  deleteUser,
  createRole,
  deleteRole,
  updateRolePermissions,
  updateProfile,
} from './__legacy__/user.controller.legacy.js';
