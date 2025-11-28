const dashboardService = require('../services/dashboardService');
const { response } = require('../utils');

/**
 * Get dashboard data based on user role
 * GET /api/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const dashboard = await dashboardService.getDashboard(req.user);
    return response.success(res, dashboard);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};
