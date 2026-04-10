/**
 * Test script: Chạy trực tiếp worker để kiểm tra logic tạo phiếu
 * Usage: npx babel-node scripts/test_auto_ticket.js [YYYY-MM-DD]
 */
import { generateDailyTickets } from '../src/workers/dailyTicketWorker.js';
import pool from '../src/config/db.js';

const targetDate = process.argv[2] || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

console.log(`\n====================================`);
console.log(` Test Auto Ticket — Date: ${targetDate}`);
console.log(`====================================\n`);

async function run() {
  try {
    const result = await generateDailyTickets(targetDate);
    console.log('\n✅ Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
