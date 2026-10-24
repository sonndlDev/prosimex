/**
 * @file auth.controller.js
 * HTTP adapter for the auth module.
 * Read logic (getMe) delegates to authService.
 * Mutations (login, refreshToken) are re-exported unchanged from the legacy controller.
 */

import { authService } from './auth.service.js';

export const getMe = async (req, res) => {
  try {
    const profile = await authService.getMe(req.user.id);
    res.json(profile);
  } catch (error) {
    const status = error.status || 500;
    const message = status === 404 ? error.message : 'Internal server error';
    if (status === 500) console.error('getMe error:', error);
    res.status(status).json({ message });
  }
};

// Re-export mutations from legacy — no behaviour change
export { login, refreshToken } from './__legacy__/auth.controller.legacy.js';
