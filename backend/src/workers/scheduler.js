import cron from "node-cron";
import { generateDailyTickets } from "./dailyTicketWorker.js";
import { createTestOperation } from "./testJob.js";

/**
 * Scheduler: Runs the daily ticket auto-generation at 00:10 every day
 * in Asia/Ho_Chi_Minh timezone.
 *
 * Cron expression: "10 0 * * *"
 *   - 10  → minute 10
 *   - 0   → hour 00
 *   - *   → every day of month
 *   - *   → every month
 *   - *   → every day of week
 */
export function startScheduler() {
  const CRON_EXPRESSION = "10 0 * * *";

  cron.schedule(
    CRON_EXPRESSION,
    async () => {
      // Derive today's date in Vietnam timezone (YYYY-MM-DD)
      const targetDate = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
      });

      console.log(
        `[Scheduler] Triggered at ${new Date().toISOString()} — generating tickets for ${targetDate}`
      );

      try {
        const result = await generateDailyTickets(targetDate);
        console.log(
          `[Scheduler] Completed: created=${result.created}, skipped=${result.skipped}, ids=${result.ticketIds}`
        );
      } catch (error) {
        console.error("[Scheduler] Auto-generation FAILED:", error);
      }
    },
    {
      timezone: "Asia/Ho_Chi_Minh",
    }
  );

  console.log(
    "[Scheduler] Daily ticket scheduler initialized — will run at 00:10 Asia/Ho_Chi_Minh every day."
  );

  // Test Job: Chạy mỗi 5 phút
  // cron.schedule("*/5 * * * *", async () => {
  //   console.log(`[Scheduler] Triggered Test Job at ${new Date().toISOString()}`);
  //   await createTestOperation();
  // });

  // console.log("[Scheduler] Test Job initialized — will run every 5 minutes.");
}
