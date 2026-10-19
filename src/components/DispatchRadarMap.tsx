import React, { useState } from 'react';
import { FleetUnit, UnitStatus } from '../models/admin_models';
import { Car, Navigation, ShieldAlert, Star, Radio, Zap, Battery, Crosshair, MapPin, Layers } from 'lucide-react';

interface Props {
  units: FleetUnit[];
  selectedUnit: FleetUnit | null;
  onSelectUnit: (unit: FleetUnit) => void;
  onDispatchToUnit?: (unit: FleetUnit) => void;
}

const CANTON_VIEWS = [
  { id: 'todos', name: 'Corredor Completo Carchi-Pichincha', label: 'Ver Todo el Corredor E35' },
  { id: 'Tulcán', name: 'Tulcán Matriz & Rumichaca', label: 'Carchi • Tulcán' },
  { id: 'Montúfar', name: 'San Gabriel / Montúfar', label: 'Carchi • San Gabriel' },
  { id: 'Ibarra', name: 'Ibarra & Imbabura', label: 'Imbabura • Ibarra' },
  { id: 'Quito', name: 'Quito Norte / Carcelén', label: 'Pichincha • Quito Norte' },
];

export const NativeTacticalRadar: React.FC<Props> = ({
  units,
  selectedUnit,
  onSelectUnit,
  onDispatchToUnit,
}) => {
  const [activeCanton, setActiveCanton] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [mapStyle, setMapStyle] = useState<'tactico' | 'topografico'>('tactico');

  // Filter units
  const filteredUnits = units.filter((u) => {
    if (activeCanton !== 'todos' && !u.canton.toLowerCase().includes(activeCanton.toLowerCase())) {
      return false;
    }
    if (filterStatus !== 'todos' && u.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status: UnitStatus) => {
    switch (status) {
      case 'disponible':
        return {
          bg: '#10b981',
          border: 'border-emerald-500',
          ring: 'ring-emerald-500/30',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400',
          badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-600',
          label: 'Disponible',
        };
      case 'en_carrera':
        return {
          bg: '#3b82f6',
          border: 'border-blue-500',
          ring: 'ring-blue-500/30',
          text: 'text-blue-400',
          dot: 'bg-blue-400',
          badge: 'bg-blue-950/90 text-blue-300 border-blue-600',
          label: 'En Carrera',
        };
      case 'en_camino':
        return {
          bg: '#f59e0b',
          border: 'border-amber-500',
          ring: 'ring-amber-500/30',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
          badge: 'bg-amber-950/90 text-amber-300 border-amber-600',
          label: 'En Camino',
        };
      case 'sos':
        return {
          bg: '#ef4444',
          border: 'border-red-500',
          ring: 'ring-red-500/50',
          text: 'text-red-400',
          dot: 'bg-red-500 animate-ping',
          badge: 'bg-red-950 text-red-200 border-red-500',
          label: 'EMERGENCIA SOS',
        };
      case 'offline':
      default:
        return {
          bg: '#71717a',
          border: 'border-zinc-600',
          ring: 'ring-zinc-600/20',
          text: 'text-zinc-400',
          dot: 'bg-zinc-500',
          badge: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          label: 'Offline',
        };
    }
  };

  // Coordenadas calculadas dentro del mapa vectorial de Ecuador
  const getUnitCoordinates = (unit: FleetUnit) => {
    // Relative coordinates % within SVG map
    const predefined: Record<string, { x: number; y: number }> = {
      'AM-012': { x: 42, y: 22 }, // Tulcán Centro
      'AM-028': { x: 48, y: 18 }, // Tulcán Norte / Hospital
      'AM-035': { x: 54, y: 44 }, // Montúfar / San Gabriel
      'AM-044': { x: 62, y: 68 }, // Ibarra Centro
      'AM-051': { x: 36, y: 26 }, // Tulcán Oeste
      'AM-063': { x: 68, y: 76 }, // Otavalo
      'AM-072': { x: 74, y: 88 }, // Quito Carcelén
    };

    if (predefined[unit.id]) return predefined[unit.id];

    // Fallback hash
    const charCode = unit.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return {
      x: 30 + (charCode % 45),
      y: 20 + ((charCode * 3) % 65),
    };
  };

  return (
    <div className="bg-[#101216] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full select-none">
      {/* Top Map Toolbar - 100% NATIVE, ZERO EXTERNAL APIS */}
      <div className="p-3 bg-[#15171d] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Crosshair className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="font-extrabold text-white text-xs flex items-center gap-2">
              <span>Radar Cartográfico Nativo AndesMovi</span>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                100% SIN API EXTERNA
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Ecuador Troncal Sierra E35 • Monitoreo Local en Memoria
            </div>
          </div>
        </div>

        {/* Quick Canton Jump Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CANTON_VIEWS.map((cv) => (
            <button
              key={cv.id}
              onClick={() => setActiveCanton(cv.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                activeCanton === cv.id
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-900/40'
                  : 'bg-[#1e2027] border-zinc-700/70 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {cv.label}
            </button>
          ))}

          <button
            onClick={() => setMapStyle(mapStyle === 'tactico' ? 'topografico' : 'tactico')}
            className="p-1.5 rounded-lg bg-[#1e2027] hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Alternar estilo visual"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">
              {mapStyle === 'tactico' ? 'Modo Táctico' : 'Modo Terreno'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="px-3 py-1.5 bg-[#12141a] border-b border-zinc-800/80 flex items-center justify-between text-[11px] gap-2 flex-wrap font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Filtrar:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1c1e26] text-zinc-200 border border-zinc-700 rounded px-2 py-0.5 text-xs focus:outline-none"
          >
            <option value="todos">Todos los Estados ({units.length})</option>
            <option value="disponible">Libres ({units.filter((u) => u.status === 'disponible').length})</option>
            <option value="en_carrera">En Carrera ({units.filter((u) => u.status === 'en_carrera').length})</option>
            <option value="en_camino">En Camino ({units.filter((u) => u.status === 'en_camino').length})</option>
            <option value="sos">Alerta SOS ({units.filter((u) => u.status === 'sos').length})</option>
            <option value="offline">Offline ({units.filter((u) => u.status === 'offline').length})</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponible ({units.filter((u) => u.status === 'disponible').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> En Carrera ({units.filter((u) => u.status === 'en_carrera').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> En Camino ({units.filter((u) => u.status === 'en_camino').length})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> SOS ({units.filter((u) => u.status === 'sos').length})
          </span>
        </div>
      </div>

      {/* Main Self-Contained Vector Map & Radar Display */}
      <div className="relative flex-1 min-h-[420px] bg-[#07090d] overflow-hidden select-none">
        {/* Native SVG Map Background depicting Northern Ecuadorian Andean Corridor */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1000 650"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="radarGrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#172235" strokeWidth="1" strokeOpacity="0.6" />
            </pattern>
            {/* Mountain Gradient */}
            <linearGradient id="andesMountain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="roadGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Background grid */}
          <rect width="100%" height="100%" fill="url(#radarGrid)" />

          {/* Andean Mountain Ranges Contours (Cordillera de los Andes del Norte: Chiles, Cotacachi, Imbabura, Pichincha) */}
          <path
            d="M 120 50 Q 250 140 380 90 T 520 220 T 700 350 T 820 520 T 940 620 L 1000 650 L 0 650 Z"
            fill="url(#andesMountain)"
          />
          <path
            d="M 280 30 Q 390 110 490 80 T 630 190 T 780 380 T 890 560"
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            strokeOpacity="0.4"
          />

          {/* Primary Highway: Troncal de la Sierra E35 (Panamericana Norte Ecuador) */}
          {/* From Rumichaca (Top) -> Tulcán -> San Gabriel -> Bolívar -> Ibarra -> Otavalo -> Guayllabamba -> Quito (Bottom) */}
          <path
            d="M 480 80 L 440 140 L 420 180 L 470 250 L 520 330 L 540 370 L 610 460 L 640 500 L 710 570 L 740 620"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeOpacity="0.8"
            strokeLinecap="round"
          />
          <path
            d="M 480 80 L 440 140 L 420 180 L 470 250 L 520 330 L 540 370 L 610 460 L 640 500 L 710 570 L 740 620"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeDasharray="8 8"
            strokeOpacity="0.6"
          />

          {/* Secondary Arterials */}
          {/* Rumichaca Border Connection */}
          <path d="M 480 80 L 560 60" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeOpacity="0.6" />
          {/* Vía Julio Andrade / Sucumbíos */}
          <path d="M 420 180 L 320 220 L 260 280" fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.4" />
          {/* Vía Mira / El Ángel */}
          <path d="M 520 330 L 440 360 L 390 410" fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.4" />
          {/* Vía Urcuquí / Yachay */}
          <path d="M 610 460 L 530 450" fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.4" />

          {/* City / Canton Hub Regions (Polygons & Labels) */}
          {/* 1. Tulcán Matriz */}
          <circle cx="430" cy="150" r="42" fill="#3b82f6" fillOpacity="0.08" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="430" cy="150" r="4" fill="#38bdf8" />
          <text x="445" y="145" fill="#93c5fd" fontSize="12" fontWeight="bold" fontFamily="monospace">
            TULCÁN (CENTRO MATRIZ)
          </text>
          <text x="445" y="158" fill="#64748b" fontSize="9" fontFamily="monospace">
            Lat: 0.8124° N • Alt: 2,980 m
          </text>

          {/* Rumichaca */}
          <rect x="550" y="50" width="12" height="12" rx="3" fill="#f59e0b" fillOpacity="0.4" stroke="#f59e0b" strokeWidth="1" />
          <text x="570" y="60" fill="#fcd34d" fontSize="10" fontWeight="bold" fontFamily="monospace">
            PUENTE INTERNACIONAL RUMICHACA
          </text>

          {/* 2. San Gabriel / Montúfar */}
          <circle cx="535" cy="350" r="36" fill="#10b981" fillOpacity="0.08" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="535" cy="350" r="4" fill="#34d399" />
          <text x="550" y="345" fill="#a7f3d0" fontSize="12" fontWeight="bold" fontFamily="monospace">
            SAN GABRIEL / MONTÚFAR
          </text>
          <text x="550" y="358" fill="#64748b" fontSize="9" fontFamily="monospace">
            Lat: 0.6012° N • Bosque de los Arrayanes
          </text>

          {/* 3. Ibarra / Otavalo */}
          <circle cx="625" cy="480" r="46" fill="#f59e0b" fillOpacity="0.08" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="625" cy="480" r="4" fill="#fbbf24" />
          <text x="640" y="475" fill="#fde68a" fontSize="12" fontWeight="bold" fontFamily="monospace">
            IBARRA / CORREDOR LAGOS
          </text>
          <text x="640" y="488" fill="#64748b" fontSize="9" fontFamily="monospace">
            Lat: 0.3517° N • Laguna Yahuarcocha
          </text>

          {/* 4. Quito Norte / Carcelén */}
          <circle cx="730" cy="595" r="40" fill="#ec4899" fillOpacity="0.08" stroke="#ec4899" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="730" cy="595" r="4" fill="#f472b6" />
          <text x="745" y="590" fill="#fbcfe8" fontSize="12" fontWeight="bold" fontFamily="monospace">
            QUITO NORTE (CARCELÉN)
          </text>
          <text x="745" y="603" fill="#64748b" fontSize="9" fontFamily="monospace">
            Lat: -0.1023° N • Terminal Interprovincial
          </text>

          {/* Concentric Radar Rings */}
          <circle cx="500" cy="325" r="280" fill="none" stroke="#1e293b" strokeWidth="1" strokeOpacity="0.5" />
          <circle cx="500" cy="325" r="180" fill="none" stroke="#1e293b" strokeWidth="1" strokeOpacity="0.5" />
          <circle cx="500" cy="325" r="90" fill="none" stroke="#1e293b" strokeWidth="1" strokeOpacity="0.5" />
        </svg>

        {/* Animated Sweep Radar Needle (Subtle & High Tech) */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full pointer-events-none opacity-25 animate-spin"
          style={{ animationDuration: '18s' }}
        >
          <div className="w-1/2 h-1/2 bg-gradient-to-br from-blue-500/40 to-transparent origin-bottom-right" />
        </div>

        {/* Dynamic Interactive Unit Markers Positioned on the Vector Map */}
        {filteredUnits.map((unit) => {
          const coords = getUnitCoordinates(unit);
          const st = getStatusColor(unit.status);
          const isSelected = selectedUnit?.id === unit.id;

          return (
            <div
              key={unit.id}
              onClick={() => onSelectUnit(unit)}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform duration-200 hover:scale-125 group"
            >
              {/* Outer pulsing ping for SOS / Active */}
              {unit.status === 'sos' && (
                <div className="absolute -inset-4 rounded-full bg-red-500/50 animate-ping pointer-events-none" />
              )}
              {unit.status === 'disponible' && (
                <div className="absolute -inset-1.5 rounded-full bg-emerald-400/25 animate-pulse pointer-events-none" />
              )}

              {/* Marker pin icon */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-xl border-2 shadow-xl backdrop-blur-md transition-all ${
                  isSelected
                    ? 'border-yellow-400 bg-yellow-400/20 ring-4 ring-yellow-400/30 scale-115'
                    : `${st.border} ${st.ring}`
                }`}
                style={{ backgroundColor: `${st.bg}25` }}
              >
                {unit.status === 'sos' ? (
                  <ShieldAlert className="w-4 h-4 text-red-400 animate-bounce" />
                ) : (
                  <Car className={`w-3.5 h-3.5 ${st.text}`} />
                )}

                {/* Status Dot */}
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black ${st.dot}`} />
              </div>

              {/* Unit Tag Pill */}
              <div
                className={`mt-1 text-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-tight shadow-md border whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-yellow-400 text-zinc-950 border-yellow-300 font-extrabold'
                    : `${st.badge}`
                }`}
              >
                {unit.id}
              </div>

              {/* Hover Tooltip Card */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                <div className="bg-[#18191e] border border-zinc-700 text-white rounded-xl p-2.5 shadow-2xl w-52 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-blue-400 pb-1 border-b border-zinc-800">
                    <span>{unit.id} • {unit.plate}</span>
                    <span className="text-zinc-400 text-[10px]">{unit.canton}</span>
                  </div>
                  <div className="mt-1 font-semibold text-zinc-100">{unit.driverName}</div>
                  <div className="text-[10px] text-zinc-400">{unit.vehicle}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {unit.rating.toFixed(1)}
                    </span>
                    <span className="text-zinc-400">{unit.completedTrips} carreras hoy</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-zinc-800 text-[10px] text-zinc-300 font-mono truncate">
                    {unit.currentOrigin || unit.lastUpdated}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Unit Quick Action Card */}
      {selectedUnit && (
        <div className="p-3 bg-[#15171d] border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/40 flex items-center justify-center text-blue-400">
              {selectedUnit.status === 'sos' ? (
                <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
              ) : (
                <Car className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">{selectedUnit.id}</span>
                <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-700">
                  {selectedUnit.plate}
                </span>
                <span className="text-[10px] text-zinc-400">{selectedUnit.cooperative}</span>
              </div>
              <div className="text-xs text-zinc-300 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-white">{selectedUnit.driverName}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">{selectedUnit.vehicle}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-blue-400">{selectedUnit.canton}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 text-zinc-400 text-xs font-mono mr-2">
              <span className="flex items-center gap-1 text-emerald-400">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {selectedUnit.rating}
              </span>
              <span>{selectedUnit.completedTrips} carreras</span>
              <span>Bat: {selectedUnit.batteryLevel || 85}%</span>
            </div>

            {selectedUnit.status === 'disponible' && onDispatchToUnit && (
              <button
                onClick={() => onDispatchToUnit(selectedUnit)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                Despachar Carrera a {selectedUnit.id}
              </button>
            )}

            <button
              onClick={() => {
                alert(`Unidad ${selectedUnit.id} enlazada en frecuencia. Chofer: ${selectedUnit.driverName}. Estado: ${selectedUnit.status.toUpperCase()}.`);
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-2 rounded-xl border border-zinc-700 transition cursor-pointer flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5 text-zinc-400" />
              Enlazar Radio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
