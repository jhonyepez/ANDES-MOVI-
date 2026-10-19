import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FleetUnit, UnitStatus, TripModel, AlliedOffice, ParcelModel } from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import {
  MapPin,
  Navigation,
  ShieldAlert,
  Car,
  Star,
  RefreshCw,
  Radio,
  Phone,
  Battery,
  Maximize2,
  Crosshair,
  X,
  Building2,
  PackageCheck,
  ShieldCheck,
  Award,
  Gauge,
  CheckCircle2,
  FileCheck,
  UserCheck,
  Sparkles,
  Search,
  Trash2,
  Volume2,
} from 'lucide-react';

interface Props {
  units: FleetUnit[];
  selectedUnit: FleetUnit | null;
  onSelectUnit: (unit: FleetUnit | null) => void;
  onDispatchToUnit?: (unit: FleetUnit) => void;
  onDeleteUnit?: (unitId: string) => void;
  trips?: TripModel[];
  selectedTrip?: TripModel | null;
  onSelectTrip?: (trip: TripModel) => void;
}

const CANTON_PRESETS = [
  { name: 'Tulcán (Carchi - Matriz)', lat: 0.8124, lng: -77.7174, zoom: 14 },
  { name: 'Rumichaca (Frontera Carchi)', lat: 0.8175, lng: -77.6625, zoom: 15 },
  { name: 'Quito (Pichincha)', lat: -0.1807, lng: -78.4678, zoom: 13 },
  { name: 'Guayaquil (Guayas)', lat: -2.1894, lng: -79.8891, zoom: 13 },
  { name: 'Cuenca (Azuay)', lat: -2.9001, lng: -79.0059, zoom: 13 },
  { name: 'Ibarra (Imbabura)', lat: 0.3517, lng: -78.1223, zoom: 14 },
  { name: 'Ambato (Tungurahua)', lat: -1.2491, lng: -78.6168, zoom: 13 },
  { name: 'Riobamba (Chimborazo)', lat: -1.6636, lng: -78.6546, zoom: 13 },
  { name: 'Loja (Loja)', lat: -3.9931, lng: -79.2042, zoom: 13 },
  { name: 'Machala (El Oro)', lat: -3.2581, lng: -79.9553, zoom: 13 },
  { name: 'Portoviejo / Manta (Manabí)', lat: -1.0546, lng: -80.4544, zoom: 13 },
  { name: 'Esmeraldas (Esmeraldas)', lat: 0.9682, lng: -79.6517, zoom: 13 },
  { name: 'Santo Domingo (Tsáchilas)', lat: -0.2530, lng: -79.1754, zoom: 13 },
  { name: 'Latacunga (Cotopaxi)', lat: -0.9333, lng: -78.6153, zoom: 13 },
  { name: 'Babahoyo (Los Ríos)', lat: -1.8022, lng: -79.5342, zoom: 13 },
  { name: 'Guaranda (Bolívar)', lat: -1.5926, lng: -79.0009, zoom: 13 },
  { name: 'Azogues (Cañar)', lat: -2.7396, lng: -78.8486, zoom: 13 },
  { name: 'Santa Elena (Santa Elena)', lat: -2.2263, lng: -80.8586, zoom: 13 },
  { name: 'Nueva Loja / Lago Agrio (Sucumbíos)', lat: 0.0847, lng: -76.8828, zoom: 13 },
  { name: 'El Coca (Orellana)', lat: -0.4664, lng: -76.9871, zoom: 13 },
  { name: 'Puyo (Pastaza)', lat: -1.4886, lng: -77.9953, zoom: 13 },
  { name: 'Tena (Napo)', lat: -0.9938, lng: -77.8129, zoom: 13 },
  { name: 'Macas (Morona Santiago)', lat: -2.3087, lng: -78.1182, zoom: 13 },
  { name: 'Zamora (Zamora Chinchipe)', lat: -4.0692, lng: -78.9564, zoom: 13 },
  { name: 'Puerto Baquerizo (Galápagos)', lat: -0.9012, lng: -89.6108, zoom: 12 },
];

type TileMode = 'osm' | 'voyager' | 'positron';
type VehicleFilter = 'todos' | 'sedan' | 'moto';

// Check if a fleet unit is a motorcycle or a sedan car
export function isMotorcycle(vehicleName: string): boolean {
  return /moto|pulsar|yamaha|honda|suzuki|bajaj|shineray|mensajer|encomienda/i.test(vehicleName);
}

// Default fallback photos if a custom unit was added without photos
const DEFAULT_DRIVER_PHOTO = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80';
const DEFAULT_SEDAN_PHOTO = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80';
const DEFAULT_MOTO_PHOTO = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&q=80';

