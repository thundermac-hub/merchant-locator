const MALAYSIA_CENTER = [101.9758, 4.2105];

function parseJsonSafe(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function pickFirst(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function asLowerText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
}

function parseBoolean(value) {
  const text = asLowerText(value);
  if (!text) return false;
  return text === '1' || text === 'true' || text === 'yes' || text === 'y';
}

function parseGoogleMapsUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return { lat: null, lng: null };

  const url = rawUrl.trim();

  const qMatch = url.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  if (qMatch) {
    return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
  }

  const atMatch = url.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  }

  const dMatch = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dMatch) {
    return { lat: Number(dMatch[1]), lng: Number(dMatch[2]) };
  }

  return { lat: null, lng: null };
}

function isValidCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function isFranchiseFilteredOut(franchise) {
  if (Number(franchise.is_active) !== 1) return true;
  if (Number(franchise.outlet_count) < 1) return true;

  const franchiseMeta = parseJsonSafe(franchise.franchise_json) || {};

  const franchiseName = asLowerText(franchise.franchise_name);
  const statusText = asLowerText(
    pickFirst(franchise, ['status', 'franchise_status']) || pickFirst(franchiseMeta, ['status', 'state', 'franchise_status']),
  );

  const isTest =
    parseBoolean(pickFirst(franchise, ['is_test', 'test'])) ||
    parseBoolean(pickFirst(franchiseMeta, ['is_test', 'test', 'isTest'])) ||
    franchiseName.includes('test');

  const isClosed =
    parseBoolean(pickFirst(franchise, ['is_closed', 'closed'])) ||
    parseBoolean(pickFirst(franchiseMeta, ['is_closed', 'closed', 'isClosed'])) ||
    statusText === 'closed';

  return isTest || isClosed;
}

function parseOutletList(outletsJson) {
  const parsed = parseJsonSafe(outletsJson);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;

  const candidates = ['data', 'outlets', 'stores', 'items', 'results'];
  for (const key of candidates) {
    const value = parsed[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      for (const nestedKey of candidates) {
        if (Array.isArray(value[nestedKey])) return value[nestedKey];
      }
    }
  }

  return [];
}

function isEffectivelyEmptyOutlet(outlet) {
  const keys = [
    'id',
    'oid',
    'outlet_id',
    'store_id',
    'name',
    'outlet_name',
    'store_name',
    'title',
    'address',
    'full_address',
    'location',
    'street',
    'mapsUrl',
    'maps_url',
    'googleMapsUrl',
    'google_maps_url',
    'url',
    'link',
    'latitude',
    'lat',
    'longitude',
    'lng',
    'lon',
    'long',
    'validUntil',
    'valid_until',
    'validFrom',
    'valid_from',
    'expires_at',
    'expiry_date',
  ];

  return keys.every((key) => {
    const value = outlet?.[key];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

function buildOutletRecord(franchise, outlet, index) {
  if (isEffectivelyEmptyOutlet(outlet)) return null;

  const mapsUrl = pickFirst(outlet, ['mapsUrl', 'maps_url', 'googleMapsUrl', 'google_maps_url', 'url', 'link']);

  const latDirect = Number(pickFirst(outlet, ['latitude', 'lat']));
  const lngDirect = Number(pickFirst(outlet, ['longitude', 'lng', 'lon', 'long']));
  const parsedFromUrl = parseGoogleMapsUrl(mapsUrl);

  const lat = Number.isFinite(latDirect) ? latDirect : parsedFromUrl.lat;
  const lng = Number.isFinite(lngDirect) ? lngDirect : parsedFromUrl.lng;

  if (!isValidCoordinate(lat, lng)) return null;

  const validUntil = pickFirst(outlet, ['validUntil', 'valid_until', 'expires_at', 'expiry_date']);

  const outletId = String(pickFirst(outlet, ['id', 'oid', 'outlet_id', 'store_id']) || `${franchise.fid}-${index}`);

  return {
    id: `${franchise.fid}-${outletId}`,
    outletId,
    fid: franchise.fid,
    franchiseName: franchise.franchise_name || 'Unknown Franchise',
    outletName: pickFirst(outlet, ['name', 'outlet_name', 'store_name', 'title']) || `Outlet ${index + 1}`,
    address: pickFirst(outlet, ['address', 'full_address', 'location', 'street']),
    validUntil,
    latitude: lat,
    longitude: lng,
    googleMapsUrl: mapsUrl || '',
  };
}

export function buildOutletMapRecords(franchises) {
  const records = [];

  for (const franchise of franchises) {
    if (isFranchiseFilteredOut(franchise)) continue;

    const outlets = parseOutletList(franchise.outlets_json);
    outlets.forEach((outlet, index) => {
      const record = buildOutletRecord(franchise, outlet, index);
      if (record) records.push(record);
    });
  }

  return records;
}

export { MALAYSIA_CENTER };
