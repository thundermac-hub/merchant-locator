import MapClient from '@/app/components/MapClient';
import { listAllCachedFranchises } from '@/lib/franchises';
import { buildOutletMapRecords } from '@/lib/outlet-map-records';

export const dynamic = 'force-dynamic';

const cardStyle = {
  maxWidth: 1100,
  margin: '40px auto',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
  overflow: 'hidden',
};

const tableCell = {
  padding: '12px 14px',
  borderBottom: '1px solid #eceff3',
  textAlign: 'left',
  fontSize: 14,
};

export default async function HomePage() {
  let rows = [];
  let outletRecords = [];
  let errorMessage = '';
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  try {
    rows = await listAllCachedFranchises();
    outletRecords = buildOutletMapRecords(rows);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  }

  const outletCountByFid = outletRecords.reduce((acc, outlet) => {
    const key = String(outlet.fid);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filteredRows = rows.filter((row) => outletCountByFid[String(row.fid)] > 0);

  return (
    <main style={{ padding: '0 16px 40px' }}>
      <section style={cardStyle}>
        <header style={{ padding: '24px 24px 10px' }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Merchant Locator</h1>
          <p style={{ margin: '8px 0 0', color: '#4b5563' }}>
            Data captured from MySQL table: <code>franchise_cache</code>
          </p>
        </header>

        {errorMessage ? (
          <div style={{ margin: 24, padding: 16, borderRadius: 8, background: '#fee2e2', color: '#7f1d1d' }}>
            <strong>Could not load data from MySQL.</strong>
            <div style={{ marginTop: 8, fontFamily: 'monospace' }}>{errorMessage}</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '0 24px 16px', color: '#374151' }}>
              Total franchises: <strong>{filteredRows.length}</strong>
            </div>

            <MapClient outlets={outletRecords} mapboxToken={mapboxToken} />

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={tableCell}>FID</th>
                    <th style={tableCell}>Franchise Name</th>
                    <th style={tableCell}>Outlet Count</th>
                    <th style={tableCell}>Import Index</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={`${row.fid}-${row.import_index}`}>
                      <td style={tableCell}>{row.fid}</td>
                      <td style={tableCell}>{row.franchise_name}</td>
                      <td style={tableCell}>{outletCountByFid[String(row.fid)] || 0}</td>
                      <td style={tableCell}>{row.import_index}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
