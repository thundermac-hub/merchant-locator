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

export default async function HomePage() {
  let outletRecords = [];
  let errorMessage = '';
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  try {
    const rows = await listAllCachedFranchises();
    outletRecords = buildOutletMapRecords(rows);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  }

  return (
    <main style={{ padding: '0 16px 40px' }}>
      <section style={cardStyle}>
        <header style={{ padding: '24px 24px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28 }}>Merchant Locator</h1>
              <p style={{ margin: '8px 0 0', color: '#4b5563' }}>
                Browse active merchant outlets on an interactive map.
              </p>
            </div>
            <img src="/logo.png" alt="Slurp logo" style={{ width: 140, height: 'auto', objectFit: 'contain' }} />
          </div>
        </header>

        {errorMessage ? (
          <div style={{ margin: 24, padding: 16, borderRadius: 8, background: '#fee2e2', color: '#7f1d1d' }}>
            <strong>Could not load data from MySQL.</strong>
            <div style={{ marginTop: 8, fontFamily: 'monospace' }}>{errorMessage}</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '0 24px 16px', color: '#374151' }}>
              Total outlets: <strong>{outletRecords.length}</strong>
            </div>

            <MapClient outlets={outletRecords} mapboxToken={mapboxToken} />
          </>
        )}
      </section>
    </main>
  );
}
