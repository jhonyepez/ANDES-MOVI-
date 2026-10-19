import React, { useState, useEffect } from 'react';
import { TripModel, TripStatus, FleetUnit, FirebaseConfigModel } from '../models/admin_models';
import { firebaseSyncService } from '../services/firebase_service';
import { audioService } from '../services/audio_service';
import {
  Car,
  Navigation,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  User,
  Phone,
  Flame,
  ShieldCheck,
  Database,
  ExternalLink,
  ChevronDown,
  X,
  CreditCard,
  Banknote,
  Send,
  AlertCircle,
  MapPin,
  Settings,
  Trash2,
  Trash,
  AlertOctagon,
} from 'lucide-react';

interface Props {
  units: FleetUnit[];
  onViewOnMap: (trip: TripModel) => void;
  onDispatchUnitToTrip?: (trip: TripModel, unit: FleetUnit) => void;
  commissionRate: number;
  onCommissionRateChange: (newRate: number) => void;
}

export const TripsLiveTable: React.FC<Props> = ({
  units,
  onViewOnMap,
  onDispatchUnitToTrip,
  commissionRate,
  onCommissionRateChange,
}) => {
  const [trips, setTrips] = useState<TripModel[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFirebaseLive, setIsFirebaseLive] = useState(firebaseSyncService.isCloudConnected());

  // Modal states
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [assigningTrip, setAssigningTrip] = useState<TripModel | null>(null);
  
  // Deletion states (Firestore Eliminar)
  const [tripToDelete, setTripToDelete] = useState<TripModel | null>(null);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchDeleteType, setBatchDeleteType] = useState<'selected' | 'finalizados_o_cancelados'>('selected');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // New Trip form state
  const [newPassengerName, setNewPassengerName] = useState('');
  const [newPassengerPhone, setNewPassengerPhone] = useState('09');
  const [newOrigin, setNewOrigin] = useState('Parque Central 24 de Mayo');
  const [newDestination, setNewDestination] = useState('Terminal Terrestre de Tulcán');
  const [newOriginLat, setNewOriginLat] = useState(0.8116);
  const [newOriginLng, setNewOriginLng] = useState(-77.7173);
  const [newDestLat, setNewDestLat] = useState(0.8189);
  const [newDestLng, setNewDestLng] = useState(-77.7245);
  const [newFare, setNewFare] = useState<number>(2.00); // Pasos de ±0.25
  const [newPaymentMethod, setNewPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [newNotes, setNewNotes] = useState('');

  // Firebase Config Modal State
  const [savedConfig, setSavedConfig] = useState<FirebaseConfigModel>(() => {
    return (
      firebaseSyncService.getSavedConfig() || {
        apiKey: 'AIzaSyDemoAndesMovi2026Key',
        authDomain: 'andesmovi-ecuador.firebaseapp.com',
        projectId: 'andesmovi-ecuador',
        storageBucket: 'andesmovi-ecuador.appspot.com',
        messagingSenderId: '868550262879',
        appId: '1:868550262879:web:9a471f021c4e92',
      }
    );
  });
  const [firebaseConnectedNotice, setFirebaseConnectedNotice] = useState<string | null>(null);

  // Subscribe to real-time 'viajes'
  useEffect(() => {
    const unsubscribe = firebaseSyncService.subscribeToViajes((updatedTrips) => {
      setTrips(updatedTrips);
      setIsFirebaseLive(firebaseSyncService.isCloudConnected());
    });
    return () => unsubscribe();
  }, []);

  // Filter & Search logic
  const filteredTrips = trips.filter((t) => {
    if (filterStatus !== 'todos' && t.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPassenger = t.passengerName.toLowerCase().includes(q);
      const matchOrigin = t.origin.toLowerCase().includes(q);
      const matchDest = t.destination.toLowerCase().includes(q);
      const matchDriver = (t.driverName || '').toLowerCase().includes(q);
      const matchUnit = (t.driverUnit || '').toLowerCase().includes(q);
      const matchPlate = (t.driverPlate || '').toLowerCase().includes(q);
      if (!matchPassenger && !matchOrigin && !matchDest && !matchDriver && !matchUnit && !matchPlate) {
        return false;
      }
    }
    return true;
  });

  // Financial and KPI calculations
  const totalTripsCount = trips.length;
  const activeTripsCount = trips.filter(
    (t) => t.status === 'buscando' || t.status === 'contraofertado' || t.status === 'aceptado' || t.status === 'en_camino'
  ).length;
  const completedTrips = trips.filter((t) => t.status === 'finalizado');
  const nonCancelledTrips = trips.filter((t) => t.status !== 'cancelado');

  const totalFaresGross = nonCancelledTrips.reduce((acc, t) => acc + (Number(t.offeredFare) || 0), 0);
  const totalCommissionsEarned = totalFaresGross * (commissionRate / 100);
  const averageFare = nonCancelledTrips.length > 0 ? totalFaresGross / nonCancelledTrips.length : 0;

  // Step fare adjuster (±$0.25 as required)
  const adjustFare = (delta: number) => {
    setNewFare((prev) => {
      const updated = Math.max(1.25, Math.round((prev + delta) * 100) / 100);
      return updated;
    });
    audioService.playBeepTone();
  };

  // Create new trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassengerName.trim() || !newOrigin.trim() || !newDestination.trim()) {
      return;
    }

    await firebaseSyncService.createTrip({
      passengerName: newPassengerName.trim(),
      passengerPhone: newPassengerPhone.trim(),
      passengerRating: 4.9,
      origin: newOrigin.trim(),
      destination: newDestination.trim(),
      originLat: newOriginLat,
      originLng: newOriginLng,
      destLat: newDestLat,
      destLng: newDestLng,
      offeredFare: newFare,
      paymentMethod: newPaymentMethod,
      status: 'buscando',
      driverId: null,
      driverName: null,
      driverUnit: null,
      driverPlate: null,
      counterOfferPrice: null,
      notes: newNotes.trim() || undefined,
    });

    audioService.playSuccessTone();
    setShowNewTripModal(false);
    // Reset form
    setNewPassengerName('');
    setNewPassengerPhone('09');
    setNewNotes('');
  };

  // Status Badge Helper
  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'buscando':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Buscando Conductor
          </span>
        );
      case 'contraofertado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Contraofertado
          </span>
        );
      case 'aceptado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Aceptado
          </span>
        );
      case 'en_camino':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            En Camino al Destino
          </span>
        );
      case 'finalizado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Finalizado
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {status}
          </span>
        );
    }
  };

  // Change Trip Status
  const handleQuickStatusChange = async (tripId: string, nextStatus: TripStatus) => {
    await firebaseSyncService.updateTripStatus(tripId, nextStatus);
    audioService.playBeepTone();
  };

  // Assign Unit
  const handleAssignUnit = async (trip: TripModel, unit: FleetUnit) => {
    await firebaseSyncService.assignUnitToTrip(trip.id, unit);
    audioService.playDispatchTone();
    setAssigningTrip(null);
  };

  // Connect Firebase
  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const success = firebaseSyncService.initFirebase(savedConfig);
    if (success) {
      setFirebaseConnectedNotice('Configuración guardada y Firestore inicializado con éxito.');
      setIsFirebaseLive(true);
      setTimeout(() => setShowFirebaseModal(false), 1200);
    } else {
      setFirebaseConnectedNotice('Error al conectar con las credenciales ingresadas. Verifique el Project ID.');
    }
  };

  // Selection handlers
  const toggleSelectTrip = (tripId: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTripIds.length === filteredTrips.length) {
      setSelectedTripIds([]);
    } else {
      setSelectedTripIds(filteredTrips.map((t) => t.id));
    }
  };

  // Delete Handlers (FIRESTORE • eliminar)
  const handleConfirmDeleteSingle = async () => {
    if (!tripToDelete) return;
    setIsDeleting(true);
    try {
      await firebaseSyncService.deleteTrip(tripToDelete.id);
      audioService.playBeepTone();
      setSelectedTripIds((prev) => prev.filter((id) => id !== tripToDelete.id));
      setDeleteNotice(`Viaje ${tripToDelete.id} (${tripToDelete.passengerName}) eliminado exitosamente de Firestore.`);
      setTimeout(() => setDeleteNotice(null), 3500);
      setTripToDelete(null);
    } catch (e) {
      console.error('Error al eliminar viaje:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteBatch = async () => {
    setIsDeleting(true);
    try {
      if (batchDeleteType === 'selected') {
        const count = await firebaseSyncService.deleteMultipleTrips(selectedTripIds);
        audioService.playBeepTone();
        setDeleteNotice(`${count} viajes seleccionados eliminados exitosamente de Firestore.`);
        setSelectedTripIds([]);
      } else {
        const count = await firebaseSyncService.clearTripsByStatus('finalizados_o_cancelados');
        audioService.playBeepTone();
        setDeleteNotice(`${count} viajes inactivos (finalizados / cancelados) eliminados de Firestore.`);
      }
      setTimeout(() => setDeleteNotice(null), 3500);
      setShowBatchDeleteModal(false);
    } catch (e) {
      console.error('Error al eliminar viajes en lote:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-time Header & Live Commission Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Gross Fares */}
        <div className="bg-[#121316] border border-zinc-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Tarifas Generadas
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            ${totalFaresGross.toFixed(2)}{' '}
            <span className="text-xs text-zinc-400 font-sans font-normal">USD</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>{nonCancelledTrips.length} carreras registradas</span>
            <span className="text-emerald-400 font-bold">Promedio: ${averageFare.toFixed(2)}</span>
          </div>
        </div>

        {/* Live Commissions AndesMovi */}
        <div className="bg-[#121316] border border-emerald-800/40 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Percent className="w-3.5 h-3.5" />
              Comisiones AndesMovi ({commissionRate}%)
            </span>
            <div className="flex items-center gap-1 bg-[#18191e] border border-zinc-700 p-0.5 rounded-lg text-[10px]">
              {[10, 12, 15].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onCommissionRateChange(rate)}
                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                    commissionRate === rate
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono flex items-center gap-2">
            ${totalCommissionsEarned.toFixed(2)}{' '}
            <span className="text-xs text-emerald-500/80 font-sans font-normal">USD Netos</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
            Cálculo en vivo sobre colección 'viajes'
          </div>
        </div>

        {/* Active Trips Monitor */}
        <div className="bg-[#121316] border border-zinc-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Carreras Activas
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono flex items-center gap-2">
            {activeTripsCount}
            <span className="text-xs text-zinc-400 font-sans font-normal">en curso / buscando</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
            <span className="text-amber-400">
              {trips.filter((t) => t.status === 'buscando').length} buscando
            </span>
            <span className="text-blue-400">
              {trips.filter((t) => t.status === 'en_camino').length} en camino
            </span>
            <span className="text-emerald-400">
              {completedTrips.length} finalizados
            </span>
          </div>
        </div>

        {/* Firestore Sync Status */}
        <div className="bg-[#121316] border border-zinc-800 p-4 rounded-2xl relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Colección 'viajes'
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isFirebaseLive
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-blue-950 text-blue-400 border border-blue-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isFirebaseLive ? 'bg-emerald-400 animate-ping' : 'bg-blue-400'
                  }`}
                />
                {isFirebaseLive ? 'onSnapshot ACTIVO' : 'REACTIVO LOCAL'}
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-zinc-200">
              Sincronización en Tiempo Real
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Escuchando cambios con latencia &lt; 50ms
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowFirebaseModal(true)}
              className="w-full bg-[#1e2027] hover:bg-[#282a33] text-zinc-200 border border-zinc-700/80 px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              Configurar Firebase Firestore
            </button>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="bg-[#121316] border border-zinc-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, origen, destino, conductor o placa..."
              className="w-full bg-[#18191e] border border-zinc-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#18191e] border border-zinc-700/80 p-0.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400 ml-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-zinc-200 px-2 py-1 text-xs focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Estados ({trips.length})</option>
              <option value="buscando">Buscando ({trips.filter((t) => t.status === 'buscando').length})</option>
              <option value="contraofertado">Contraofertado ({trips.filter((t) => t.status === 'contraofertado').length})</option>
              <option value="aceptado">Aceptado ({trips.filter((t) => t.status === 'aceptado').length})</option>
              <option value="en_camino">En Camino ({trips.filter((t) => t.status === 'en_camino').length})</option>
              <option value="finalizado">Finalizados ({trips.filter((t) => t.status === 'finalizado').length})</option>
              <option value="cancelado">Cancelados ({trips.filter((t) => t.status === 'cancelado').length})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Batch Delete Selected Button */}
          {selectedTripIds.length > 0 && (
            <button
              onClick={() => {
                setBatchDeleteType('selected');
                setShowBatchDeleteModal(true);
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/30 transition cursor-pointer animate-pulse"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar de Firestore ({selectedTripIds.length})</span>
            </button>
          )}

          {/* Quick Clear Inactive Trips */}
          <button
            onClick={() => {
              setBatchDeleteType('finalizados_o_cancelados');
              setShowBatchDeleteModal(true);
            }}
            title="Eliminar viajes finalizados y cancelados de Firestore"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#18191e] hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs"
          >
            <Trash className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Limpiar Inactivos</span>
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={() => {
              if (confirm('¿Restablecer los viajes de prueba para demostración?')) {
                firebaseSyncService.resetDemoTrips();
                audioService.playSuccessTone();
              }
            }}
            title="Restablecer viajes demo"
            className="p-2 rounded-xl bg-[#18191e] hover:bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Create New Trip Button */}
          <button
            onClick={() => setShowNewTripModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Despachar Nuevo Viaje (±$0.25)
          </button>
        </div>
      </div>

      {/* Delete Feedback Notice Toast */}
      {deleteNotice && (
        <div className="bg-emerald-950/80 border border-emerald-700/80 p-3 rounded-2xl text-xs font-mono text-emerald-300 flex items-center justify-between shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteNotice}</span>
          </div>
          <button onClick={() => setDeleteNotice(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dynamic Real-time Trips Table */}
      <div className="bg-[#121316] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#18191e] text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-mono">
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={filteredTrips.length > 0 && selectedTripIds.length === filteredTrips.length}
                    onChange={toggleSelectAll}
                    title="Seleccionar todos para eliminar"
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-500 cursor-pointer accent-blue-500"
                  />
                </th>
                <th className="py-3 px-4 font-bold">Cliente</th>
                <th className="py-3 px-4 font-bold">Origen</th>
                <th className="py-3 px-4 font-bold">Destino</th>
                <th className="py-3 px-3 font-bold text-right">Tarifa ($)</th>
                <th className="py-3 px-3 font-bold">Método Pago</th>
                <th className="py-3 px-4 font-bold">Conductor Asignado</th>
                <th className="py-3 px-3 font-bold text-center">Estado Actual</th>
                <th className="py-3 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    <Navigation className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No hay viajes registrados con este filtro</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Crea un viaje con el botón "Despachar Nuevo Viaje" o ajusta la búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const isBuscando = trip.status === 'buscando';
                  const isAceptado = trip.status === 'aceptado';
                  const isEnCamino = trip.status === 'en_camino';
                  const isFinalizado = trip.status === 'finalizado';
                  const isSelected = selectedTripIds.includes(trip.id);

                  return (
                    <tr
                      key={trip.id}
                      className={`hover:bg-[#181a20] transition group ${
                        isSelected ? 'bg-red-950/20' : isBuscando ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTrip(trip.id)}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-500 cursor-pointer accent-blue-500"
                        />
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                            {trip.passengerName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{trip.passengerName}</span>
                              <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center">
                                ★ {trip.passengerRating.toFixed(1)}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                              <Phone className="w-3 h-3 text-zinc-500" />
                              {trip.passengerPhone || 'Sin teléfono'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Origen */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-zinc-200 line-clamp-2 leading-tight">
                            {trip.origin}
                          </span>
                        </div>
                      </td>

                      {/* Destino */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                          <span className="text-zinc-200 line-clamp-2 leading-tight font-medium">
                            {trip.destination}
                          </span>
                        </div>
                      </td>

                      {/* Tarifa ($) */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="font-black text-white font-mono text-sm">
                          ${trip.offeredFare.toFixed(2)}
                        </div>
                        {trip.counterOfferPrice && (
                          <div className="text-[10px] text-cyan-400 font-mono">
                            Contraoferta: ${trip.counterOfferPrice.toFixed(2)}
                          </div>
                        )}
                        <div className="text-[10px] text-emerald-400/80 font-mono">
                          Comisión: ${(trip.offeredFare * (commissionRate / 100)).toFixed(2)}
                        </div>
                      </td>

                      {/* Método de Pago */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#1c1d24] border border-zinc-700/80 text-zinc-300">
                          {trip.paymentMethod === 'Efectivo' ? (
                            <>
                              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Efectivo</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                              <span>Transferencia</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Conductor Asignado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {trip.driverName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                              <Car className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs">
                                {trip.driverName}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                {trip.driverUnit || 'Unidad asignada'} •{' '}
                                <span className="text-blue-400">{trip.driverPlate || ''}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigningTrip(trip)}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <Car className="w-3 h-3" />
                            + Asignar Conductor
                          </button>
                        )}
                      </td>

                      {/* Estado Actual */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(trip.status)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver en Mapa OpenStreetMap */}
                          <button
                            onClick={() => onViewOnMap(trip)}
                            title="Ver en OpenStreetMap"
                            className="p-1.5 rounded-lg bg-[#1c1d24] hover:bg-blue-600 hover:text-white border border-zinc-700 text-zinc-300 transition cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                            <span className="hidden xl:inline">Mapa</span>
                          </button>

                          {/* Quick status progress buttons */}
                          {isBuscando && (
                            <button
                              onClick={() => setAssigningTrip(trip)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer"
                            >
                              Asignar
                            </button>
                          )}

                          {isAceptado && (
                            <button
                              onClick={() => handleQuickStatusChange(trip.id, 'en_camino')}
                              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition cursor-pointer"
                            >
                              En Ruta
                            </button>
                          )}

                          {isEnCamino && (
                            <button
                              onClick={() => handleQuickStatusChange(trip.id, 'finalizado')}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Finalizar
                            </button>
                          )}

                          {!isFinalizado && trip.status !== 'cancelado' && (
                            <button
                              onClick={() => handleQuickStatusChange(trip.id, 'cancelado')}
                              title="Cancelar Viaje"
                              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-amber-900/60 hover:text-amber-300 text-zinc-400 transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* FIRESTORE • Eliminar Button */}
                          <button
                            onClick={() => setTripToDelete(trip)}
                            title="Eliminar Viaje de Firestore"
                            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-red-600 hover:text-white text-red-400 transition cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden 2xl:inline">Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#18191e] border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>AndesMovi Ecuador • Monitoreo de Despacho y Carreras</span>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400">Total comisión activa: ${totalCommissionsEarned.toFixed(2)} USD</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Reglas Firestore: allow read: if true;</span>
            <span className="text-zinc-600">|</span>
            <span>Estado: buscando = create permitida</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: DESPACHAR NUEVO VIAJE (±$0.25) */}
      {/* ============================================================== */}
      {showNewTripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#18191e] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Despachar Nuevo Viaje</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Registrar pedido de carrera en colección 'viajes'
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewTripModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Passenger Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nombre del Cliente / Pasajero *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassengerName}
                    onChange={(e) => setNewPassengerName(e.target.value)}
                    placeholder="Ej. Ing. Wilson Benavides"
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Teléfono Celular *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassengerPhone}
                    onChange={(e) => setNewPassengerPhone(e.target.value)}
                    placeholder="0984123890"
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Origin & Destination */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Dirección de Origen / Recogida *
                </label>
                <input
                  type="text"
                  required
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  placeholder="Ej. Terminal Terrestre de Tulcán"
                  className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-red-400" />
                  Dirección de Destino *
                </label>
                <input
                  type="text"
                  required
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="Ej. Puente Internacional de Rumichaca"
                  className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Fare with ±$0.25 adjustments as required by prompt */}
              <div className="bg-[#18191e] border border-zinc-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Tarifa Ofertada (Pasos de ±$0.25)
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Comisión AndesMovi: ${(newFare * (commissionRate / 100)).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustFare(-1.00)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold transition"
                  >
                    -$1.00
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustFare(-0.25)}
                    className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs font-mono font-bold transition"
                  >
                    -$0.25
                  </button>

                  <div className="px-5 py-2 rounded-xl bg-[#121316] border border-zinc-700 text-xl font-black text-white font-mono shadow-inner min-w-[110px] text-center">
                    ${newFare.toFixed(2)}
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustFare(0.25)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold transition"
                  >
                    +$0.25
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustFare(1.00)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold transition"
                  >
                    +$1.00
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPaymentMethod('Efectivo')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                      newPaymentMethod === 'Efectivo'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-[#1c1d24] border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPaymentMethod('Transferencia')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
                      newPaymentMethod === 'Transferencia'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-[#1c1d24] border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Transferencia Bancaria
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Notas de Despacho (Opcional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ej. Casa esquinera con portón blanco, llamar al llegar"
                  className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewTripModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Emitir Carrera a la Flota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ASIGNAR CONDUCTOR A VIAJE */}
      {/* ============================================================== */}
      {assigningTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-[#18191e] border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Asignar Unidad de Flota</h3>
                <p className="text-xs text-zinc-400">
                  Viaje de {assigningTrip.passengerName} (${assigningTrip.offeredFare.toFixed(2)})
                </p>
              </div>
              <button
                onClick={() => setAssigningTrip(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-zinc-400 mb-2">
                Selecciona una unidad disponible para atender de inmediato este servicio:
              </p>
              {units.map((unit) => {
                const isAvail = unit.status === 'disponible';
                return (
                  <button
                    key={unit.id}
                    disabled={!isAvail}
                    onClick={() => handleAssignUnit(assigningTrip, unit)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                      isAvail
                        ? 'bg-[#1a1c22] border-zinc-700 hover:border-blue-500 hover:bg-[#20222a]'
                        : 'bg-[#15161a] border-zinc-800/80 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {unit.id.replace('AM-', '')}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{unit.driverName}</div>
                        <div className="text-[11px] text-zinc-400">
                          {unit.vehicle} • {unit.plate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAvail
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {unit.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FIREBASE FIRESTORE CONFIGURATION */}
      {/* ============================================================== */}
      {showFirebaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#18191e] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Configuración de Firebase Firestore</h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Conexión directa a colección 'viajes'
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFirebaseModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFirebaseConfig} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {firebaseConnectedNotice && (
                <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800 text-blue-200 text-xs font-mono">
                  {firebaseConnectedNotice}
                </div>
              )}

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  Project ID de Firebase *
                </label>
                <input
                  type="text"
                  required
                  value={savedConfig.projectId}
                  onChange={(e) => setSavedConfig({ ...savedConfig, projectId: e.target.value })}
                  placeholder="ej. andesmovi-ecuador"
                  className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">
                  API Key de Firebase
                </label>
                <input
                  type="text"
                  value={savedConfig.apiKey}
                  onChange={(e) => setSavedConfig({ ...savedConfig, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    value={savedConfig.authDomain}
                    onChange={(e) => setSavedConfig({ ...savedConfig, authDomain: e.target.value })}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    App ID
                  </label>
                  <input
                    type="text"
                    value={savedConfig.appId}
                    onChange={(e) => setSavedConfig({ ...savedConfig, appId: e.target.value })}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Firestore Security Rules Display */}
              <div className="p-3 rounded-xl bg-[#09090b] border border-zinc-800">
                <span className="text-zinc-400 font-mono text-[11px] block mb-1">
                  Reglas de Seguridad Activas en Firestore:
                </span>
                <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto whitespace-pre">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /viajes/{viajeId} {
      allow read: if true;
      allow create: if request.resource.data.estado == 'buscando';
      allow update: if true;
      allow delete: if true; // Eliminación permitida para administración
    }
  }
}`}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    firebaseSyncService.disconnectFirebase();
                    setIsFirebaseLive(false);
                    setFirebaseConnectedNotice('Desconectado de Firebase. Usando almacenamiento reactivo local.');
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-semibold"
                >
                  Usar Modo Local
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFirebaseModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                  >
                    Conectar y Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación Individual en Firestore */}
      {tripToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-red-900/60 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-red-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">
                    Eliminar Viaje de Firestore
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    ID: {tripToDelete.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTripToDelete(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#181a20] border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Cliente:</span>
                  <span className="font-bold text-white">{tripToDelete.passengerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Origen:</span>
                  <span className="text-zinc-200 text-right truncate max-w-[220px]">{tripToDelete.origin}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Destino:</span>
                  <span className="text-zinc-200 text-right truncate max-w-[220px]">{tripToDelete.destination}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Tarifa:</span>
                  <span className="font-mono font-bold text-emerald-400">${tripToDelete.offeredFare.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Estado:</span>
                  <span>{getStatusBadge(tripToDelete.status)}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-red-950/30 border border-red-900/50 flex items-start gap-2.5 text-[11px] text-red-300">
                <AlertOctagon className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold block">Operación de Eliminación Permanente</span>
                  Se ejecutará <code className="bg-red-950 px-1 py-0.5 rounded text-white font-mono">deleteDoc()</code> en la colección <code className="text-amber-300 font-mono">'viajes'</code> de Firebase Firestore.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setTripToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteSingle}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Eliminando...' : 'Sí, Eliminar de Firestore'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación Masiva en Firestore */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-red-900/60 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-red-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">
                    {batchDeleteType === 'selected'
                      ? `Eliminar ${selectedTripIds.length} Viajes Seleccionados`
                      : 'Limpiar Viajes Finalizados y Cancelados'}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Colección 'viajes' • Eliminación en bloque
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-zinc-300 leading-relaxed">
                {batchDeleteType === 'selected'
                  ? `¿Confirmas la eliminación permanente de los ${selectedTripIds.length} viajes seleccionados de la base de datos Firestore?`
                  : 'Esta acción removerá todos los viajes en estado "finalizado" y "cancelado" para liberar espacio y mantener la consola ágil.'}
              </p>

              <div className="p-3 rounded-2xl bg-red-950/30 border border-red-900/50 flex items-start gap-2.5 text-[11px] text-red-300">
                <AlertOctagon className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  Esta acción eliminará físicamente los documentos de Firebase Firestore y no se puede deshacer.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteBatch}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Procesando...' : 'Confirmar Eliminación Masiva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
