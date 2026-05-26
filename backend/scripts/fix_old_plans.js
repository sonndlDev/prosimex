import pool from "../src/config/db.js";

async function fixOldPlans() {
  try {
    console.log("Fetching all orders and their plans...");

    // Get all orders with planned status or any order that has plans
    const plansRes = await pool.query(`
      SELECT 
       pp.id as plan_id,
       pp.order_id,
       pp.product_group_operation_id,
       pp.product_id,
       pp.remaining_quantity,
       pp.dinh_muc,
       pp.total_required_work
      FROM production_plans pp
    `);

    const plans = plansRes.rows;

    // Group plans by their uniqueness constraint so we can fix them together
    // For single product per order or case 2 (full order mode, which uses product_id)
    const groups = {};
    for (const plan of plans) {
      const key = `${plan.order_id}_${plan.product_group_operation_id || ""}_${plan.product_id || ""}`;
      if (!groups[key]) {
        groups[key] = {
          order_id: plan.order_id,
          remaining_quantity: parseFloat(plan.remaining_quantity || 0),
          dinh_muc: parseFloat(plan.dinh_muc || 1),
          plans: [],
        };
      }
      groups[key].plans.push(plan);
    }

    let fixedGroupsCount = 0;

    for (const key in groups) {
      const group = groups[key];
      const targetQty = group.remaining_quantity;
      // Target hours in exact precision
      const targetHours = (targetQty / group.dinh_muc) * 8;

      let currentTotalHours = 0;
      let lastDay = null;

      // Loop all plans in this group to calculate exact sum of hours
      for (const plan of group.plans) {
        const daysRes = await pool.query(
          "SELECT * FROM production_plan_days WHERE production_plan_id = $1 ORDER BY working_date ASC",
          [plan.plan_id],
        );

        for (const day of daysRes.rows) {
          currentTotalHours += parseFloat(day.planned_work_quantity);
          lastDay = day; // Keep track of the very last day across all plans in the group
        }
      }

      // Find the discrepancy
      const diff = targetHours - currentTotalHours;

      // If discrepancy is more than a tiny rounding artifact
      if (Math.abs(diff) > 0.000001 && lastDay) {
        console.log(
          `Fixing Group ${key}: Target ${targetHours} vs Current ${currentTotalHours} (Diff: ${diff})`,
        );

        // Adjust the last day
        const newValue = parseFloat(lastDay.planned_work_quantity) + diff;

        await pool.query(
          "UPDATE production_plan_days SET planned_work_quantity = $1 WHERE production_plan_id = $2 AND working_date = $3",
          [newValue, lastDay.production_plan_id, lastDay.working_date],
        );

        // Also optionally adjust the plan's total_required_work
        await pool.query(
          "UPDATE production_plans SET total_required_work = total_required_work + $1 WHERE id = $2",
          [diff, lastDay.production_plan_id],
        );

        fixedGroupsCount++;
      }
    }

    console.log(`Scan complete! Fixed ${fixedGroupsCount} groups of plans.`);
  } catch (e) {
    console.error("Error fixing old plans:", e);
  } finally {
    await pool.end();
  }
}

fixOldPlans();
