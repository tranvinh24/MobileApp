const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function overpassRequest(query) {
  const body = 'data=' + encodeURIComponent(query);
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const text = await res.text();
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json') && !text.trim().startsWith('{')) continue;
      const json = JSON.parse(text);
      if (json && typeof json.elements !== 'undefined') return json;
    } catch (_) {}
  }
  return null;
}

export async function searchNearbyPharmacies(lat, lng, radiusM = 5000, limit = 10) {
  const query = `[out:json][timeout:15];(node["amenity"="pharmacy"](around:${radiusM},${lat},${lng});way["amenity"="pharmacy"](around:${radiusM},${lat},${lng}););out center;`;
  try {
    const json = await overpassRequest(query);
    if (!json) return [];
    const elements = json.elements || [];
    const results = [];
    for (const el of elements) {
      const name = el.tags?.name || 'Nhà thuốc';
      let addr = el.tags?.['addr:street'] || el.tags?.['addr:full'] || '';
      if (el.tags?.['addr:housenumber']) addr = (el.tags['addr:housenumber'] + ' ' + addr).trim();
      const phone = el.tags?.phone || el.tags?.['contact:phone'] || null;
      const elat = el.lat ?? el.center?.lat;
      const elon = el.lon ?? el.center?.lon;
      const dist = elat && elon ? haversine(lat, lng, elat, elon) : 999;
      const mapsUrl = elat != null && elon != null ? `https://www.google.com/maps?q=${elat},${elon}` : null;
      results.push({ name, address: addr || 'Không có địa chỉ', phone, lat: elat, lng: elon, mapsUrl, distance: Math.round(dist * 1000) / 1000 });
    }
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, limit);
  } catch (e) {
    console.warn('Pharmacy search error:', e);
    return [];
  }
}

export async function searchNearbyHospitals(lat, lng, radiusM = 5000, limit = 10) {
  const query = `[out:json][timeout:15];(node["amenity"="hospital"](around:${radiusM},${lat},${lng});way["amenity"="hospital"](around:${radiusM},${lat},${lng});node["amenity"="clinic"](around:${radiusM},${lat},${lng});way["amenity"="clinic"](around:${radiusM},${lat},${lng}););out center;`;
  try {
    const json = await overpassRequest(query);
    if (!json) return [];
    const elements = json.elements || [];
    const results = [];
    for (const el of elements) {
      const name = el.tags?.name || (el.tags?.amenity === 'hospital' ? 'Bệnh viện' : 'Phòng khám');
      let addr = el.tags?.['addr:street'] || el.tags?.['addr:full'] || '';
      if (el.tags?.['addr:housenumber']) addr = (el.tags['addr:housenumber'] + ' ' + addr).trim();
      const phone = el.tags?.phone || el.tags?.['contact:phone'] || null;
      const elat = el.lat ?? el.center?.lat;
      const elon = el.lon ?? el.center?.lon;
      const dist = elat && elon ? haversine(lat, lng, elat, elon) : 999;
      const mapsUrl = elat != null && elon != null ? `https://www.google.com/maps?q=${elat},${elon}` : null;
      results.push({ name, address: addr || 'Không có địa chỉ', phone, lat: elat, lng: elon, mapsUrl, distance: Math.round(dist * 1000) / 1000 });
    }
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, limit);
  } catch (e) {
    console.warn('Hospital search error:', e);
    return [];
  }
}
