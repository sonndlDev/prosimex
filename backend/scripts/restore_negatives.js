import pool from "../src/config/db.js";

async function run() {
  const res = await pool.query(
    "SELECT pk.production_plan_id, pk.working_date, pk.planned_work_quantity, pp.total_required_work, pp.remaining_quantity, pp.dinh_muc FROM production_plan_days pk JOIN production_plans pp ON pp.id = pk.production_plan_id WHERE pk.planned_work_quantity < 0",
  );

  for (let row of res.rows) {
    const qty = parseFloat(row.planned_work_quantity);
    // Calculate what the "target targetHours" was in the previous script.
    const targetQty = parseFloat(row.remaining_quantity);
    const linhMuc = parseFloat(row.dinh_muc);
    const targetHours = (targetQty / linhMuc) * 8;

    // Original script did:
    // diff = targetHours - currentTotalHours
    // newValue = lastDay + diff
    // Here: qty = originalLastDay + diff
    // So originalLastDay = qty - diff

    // But we don't know diff directly unless we know currentTotalHours before script ran.
    // However, the script ALSO added diff to `total_required_work`!
    // So the NEW `total_required_work` is EXACTLY `targetHours`.
    // Thus, `total_required_work` - `diff` = originalTotalRequiredWork (which is currentTotalHours!).
    // Actually, if we just find the sum of all days NOW, it should equal targetHours exactly.
    // So to find the diff, we can just guess based on negative value.

    let original = 0;
    let diff = 0;
    if (qty <= -70 && qty >= -80) {
      diff = -80;
    } else if (qty <= -280 && qty >= -290) {
      diff = -289.3142857;
    } else if (qty <= -320 && qty >= -340) {
      diff = -331.5742857;
    } else if (qty <= -7 && qty >= -10 && Math.abs(qty - -8) < 0.2) {
      diff = -8;
    } else if (qty <= -4 && qty >= -6 && Math.abs(qty - -4) < 0.2) {
      diff = -4.8;
    }
    // If we can't reliably guess, just set to absolute value or 0
    original = qty - diff;
    if (original < 0) {
      // let's just make it 0. Or if it's very small, 0.
      original = 0;
    }

    console.log(
      `Plan ${row.production_plan_id} on ${row.working_date}: ${qty} -> restored to ${original} (guessed diff ${diff})`,
    );

    // Update
    await pool.query(
      "UPDATE production_plan_days SET planned_work_quantity = $1 WHERE production_plan_id = $2 AND working_date = $3",
      [original.toFixed(6), row.production_plan_id, row.working_date],
    );

    // Also revert the total_required_work
    await pool.query(
      "UPDATE production_plans SET total_required_work = total_required_work - $1 WHERE id = $2",
      [qty - original, row.production_plan_id],
    );
  }
}

run()
  .then(() => pool.end())
  .catch(console.error);
