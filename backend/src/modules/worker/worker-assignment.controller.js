import { workerAssignmentService } from './worker-assignment.service.js';
import { updateAssignments as updateAssignmentsLegacy } from './__legacy__/worker-assignment.controller.legacy.js';

export const getAssignments = async (req, res) => {
  try {
    const { production_plan_id, working_date } = req.query;
    const rows = await workerAssignmentService.getAssignments({ production_plan_id, working_date });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving worker assignments', error: error.message });
  }
};

export const updateAssignments = updateAssignmentsLegacy;
