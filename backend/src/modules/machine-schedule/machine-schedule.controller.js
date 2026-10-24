/**
 * @file machine-schedule.controller.js
 * HTTP adapter for the machine-schedule module.
 * Read logic delegates to machineScheduleService.
 * No mutations in this module.
 */

import { machineScheduleService } from './machine-schedule.service.js';

export const getMachineScheduleCalendar = async (req, res) => {
  try {
    const { factory_id, start_date, end_date, is_unassigned } = req.query;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ message: "Missing parameters: start_date, end_date required" });
    }

    const result = await machineScheduleService.getCalendar({
      factory_id,
      start_date,
      end_date,
      is_unassigned,
    });

    res.json(result);
  } catch (error) {
    console.error("Schedule Error:", error);
    res.status(500).json({ message: "Error retrieving timeline schedule", error });
  }
};
