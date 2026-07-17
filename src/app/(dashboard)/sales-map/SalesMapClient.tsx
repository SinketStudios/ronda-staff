'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getStaffClients, getStaffContacts, type StaffCommercialContact } from '@/lib/api';
import { ContactDetailSidebar } from '../contacts/ContactDetailSidebar';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { LatLngBoundsExpression, LayerGroup, Map as LeafletMap } from 'leaflet';
import { Building2, MapPin, Pencil, Search } from 'lucide-react';
import type { Topology } from 'topojson-specification';
import { feature as topojsonFeature } from 'topojson-client';

const spainCenter: [number, number] = [40.4168, -3.7038];
const minMapZoom = 6;
const softSpainBounds: LatLngBoundsExpression = [
  [26.8, -19.2],
  [45.4, 6.4],
];
const geocodeCachePrefix = 'ronda-sales-map-geocode:v1:';
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const accountPinColors = {
  contact: '#94a3b8',
  contactLow: '#C8B27A',
  contactInteresting: '#B98A41',
  contactHigh: '#B9653B',
  contactExcellent: '#3F7A56',
  real: '#6f4a2f',
  demo: '#2563eb',
  trial: '#7c3aed',
} as const;

type AccountKind = keyof typeof accountPinColors;

type RestaurantMarker = {
  id: string;
  clientName: string;
  restaurantName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  accountKind: AccountKind;
};

type RestaurantSearchItem = Omit<RestaurantMarker, 'lat' | 'lng'> & { lat?: number; lng?: number };

type SearchResult = {
  id: string;
  lat?: number;
  lng?: number;
  label: string;
  secondaryLabel?: string;
  popupHtml: string;
  placeId?: string;
  address?: string;
  city?: string;
  restaurantName?: string;
  clientName?: string;
  provider: 'restaurant' | 'google' | 'nominatim';
};

declare global {
  interface Window {
    google?: any;
    __rondaGoogleMapsPromise?: Promise<boolean>;
  }
}

type AdminProperties = {
  name?: string;
  noml_ccaa?: string;
};

type AccountSubscription = {
  planId?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
};

function getFeatureName(feature: Feature<Geometry, AdminProperties>) {
  return feature.properties?.name || feature.properties?.noml_ccaa || 'Zona sin nombre';
}

function normalizeName(value: string) {
  return value
    .toLocaleLowerCase('es-ES')
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-ES'));
}

function getAccountKind(clientSubscription?: AccountSubscription | null, restaurantSubscription?: AccountSubscription | null): AccountKind {
  const subscription = restaurantSubscription ?? clientSubscription;
  const planId = subscription?.planId?.toLocaleLowerCase('es-ES') ?? '';
  const status = subscription?.status?.toLocaleLowerCase('es-ES') ?? '';

  if (status.includes('trial')) return 'trial';
  if (planId === 'demo') return 'demo';
  return 'real';
}

