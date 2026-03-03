'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

const MALAYSIA_CENTER = [101.9758, 4.2105];

function statusFromValidUntil(validUntil) {
  if (!validUntil) return 'active';

  const now = Date.now();
  const expiry = new Date(validUntil).getTime();
  if (!Number.isFinite(expiry)) return 'active';

  const dayMs = 24 * 60 * 60 * 1000;
  const diff = expiry - now;

  if (diff < 0) return 'expired';
  if (diff <= 30 * dayMs) return 'expiring';
  return 'active';
}

function getMapbox() {
  if (typeof window === 'undefined') return null;
  return window.mapboxgl || null;
}

function buildGeoJson(outlets, selectedId) {
  return {
    type: 'FeatureCollection',
    features: outlets.map((outlet) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [outlet.longitude, outlet.latitude],
      },
      properties: {
        id: outlet.id,
        outletName: outlet.outletName,
        franchiseName: outlet.franchiseName,
        address: outlet.address,
        googleMapsUrl: outlet.googleMapsUrl,
        status: statusFromValidUntil(outlet.validUntil),
        isSelected: outlet.id === selectedId ? '1' : '0',
      },
    })),
  };
}

export default function MapClient({ outlets, mapboxToken }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [selectedOutletId, setSelectedOutletId] = useState('');

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedOutletId) || null,
    [outlets, selectedOutletId],
  );

  const geoJson = useMemo(() => buildGeoJson(outlets, selectedOutletId), [outlets, selectedOutletId]);

  useEffect(() => {
    if (getMapbox()) setScriptReady(true);
  }, []);

  useEffect(() => {
    if (!scriptReady || !mapboxToken || !mapContainerRef.current || mapRef.current) return;

    const mapboxgl = getMapbox();
    if (!mapboxgl) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: MALAYSIA_CENTER,
      zoom: 5,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: { around: 'center' },
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('outlets', {
        type: 'geojson',
        data: geoJson,
      });

      map.addLayer({
        id: 'outlets-halo',
        type: 'circle',
        source: 'outlets',
        paint: {
          'circle-radius': 12,
          'circle-color': '#ffffff',
          'circle-opacity': 0.65,
        },
      });

      map.addLayer({
        id: 'outlets-main',
        type: 'circle',
        source: 'outlets',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'isSelected'], '1'], 8, 6],
          'circle-color': [
            'match',
            ['get', 'status'],
            'active',
            '#16a34a',
            'expiring',
            '#ea580c',
            'expired',
            '#dc2626',
            '#2563eb',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'outlets-icon',
        type: 'symbol',
        source: 'outlets',
        layout: {
          'icon-image': 'shop-15',
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      const clickableLayers = ['outlets-main', 'outlets-icon'];

      clickableLayers.forEach((layerId) => {
        map.on('click', layerId, (event) => {
          const feature = event.features?.[0];
          const id = feature?.properties?.id;
          if (id) setSelectedOutletId(String(id));
        });

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [scriptReady, mapboxToken, geoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('outlets');
    if (!source || typeof source.setData !== 'function') return;

    source.setData(geoJson);

    if (!geoJson.features.length || selectedOutletId) return;

    if (geoJson.features.length === 1) {
      const point = geoJson.features[0].geometry.coordinates;
      map.flyTo({ center: point, zoom: 12, duration: 600 });
      return;
    }

    const bounds = geoJson.features.reduce((acc, feature) => {
      acc.extend(feature.geometry.coordinates);
      return acc;
    }, new window.mapboxgl.LngLatBounds());

    map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 700 });
  }, [geoJson, selectedOutletId]);

  const canInteract = Boolean(mapboxToken);

  return (
    <section style={{ padding: '0 24px 24px' }}>
      <Script
        src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#374151', fontSize: 14 }}>
          Mapped outlets: <strong>{outlets.length}</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            disabled={!canInteract}
            style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, width: 36, height: 36, fontSize: 20 }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            disabled={!canInteract}
            style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, width: 36, height: 36, fontSize: 20 }}
          >
            -
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: 460, background: '#e5e7eb' }} />

        {!mapboxToken && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.9)',
              color: '#7f1d1d',
              fontWeight: 600,
              padding: 16,
              textAlign: 'center',
            }}
          >
            Mapbox token is missing. Set <code style={{ marginLeft: 6 }}>NEXT_PUBLIC_MAPBOX_TOKEN</code> in `.env`.
          </div>
        )}
      </div>

      {selectedOutlet && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <strong>{selectedOutlet.outletName}</strong>
          <div style={{ color: '#374151', marginTop: 4 }}>{selectedOutlet.franchiseName}</div>
          {selectedOutlet.address && <div style={{ color: '#4b5563', marginTop: 4 }}>{selectedOutlet.address}</div>}
          {selectedOutlet.googleMapsUrl && (
            <a href={selectedOutlet.googleMapsUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', marginTop: 6, display: 'inline-block' }}>
              Open in Google Maps
            </a>
          )}
        </div>
      )}
    </section>
  );
}
