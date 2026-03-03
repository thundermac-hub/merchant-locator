import { NextResponse } from 'next/server';
import { listAllCachedFranchises } from '@/lib/franchises';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await listAllCachedFranchises();
    return NextResponse.json({ ok: true, count: rows.length, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