function getContactAccountKind(score: number, hasEvaluation: boolean): AccountKind {
  if (!hasEvaluation) return 'contact';
  if (score >= 23) return 'contactExcellent';
  if (score >= 16) return 'contactHigh';
  if (score >= 9) return 'contactInteresting';
  return 'contactLow';
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

async function loadGooglePlaces() {
  if (!googleMapsApiKey || typeof window === 'undefined') return false;
  if (window.google?.maps?.places) return true;
  if (window.__rondaGoogleMapsPromise) return window.__rondaGoogleMapsPromise;

  window.__rondaGoogleMapsPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('ronda-google-maps');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(Boolean(window.google?.maps?.places)), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'ronda-google-maps';
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places&loading=async`;
    script.onload = () => resolve(Boolean(window.google?.maps?.places));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return window.__rondaGoogleMapsPromise;
}

async function getGooglePlacePredictions(query: string): Promise<SearchResult[]> {
  const loaded = await loadGooglePlaces();
  if (!loaded || !window.google?.maps?.places) return [];

  const service = new window.google.maps.places.AutocompleteService();
  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'es' },
        types: ['geocode'],
      },
      (predictions: any[] | null, status: string) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }

        resolve(
          predictions.slice(0, 6).map((prediction) => ({
            id: `google:${prediction.place_id}`,
            label: prediction.structured_formatting?.main_text || prediction.description,
            secondaryLabel: prediction.structured_formatting?.secondary_text || prediction.description,
            popupHtml: `<strong>${escapeHtml(prediction.description)}</strong>`,
            placeId: prediction.place_id,
            provider: 'google',
          })),
        );
      },
    );
  });
}

async function getGooglePlaceDetails(result: SearchResult): Promise<SearchResult | null> {
  if (!result.placeId) return result;
  const loaded = await loadGooglePlaces();
  if (!loaded || !window.google?.maps?.places) return null;

  const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
  return new Promise((resolve) => {
    placesService.getDetails(
      {
        placeId: result.placeId,
        fields: ['geometry', 'formatted_address', 'name'],
      },
      (place: any | null, status: string) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          resolve(null);
          return;
        }

        const label = place.name || result.label;
        const address = place.formatted_address || result.secondaryLabel || result.label;
        resolve({
          ...result,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          label,
          secondaryLabel: address,
          popupHtml: `<strong>${escapeHtml(label)}</strong><br>${escapeHtml(address)}`,
        });
      },
    );
  });
}

async function geocodeSearchResults(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'es',
    addressdetails: '1',
    bounded: '1',
    viewbox: '-18.6,43.9,4.4,27.4',
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
        id: `nominatim:${lat}:${lng}:${label}`,
        lat,
        lng,
        label,
        popupHtml: `<strong>${escapeHtml(query)}</strong><br>${escapeHtml(label)}`,
        provider: 'nominatim',
      },
    ];
  });
}

function getSearchText(marker: RestaurantSearchItem) {
  return `${marker.restaurantName} ${marker.clientName} ${marker.address} ${marker.city}`.toLocaleLowerCase('es-ES');
}

function buildRestaurantSearchResult(marker: RestaurantSearchItem & { lat?: number; lng?: number }): SearchResult {
  return {
    id: `restaurant:${marker.id}`,
    lat: marker.lat,
    lng: marker.lng,
    label: marker.restaurantName,
    secondaryLabel: `${marker.address}, ${marker.city}`,
    popupHtml: `<strong>${escapeHtml(marker.restaurantName)}</strong><br>${escapeHtml(marker.clientName)}<br>${escapeHtml(marker.address)}<br>${escapeHtml(marker.city)}`,
    address: marker.address,
    city: marker.city,
    restaurantName: marker.restaurantName,
    clientName: marker.clientName,
    provider: 'restaurant',
  };
}

function getMarkerKindLabel(accountKind: AccountKind) {
  if (accountKind === 'real') return 'Cliente real';
  if (accountKind === 'demo') return 'Demo';
  if (accountKind === 'trial') return 'Demo activa';
  if (accountKind === 'contact') return 'Contacto sin evaluar';
  if (accountKind === 'contactLow') return 'Baja prioridad';
  if (accountKind === 'contactInteresting') return 'Oportunidad interesante';
  if (accountKind === 'contactHigh') return 'Alta prioridad';
  return 'Oportunidad excelente';
}

function getContactIdFromMarker(marker: RestaurantMarker) {
  return marker.id.startsWith('contact:') ? marker.id.slice('contact:'.length) : null;
}

function SelectedPlaceCard({
  marker,
  onClose,
  onEdit,
  onInteract,
}: {
  marker: RestaurantMarker;
  onClose: () => void;
  onEdit?: () => void;
  onInteract: () => void;
}) {
  const markerColor = accountPinColors[marker.accountKind];

  return (
    <div
      className="mt-2 overflow-hidden rounded-2xl border border-ronda-border bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
      onMouseDown={(event) => {
        event.preventDefault();
        onInteract();
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <span
          className="inline-flex max-w-[calc(100%-2.5rem)] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
          style={{ borderColor: markerColor, color: markerColor, backgroundColor: `${markerColor}14` }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: markerColor }} />
          <span className="truncate">{getMarkerKindLabel(marker.accountKind)}</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto rounded-full p-1.5 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
          aria-label="Cerrar ficha"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-4 pb-4 pt-3">
        <h2 className="truncate text-xl font-extrabold tracking-tight text-ronda-text">{marker.restaurantName}</h2>

        <div className="mt-3 grid gap-2.5 text-sm">
          <div className="flex gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ronda-muted" />
            <div className="min-w-0">
              <p className="font-semibold leading-5 text-ronda-text">{marker.address}</p>
              <p className="mt-0.5 text-xs font-medium text-ronda-muted">{marker.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 shrink-0 text-ronda-muted" />
            <p className="truncate text-sm font-semibold text-ronda-muted">{marker.clientName}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          disabled={!onEdit}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-ronda-border bg-white px-4 py-2.5 text-sm font-bold text-ronda-text shadow-sm transition hover:border-ronda-secondary hover:text-ronda-secondary"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </button>
        {marker.accountKind === 'contact' ? (
          <button
            type="button"
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-ronda-secondary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-ronda-secondary/90"
          >
            Evaluar
          </button>
        ) : null}
      </div>
    </div>
  );
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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const searchLayerRef = useRef<LayerGroup | null>(null);
  const renderMarkerLayerRef = useRef<(() => void) | null>(null);
  const selectedMarkerIdRef = useRef<string | null>(null);
  const markerDataRef = useRef<RestaurantMarker[]>([]);
  const restaurantSearchRef = useRef<RestaurantSearchItem[]>([]);
  const contactsByIdRef = useRef<Map<string, StaffCommercialContact>>(new Map());
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionStatus, setPredictionStatus] = useState('');
  const [areSuggestionsOpen, setAreSuggestionsOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<RestaurantMarker | null>(null);
  const [editingMapContact, setEditingMapContact] = useState<StaffCommercialContact | null>(null);

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
          attributionControl: false,
          zoomControl: false,
        });
        mapRef.current = map;

        L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);
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

        const createPinIcon = (accountKind: AccountKind, selected: boolean) =>
          L.divIcon({
            className: 'sales-map-client-pin-wrapper',
            html: `
            <svg class="sales-map-client-pin" style="${selected ? 'transform: scale(1.12); filter: drop-shadow(0 10px 18px rgba(36,22,12,0.4));' : ''}" viewBox="0 0 36 48" aria-hidden="true">
              <path style="fill: ${accountPinColors[accountKind]}; stroke: ${selected ? '#c9a96e' : '#ffffff'}; stroke-width: ${selected ? 4.2 : 2.5};" d="M18 46C15.4 42.1 5 29.4 5 17.4C5 9.7 10.8 3.5 18 3.5s13 6.2 13 13.9C31 29.4 20.6 42.1 18 46Z" />
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

        const clearSelectedMarker = () => {
          selectedMarkerIdRef.current = null;
          setSelectedMarker(null);
          setAreSuggestionsOpen(false);
          searchInputRef.current?.blur();
          renderMarkerLayerRef.current?.();
        };

        const addRestaurantMarker = (marker: RestaurantMarker) =>
          L.marker([marker.lat, marker.lng], { icon: createPinIcon(marker.accountKind, selectedMarkerIdRef.current === marker.id) })
            .on('click', (event) => {
              L.DomEvent.stopPropagation(event);
              selectedMarkerIdRef.current = marker.id;
              setSelectedMarker(marker);
              setSearchQuery(marker.restaurantName);
              setSearchStatus('');
              setPredictionStatus('');
              setSearchResults([]);
              setAreSuggestionsOpen(false);
              searchInputRef.current?.blur();
              map.flyTo([marker.lat, marker.lng], map.getMaxZoom(), {
                animate: true,
                duration: 0.9,
                easeLinearity: 0.25,
              });
              renderMarkerLayerRef.current?.();
            })
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
                .on('click', (event) => {
                  L.DomEvent.stopPropagation(event);
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
              .on('click', (event) => {
                L.DomEvent.stopPropagation(event);
                map.setView([lat, lng], Math.min(map.getZoom() + 2, map.getMaxZoom()), { animate: true });
              })
              .addTo(markerLayer);
          });
        };
        renderMarkerLayerRef.current = renderMarkerLayer;

        map.on('zoomend moveend', renderMarkerLayer);
        map.on('click', clearSelectedMarker);

        Promise.all([getStaffClients(), getStaffContacts()])
          .then(async ([clients, contacts]) => {
            contactsByIdRef.current = new Map(contacts.map((contact) => [contact.id, contact]));
            const restaurants: RestaurantSearchItem[] = clients.flatMap((client) =>
              (client.restaurants ?? [])
                .filter((restaurant) => restaurant.address && restaurant.city)
                .map((restaurant) => ({
                  id: restaurant.id,
                  clientName: client.name,
                  restaurantName: restaurant.name,
                  address: restaurant.address!,
                  city: restaurant.city!,
                  accountKind: getAccountKind(client.subscription, restaurant.subscription),
                })),
            );

            const commercialContacts: RestaurantSearchItem[] = contacts
              .filter((contact) => contact.address && (contact.city || contact.province))
              .map((contact) => ({
                id: `contact:${contact.id}`,
                clientName: 'Contacto comercial',
                restaurantName: contact.restaurantName,
                address: contact.address,
                city: contact.city || contact.province,
                lat: contact.lat ?? undefined,
                lng: contact.lng ?? undefined,
                accountKind: getContactAccountKind(contact.potential, Boolean(contact.evaluation)),
              }));

            const locations = [...restaurants, ...commercialContacts];
            restaurantSearchRef.current = locations;
            const markers: RestaurantMarker[] = [];

            for (const restaurant of locations) {
              if (disposed) return;
              const coordinates =
                typeof restaurant.lat === 'number' && typeof restaurant.lng === 'number'
                  ? { lat: restaurant.lat, lng: restaurant.lng, cached: true }
                  : await geocodeAddress(restaurant.address, restaurant.city);
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
      renderMarkerLayerRef.current = null;
      selectedMarkerIdRef.current = null;
      markerDataRef.current = [];
      restaurantSearchRef.current = [];
      contactsByIdRef.current = new Map();
      searchLayerRef.current?.remove();
      searchLayerRef.current = null;
      markersLayerRef.current?.remove();
      markersLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setIsPredicting(false);
      setPredictionStatus('');
      return;
    }

    let cancelled = false;
    setIsPredicting(true);
    setPredictionStatus('Buscando sugerencias...');
    const timeoutId = window.setTimeout(async () => {
      const normalizedQuery = query.toLocaleLowerCase('es-ES');
      const restaurantMatches = [
        ...markerDataRef.current.map(buildRestaurantSearchResult),
        ...restaurantSearchRef.current.map(buildRestaurantSearchResult),
      ]
        .filter((result, index, results) => results.findIndex((item) => item.id === result.id) === index)
        .filter((result) =>
          `${result.label} ${result.clientName ?? ''} ${result.address ?? ''} ${result.city ?? ''}`.toLocaleLowerCase('es-ES').includes(normalizedQuery),
        )
        .slice(0, 4);

      let externalMatches: SearchResult[] = [];
      if (restaurantMatches.length < 4) {
        externalMatches = await getGooglePlacePredictions(query);
        if (externalMatches.length === 0) {
          externalMatches = await geocodeSearchResults(query);
        }
      }

      if (!cancelled) {
        const nextResults = [...restaurantMatches, ...externalMatches].slice(0, 8);
        setSearchResults(nextResults);
        setPredictionStatus(nextResults.length > 0 ? '' : 'No hay sugerencias para esta busqueda.');
        setIsPredicting(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      setIsPredicting(false);
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const focusSearchResult = async (result: SearchResult) => {
    let resolvedResult = result;
    if (result.placeId) {
      const googleResult = await getGooglePlaceDetails(result);
      if (!googleResult) {
        setSearchStatus('No se ha podido obtener la ubicacion exacta.');
        return;
      }
      resolvedResult = googleResult;
    } else if ((result.lat === undefined || result.lng === undefined) && result.address && result.city) {
      const coordinates = await geocodeAddress(result.address, result.city);
      if (!coordinates) {
        setSearchStatus('No se ha podido obtener la ubicacion exacta.');
        return;
      }
      resolvedResult = { ...result, lat: coordinates.lat, lng: coordinates.lng };
    }

    if (resolvedResult.lat === undefined || resolvedResult.lng === undefined) return;

    const L = await import('leaflet');
    const map = mapRef.current;
    const searchLayer = searchLayerRef.current;
    if (!map || !searchLayer) return;

    if (resolvedResult.provider === 'restaurant') {
      const marker = markerDataRef.current.find((item) => `restaurant:${item.id}` === resolvedResult.id);
      if (marker) {
        selectedMarkerIdRef.current = marker.id;
        setSelectedMarker(marker);
        searchInputRef.current?.blur();
        renderMarkerLayerRef.current?.();
      }
    } else {
      selectedMarkerIdRef.current = null;
      setSelectedMarker(null);
      renderMarkerLayerRef.current?.();
    }

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
    L.marker([resolvedResult.lat, resolvedResult.lng], { icon: searchIcon })
      .bindPopup(resolvedResult.popupHtml, { className: 'sales-map-client-popup' })
      .addTo(searchLayer)
      .openPopup();
    map.flyTo([resolvedResult.lat, resolvedResult.lng], map.getMaxZoom(), {
      animate: true,
      duration: 0.9,
      easeLinearity: 0.25,
    });
    setSearchStatus(resolvedResult.label);
    setSearchResults([]);
    setAreSuggestionsOpen(false);
  };

  const getPredictiveSearchResults = async (query: string) => {
    const normalizedQuery = query.toLocaleLowerCase('es-ES');
    const restaurantMatches = [
      ...markerDataRef.current.map(buildRestaurantSearchResult),
      ...restaurantSearchRef.current.map(buildRestaurantSearchResult),
    ]
      .filter((result, index, results) => results.findIndex((item) => item.id === result.id) === index)
      .filter((result) =>
        `${result.label} ${result.clientName ?? ''} ${result.address ?? ''} ${result.city ?? ''}`.toLocaleLowerCase('es-ES').includes(normalizedQuery),
      )
      .slice(0, 4);

    let externalMatches: SearchResult[] = [];
    if (restaurantMatches.length < 4) {
      externalMatches = await getGooglePlacePredictions(query);
      if (externalMatches.length === 0) {
        externalMatches = await geocodeSearchResults(query);
      }
    }

    return [...restaurantMatches, ...externalMatches].slice(0, 8);
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query || !mapRef.current || !searchLayerRef.current) return;

    setIsSearching(true);
    setSearchStatus('');
    setSearchResults([]);
    setPredictionStatus('');
    setAreSuggestionsOpen(false);

    try {
      const results = searchResults.length > 0 ? searchResults : await getPredictiveSearchResults(query);
      const bestResult = results[0];

      if (!bestResult) {
        setSearchStatus('No se ha encontrado ningun resultado.');
        return;
      }

      setSearchQuery(bestResult.label);
      await focusSearchResult(bestResult);
    } catch (error) {
      setSearchStatus(error instanceof Error ? error.message : 'No se ha podido buscar.');
    } finally {
      setIsSearching(false);
    }
  };

  const openContactEditor = (marker: RestaurantMarker) => {
    const contactId = getContactIdFromMarker(marker);
    if (!contactId) return;

    const contact = contactsByIdRef.current.get(contactId);
    if (!contact) return;

    setEditingMapContact(contact);
  };

  const handleMapContactUpdated = (contact: StaffCommercialContact) => {
    contactsByIdRef.current = new Map(contactsByIdRef.current).set(contact.id, contact);

    const nextItem: RestaurantSearchItem = {
      id: `contact:${contact.id}`,
      clientName: 'Contacto comercial',
      restaurantName: contact.restaurantName,
      address: contact.address,
      city: contact.city || contact.province,
      lat: contact.lat ?? undefined,
      lng: contact.lng ?? undefined,
      accountKind: getContactAccountKind(contact.potential, Boolean(contact.evaluation)),
    };

    restaurantSearchRef.current = restaurantSearchRef.current.map((item) => (item.id === nextItem.id ? nextItem : item));
    markerDataRef.current = markerDataRef.current.map((marker) =>
      marker.id === nextItem.id
        ? {
            ...marker,
            clientName: nextItem.clientName,
            restaurantName: nextItem.restaurantName,
            address: nextItem.address,
            city: nextItem.city,
            accountKind: nextItem.accountKind,
            lat: nextItem.lat ?? marker.lat,
            lng: nextItem.lng ?? marker.lng,
          }
        : marker,
    );

    setEditingMapContact(contact);
    setSelectedMarker((current) => {
      if (!current || current.id !== nextItem.id) return current;
      return {
        ...current,
        clientName: nextItem.clientName,
        restaurantName: nextItem.restaurantName,
        address: nextItem.address,
        city: nextItem.city,
        accountKind: nextItem.accountKind,
        lat: nextItem.lat ?? current.lat,
        lng: nextItem.lng ?? current.lng,
      };
    });
    setSearchQuery((current) => (selectedMarkerIdRef.current === nextItem.id ? contact.restaurantName : current));
    renderMarkerLayerRef.current?.();
  };

  return (
    <div className="-m-4 h-[calc(100%+2rem)] min-h-0 overflow-hidden sm:-m-6 sm:h-[calc(100%+3rem)] lg:-m-8 lg:h-[calc(100%+4rem)]">
      <section className="relative h-full min-h-0 overflow-hidden bg-ronda-bg">
        <div className="absolute inset-0 bg-ronda-bg">
          <form
            onSubmit={handleSearch}
            className="absolute left-1/2 top-5 z-[1000] w-[min(21rem,calc(100%-2rem))] -translate-x-1/2 transition-[width] duration-300 ease-out focus-within:w-[min(27rem,calc(100%-2rem))] sm:left-5 sm:w-[min(21rem,calc(100%-2.5rem))] sm:translate-x-0 sm:focus-within:w-[min(27rem,calc(100%-2.5rem))]"
          >
            <div className="flex h-11 items-center gap-2 rounded-full border border-ronda-border bg-ronda-surface/95 py-0 pl-1.5 pr-3 shadow-lg backdrop-blur transition duration-300 ease-out focus-within:border-ronda-coffee focus-within:shadow-xl">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ronda-coffee text-base leading-none text-white"
                style={{ fontFamily: 'var(--font-ronda-strong), var(--font-geist-sans), Arial, sans-serif' }}
                aria-hidden="true"
              >
                R
              </span>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchResults([]);
                  setSearchStatus('');
                  setPredictionStatus('');
                  setAreSuggestionsOpen(true);
                }}
                onFocus={() => setAreSuggestionsOpen(true)}
                placeholder="Buscar calle o restaurante"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ronda-text outline-none placeholder:text-ronda-muted"
                type="text"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                onMouseDown={(event) => event.preventDefault()}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-coffee disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {areSuggestionsOpen && searchQuery.trim().length >= 3 && (isPredicting || predictionStatus || searchResults.length > 0) ? (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-ronda-border bg-ronda-surface shadow-lg">
                {isPredicting || predictionStatus ? (
                  <p className="px-3 py-2 text-xs font-semibold text-ronda-muted">
                    {isPredicting ? 'Buscando sugerencias...' : predictionStatus}
                  </p>
                ) : null}
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery(result.label);
                      setAreSuggestionsOpen(false);
                      void focusSearchResult(result);
                    }}
                    className="block w-full border-b border-ronda-border px-3 py-2 text-left text-xs font-semibold leading-5 text-ronda-text transition last:border-b-0 hover:bg-ronda-bg"
                  >
                    <span className="block truncate">{result.label}</span>
                    {result.secondaryLabel ? (
                      <span className="mt-0.5 block truncate font-medium text-ronda-muted">{result.secondaryLabel}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
            {selectedMarker && !areSuggestionsOpen ? (
              <SelectedPlaceCard
                marker={selectedMarker}
                onInteract={() => searchInputRef.current?.blur()}
                onEdit={getContactIdFromMarker(selectedMarker) ? () => openContactEditor(selectedMarker) : undefined}
                onClose={() => {
                  selectedMarkerIdRef.current = null;
                  setSelectedMarker(null);
                  renderMarkerLayerRef.current?.();
                }}
              />
            ) : null}
          </form>
          <div className="pointer-events-none absolute right-5 top-5 z-[1000] grid gap-2">
            <div className="rounded-xl border border-ronda-border/60 bg-ronda-surface/80 px-2.5 py-2 shadow-md backdrop-blur">
              <div className="grid gap-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ronda-muted">Calor</p>
                <div className="grid grid-cols-[0.45rem_1fr] gap-1.5">
                <div className="grid overflow-hidden rounded-full shadow-sm">
                  {[
                    accountPinColors.contact,
                    accountPinColors.contactLow,
                    accountPinColors.contactInteresting,
                    accountPinColors.contactHigh,
                    accountPinColors.contactExcellent,
                  ].map((color) => (
                    <span key={color} className="h-3" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="grid text-[10px] font-semibold leading-3 text-ronda-muted">
                  <span>Sin eval.</span>
                  <span>Baja</span>
                  <span>Media</span>
                  <span>Alta</span>
                  <span>Top</span>
                </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-ronda-border/60 bg-ronda-surface/80 px-2.5 py-2 shadow-md backdrop-blur">
              <div className="grid gap-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ronda-muted">Clientes</p>
                <div className="grid grid-cols-[0.45rem_1fr] gap-1.5">
                <div className="grid overflow-hidden rounded-full shadow-sm">
                  {[accountPinColors.real, accountPinColors.trial, accountPinColors.demo].map((color) => (
                    <span key={color} className="h-3" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="grid text-[10px] font-semibold leading-3 text-ronda-muted">
                  <span>Real</span>
                  <span>Activa</span>
                  <span>Demo</span>
                </div>
                </div>
              </div>
            </div>
          </div>
          <div ref={mapNodeRef} className="absolute inset-0" />
          {loadError ? (
            <div className="absolute inset-0 grid place-items-center bg-ronda-bg p-6">
              <div className="max-w-md rounded-lg border border-ronda-border bg-ronda-surface p-5 text-center">
                <h2 className="text-lg font-semibold text-ronda-text">No se ha podido cargar el mapa</h2>
                <p className="mt-2 text-sm text-ronda-muted">{loadError}</p>
              </div>
            </div>
          ) : null}
          {editingMapContact ? (
            <div className="absolute inset-0 z-[1400] flex justify-end bg-ronda-text/10 backdrop-blur-[1px] sm:left-auto sm:w-[26rem]">
              <ContactDetailSidebar
                selection={{ type: 'contact', item: editingMapContact }}
                defaultEditing
                onContactUpdated={handleMapContactUpdated}
                onClose={() => setEditingMapContact(null)}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
