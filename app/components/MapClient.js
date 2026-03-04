'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

const MALAYSIA_CENTER = [101.9758, 4.2105];

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
        isSelected: outlet.id === selectedId ? '1' : '0',
      },
    })),
  };
}

export default function MapClient({ outlets, mapboxToken }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geoJsonRef = useRef({ type: 'FeatureCollection', features: [] });
  const filteredOutletsRef = useRef([]);
  const [scriptReady, setScriptReady] = useState(false);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');

  const availableStates = useMemo(() => {
    const unique = new Set();
    outlets.forEach((outlet) => {
      if (outlet.state) unique.add(outlet.state);
    });
    return ['ALL', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [outlets]);

  const filteredOutlets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return outlets.filter((outlet) => {
      const matchesState = selectedState === 'ALL' || outlet.state === selectedState;
      if (!matchesState) return false;
      if (!query) return true;

      const outletName = outlet.outletName.toLowerCase();
      const franchiseName = outlet.franchiseName.toLowerCase();
      const address = (outlet.address || '').toLowerCase();
      return outletName.includes(query) || franchiseName.includes(query) || address.includes(query);
    });
  }, [outlets, searchQuery, selectedState]);

  const selectedOutlet = useMemo(
    () => filteredOutlets.find((outlet) => outlet.id === selectedOutletId) || null,
    [filteredOutlets, selectedOutletId],
  );

  const geoJson = useMemo(() => buildGeoJson(filteredOutlets, selectedOutletId), [filteredOutlets, selectedOutletId]);
  geoJsonRef.current = geoJson;
  filteredOutletsRef.current = filteredOutlets;

  const focusOutletOnMap = (outlet) => {
    const map = mapRef.current;
    if (!map || !outlet) return;

    map.flyTo({
      center: [outlet.longitude, outlet.latitude],
      zoom: 15,
      duration: 600,
    });
  };

  useEffect(() => {
    if (!selectedOutletId) return;
    const existsInFiltered = filteredOutlets.some((outlet) => outlet.id === selectedOutletId);
    if (!existsInFiltered) setSelectedOutletId('');
  }, [filteredOutlets, selectedOutletId]);

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
        data: geoJsonRef.current,
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
          'circle-color': '#16a34a',
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
          if (id) {
            const outletId = String(id);
            setSelectedOutletId(outletId);

            const outlet = filteredOutletsRef.current.find((item) => item.id === outletId);
            if (outlet) {
              focusOutletOnMap(outlet);
            } else {
              const coordinates = feature?.geometry?.coordinates;
              if (Array.isArray(coordinates) && coordinates.length >= 2) {
                map.flyTo({
                  center: [Number(coordinates[0]), Number(coordinates[1])],
                  zoom: 15,
                  duration: 600,
                });
              }
            }
          }
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
  }, [scriptReady, mapboxToken]);

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

  useEffect(() => {
    if (!selectedOutlet) return;
    const map = mapRef.current;
    if (!map) return;

    const flyToOutlet = () => {
      map.flyTo({
        center: [selectedOutlet.longitude, selectedOutlet.latitude],
        zoom: 15,
        duration: 600,
      });
    };

    if (map.isStyleLoaded()) {
      flyToOutlet();
      return;
    }

    map.once('load', flyToOutlet);
  }, [selectedOutlet]);

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
          Mapped outlets: <strong>{filteredOutlets.length}</strong>
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

      <div className="map-layout" style={{ gap: 12 }}>
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#fff',
            maxHeight: 460,
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: 10, borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              <input
                type="text"
                placeholder="Search merchant by name or location..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                }}
              />
              <select
                value={selectedState}
                onChange={(event) => setSelectedState(event.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  background: '#fff',
                }}
              >
                {availableStates.map((stateValue) => (
                  <option key={stateValue} value={stateValue}>
                    {stateValue === 'ALL' ? 'All States' : stateValue}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredOutlets.map((outlet) => {
            const isSelected = outlet.id === selectedOutletId;
            return (
              <button
                key={outlet.id}
                type="button"
                onClick={() => {
                  setSelectedOutletId(outlet.id);
                  focusOutletOnMap(outlet);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: isSelected ? '#ecfdf5' : '#fff',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  padding: '12px 12px 10px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{outlet.outletName}</div>
                <div style={{ color: '#374151', fontSize: 12, marginTop: 3 }}>{outlet.franchiseName}</div>
                {outlet.state && <div style={{ color: '#047857', fontSize: 12, marginTop: 3 }}>{outlet.state}</div>}
                {outlet.address && (
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4, lineHeight: 1.3 }}>{outlet.address}</div>
                )}
              </button>
            );
          })}

          {filteredOutlets.length === 0 && (
            <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>No outlets found for this search.</div>
          )}
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
      </div>

      <style jsx>{`
        .map-layout {
          display: grid;
          grid-template-columns: minmax(260px, 340px) 1fr;
        }

        @media (max-width: 960px) {
          .map-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

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
