// Slim adapter: re-export all handlers from legacy
// This module is write-heavy (file upload + bulk DB inserts), so handlers remain in legacy
export { importMasterData, getImportHistory } from "./__legacy__/import-excel.controller.legacy.js";
