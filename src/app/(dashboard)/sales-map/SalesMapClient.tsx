'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getStaffClients } from '@/lib/api';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { LatLngBoundsExpression, LayerGroup, Map as LeafletMap } from 'leaflet';
import type { Topology } from 'topojson-specification';
import { feature as topojsonFeature } from 'topojson-client';

const spainCenter: [number, number] = [40.4168, -3.7038];
const minMapZoom = 6;
const softSpainBounds: LatLngBoundsExpression = [
  [33.2, -12.4],
  [45.4, 6.4],
];
const geocodeCachePrefix = 'ronda-sales-map-geocode:v1:';

type RestaurantMarker = {
  id: string;
  clientName: string;
  restaurantName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
};

type RestaurantSearchItem = Omit<RestaurantMarker, 'lat' | 'lng'>;

type SearchResult = {
  lat: number;
  lng: number;
  label: string;
  popupHtml: string;
};

type AdminProperties = {
  name?: string;
  noml_ccaa?: string;
};

function getFeatureName(feature: Feature<Geometry, AdminProperties>) {
  return feature.properties?.name || feature.properties?.noml_ccaa || 'Zona sin nombre';
}

function normalizeName(value: string) {
  return value
    .toLocaleLowerCase('es-ES')
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-ES'));
}

