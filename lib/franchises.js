import { getPool } from '@/lib/db';
import { buildOutletMapRecords } from '@/lib/outlet-map-records';

export async function listAllCachedFranchises() {
  const sql = `
    SELECT
      fid,
      is_active,
      franchise_name,
      franchise_json,
      outlets_json,
      outlet_count,
      import_index
    FROM franchise_cache
    WHERE is_active = 1
      AND outlet_count >= 1
    ORDER BY import_index ASC, franchise_name ASC
  `;

  const [rows] = await getPool().query(sql);
  return rows;
}

export async function listAllOutletMapRecords() {
  const rows = await listAllCachedFranchises();
  return buildOutletMapRecords(rows);
}
