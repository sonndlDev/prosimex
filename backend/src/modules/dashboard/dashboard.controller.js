/**
 * @file dashboard.controller.js
 * HTTP adapter for the dashboard module.
 * All read logic delegates to dashboardService (Type C).
 * No mutations in this module.
 */

import { dashboardService } from './dashboard.service.js';

export const getMetrics = async (req, res) => {
  try {
    const result = await dashboardService.getMetrics({ userId: req.user.id });
    res.json(result);
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    res.status(500).json({ message: "Error retrieving dashboard metrics", error });
  }
};

export const getActivities = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const result = await dashboardService.getActivities({ page, limit });
    res.json(result);
  } catch (error) {
    console.error("Dashboard Activities Error:", error);
    res.status(500).json({ message: "Error retrieving activities", error });
  }
};
