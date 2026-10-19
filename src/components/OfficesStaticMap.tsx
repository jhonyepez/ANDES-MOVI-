import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlliedOffice } from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import {
  Building2,
  MapPin,
  Search,
  Phone,
  Clock,
  Maximize2,
  PackageCheck,
  X,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

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

export const OfficesStaticMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const officeMarkersRef = useRef<{ [key: string]: L.Marker }>({});

  const [offices, setOffices] = useState<AlliedOffice[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<AlliedOffice | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProvinceName, setActiveProvinceName] = useState<string>('Tulcán (Carchi - Matriz)');
  const [tileMode, setTileMode] = useState<'osm' | 'voyager' | 'positron'>('osm');

  useEffect(() => {
    setOffices(AdminService.getStoredAlliedOffices());
  }, []);

  const filteredOffices = offices.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      o.name.toLowerCase().includes(q) ||
      o.shortName.toLowerCase().includes(q) ||
      o.canton.toLowerCase().includes(q) ||
      o.address.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    );
  });

  const getTileUrl = (mode: string) => {
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
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileLayer = L.tileLayer(getTileUrl(tileMode), {
        attribution: '&copy; OpenStreetMap (Mapa Fijo Oficinas)',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      mapInstanceRef.current = map;
      (map as unknown as { _tileLayer: L.TileLayer })._tileLayer = tileLayer;

      setTimeout(() => map.invalidateSize(), 200);
      setTimeout(() => map.invalidateSize(), 600);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentLayer = (map as unknown as { _tileLayer?: L.TileLayer })._tileLayer;
    if (currentLayer) map.removeLayer(currentLayer);

    const newLayer = L.tileLayer(getTileUrl(tileMode), {
      attribution: '&copy; OpenStreetMap (Mapa Fijo Oficinas)',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    (map as unknown as { _tileLayer: L.TileLayer })._tileLayer = newLayer;
  }, [tileMode]);

  // Render Allied Offices Markers on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.keys(officeMarkersRef.current).forEach((id) => {
      map.removeLayer(officeMarkersRef.current[id]);
      delete officeMarkersRef.current[id];
    });

    filteredOffices.forEach((office) => {
      const isSelected = selectedOffice?.id === office.id;
      const officeHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
          <div style="
            width: ${isSelected ? '38px' : '32px'};
            height: ${isSelected ? '38px' : '32px'};
            border-radius: 12px;
            background: ${isSelected ? '#0284c7' : '#0f172a'};
            border: 2px solid ${isSelected ? '#38bdf8' : '#38bdf8'};
            box-shadow: 0 4px 14px rgba(14, 165, 233, ${isSelected ? '0.8' : '0.45'});
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            transition: transform 0.2s;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          ">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
              <path d="M9 22v-4h6v4"></path>
              <path d="M8 6h.01"></path>
              <path d="M16 6h.01"></path>
              <path d="M12 6h.01"></path>
              <path d="M12 10h.01"></path>
              <path d="M12 14h.01"></path>
              <path d="M16 10h.01"></path>
              <path d="M16 14h.01"></path>
              <path d="M8 10h.01"></path>
              <path d="M8 14h.01"></path>
            </svg>
          </div>
          <div style="
            background: #0369a1;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 6px;
            border: 1px solid #38bdf8;
            margin-top: 3px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.6);
          ">
            🏢 ${office.shortName}
          </div>
        </div>
      `;

      const marker = L.marker([office.lat, office.lng], {
        icon: L.divIcon({
          className: 'allied-office-static-marker',
          html: officeHtml,
          iconSize: [0, 0],
        }),
      }).addTo(map);

      marker.bindTooltip(
        `<div style="font-size:11px;font-weight:bold;">🏢 ${office.name}</div><div style="font-size:10px;">${office.address}<br/>Contacto: ${office.phone || '+593 99 856 6503'}</div>`,
        { direction: 'top', offset: [0, -36] }
      );

      marker.on('click', () => {
        setSelectedOffice(office);
        audioService.playBeepTone();
      });

      officeMarkersRef.current[office.id] = marker;
    });
  }, [filteredOffices, selectedOffice]);

  const handleFlyTo = (preset: (typeof CANTON_PRESETS)[0]) => {
    setActiveProvinceName(preset.name);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lng], preset.zoom, { duration: 1.2 });
    }
    audioService.playBeepTone();
  };

  const handleFlyToOffice = (office: AlliedOffice) => {
    setSelectedOffice(office);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([office.lat, office.lng], 16, { duration: 1.2 });
    }
    audioService.playBeepTone();
  };

  return (
    <div className="bg-[#0e0f14] border border-sky-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full font-sans text-xs">
      {/* Header Banner for Mapa Fijo de Oficinas */}
      <div className="bg-[#12141c] p-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                <span>MAPA FIJO: Oficinas, Agencias y Puntos Aliados</span>
                <span className="bg-sky-950 text-sky-300 border border-sky-700 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  🏢 {offices.length} Oficinas Fijas
                </span>
              </h2>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Visualización exclusiva de la red fija de terminales y agencias recepcionistas en las 24 provincias (Sin carros en movimiento).
            </p>
          </div>
        </div>

        {/* Tile mode buttons */}
        <div className="flex items-center gap-1 bg-[#181a22] p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setTileMode('osm')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              tileMode === 'osm' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            OSM Calles
          </button>
          <button
            onClick={() => setTileMode('voyager')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              tileMode === 'voyager' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Voyager
          </button>
          <button
            onClick={() => setTileMode('positron')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              tileMode === 'positron' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Positron
          </button>
        </div>
      </div>

      {/* Buscador de Oficina y Cinta de 24 Provincias */}
      <div className="p-2.5 bg-[#141620] border-b border-zinc-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Lupita buscador de oficina */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar agencia por ciudad, provincia o nombre..."
              className="w-full bg-[#1c1e28] border border-zinc-700 focus:border-sky-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={activeProvinceName}
            onChange={(e) => {
              const p = CANTON_PRESETS.find((x) => x.name === e.target.value);
              if (p) handleFlyTo(p);
            }}
            className="bg-[#1c1e28] text-sky-300 font-bold border border-sky-500/40 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            {CANTON_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                📍 {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cinta deslizable de 24 Provincias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
          <span className="text-[10px] font-bold text-sky-400 uppercase shrink-0 px-1 flex items-center gap-1">
            📍 Enfocar Provincia:
          </span>
          {CANTON_PRESETS.map((p) => {
            const isSelected = activeProvinceName === p.name;
            const shortName = p.name.split(' ')[0];
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => handleFlyTo(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30'
                    : 'bg-[#1c1e28] hover:bg-zinc-700 text-zinc-300 border-zinc-700/80 hover:text-white'
                }`}
              >
                <span>📍</span>
                <span>{shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container: Map + Left/Right Office List sidebar */}
      <div className="relative flex-1 min-h-[480px] grid grid-cols-1 lg:grid-cols-12">
        {/* Map Canvas */}
        <div className="lg:col-span-8 relative min-h-[420px] bg-[#090a0f]">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

          {/* Selected Office Floating Info Card */}
          {selectedOffice && (
            <div className="absolute top-3 left-3 z-10 bg-[#0f1118]/95 border-2 border-sky-500/80 backdrop-blur-md p-3.5 rounded-2xl max-w-xs shadow-2xl space-y-2 animate-fadeIn text-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="bg-sky-950 text-sky-300 border border-sky-700 text-[9px] font-mono px-2 py-0.5 rounded font-black">
                    {selectedOffice.id}
                  </span>
                  <h3 className="text-xs font-black mt-1 leading-tight text-white">
                    {selectedOffice.name}
                  </h3>
                  <p className="text-[10px] text-sky-400 font-bold">{selectedOffice.canton}</p>
                </div>
                <button
                  onClick={() => setSelectedOffice(null)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-[11px] text-zinc-300 pt-1 border-t border-zinc-800">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{selectedOffice.address}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-mono font-bold">{selectedOffice.phone || '+593 99 856 6503'}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Horario: {selectedOffice.hours || '06:00 - 22:00'}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    Recepciones: <strong className="text-sky-300">{selectedOffice.packagesReceived || 12} paquetes</strong>
                  </span>
                </p>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => handleFlyToOffice(selectedOffice)}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-1.5 rounded-xl uppercase text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
                >
                  <Navigation className="w-3 h-3" /> Centrar en Esta Agencia
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar List of Allied Offices */}
        <div className="lg:col-span-4 bg-[#12141d] border-l border-zinc-800 p-3 overflow-y-auto max-h-[580px] space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-[11px] font-black text-white uppercase flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-400" />
              Lista de Agencias ({filteredOffices.length})
            </span>
            <span className="text-[10px] font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
              Puntos Fijos
            </span>
          </div>

          <div className="space-y-2">
            {filteredOffices.map((office) => {
              const isSelected = selectedOffice?.id === office.id;
              return (
                <div
                  key={office.id}
                  onClick={() => handleFlyToOffice(office)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-500 ring-1 ring-sky-400/50 shadow-lg'
                      : 'bg-[#181a24] hover:bg-[#1e202e] border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold text-sky-400 bg-sky-950 px-1.5 py-0.2 rounded border border-sky-800">
                          {office.id}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-300">{office.canton}</span>
                      </div>
                      <h4 className="text-xs font-black text-white mt-1 leading-tight">
                        {office.shortName}
                      </h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{office.address}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFlyToOffice(office);
                      }}
                      className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 transition shrink-0"
                      title="Ver en el mapa fijo"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Recepción Activa
                    </span>
                    <span className="text-zinc-400 font-mono">📞 +593 99 856 6503</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
