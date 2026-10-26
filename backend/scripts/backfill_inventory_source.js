/**
 * Backfill product_inventory.source_inventory_id cho cac dong xuat kho cu
 * (truoc khi co cot source_inventory_id).
 *
 * Quy tac gan (theo thu tu uu tien):
 *   1. audit: audit_logs (action = EXPORT) co after_data.exported_record_id = id dong xuat
 *      va entity_id = id lo nguon. Dung lo nguon phai cung san pham / cong doan / loai.
 *   2. single: khong co audit, nhung chi co DUNG 1 lo ung vien (cung san pham / cong doan /
 *      loai, duoc tao truoc thoi diem xuat).
 *   3. Con lai (ambiguous / no_candidate): KHONG gan, in ra de kiem tra tay.
 *
 * Cach chay (tu thu muc backend):
 *   babel-node ./scripts/backfill_inventory_source.js            -> chi xem truoc (dry-run)
 *   babel-node ./scripts/backfill_inventory_source.js --apply    -> ghi that, trong transaction
 *
 * Moi dong duoc gan se ghi 1 dong audit_logs voi action = 'BACKFILL_SOURCE'.
 */

import pool from '../src/config/db.js';

const APPLY = process.argv.includes('--apply');

const keyOf = (row) => `${row.product_id}|${row.operation_id ?? 'null'}|${row.inventory_type}`;

// Dong xuat cu: completed_at co gia tri, note bat dau bang 'Xuat kho', chua co lien ket
const LEGACY_EXPORT_WHERE = `
  deleted_at IS NULL
  AND source_inventory_id IS NULL
  AND completed_at IS NOT NULL
  AND note LIKE 'Xuất kho%'
`;

async function loadData(client) {
  const exportsRes = await client.query(`
    SELECT id, product_id, operation_id, inventory_type, quantity, recorded_at
    FROM product_inventory
    WHERE ${LEGACY_EXPORT_WHERE}
    ORDER BY recorded_at
  `);

  // Lo nhap: moi dong chua bi xem la dong xuat cu
  const lotsRes = await client.query(`
    SELECT id, product_id, operation_id, inventory_type, quantity, recorded_at, completed_at, note
    FROM product_inventory
    WHERE deleted_at IS NULL
      AND source_inventory_id IS NULL
      AND NOT (completed_at IS NOT NULL AND note LIKE 'Xuất kho%')
  `);

  const auditRes = await client.query(`
    SELECT entity_id AS source_id,
           (after_data->>'exported_record_id')::int AS export_id,
           id AS audit_id
    FROM audit_logs
    WHERE action = 'EXPORT'
      AND entity = 'ProductInventory'
      AND after_data->>'exported_record_id' IS NOT NULL
  `);

  return {
    exports: exportsRes.rows,
    lots: lotsRes.rows,
    audits: auditRes.rows,
  };
}

