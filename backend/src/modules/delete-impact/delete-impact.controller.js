/**
 * @file delete-impact.controller.js
 * HTTP adapter for the delete-impact module.
 *
 * This module is a pure utility passthrough: all business logic lives in
 * src/utils/delete-impact.util.js. The controller adds auth/permission checks
 * then delegates directly to the utility. No read service needed.
 *
 * All handlers are re-exported unchanged from the legacy controller.
 */

export { getEntityDeleteImpact, getBulkEntityDeleteImpact } from './__legacy__/delete-impact.controller.legacy.js';
