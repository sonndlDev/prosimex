import { productionPlanningService } from './production-planning.service.js';

export const getProductionPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, ...filters } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const { total, rows } = await productionPlanningService.getPlans(
      filters,
      { limit: limitInt, offset: (pageInt - 1) * limitInt },
    );
    res.json({
      data: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get Plans Error:', error);
    res.status(500).json({ message: 'Error retrieving production plans' });
  }
};

// Not-yet-refactored mutations delegated to legacy controller
export {
  createProductionPlan,
  updateProductionPlan,
  deleteProductionPlan,
  cloneProductionPlan,
  createOrderGeneralPlan,
  stopPlan,
  getPlannedStatusByOrder,
} from './production-planning.controller.legacy.js';