function buildPlan({ exports, lots, audits }) {
  const lotById = new Map(lots.map((l) => [l.id, l]));

  const auditByExport = new Map();
  for (const a of audits) {
    if (!auditByExport.has(a.export_id)) auditByExport.set(a.export_id, []);
    auditByExport.get(a.export_id).push(a);
  }

  const lotsByKey = new Map();
  for (const lot of lots) {
    const k = keyOf(lot);
    if (!lotsByKey.has(k)) lotsByKey.set(k, []);
    lotsByKey.get(k).push(lot);
  }

  const linked = [];
  const ambiguous = [];
  const noCandidate = [];

  for (const exp of exports) {
    const exportKey = keyOf(exp);
    const exportTime = new Date(exp.recorded_at).getTime();

    // 1. Audit
    const auditRows = auditByExport.get(exp.id) || [];
    const auditSources = [...new Set(auditRows.map((a) => a.source_id))];

    if (auditSources.length > 1) {
      ambiguous.push({ export: exp, reason: 'audit co nhieu lo nguon', candidates: auditSources });
      continue;
    }

    if (auditSources.length === 1) {
      const src = lotById.get(auditSources[0]);
      if (src && keyOf(src) === exportKey) {
        linked.push({ export: exp, sourceId: src.id, method: 'audit' });
        continue;
      }
      // Audit tro den lo khong hop le (khac san pham/cong doan) -> khong tin, xem tay
      ambiguous.push({ export: exp, reason: 'audit tro den lo khong khop', candidates: auditSources });
      continue;
    }

    // 2. Single candidate
    const candidates = (lotsByKey.get(exportKey) || []).filter(
      (lot) => lot.id !== exp.id && new Date(lot.recorded_at).getTime() <= exportTime
    );

    if (candidates.length === 1) {
      linked.push({ export: exp, sourceId: candidates[0].id, method: 'single' });
    } else if (candidates.length === 0) {
      noCandidate.push({ export: exp });
    } else {
      ambiguous.push({
        export: exp,
        reason: 'nhieu lo ung vien, khong co audit',
        candidates: candidates.map((c) => c.id),
      });
    }
  }

  return { linked, ambiguous, noCandidate };
}

function printReport({ linked, ambiguous, noCandidate }, total) {
  console.log(`\nTong so dong xuat cu can xu ly: ${total}`);
  console.log(`  Gan duoc: ${linked.length} (audit: ${linked.filter((x) => x.method === 'audit').length}, single: ${linked.filter((x) => x.method === 'single').length})`);
  console.log(`  Mo ho (can kiem tra tay): ${ambiguous.length}`);
  console.log(`  Khong tim thay lo: ${noCandidate.length}`);

  if (linked.length) {
    console.log('\n--- Se gan ---');
    for (const x of linked) {
      console.log(`  export #${x.export.id} (SL ${x.export.quantity}) -> lo #${x.sourceId} [${x.method}]`);
    }
  }
  if (ambiguous.length) {
    console.log('\n--- Mo ho ---');
    for (const x of ambiguous) {
      console.log(`  export #${x.export.id} (SL ${x.export.quantity}, ${x.export.recorded_at}): ${x.reason}; ung vien: ${x.candidates.join(', ')}`);
    }
  }
  if (noCandidate.length) {
    console.log('\n--- Khong co lo ---');
    for (const x of noCandidate) {
      console.log(`  export #${x.export.id} (SL ${x.export.quantity}, ${x.export.recorded_at})`);
    }
  }
}

async function applyPlan(client, linked) {
  await client.query('BEGIN');
  try {
    let updated = 0;
    for (const x of linked) {
      const res = await client.query(
        `UPDATE product_inventory
         SET source_inventory_id = $1
         WHERE id = $2 AND source_inventory_id IS NULL AND deleted_at IS NULL
         RETURNING id`,
        [x.sourceId, x.export.id]
      );
      if (res.rowCount === 0) continue;
      updated += 1;

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
         VALUES (NULL, 'BACKFILL_SOURCE', 'ProductInventory', $1, $2, $3)`,
        [
          x.export.id,
          JSON.stringify({ source_inventory_id: null }),
          JSON.stringify({ source_inventory_id: x.sourceId, method: x.method }),
        ]
      );
    }
    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const client = await pool.connect();
  try {
    console.log(APPLY ? 'Che do: APPLY (ghi that)' : 'Che do: DRY-RUN (chi xem truoc, khong ghi)');

    const data = await loadData(client);
    const plan = buildPlan(data);
    printReport(plan, data.exports.length);

    if (!APPLY) {
      console.log('\nDry-run: khong ghi gi vao DB. Chay lai voi --apply de ghi.');
      return;
    }

    const updated = await applyPlan(client, plan.linked);
    console.log(`\nDa gan ${updated} dong. Da ghi audit_logs (BACKFILL_SOURCE).`);
  } catch (err) {
    console.error('Backfill that bai, da ROLLBACK:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