export const OpenStreetMapRadar: React.FC<Props> = ({
  units,
  selectedUnit,
  onSelectUnit,
  onDispatchToUnit,
  onDeleteUnit,
  trips = [],
  selectedTrip,
  onSelectTrip,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const officeMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const provinceMarkersRef = useRef<{ [key: string]: L.Marker }>({});
  const tripLayersRef = useRef<{ [key: string]: { origin: L.Marker; dest?: L.Marker; line?: L.Polyline } }>({});

  // Filter & Mode states
  const [filterVehicle, setFilterVehicle] = useState<VehicleFilter>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterCanton, setFilterCanton] = useState<string>('todos');
  const [activeProvinceName, setActiveProvinceName] = useState<string>('Tulcán (Carchi - Matriz)');
  const [tileMode, setTileMode] = useState<TileMode>('osm');
  const [layerVisibility, setLayerVisibility] = useState<'todos' | 'unidades' | 'viajes' | 'oficinas'>('todos');
  const [liveTrackingActive, setLiveTrackingActive] = useState<boolean>(true);
  const [simulatedUnits, setSimulatedUnits] = useState<FleetUnit[]>(units);
  const [alliedOffices, setAlliedOffices] = useState<AlliedOffice[]>([]);
  const [parcels, setParcels] = useState<ParcelModel[]>([]);
  const [officeDropoffToast, setOfficeDropoffToast] = useState<string | null>(null);
  const [selectedOfficeForDropoff, setSelectedOfficeForDropoff] = useState<string>('OFI-TUL-01');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load Allied Offices and Parcels
  useEffect(() => {
    setAlliedOffices(AdminService.getStoredAlliedOffices());
    setParcels(AdminService.getStoredParcels());
  }, []);

  // Sync props units when updated
  useEffect(() => {
    setSimulatedUnits(units);
  }, [units]);

  // Live GPS movement simulation along street axes + Geofence Check with Allied Offices
  useEffect(() => {
    if (!liveTrackingActive) return;

    const interval = setInterval(() => {
      setSimulatedUnits((prevUnits) =>
        prevUnits.map((u) => {
          if (u.status === 'offline') return u;

          const currentLat = u.lat ?? 0.8124;
          const currentLng = u.lng ?? -77.7174;

          const isEnCarrera = u.status === 'en_carrera' || u.status === 'en_camino';
          const speedFactor = isEnCarrera ? 0.00065 : 0.0002;
          const deltaLat = (Math.random() - 0.49) * speedFactor;
          const deltaLng = (Math.random() - 0.51) * speedFactor;

          const newLat = currentLat + deltaLat;
          const newLng = currentLng + deltaLng;
          const newSpeed = isEnCarrera
            ? Math.floor(32 + Math.random() * 24)
            : Math.floor(15 + Math.random() * 15);

          return {
            ...u,
            lat: newLat,
            lng: newLng,
            speedKmh: newSpeed,
            batteryLevel: Math.max(18, (u.batteryLevel || 92) + (Math.random() > 0.88 ? -1 : 0)),
            lastUpdated: 'En vivo (GPS satelital activo)',
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [liveTrackingActive]);

  // Keep selectedUnit synced with live simulated telemetry
  const activeSelectedUnit = selectedUnit
    ? simulatedUnits.find((u) => u.id === selectedUnit.id) || selectedUnit
    : null;

  // Filtered fleet units (by vehicle type, status, canton, and Lupita search by driver name or plate)
  const filteredUnits = simulatedUnits.filter((u) => {
    if (layerVisibility === 'viajes') return false;
    const isMoto = isMotorcycle(u.vehicle);
    if (filterVehicle === 'sedan' && isMoto) return false;
    if (filterVehicle === 'moto' && !isMoto) return false;
    if (filterStatus !== 'todos' && u.status !== filterStatus) return false;
    if (filterCanton !== 'todos' && !u.canton.toLowerCase().includes(filterCanton.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.driverName.toLowerCase().includes(q);
      const matchPlate = u.plate.toLowerCase().includes(q);
      const matchVehicle = u.vehicle.toLowerCase().includes(q);
      if (!matchName && !matchPlate && !matchVehicle) return false;
    }
    return true;
  });

  // Tile URL helper for ultra-clear daylight viewing
  const getTileUrl = (mode: TileMode): string => {
    switch (mode) {
      case 'osm':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'voyager':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'positron':
        return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [0.8124, -77.7174],
        zoom: 15,
        zoomControl: true,
      });

      const tileLayer = L.tileLayer(getTileUrl(tileMode), {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> colaboradores (Sin API Key)',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      mapInstanceRef.current = map;
      (map as unknown as { _tileLayer: L.TileLayer })._tileLayer = tileLayer;

      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 700);
    }

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Tile Layer when tileMode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentLayer = (map as unknown as { _tileLayer?: L.TileLayer })._tileLayer;
    if (currentLayer) {
      map.removeLayer(currentLayer);
    }

    const newLayer = L.tileLayer(getTileUrl(tileMode), {
      attribution: '&copy; OpenStreetMap (Sin API Key)',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    (map as unknown as { _tileLayer: L.TileLayer })._tileLayer = newLayer;
  }, [tileMode]);

  // Render Allied Offices Markers on the Map (Disabled on Mapa 1 - strictly for live vehicles)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.keys(officeMarkersRef.current).forEach((id) => {
      map.removeLayer(officeMarkersRef.current[id]);
      delete officeMarkersRef.current[id];
    });

    // Mapa 1 is strictly for live moving cars, motorcycles, fleet and trips
  }, []);

  // Update Fleet Unit Markers on the streets
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.keys(markersRef.current).forEach((id) => {
      if (!filteredUnits.find((u) => u.id === id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    filteredUnits.forEach((unit) => {
      const lat = unit.lat ?? 0.8124;
      const lng = unit.lng ?? -77.7174;
      const isSelected = selectedUnit?.id === unit.id;
      const isMoto = isMotorcycle(unit.vehicle);

      const getStatusTheme = (status: UnitStatus) => {
        switch (status) {
          case 'disponible':
            return {
              bg: '#10b981',
              ring: '#059669',
              label: 'LIBRE',
              glow: 'rgba(16, 185, 129, 0.4)',
              isSos: false,
            };
          case 'en_carrera':
            return {
              bg: '#2563eb',
              ring: '#1d4ed8',
              label: 'EN CARRERA',
              glow: 'rgba(37, 99, 235, 0.45)',
              isSos: false,
            };
          case 'en_camino':
            return {
              bg: '#f59e0b',
              ring: '#d97706',
              label: 'EN CAMINO',
              glow: 'rgba(245, 158, 11, 0.4)',
              isSos: false,
            };
          case 'sos':
            return {
              bg: '#ef4444',
              ring: '#dc2626',
              label: 'SOS PÁNICO',
              glow: 'rgba(239, 68, 68, 0.7)',
              isSos: true,
            };
          default:
            return {
              bg: '#64748b',
              ring: '#475569',
              label: 'OFFLINE',
              glow: 'transparent',
              isSos: false,
            };
        }
      };

      const theme = getStatusTheme(unit.status);

      // Distinctive Vehicle SVGs: Sedan Car vs Motorcycle
      const vehicleSvg = isMoto
        ? `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="5" cy="16" r="3" fill="#18181b" stroke="#ffffff" stroke-width="2"/>
          <circle cx="19" cy="16" r="3" fill="#18181b" stroke="#ffffff" stroke-width="2"/>
          <path d="M5 16l4-7h5l3 7" stroke="#ffffff" stroke-width="2"/>
          <path d="M16 6l2 3" stroke="#ffffff" stroke-width="2.2"/>
          <path d="M8 9h4l2 3H7z" fill="#ffffff" fill-opacity="0.3"/>
          <circle cx="12" cy="5.5" r="2" fill="#ffffff"/>
        </svg>
      `
        : `
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 13.5l1.8-4.2c.4-.9 1.3-1.5 2.3-1.5h9.8c1 0 1.9.6 2.3 1.5l1.8 4.2v3.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-.5H5.5v.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-3.5z" fill="#ffffff" fill-opacity="0.22"/>
          <path d="M3 13.5l1.8-4.2c.4-.9 1.3-1.5 2.3-1.5h9.8c1 0 1.9.6 2.3 1.5l1.8 4.2v3.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-.5H5.5v.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-3.5z" stroke="#ffffff"/>
          <path d="M6 11.5l1-2.5h4v2.5H6zm6 0v-2.5h4l1 2.5h-5z" fill="#ffffff" fill-opacity="0.45"/>
          <circle cx="5" cy="14" r="1" fill="#fef08a"/>
          <circle cx="19" cy="14" r="1" fill="#fef08a"/>
          <circle cx="6.5" cy="17" r="2" fill="#18181b" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="17.5" cy="17" r="2" fill="#18181b" stroke="#ffffff" stroke-width="1.5"/>
        </svg>
      `;

      const typeBadgeBg = isMoto ? '#7c2d12' : '#1e3a8a';
      const typeBadgeBorder = isMoto ? '#ea580c' : '#3b82f6';

      const iconHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
          ${
            theme.isSos
              ? `<div style="position: absolute; top: -10px; left: -10px; width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          ${
            isSelected
              ? `<div style="position: absolute; top: -8px; left: -8px; width: 56px; height: 56px; border-radius: 16px; border: 2px solid #facc15; background: rgba(250, 204, 21, 0.2); animation: pulse 1.5s infinite;"></div>`
              : ''
          }

          <!-- Vehicle Capsule (Sedan / Moto) -->
          <div style="
            position: relative;
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: ${theme.bg};
            border: 3px solid ${isSelected ? '#facc15' : '#ffffff'};
            box-shadow: 0 6px 14px rgba(0,0,0,0.5), 0 0 12px ${theme.glow};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            transform: ${isSelected ? 'scale(1.25)' : 'scale(1)'};
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 2;
          ">
            ${vehicleSvg}

            <div style="
              position: absolute;
              top: -6px;
              right: -8px;
              background: ${typeBadgeBg};
              color: #ffffff;
              border: 1px solid ${typeBadgeBorder};
              font-size: 8px;
              font-weight: 900;
              padding: 1px 3px;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.6);
              white-space: nowrap;
            ">
              ${isMoto ? 'MOTO' : 'AUTO'}
            </div>
          </div>

          <!-- Street Anchor Point -->
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid ${isSelected ? '#facc15' : theme.bg};
            margin-top: -1px;
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
          "></div>

          <!-- Asphalt Contact Shadow -->
          <div style="
            width: 24px;
            height: 6px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.35);
            margin-top: -2px;
          "></div>

          <!-- Driver Name Only Street Badge (Vehículos Particulares) -->
          <div style="
            background: ${isSelected ? '#18181b' : '#09090b'};
            color: ${isSelected ? '#facc15' : '#ffffff'};
            font-size: 10px;
            font-weight: 800;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            padding: 2px 8px;
            border-radius: 6px;
            border: 1.5px solid ${isSelected ? '#facc15' : '#3f3f46'};
            margin-top: 3px;
            white-space: nowrap;
            box-shadow: 0 4px 8px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${unit.driverName}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'andesmovi-vehicle-marker',
        html: iconHtml,
        iconSize: [0, 0],
      });

      if (markersRef.current[unit.id]) {
        const marker = markersRef.current[unit.id];
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.off('click');
        marker.on('click', () => {
          audioService.playBeepTone();
          onSelectUnit(unit);
        });
      } else {
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          audioService.playBeepTone();
          onSelectUnit(unit);
        });
        markersRef.current[unit.id] = marker;
      }
    });
  }, [filteredUnits, selectedUnit, onSelectUnit]);

  // Render Real-time Trips Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.keys(tripLayersRef.current).forEach((id) => {
      const entry = tripLayersRef.current[id];
      if (entry.origin) map.removeLayer(entry.origin);
      if (entry.dest) map.removeLayer(entry.dest);
      if (entry.line) map.removeLayer(entry.line);
      delete tripLayersRef.current[id];
    });

    if (layerVisibility === 'unidades' || layerVisibility === 'oficinas') return;
    if (!trips || trips.length === 0) return;

    const visibleTrips = trips.filter((t) => {
      if (selectedTrip && selectedTrip.id === t.id) return true;
      return t.status !== 'cancelado';
    });

    visibleTrips.forEach((trip) => {
      const isSelected = selectedTrip?.id === trip.id;
      const isBuscando = trip.status === 'buscando';
      const isAceptado = trip.status === 'aceptado' || trip.status === 'en_camino';

      const pinColor = isBuscando ? '#f59e0b' : isAceptado ? '#10b981' : '#6b7280';
      const strokeColor = isBuscando ? '#d97706' : isAceptado ? '#059669' : '#4b5563';

      const originHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
          ${
            isBuscando
              ? `<div style="position: absolute; top: -6px; left: -6px; width: 44px; height: 44px; border-radius: 50%; background: rgba(245, 158, 11, 0.4); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${pinColor};
            border: 2px solid ${isSelected ? '#ffffff' : strokeColor};
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
            transition: transform 0.2s;
          ">
            <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div style="
            background: #18181b;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
            border: 1px solid ${isSelected ? '#38bdf8' : '#3f3f46'};
            margin-top: 3px;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
          ">
            <span>$${trip.offeredFare.toFixed(2)}</span>
            <span style="color: #94a3b8;">•</span>
            <span style="max-width: 90px; overflow: hidden; text-overflow: ellipsis;">${trip.passengerName.split(' ')[0]}</span>
          </div>
        </div>
      `;

      const originMarker = L.marker([trip.originLat, trip.originLng], {
        icon: L.divIcon({
          className: 'trip-origin-marker',
          html: originHtml,
          iconSize: [0, 0],
        }),
      }).addTo(map);

      originMarker.on('click', () => {
        onSelectTrip?.(trip);
      });

      const destHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
          <div style="
            width: 26px;
            height: 26px;
            border-radius: 8px;
            background: #ef4444;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
          ">
            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </div>
          <div style="
            background: #18181b;
            color: #cbd5e1;
            font-size: 9px;
            padding: 1px 4px;
            border-radius: 4px;
            border: 1px solid #3f3f46;
            margin-top: 2px;
            white-space: nowrap;
            max-width: 110px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            ${trip.destination.split(',')[0]}
          </div>
        </div>
      `;

      const destMarker = L.marker([trip.destLat, trip.destLng], {
        icon: L.divIcon({
          className: 'trip-dest-marker',
          html: destHtml,
          iconSize: [0, 0],
        }),
      }).addTo(map);

      destMarker.on('click', () => {
        onSelectTrip?.(trip);
      });

      const line = L.polyline(
        [
          [trip.originLat, trip.originLng],
          [trip.destLat, trip.destLng],
        ],
        {
          color: isSelected ? '#38bdf8' : isBuscando ? '#f59e0b' : '#10b981',
          weight: isSelected ? 4 : 2.5,
          dashArray: '6, 8',
          opacity: isSelected ? 0.95 : 0.65,
        }
      ).addTo(map);

      tripLayersRef.current[trip.id] = {
        origin: originMarker,
        dest: destMarker,
        line,
      };
    });
  }, [trips, selectedTrip, layerVisibility, onSelectTrip]);

  // Pan to selected unit when clicked
  useEffect(() => {
    if (selectedUnit && selectedUnit.lat && selectedUnit.lng && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([selectedUnit.lat, selectedUnit.lng], { animate: true, duration: 0.7 });
    }
  }, [selectedUnit]);

  // Pan to selected trip
  useEffect(() => {
    if (selectedTrip && mapInstanceRef.current) {
      const bounds = L.latLngBounds(
        [selectedTrip.originLat, selectedTrip.originLng],
        [selectedTrip.destLat, selectedTrip.destLng]
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [selectedTrip]);

  const handleFlyTo = (preset: (typeof CANTON_PRESETS)[0]) => {
    setActiveProvinceName(preset.name);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], preset.zoom, { duration: 1.2 });
    }
    audioService.playBeepTone();
  };

  // Render Province Node Markers on the Map canvas so clicking any province marker on the map jumps directly to it!
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.keys(provinceMarkersRef.current).forEach((id) => {
      map.removeLayer(provinceMarkersRef.current[id]);
      delete provinceMarkersRef.current[id];
    });

    CANTON_PRESETS.forEach((p) => {
      const isSelected = activeProvinceName === p.name;
      const shortName = p.name.split(' ')[0];
      const provinceHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
          <div style="
            background: ${isSelected ? '#059669' : '#0f172a'};
            color: #ffffff;
            font-size: 10px;
            font-weight: 900;
            padding: 3px 8px;
            border-radius: 20px;
            border: 2px solid ${isSelected ? '#34d399' : '#0284c7'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: transform 0.2s, background 0.2s;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          ">
            <span>📍</span>
            <span>${shortName}</span>
          </div>
        </div>
      `;

      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: 'province-node-marker',
          html: provinceHtml,
          iconSize: [0, 0],
        }),
        zIndexOffset: 300,
      }).addTo(map);

      marker.bindTooltip(
        `<div style="font-size:11px;font-weight:bold;">📍 ${p.name}</div><div style="font-size:10px;color:#38bdf8;">Haz clic para enfocar mapa aquí</div>`,
        { direction: 'top', offset: [0, -15] }
      );

      marker.on('click', () => {
        handleFlyTo(p);
      });

      provinceMarkersRef.current[p.name] = marker;
    });
  }, [activeProvinceName]);

  const handleFitAllUnits = () => {
    if (!mapInstanceRef.current || filteredUnits.length === 0) return;
    const latLngs = filteredUnits
      .filter((u) => u.lat && u.lng)
      .map((u) => [u.lat!, u.lng!] as [number, number]);
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  };

  // Automatic dropoff at Allied Office from Driver Card
  const handleDriverDropoffAtAlliedOffice = (unit: FleetUnit) => {
    const result = AdminService.autoDropoffByDriverUnit(unit.id, selectedOfficeForDropoff);
    const office = alliedOffices.find((o) => o.id === selectedOfficeForDropoff) || alliedOffices[0];

    if (result.updatedCount > 0) {
      audioService.playSuccessTone();
      setParcels(AdminService.getStoredParcels());
      setAlliedOffices(AdminService.getStoredAlliedOffices());
      setOfficeDropoffToast(result.message);
    } else {
      // If unit had no pre-assigned pending parcel, create & mark an express guide dropoff automatically
      const created = AdminService.addParcel({
        senderName: `Envío Express (${unit.driverName})`,
        senderPhone: unit.phone || '+593 99 856 6503',
        recipientName: `Recepción ${office?.shortName || 'Oficina Aliada'}`,
        recipientPhone: office?.phone || '+593 99 856 6503',
        pickupAddress: unit.currentOrigin || 'Ruta Cantonal',
        deliveryAddress: office?.address || 'Oficina Aliada AndesMovi',
        originOfficeId: 'OFI-TUL-01',
        originOfficeName: 'Oficina Central Matriz Tulcán',
        destinationOfficeId: office?.id || 'OFI-TUL-01',
        destinationOfficeName: office?.name || 'Oficina Aliada',
        packageDescription: `Encomienda dejada por unidad ${unit.id}`,
        packageWeight: '1.5 kg',
        fare: 3.00,
        paymentMethod: 'Efectivo',
        status: 'en_transito',
        assignedUnitId: unit.id,
        assignedDriver: `${unit.driverName} (${unit.id})`,
      });
      const autoRes = AdminService.markParcelDispatchedAndDeliveredAtOffice(created.id, office?.id || 'OFI-TUL-01');
      audioService.playSuccessTone();
      setParcels(AdminService.getStoredParcels());
      setAlliedOffices(AdminService.getStoredAlliedOffices());
      setOfficeDropoffToast(autoRes.message);
    }

    setTimeout(() => setOfficeDropoffToast(null), 7000);
  };

  const sedanCount = units.filter((u) => !isMotorcycle(u.vehicle)).length;
  const motoCount = units.filter((u) => isMotorcycle(u.vehicle)).length;

  // Find parcels assigned to the currently selected driver
  const driverActiveParcels = activeSelectedUnit
    ? parcels.filter((p) => p.assignedUnitId === activeSelectedUnit.id)
    : [];

  return (
    <div className="bg-[#121316] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full relative">
      {/* Automatic Allied Office Dropoff Toast Notification */}
      {officeDropoffToast && (
        <div className="bg-emerald-950/95 border-b border-emerald-500/60 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-200 z-30 animate-fadeIn">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{officeDropoffToast}</span>
          </div>
          <button
            onClick={() => setOfficeDropoffToast(null)}
            className="text-emerald-400 hover:text-white font-bold px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Map Bar */}
      <div className="p-3 bg-[#18191e] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm">
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="font-extrabold text-white text-xs flex items-center gap-2">
              <span>OpenStreetMap Oficial • Rastreo Satelital en Tiempo Real</span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HAZ CLIC EN UN VEHÍCULO PARA VER TARJETA DE CONDUCTOR
              </span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1 font-bold">
              <span>🇪🇨 Cobertura Satelital Activa en las 24 Provincias del Ecuador</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-300">🏢 {alliedOffices.length} Agencias Aliadas</span>
            </div>
          </div>
        </div>

        {/* Quick Province Selector (24 Provincias de Ecuador) & Map Presets */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* SELECTOR DESPLEGABLE DE LAS 24 PROVINCIAS DEL ECUADOR */}
            <select
              value={activeProvinceName}
              onChange={(e) => {
                const selected = CANTON_PRESETS.find(p => p.name === e.target.value);
                if (selected) handleFlyTo(selected);
              }}
              className="bg-[#22242a] text-emerald-300 font-bold border border-emerald-500/50 rounded-lg px-2.5 py-1 text-[11px] focus:outline-none focus:border-emerald-400 cursor-pointer shadow-sm"
            >
              {CANTON_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  📍 {p.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleFitAllUnits}
                title="Ajustar vista a todas las unidades"
                className="p-1.5 rounded-lg bg-[#22242a] hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Ver Flota</span>
              </button>

              {/* Toggle Map Tile Style */}
              <div className="flex items-center bg-[#202228] p-0.5 rounded-lg border border-zinc-700">
                <button
                  onClick={() => setTileMode('osm')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    tileMode === 'osm' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  OSM Calles
                </button>
                <button
                  onClick={() => setTileMode('voyager')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    tileMode === 'voyager' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Voyager Claro
                </button>
                <button
                  onClick={() => setTileMode('positron')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    tileMode === 'positron' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Positron Nítido
                </button>
              </div>
            </div>
          </div>

          {/* CINTA DESLIZABLE CON BOTONES DIRECTOS PARA LAS 24 PROVINCIAS DEL ECUADOR */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin scrollbar-thumb-zinc-700">
            <span className="text-[10px] font-bold text-emerald-400 uppercase shrink-0 px-1 flex items-center gap-1">
              📍 Saltos Directos:
            </span>
            {CANTON_PRESETS.map((p) => {
              const isSelected = activeProvinceName === p.name;
              const shortName = p.name.split(' ')[0];
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleFlyTo(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shrink-0 flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                      : 'bg-[#202228] hover:bg-zinc-700 text-zinc-200 border-zinc-700/80 hover:text-white'
                  }`}
                >
                  <span>📍</span>
                  <span>{shortName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter & Search Ribbon with Lupita (Buscar por nombre o placa) */}
      <div className="px-3 py-2.5 bg-[#14151a] border-b border-zinc-800/80 flex flex-col gap-2 text-[11px]">
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* LUPITA SEARCH BAR FOR DRIVER NAME OR PLATE */}
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length >= 2) {
                  const match = simulatedUnits.find(
                    (u) =>
                      u.driverName.toLowerCase().includes(val.toLowerCase().trim()) ||
                      u.plate.toLowerCase().includes(val.toLowerCase().trim())
                  );
                  if (match) {
                    onSelectUnit(match);
                  }
                }
              }}
              placeholder="Buscar conductor por nombre o número de placa (ej. Marco Rosero, PBC-4921)..."
              className="w-full bg-[#202228] border border-zinc-700 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#1e2026] p-0.5 rounded-lg border border-zinc-700">
              <button
                onClick={() => setFilterVehicle('todos')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  filterVehicle === 'todos' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todos ({units.length})
              </button>
              <button
                onClick={() => setFilterVehicle('sedan')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  filterVehicle === 'sedan'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>🚗</span>
                <span>Particulares ({sedanCount})</span>
              </button>
              <button
                onClick={() => setFilterVehicle('moto')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  filterVehicle === 'moto'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>🏍️</span>
                <span>Motos ({motoCount})</span>
              </button>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#202228] text-zinc-200 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="todos">Todos los Estados</option>
              <option value="disponible">Libres ({units.filter((u) => u.status === 'disponible').length})</option>
              <option value="en_carrera">En Carrera ({units.filter((u) => u.status === 'en_carrera').length})</option>
              <option value="en_camino">En Camino ({units.filter((u) => u.status === 'en_camino').length})</option>
              <option value="sos">Emergencia SOS ({units.filter((u) => u.status === 'sos').length})</option>
              <option value="offline">Offline ({units.filter((u) => u.status === 'offline').length})</option>
            </select>

            <select
              value={filterCanton}
              onChange={(e) => setFilterCanton(e.target.value)}
              className="bg-[#202228] text-zinc-200 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="todos">🇪🇨 Todas las Provincias / Cantones</option>
              <option value="Tulcán">Tulcán / Rumichaca (Carchi)</option>
              <option value="Montúfar">Montúfar / San Gabriel (Carchi)</option>
              <option value="Ibarra">Ibarra / Otavalo (Imbabura)</option>
              <option value="Quito">Quito (Pichincha)</option>
              <option value="Guayaquil">Guayaquil (Guayas)</option>
              <option value="Cuenca">Cuenca (Azuay)</option>
              <option value="Ambato">Ambato (Tungurahua)</option>
              <option value="Riobamba">Riobamba (Chimborazo)</option>
              <option value="Loja">Loja (Loja)</option>
              <option value="Machala">Machala (El Oro)</option>
              <option value="Portoviejo">Portoviejo / Manta (Manabí)</option>
              <option value="Esmeraldas">Esmeraldas (Esmeraldas)</option>
              <option value="Santo Domingo">Santo Domingo (Tsáchilas)</option>
              <option value="Latacunga">Latacunga (Cotopaxi)</option>
              <option value="Babahoyo">Babahoyo (Los Ríos)</option>
              <option value="Guaranda">Guaranda (Bolívar)</option>
              <option value="Azogues">Azogues (Cañar)</option>
              <option value="Santa Elena">Santa Elena (Santa Elena)</option>
              <option value="Lago Agrio">Lago Agrio / Nueva Loja (Sucumbíos)</option>
              <option value="Coca">El Coca (Orellana)</option>
              <option value="Puyo">Puyo (Pastaza)</option>
              <option value="Tena">Tena (Napo)</option>
              <option value="Macas">Macas (Morona Santiago)</option>
              <option value="Zamora">Zamora (Zamora Chinchipe)</option>
              <option value="Galápagos">Galápagos</option>
            </select>

            {/* Toggle Layers */}
            <div className="flex items-center gap-1 bg-[#202228] p-0.5 rounded-lg border border-zinc-700">
              <button
                onClick={() => setLayerVisibility('todos')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  layerVisibility === 'todos' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setLayerVisibility('unidades')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  layerVisibility === 'unidades' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Conductores ({filteredUnits.length})
              </button>
              <button
                onClick={() => setLayerVisibility('oficinas')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  layerVisibility === 'oficinas' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🏢 Oficinas ({alliedOffices.length})
              </button>
              <button
                onClick={() => setLayerVisibility('viajes')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                  layerVisibility === 'viajes' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Viajes ({trips ? trips.filter((t) => t.status !== 'cancelado').length : 0})
              </button>
            </div>

            <button
              onClick={() => setLiveTrackingActive(!liveTrackingActive)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                liveTrackingActive
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${liveTrackingActive ? 'bg-emerald-400 animate-ping' : 'bg-zinc-500'}`} />
              {liveTrackingActive ? 'GPS EN VIVO' : 'GPS PAUSADO'}
            </button>
          </div>
        </div>

        {/* Quick driver selector pills showing ONLY driver name and plate */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pt-0.5">
          <span className="text-[10px] text-zinc-400 font-semibold mr-1 shrink-0">Conductores en Mapa:</span>
          {filteredUnits.slice(0, 7).map((u) => (
            <button
              key={u.id}
              onClick={() => {
                audioService.playBeepTone();
                onSelectUnit(u);
              }}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeSelectedUnit?.id === u.id
                  ? 'bg-yellow-400 text-zinc-950 border-yellow-300 shadow'
                  : 'bg-zinc-800/90 text-zinc-200 border-zinc-700 hover:text-white'
              }`}
            >
              <span>{u.driverName}</span>
              <span className="font-mono text-[9px] opacity-80">({u.plate})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Container + Sliding Driver Profile Card Drawer */}
      <div className="relative flex-1 min-h-[520px] w-full bg-[#f8fafc] overflow-hidden flex">
        {/* Leaflet Map Canvas */}
        <div
          ref={mapContainerRef}
          className="w-full h-full min-h-[520px] z-0 flex-1"
          style={{ minHeight: '520px' }}
        />

        {/* ===================================================================== */}
        {/* SLIDING DRIVER & VEHICLE CARD ("TARJETA DE CONDUCTOR EN CENTRAL")     */}
        {/* Opens automatically whenever a vehicle logo is clicked on the map     */}
        {/* ===================================================================== */}
        {activeSelectedUnit && (
          <div className="w-full sm:w-[390px] md:w-[420px] bg-[#111216]/98 backdrop-blur-xl border-l border-zinc-700/80 shadow-2xl z-20 flex flex-col justify-between overflow-y-auto max-h-[560px] animate-fadeIn">
            <div>
              {/* Card Top Header */}
              <div className="p-3.5 bg-gradient-to-r from-[#181a20] to-[#121318] border-b border-zinc-800 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs">
                    {activeSelectedUnit.plate}
                  </span>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      {activeSelectedUnit.driverName}
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      Conductor Particular • Andes Movi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectUnit(null)}
                  title="Cerrar tarjeta de conductor"
                  className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dual Photo Showcase: Vehicle Banner + Driver Portrait */}
              <div className="relative h-40 w-full bg-zinc-900 overflow-hidden border-b border-zinc-800">
                {/* Vehicle Photo */}
                <img
                  src={
                    activeSelectedUnit.vehiclePhoto ||
                    (isMotorcycle(activeSelectedUnit.vehicle) ? DEFAULT_MOTO_PHOTO : DEFAULT_SEDAN_PHOTO)
                  }
                  alt={activeSelectedUnit.vehicle}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111216] via-[#111216]/30 to-transparent" />

                {/* Vehicle Type & Plate Badge on Top Right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg border ${
                      isMotorcycle(activeSelectedUnit.vehicle)
                        ? 'bg-amber-950/90 text-amber-300 border-amber-600'
                        : 'bg-blue-950/90 text-blue-300 border-blue-600'
                    }`}
                  >
                    {isMotorcycle(activeSelectedUnit.vehicle) ? '🏍️ Moto Particular' : '🚗 Vehículo Particular'}
                  </span>
                  <span className="bg-yellow-400 text-zinc-950 font-mono font-black text-xs px-2.5 py-1 rounded-lg border-2 border-zinc-900 shadow-lg">
                    {activeSelectedUnit.plate}
                  </span>
                </div>

                {/* Driver Portrait Avatar Overlapping Bottom Left */}
                <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-3">
                  <div className="flex items-end gap-3">
                    <div className="relative">
                      <img
                        src={activeSelectedUnit.driverPhoto || DEFAULT_DRIVER_PHOTO}
                        alt={activeSelectedUnit.driverName}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-yellow-400 shadow-xl bg-zinc-800"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#111216] ${
                          activeSelectedUnit.status === 'disponible'
                            ? 'bg-emerald-400'
                            : activeSelectedUnit.status === 'en_carrera'
                            ? 'bg-blue-400'
                            : activeSelectedUnit.status === 'en_camino'
                            ? 'bg-amber-400'
                            : activeSelectedUnit.status === 'sos'
                            ? 'bg-red-500 animate-ping'
                            : 'bg-zinc-500'
                        }`}
                      />
                    </div>
                    <div className="pb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> CONDUCTOR VERIFICADO
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white leading-tight mt-0.5">
                        {activeSelectedUnit.driverName}
                      </h4>
                      <p className="text-xs text-blue-400 font-semibold">
                        Vehículo Particular • Placa {activeSelectedUnit.plate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle Specifications */}
              <div className="p-4 space-y-3.5 text-xs">
                {/* Status & Quick KPIs */}
                <div className="grid grid-cols-3 gap-2 bg-[#18191f] p-2.5 rounded-xl border border-zinc-800/90 text-center">
                  <div>
                    <div className="text-[10px] text-zinc-400 font-mono">Calificación</div>
                    <div className="text-sm font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {activeSelectedUnit.rating.toFixed(2)}
                    </div>
                  </div>
                  <div className="border-x border-zinc-800">
                    <div className="text-[10px] text-zinc-400 font-mono">Carreras Hoy</div>
                    <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                      {activeSelectedUnit.completedTrips}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400 font-mono">Velocidad GPS</div>
                    <div className="text-sm font-black text-blue-400 font-mono mt-0.5">
                      {activeSelectedUnit.speedKmh ?? 35} km/h
                    </div>
                  </div>
                </div>

                {/* Vehicle Details Box */}
                <div className="bg-[#16181f] border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center justify-between">
                    <span>Datos del Vehículo y Documentación</span>
                    <span className="text-emerald-400">{activeSelectedUnit.vehicleYear || 2022}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Vehículo / Modelo:</span>
                      <span className="font-bold text-white">{activeSelectedUnit.vehicle}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Placa Oficial:</span>
                      <span className="font-mono font-bold text-yellow-300">{activeSelectedUnit.plate}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Licencia ANT:</span>
                      <span className="text-zinc-200 font-medium">
                        {activeSelectedUnit.licenseType || 'Profesional Tipo C'} ({activeSelectedUnit.antPoints || 30} pts)
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Póliza SPPAT / SOAT:</span>
                      <span className="text-emerald-400 font-medium">
                        {activeSelectedUnit.soatStatus || 'Vigente 2027'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-time Location & Route */}
                <div className="bg-[#16181f] border border-zinc-800 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>TELEMETRÍA Y UBICACIÓN ACTUAL</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5" /> {activeSelectedUnit.batteryLevel || 90}%
                    </span>
                  </div>
                  <div className="text-zinc-200">
                    <span className="text-zinc-500">Cantón: </span>
                    <span className="font-bold text-blue-400">{activeSelectedUnit.canton}</span>
                  </div>
                  <div className="text-zinc-200">
                    <span className="text-zinc-500">Punto Actual: </span>
                    <span className="text-white">{activeSelectedUnit.currentOrigin || 'En circulación urbana'}</span>
                  </div>
                  <div className="text-zinc-200">
                    <span className="text-zinc-500">Destino / Estado: </span>
                    <span className="text-emerald-300">{activeSelectedUnit.currentDestination || 'Disponible'}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/80 flex justify-between">
                    <span>
                      GPS: {(activeSelectedUnit.lat || 0.8124).toFixed(4)}° N, {(activeSelectedUnit.lng || -77.7174).toFixed(4)}° W
                    </span>
                    <span>{activeSelectedUnit.lastUpdated}</span>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* AUTOMATIC PARCEL DROPOFF AT ALLIED OFFICE SECTION              */}
                {/* ============================================================== */}
                <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                      Entrega en Oficina Aliada (Guías)
                    </span>
                    <span className="text-[9px] bg-emerald-900/80 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                      AUTO-DESPACHO
                    </span>
                  </div>

                  {driverActiveParcels.length > 0 && (
                    <div className="text-[11px] bg-black/40 p-2 rounded-lg border border-emerald-800/60 space-y-1">
                      {driverActiveParcels.map((p) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-300">
                            📦 {p.id} ({p.guideNumber || p.id})
                          </span>
                          <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-200">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-300 block">
                      Oficina Aliada donde el conductor deja la encomienda:
                    </label>
                    <select
                      value={selectedOfficeForDropoff}
                      onChange={(e) => setSelectedOfficeForDropoff(e.target.value)}
                      className="w-full bg-[#121318] border border-emerald-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {alliedOffices.map((off) => (
                        <option key={off.id} value={off.id}>
                          🏢 {off.name} ({off.canton})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDriverDropoffAtAlliedOffice(activeSelectedUnit)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4" />
                      Dejar Encomienda en Oficina (Auto-Despachar y Entregar)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="p-3.5 bg-[#16181f] border-t border-zinc-800 space-y-2 sticky bottom-0">
              <div className="grid grid-cols-2 gap-2">
                {activeSelectedUnit.phone && (
                  <a
                    href={`tel:${activeSelectedUnit.phone}`}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Llamar ({activeSelectedUnit.phone})</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    if (mapInstanceRef.current && activeSelectedUnit.lat && activeSelectedUnit.lng) {
                      mapInstanceRef.current.flyTo([activeSelectedUnit.lat, activeSelectedUnit.lng], 17, {
                        duration: 0.8,
                      });
                    }
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs py-2.5 px-3 rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                  <span>Seguir en Mapa</span>
                </button>
              </div>

              {onDispatchToUnit && (
                <button
                  onClick={() => onDispatchToUnit(activeSelectedUnit)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Asignar Carrera / Servicio a {activeSelectedUnit.driverName}</span>
                </button>
              )}

              {activeSelectedUnit.status === 'sos' && (
                <button
                  onClick={async () => {
                    const streamUrl = await AdminService.requestEmergencyAudio(activeSelectedUnit.id);
                    alert(`Puente de audio de seguridad activado para ${activeSelectedUnit.driverName}. Escuchando en tiempo real desde: ${streamUrl}`);
                    audioService.playSirenAlarm();
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar Puente de Audio de Emergencia</span>
                </button>
              )}

              {onDeleteUnit && (
                <button
                  onClick={() => {
                    onDeleteUnit(activeSelectedUnit.id);
                    onSelectUnit(null);
                    audioService.playPTTKey();
                  }}
                  className="w-full bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/80 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Eliminar Conductor Directo (Sin Caché)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Trip Quick Action Card */}
      {selectedTrip && (
        <div className="p-3 bg-[#131b26] border-t border-blue-900/50 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Navigation className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">{selectedTrip.passengerName}</span>
                <span className="bg-emerald-950 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded text-[11px] border border-emerald-800">
                  ${selectedTrip.offeredFare.toFixed(2)} USD
                </span>
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                  {selectedTrip.paymentMethod}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {selectedTrip.status}
                </span>
              </div>
              <div className="text-xs text-zinc-300 flex items-center gap-2 mt-1">
                <span className="text-emerald-400 font-medium truncate max-w-[200px]">
                  Origen: {selectedTrip.origin}
                </span>
                <span className="text-zinc-500">➔</span>
                <span className="text-red-400 font-medium truncate max-w-[200px]">
                  Destino: {selectedTrip.destination}
                </span>
                {selectedTrip.driverUnit && (
                  <span className="text-blue-300 font-mono text-[11px] bg-blue-900/40 px-1.5 py-0.2 rounded border border-blue-700/60">
                    Asignado: {selectedTrip.driverUnit} ({selectedTrip.driverName})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  const bounds = L.latLngBounds(
                    [selectedTrip.originLat, selectedTrip.originLng],
                    [selectedTrip.destLat, selectedTrip.destLng]
                  );
                  mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
                }
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              Ver Ruta Completa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