async function loadTopoJsonFeatureCollection(path: string, objectName: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se ha podido cargar ${path}: ${response.status}`);
  const topology = (await response.json()) as Topology;
  return topojsonFeature(topology, topology.objects[objectName]) as FeatureCollection<Geometry, AdminProperties>;
}

function pointInRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonGeometry(lng: number, lat: number, geometry: Polygon | MultiPolygon) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => {
    const [outerRing, ...holes] = polygon;
    return pointInRing(lng, lat, outerRing) && !holes.some((hole) => pointInRing(lng, lat, hole));
  });
}

function getMarkerCommunity(marker: RestaurantMarker, communities: FeatureCollection<Geometry, AdminProperties>) {
  const community = communities.features.find((communityFeature) => {
    if (communityFeature.geometry.type !== 'Polygon' && communityFeature.geometry.type !== 'MultiPolygon') return false;
    return pointInPolygonGeometry(marker.lng, marker.lat, communityFeature.geometry);
  });
  return community ? normalizeName(getFeatureName(community)) : 'Sin comunidad';
}

function geocodeCacheKey(address: string, city: string) {
  return `${geocodeCachePrefix}${address.trim().toLocaleLowerCase('es-ES')}|${city.trim().toLocaleLowerCase('es-ES')}`;
}

function readCachedGeocode(address: string, city: string) {
  try {
    const cached = localStorage.getItem(geocodeCacheKey(address, city));
    if (!cached) return null;
    const parsed = JSON.parse(cached) as { lat?: unknown; lng?: unknown };
    return typeof parsed.lat === 'number' && typeof parsed.lng === 'number' ? { lat: parsed.lat, lng: parsed.lng, cached: true } : null;
  } catch {
    return null;
  }
}

function writeCachedGeocode(address: string, city: string, lat: number, lng: number) {
  try {
    localStorage.setItem(geocodeCacheKey(address, city), JSON.stringify({ lat, lng }));
  } catch {
    // Cache is optional; markers still work without localStorage.
  }
}

async function geocodeAddress(address: string, city: string) {
  const cached = readCachedGeocode(address, city);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'es',
    q: `${address}, ${city}, Spain`,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const first = results[0];
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  writeCachedGeocode(address, city, lat, lng);
  return { lat, lng, cached: false };
}

async function geocodeSearchResults(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'es',
    addressdetails: '1',
    bounded: '1',
    viewbox: '-9.7,43.9,4.4,35.8',
    q: `${query}, Spain`,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) return [];
  const results = (await response.json()) as Array<{ display_name?: string; lat?: string; lon?: string }>;
  return results.flatMap((result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const label = result.display_name || query;
    return [
      {
        lat,
        lng,
        label,
        popupHtml: `<strong>${escapeHtml(query)}</strong><br>${escapeHtml(label)}`,
      },
    ];
  });
}

function getSearchText(marker: RestaurantSearchItem) {
  return `${marker.restaurantName} ${marker.clientName} ${marker.address} ${marker.city}`.toLocaleLowerCase('es-ES');
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function SalesMapClient() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const searchLayerRef = useRef<LayerGroup | null>(null);
  const markerDataRef = useRef<RestaurantMarker[]>([]);
  const restaurantSearchRef = useRef<RestaurantSearchItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function mountMap() {
      if (!mapNodeRef.current || mapRef.current) return;

      try {
        const L = await import('leaflet');
        if (disposed || !mapNodeRef.current) return;

        const map = L.map(mapNodeRef.current, {
          center: spainCenter,
          zoom: minMapZoom,
          minZoom: minMapZoom,
          maxZoom: 20,
          maxBounds: softSpainBounds,
          maxBoundsViscosity: 0.55,
          zoomControl: false,
        });
        mapRef.current = map;

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxNativeZoom: 20,
          maxZoom: 20,
        }).addTo(map);

        L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
        map.setView(spainCenter, minMapZoom);

        const communities = await loadTopoJsonFeatureCollection('/geo/spain/autonomous_regions.topojson', 'autonomous_regions');
        if (disposed) {
          map.remove();
          return;
        }

        const pinIcon = L.divIcon({
          className: 'sales-map-client-pin-wrapper',
          html: `
            <svg class="sales-map-client-pin" viewBox="0 0 36 48" aria-hidden="true">
              <path d="M18 46C15.4 42.1 5 29.4 5 17.4C5 9.7 10.8 3.5 18 3.5s13 6.2 13 13.9C31 29.4 20.6 42.1 18 46Z" />
              <text x="18" y="18.2" text-anchor="middle">R</text>
            </svg>
          `,
          iconSize: [36, 48],
          iconAnchor: [18, 46],
          popupAnchor: [0, -42],
        });

        const getClusterGridSize = () => {
          const zoom = map.getZoom();
          if (zoom >= 15) return 0;
          if (zoom >= 13) return 44;
          if (zoom >= 11) return 58;
          if (zoom >= 9) return 76;
          return 98;
        };

        const createClusterIcon = (count: number) =>
          L.divIcon({
            className: 'sales-map-cluster-pin-wrapper',
            html: `
              <svg class="sales-map-cluster-pin" viewBox="0 0 36 48" aria-hidden="true">
                <path d="M18 46C15.4 42.1 5 29.4 5 17.4C5 9.7 10.8 3.5 18 3.5s13 6.2 13 13.9C31 29.4 20.6 42.1 18 46Z" />
                <text x="18" y="18.2" text-anchor="middle">${count}</text>
              </svg>
            `,
            iconSize: [36, 48],
            iconAnchor: [18, 46],
            popupAnchor: [0, -42],
          });

        const markerLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markerLayer;
        searchLayerRef.current = L.layerGroup().addTo(map);

        const addRestaurantMarker = (marker: RestaurantMarker) =>
          L.marker([marker.lat, marker.lng], { icon: pinIcon })
            .bindPopup(
              `<strong>${escapeHtml(marker.restaurantName)}</strong><br>${escapeHtml(marker.clientName)}<br>${escapeHtml(marker.address)}<br>${escapeHtml(marker.city)}`,
              { className: 'sales-map-client-popup' },
            )
            .addTo(markerLayer);

        const renderMarkerLayer = () => {
          markerLayer.clearLayers();
          const markers = markerDataRef.current;

          if (map.getZoom() <= minMapZoom) {
            const communityBuckets = new Map<string, RestaurantMarker[]>();
            markers.forEach((marker) => {
              const communityName = getMarkerCommunity(marker, communities);
              const bucket = communityBuckets.get(communityName);
              if (bucket) bucket.push(marker);
              else communityBuckets.set(communityName, [marker]);
            });

            communityBuckets.forEach((bucket, communityName) => {
              if (bucket.length === 1) {
                addRestaurantMarker(bucket[0]);
                return;
              }

              const lat = bucket.reduce((sum, marker) => sum + marker.lat, 0) / bucket.length;
              const lng = bucket.reduce((sum, marker) => sum + marker.lng, 0) / bucket.length;
              L.marker([lat, lng], { icon: createClusterIcon(bucket.length) })
                .bindPopup(`${bucket.length} locales en ${escapeHtml(communityName)}`, { className: 'sales-map-client-popup' })
                .on('click', () => {
                  map.setView([lat, lng], Math.min(8, map.getMaxZoom()), { animate: true });
                })
                .addTo(markerLayer);
            });
            return;
          }

          const gridSize = getClusterGridSize();

          if (gridSize === 0) {
            markers.forEach(addRestaurantMarker);
            return;
          }

          const buckets = new Map<string, RestaurantMarker[]>();
          markers.forEach((marker) => {
            const point = map.latLngToLayerPoint([marker.lat, marker.lng]);
            const key = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`;
            const bucket = buckets.get(key);
            if (bucket) bucket.push(marker);
            else buckets.set(key, [marker]);
          });

          buckets.forEach((bucket) => {
            if (bucket.length === 1) {
              addRestaurantMarker(bucket[0]);
              return;
            }

            const lat = bucket.reduce((sum, marker) => sum + marker.lat, 0) / bucket.length;
            const lng = bucket.reduce((sum, marker) => sum + marker.lng, 0) / bucket.length;
            L.marker([lat, lng], { icon: createClusterIcon(bucket.length) })
              .bindPopup(`${bucket.length} locales agrupados`, { className: 'sales-map-client-popup' })
              .on('click', () => {
                map.setView([lat, lng], Math.min(map.getZoom() + 2, map.getMaxZoom()), { animate: true });
              })
              .addTo(markerLayer);
          });
        };

        map.on('zoomend moveend', renderMarkerLayer);

        getStaffClients()
          .then(async (clients) => {
            const restaurants = clients.flatMap((client) =>
              (client.restaurants ?? [])
                .filter((restaurant) => restaurant.address && restaurant.city)
                .map((restaurant) => ({
                  id: restaurant.id,
                  clientName: client.name,
                  restaurantName: restaurant.name,
                  address: restaurant.address!,
                  city: restaurant.city!,
                })),
            );
            restaurantSearchRef.current = restaurants;
            const markers: RestaurantMarker[] = [];

            for (const restaurant of restaurants) {
              if (disposed) return;
              const coordinates = await geocodeAddress(restaurant.address, restaurant.city);
              if (coordinates) {
                const marker = { ...restaurant, ...coordinates };
                markers.push(marker);
                markerDataRef.current = markers;
                renderMarkerLayer();
              }
              if (coordinates && !coordinates.cached) await wait(1100);
            }
          })
          .catch((error) => {
            if (!disposed) setLoadError(error instanceof Error ? error.message : 'No se han podido cargar los locales.');
          });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se ha podido cargar el mapa.');
      }
    }

    void mountMap();

    return () => {
      disposed = true;
      markerDataRef.current = [];
      restaurantSearchRef.current = [];
      searchLayerRef.current?.remove();
      searchLayerRef.current = null;
      markersLayerRef.current?.remove();
      markersLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const focusSearchResult = async (result: SearchResult) => {
      const L = await import('leaflet');
      const map = mapRef.current;
      const searchLayer = searchLayerRef.current;
    if (!map || !searchLayer) return;

      const searchIcon = L.divIcon({
        className: 'sales-map-search-pin-wrapper',
        html: `
          <svg class="sales-map-search-pin" viewBox="0 0 36 48" aria-hidden="true">
            <path d="M18 46C15.4 42.1 5 29.4 5 17.4C5 9.7 10.8 3.5 18 3.5s13 6.2 13 13.9C31 29.4 20.6 42.1 18 46Z" />
            <text x="18" y="18.2" text-anchor="middle">R</text>
          </svg>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 46],
        popupAnchor: [0, -42],
      });

      searchLayer.clearLayers();
      L.marker([result.lat, result.lng], { icon: searchIcon })
        .bindPopup(result.popupHtml, { className: 'sales-map-client-popup' })
        .addTo(searchLayer)
        .openPopup();
      map.setView([result.lat, result.lng], map.getMaxZoom(), { animate: true });
      setSearchStatus(result.label);
    setSearchResults([]);
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query || !mapRef.current || !searchLayerRef.current) return;

    setIsSearching(true);
    setSearchStatus('');
    setSearchResults([]);

    try {
      const normalizedQuery = query.toLocaleLowerCase('es-ES');
      const markerMatch = markerDataRef.current.find((marker) => getSearchText(marker).includes(normalizedQuery));
      const restaurantMatch =
        markerMatch ?? restaurantSearchRef.current.find((restaurant) => getSearchText(restaurant).includes(normalizedQuery));

      if (markerMatch) {
        await focusSearchResult({
          lat: markerMatch.lat,
          lng: markerMatch.lng,
          label: markerMatch.restaurantName,
          popupHtml: `<strong>${escapeHtml(markerMatch.restaurantName)}</strong><br>${escapeHtml(markerMatch.clientName)}<br>${escapeHtml(markerMatch.address)}<br>${escapeHtml(markerMatch.city)}`,
        });
        return;
      }

      if (restaurantMatch) {
        const coordinates = await geocodeAddress(restaurantMatch.address, restaurantMatch.city);
        if (coordinates) {
          await focusSearchResult({
            lat: coordinates.lat,
            lng: coordinates.lng,
            label: restaurantMatch.restaurantName,
            popupHtml: `<strong>${escapeHtml(restaurantMatch.restaurantName)}</strong><br>${escapeHtml(restaurantMatch.clientName)}<br>${escapeHtml(restaurantMatch.address)}<br>${escapeHtml(restaurantMatch.city)}`,
          });
          return;
        }
      }

      const results = await geocodeSearchResults(query);
      if (results.length === 0) {
        setSearchStatus('No se ha encontrado ningun resultado.');
      } else if (results.length === 1) {
        await focusSearchResult(results[0]);
      } else {
        setSearchResults(results);
        setSearchStatus('Elige el resultado correcto.');
      }
    } catch (error) {
      setSearchStatus(error instanceof Error ? error.message : 'No se ha podido buscar.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="-m-4 h-[calc(100%+2rem)] min-h-0 overflow-hidden sm:-m-6 sm:h-[calc(100%+3rem)] lg:-m-8 lg:h-[calc(100%+4rem)]">
      <section className="relative h-full min-h-0 overflow-hidden bg-ronda-bg">
        <div className="absolute inset-0 bg-ronda-bg">
          <form
            onSubmit={handleSearch}
            className="absolute left-5 top-5 z-[1000] w-[min(25rem,calc(100%-2.5rem))] rounded-lg border border-ronda-border bg-ronda-surface/95 p-2 shadow-lg backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchResults([]);
                  setSearchStatus('');
                }}
                placeholder="Buscar calle o restaurante"
                className="min-w-0 flex-1 rounded-md border border-ronda-border bg-ronda-bg px-3 py-2 text-sm font-medium text-ronda-text outline-none transition focus:border-ronda-coffee"
                type="search"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="rounded-md bg-ronda-coffee px-3 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSearching ? 'Buscando' : 'Buscar'}
              </button>
            </div>
            {searchStatus ? <p className="mt-2 px-1 text-xs font-semibold text-ronda-muted">{searchStatus}</p> : null}
            {searchResults.length > 0 ? (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-ronda-border bg-ronda-surface shadow-lg">
                {searchResults.map((result) => (
                  <button
                    key={`${result.lat}:${result.lng}:${result.label}`}
                    type="button"
                    onClick={() => {
                      setSearchQuery(result.label);
                      void focusSearchResult(result);
                    }}
                    className="block w-full border-b border-ronda-border px-3 py-2 text-left text-xs font-semibold leading-5 text-ronda-text transition last:border-b-0 hover:bg-ronda-bg"
                  >
                    {result.label}
                  </button>
                ))}
              </div>
            ) : null}
          </form>
          <div ref={mapNodeRef} className="absolute inset-0" />
          {loadError ? (
            <div className="absolute inset-0 grid place-items-center bg-ronda-bg p-6">
              <div className="max-w-md rounded-lg border border-ronda-border bg-ronda-surface p-5 text-center">
                <h2 className="text-lg font-semibold text-ronda-text">No se ha podido cargar el mapa</h2>
                <p className="mt-2 text-sm text-ronda-muted">{loadError}</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
