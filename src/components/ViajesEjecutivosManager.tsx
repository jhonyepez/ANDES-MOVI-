import React, { useState, useEffect, useMemo } from 'react';
import { FleetUnit, TripModel, ExecutiveSchedule, ExecutivePassenger, AssignedUnit } from '../models/admin_models';
import { 
  Car, Search, ArrowRight, MapPin, Bell, 
  Clock, Calendar, User, Info, CheckCircle, 
  Plus, Trash2, Send, Zap, UserCheck, LayoutDashboard,
  Users, Map, Shield, ChevronRight, List, Smartphone,
  Repeat, ArrowLeftRight, Settings, PlusCircle, Filter,
  Phone, DollarSign, Check, AlertTriangle, Navigation,
  Compass, ExternalLink, RefreshCw, MessageSquare, Copy,
  CheckSquare, X
} from 'lucide-react';
import { audioService } from '../services/audio_service';
import { AdminService } from '../services/admin_service';

interface Props {
  units: FleetUnit[];
  trips: TripModel[];
  initialTab?: 'parrilla' | 'conductor' | 'cliente' | 'despacho_vivo';
}

export const ViajesEjecutivosManager: React.FC<Props> = ({ units, trips, initialTab = 'parrilla' }) => {
  const [activeTab, setActiveTab] = useState<'parrilla' | 'conductor' | 'cliente' | 'despacho_vivo'>(initialTab);
  const [schedules, setSchedules] = useState<ExecutiveSchedule[]>([]);
  const [routeFilter, setRouteFilter] = useState<string>('todas');
  const [sentToDriverSuccess, setSentToDriverSuccess] = useState<string | null>(null);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);

  // Modal: Nueva Ruta Personalizada (Nivel Nacional)
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newOrigin, setNewOrigin] = useState<string>('Tulcán');
  const [newDestination, setNewDestination] = useState<string>('Quito');
  const [newTime, setNewTime] = useState<string>('03:00 AM');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPrice, setNewPrice] = useState<number>(25.00);
  const [newSeats, setNewSeats] = useState<number>(4);
  const [newNotes, setNewNotes] = useState<string>('Puerta a Puerta');

  // Modal: Inscribir Pasajero Manual a una tarjeta
  const [bookingScheduleId, setBookingScheduleId] = useState<string | null>(null);
  const [paxName, setPaxName] = useState<string>('');
  const [paxPhone, setPaxPhone] = useState<string>('09');
  const [paxSeats, setPaxSeats] = useState<number>(1);
  const [paxPickup, setPaxPickup] = useState<string>('');
  const [paxReference, setPaxReference] = useState<string>('');
  const [paxDropoff, setPaxDropoff] = useState<string>('');
  const [paxPayment, setPaxPayment] = useState<'cobrar_efectivo' | 'pagado' | 'pendiente'>('cobrar_efectivo');

  // Modal: WhatsApp rápido
  const [whatsAppModalSchedule, setWhatsAppModalSchedule] = useState<ExecutiveSchedule | null>(null);
  const [waDriverPhone, setWaDriverPhone] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // App Conductor
  const [driverViewUnitId, setDriverViewUnitId] = useState<string>(units[0]?.id || 'AM-012');

  // Sync initial tab when changed from props
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Cargar frecuencias
  const loadSchedules = () => {
    const list = AdminService.getExecutiveSchedules();
    setSchedules(list);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  // Lista de rutas únicas
  const uniqueRoutes = useMemo(() => {
    const routesSet = new Set<string>();
    schedules.forEach(s => routesSet.add(s.route));
    return Array.from(routesSet);
  }, [schedules]);

  // Filtrado de tarjetas
  const filteredSchedules = useMemo(() => {
    if (routeFilter === 'todas') return schedules;
    return schedules.filter(s => s.route === routeFilter);
  }, [schedules, routeFilter]);

  // Asignar unidad/conductor a una tarjeta -> Va directamente al panel del conductor
  const handleAssignUnitToSchedule = (scheduleId: string, unitId: string) => {
    if (!unitId) return;
    const schedule = schedules.find(s => s.id === scheduleId);
    const unit = units.find(u => u.id === unitId);
    if (!schedule || !unit) return;

    const currentUnits = schedule.assignedUnits || [];
    if (currentUnits.some(u => u.unitId === unitId)) {
      alert('Esta unidad ya está asignada a esta tarjeta.');
      return;
    }

    const newAssignment: AssignedUnit = {
      unitId: unit.id,
      driverName: unit.driverName,
      driverPhone: unit.phone || '0984123890',
      plate: unit.plate,
      vehicle: unit.vehicle,
      vehiclePhoto: unit.vehiclePhoto,
      driverPhoto: unit.driverPhoto
    };

    const updated: ExecutiveSchedule = {
      ...schedule,
      assignedUnits: [...currentUnits, newAssignment]
    };

    AdminService.saveExecutiveSchedule(updated);
    loadSchedules();
    audioService.playSuccessTone();

    // Notificación directa
    setSentToDriverSuccess(`Asignado directamente al panel de ${unit.driverName} (${unit.id})`);
    setTimeout(() => setSentToDriverSuccess(null), 4000);
  };

  // Remover conductor de una tarjeta
  const handleRemoveUnitFromSchedule = (scheduleId: string, unitId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule || !schedule.assignedUnits) return;

    const updated: ExecutiveSchedule = {
      ...schedule,
      assignedUnits: schedule.assignedUnits.filter(u => u.unitId !== unitId)
    };

    AdminService.saveExecutiveSchedule(updated);
    loadSchedules();
  };

  // Enviar directamente al panel del conductor
  const handleSendDirectToDriverPanel = (schedule: ExecutiveSchedule, unitId?: string) => {
    const targetId = unitId || schedule.assignedUnits?.[0]?.unitId;
    if (!targetId) {
      alert('Por favor asigne primero un conductor a esta tarjeta.');
      return;
    }

    const driverName = schedule.assignedUnits?.find(u => u.unitId === targetId)?.driverName || 'Conductor';

    // Marcar como despachado / en panel
    const updated: ExecutiveSchedule = {
      ...schedule,
      status: 'despachado',
      dispatchedAt: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
    };

    AdminService.saveExecutiveSchedule(updated);
    loadSchedules();
    audioService.playSuccessTone();

    // Cambiar vista directamente al panel del conductor
    setDriverViewUnitId(targetId);
    setSentToDriverSuccess(`¡Enviado directamente al panel de ${driverName}! Abriendo vista del chofer...`);
    setTimeout(() => {
      setActiveTab('conductor');
      setSentToDriverSuccess(null);
    }, 1000);
  };

  // Crear una nueva ruta compacta
  const handleCreateCustomRouteCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrigin.trim() || !newDestination.trim() || !newTime.trim()) {
      alert('Por favor complete el origen, destino y hora de salida.');
      return;
    }

    const cleanOrigin = newOrigin.trim();
    const cleanDestination = newDestination.trim();
    const routeName = `${cleanOrigin}-${cleanDestination}`;
    const newId = `RUTA-${cleanOrigin.substring(0, 3).toUpperCase()}-${cleanDestination.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newCard: ExecutiveSchedule = {
      id: newId,
      route: routeName,
      originCity: cleanOrigin,
      destinationCity: cleanDestination,
      departureTime: newTime,
      departureDate: newDate,
      price: isNaN(newPrice) ? 25.00 : newPrice,
      totalSeats: isNaN(newSeats) ? 4 : newSeats,
      availableSeats: isNaN(newSeats) ? 4 : newSeats,
      status: 'programado',
      notes: newNotes.trim() || `Servicio Ejecutivo: ${cleanOrigin} ➔ ${cleanDestination}`,
      tripType: 'ida',
      shiftBlock: 'personalizado',
      passengerIds: [],
      passengersList: [],
      assignedUnits: []
    };

    AdminService.saveExecutiveSchedule(newCard);
    loadSchedules();
    setShowAddModal(false);
    audioService.playSuccessTone();

    // Reset defaults
    setNewOrigin('Tulcán');
    setNewDestination('Quito');
    setNewTime('03:00 AM');
    setNewPrice(25.00);
    setNewSeats(4);
    setNewNotes('Puerta a Puerta');
  };

  // Inscribir pasajero directo en una tarjeta
  const handleAddPassengerToCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingScheduleId || !paxName.trim() || !paxPhone.trim()) {
      alert('Por favor ingrese nombre y teléfono.');
      return;
    }

    const targetSchedule = schedules.find(s => s.id === bookingScheduleId);
    if (!targetSchedule) return;

    const seatsToBook = isNaN(paxSeats) ? 1 : paxSeats;
    const newPax: ExecutivePassenger = {
      id: `PAX-${Date.now().toString().slice(-5)}`,
      name: paxName.trim(),
      phone: paxPhone.trim(),
      seats: seatsToBook,
      pickupLocation: paxPickup.trim() || `${targetSchedule.originCity || 'Ciudad de origen'} - Domicilio`,
      pickupReference: paxReference.trim() || undefined,
      dropoffLocation: paxDropoff.trim() || undefined,
      fare: targetSchedule.price * seatsToBook,
      paymentStatus: paxPayment,
      pickupStatus: 'pendiente',
      bookedAt: new Date().toISOString()
    };

    AdminService.addPassengerToExecutiveSchedule(bookingScheduleId, newPax);
    loadSchedules();
    setBookingScheduleId(null);
    setPaxName('');
    setPaxPhone('09');
    setPaxSeats(1);
    setPaxPickup('');
    setPaxReference('');
    setPaxDropoff('');
    audioService.playSuccessTone();

    // Notificación
    setSentToDriverSuccess(`Reserva de ${newPax.name} sincronizada al panel del conductor`);
    setTimeout(() => setSentToDriverSuccess(null), 3000);
  };

  // Eliminar tarjeta
  const handleDeleteCard = (id: string, _route: string) => {
    AdminService.deleteExecutiveSchedule(id);
    loadSchedules();
    audioService.playPTTKey();
  };

  // Limpiar todas las tarjetas
  const handleClearAllCards = () => {
    AdminService.clearAllExecutiveSchedules();
    loadSchedules();
    audioService.playPTTKey();
  };

  // Actualizar estado de recogida de pasajero (ej. desde app de conductor)
  const handleUpdatePassengerStatus = (
    scheduleId: string, 
    passengerId: string, 
    status: 'pendiente' | 'en_camino' | 'a_bordo' | 'ausente'
  ) => {
    AdminService.updatePassengerPickupStatus(scheduleId, passengerId, status);
    loadSchedules();
    audioService.playSuccessTone();
  };

  // Generar texto para WhatsApp
  const generateWhatsAppMessage = (schedule: ExecutiveSchedule, driverUnit?: AssignedUnit) => {
    const paxList = schedule.passengersList || [];
    const driverName = driverUnit?.driverName || (schedule.assignedUnits && schedule.assignedUnits[0]?.driverName) || 'Conductor';
    const unitId = driverUnit?.unitId || (schedule.assignedUnits && schedule.assignedUnits[0]?.unitId) || 'AM';

    let msg = `🚐 *ANDES MOVI - HOJA DE RECOGIDA* 🇪🇨\n`;
    msg += `📍 *Ruta:* ${schedule.originCity || schedule.route.split('-')[0]} ➔ ${schedule.destinationCity || schedule.route.split('-')[1]}\n`;
    msg += `⏰ *Hora:* ${schedule.departureTime} | *Unidad:* ${unitId} | *Chofer:* ${driverName}\n\n`;

    if (paxList.length === 0) {
      msg += `⚠️ Sin pasajeros registrados aún.\n`;
    } else {
      paxList.forEach((p, idx) => {
        const num = idx + 1;
        const cleanAddress = encodeURIComponent(p.pickupLocation);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${cleanAddress}`;
        msg += `${num}. *${p.name}* (${p.seats} as.) - Cel: ${p.phone}\n`;
        msg += `   📍 *Recoger:* ${p.pickupLocation}\n`;
        if (p.pickupReference) msg += `   🏢 Ref: ${p.pickupReference}\n`;
        msg += `   💰 Cobro: $${p.fare.toFixed(2)} USD (${p.paymentStatus === 'pagado' ? 'Ya pagó' : 'Efectivo'})\n`;
        msg += `   🗺️ GPS: ${mapUrl}\n\n`;
      });
    }

    msg += `📞 *Soporte AndesMovi:* +593 99 856 6503\n`;
    msg += `Buen viaje y conducción segura.`;
    return msg;
  };

  const handleOpenWhatsAppModal = (schedule: ExecutiveSchedule) => {
    setWhatsAppModalSchedule(schedule);
    const assigned = schedule.assignedUnits || [];
    setWaDriverPhone(assigned[0]?.driverPhone || '0984123890');
    setCopiedNotification(false);
  };

  const handleSendToWhatsApp = (schedule: ExecutiveSchedule) => {
    const assigned = schedule.assignedUnits || [];
    const selectedDriver = assigned[0];
    const rawPhone = waDriverPhone.trim() || selectedDriver?.driverPhone || '0984123890';
    
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '593' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('593')) {
      cleanPhone = '593' + cleanPhone;
    }

    const messageText = generateWhatsAppMessage(schedule, selectedDriver);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyWhatsApp = (schedule: ExecutiveSchedule) => {
    const assigned = schedule.assignedUnits || [];
    const messageText = generateWhatsAppMessage(schedule, assigned[0]);
    navigator.clipboard.writeText(messageText).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    });
  };

  // Turnos asignados para el conductor en la vista de conductor
  const driverAssignedSchedules = useMemo(() => {
    if (!driverViewUnitId) return [];
    return schedules.filter(s => s.assignedUnits?.some(u => u.unitId === driverViewUnitId));
  }, [schedules, driverViewUnitId]);

  return (
    <div className="bg-[#090a0f] min-h-screen text-zinc-100 flex flex-col font-sans select-none text-xs">
      {/* ============================================================== */}
      {/* HEADER COMPACTO */}
      {/* ============================================================== */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-[#101116] flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight uppercase">
                Frecuencias & Rutas Nacionales
              </h2>
              <span className="text-[10px] font-bold bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                {schedules.length} activas
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Crea tarjetas de ruta y envíalas directamente al panel del conductor
            </p>
          </div>
        </div>

        {/* TABS SELECTOR COMPACTO */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('parrilla')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'parrilla'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Parrilla ({schedules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('conductor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'conductor'
                ? 'bg-amber-500 text-zinc-950 font-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Panel Conductor (Recogidas)</span>
          </button>

          <button
            onClick={() => setActiveTab('cliente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cliente'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Simulador Cliente</span>
          </button>
        </div>
      </div>

      {/* NOTIFICACIÓN FLOTANTE DE ENVÍO DIRECTO */}
      {sentToDriverSuccess && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{sentToDriverSuccess}</span>
          </div>
          <button 
            onClick={() => setActiveTab('conductor')}
            className="underline ml-4 text-[11px] hover:text-emerald-100 cursor-pointer"
          >
            Ver en Panel Conductor ➔
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* CUERPO PRINCIPAL */}
      {/* ============================================================== */}
      <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-4">

        {/* ------------------------------------------------------------ */}
        {/* VISTA 1: PARRILLA DE TARJETAS COMPACTAS (TAMAÑO ERGONÓMICO) */}
        {/* ------------------------------------------------------------ */}
        {activeTab === 'parrilla' && (() => {
          const isAllSchedulesSelected =
            filteredSchedules.length > 0 &&
            filteredSchedules.every((s) => selectedScheduleIds.includes(s.id));

          const toggleSelectAllSchedules = () => {
            if (isAllSchedulesSelected) {
              setSelectedScheduleIds([]);
            } else {
              setSelectedScheduleIds(filteredSchedules.map((s) => s.id));
            }
          };

          const toggleSelectSchedule = (id: string) => {
            setSelectedScheduleIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            );
          };

          const handleBulkDeleteSchedules = () => {
            selectedScheduleIds.forEach((id) => AdminService.deleteExecutiveSchedule(id));
            loadSchedules();
            setSelectedScheduleIds([]);
            audioService.playPTTKey();
          };

          return (
            <div className="space-y-4">
              {/* BARRA DE ACCIÓN: FILTROS + BOTONES COMPACTOS + SELECCIONAR TODO */}
              <div className="bg-[#121318] border border-zinc-800 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <label className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 hover:border-blue-500 px-2.5 py-1 rounded-xl text-xs text-white font-bold cursor-pointer transition select-none shrink-0 mr-1">
                    <input
                      type="checkbox"
                      checked={isAllSchedulesSelected}
                      onChange={toggleSelectAllSchedules}
                      className="w-3.5 h-3.5 accent-blue-500 cursor-pointer rounded"
                    />
                    <span>Seleccionar Todo ({filteredSchedules.length})</span>
                  </label>

                  <span className="text-[10px] font-bold text-zinc-500 uppercase mr-0.5">Rutas:</span>
                  <button
                    onClick={() => setRouteFilter('todas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      routeFilter === 'todas'
                        ? 'bg-zinc-200 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todas ({schedules.length})
                  </button>
                  {uniqueRoutes.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRouteFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        routeFilter === r
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {schedules.length > 0 && (
                    <button
                      onClick={handleClearAllCards}
                      className="text-zinc-500 hover:text-red-400 text-xs font-bold px-2 py-1 transition flex items-center gap-1 cursor-pointer"
                      title="Eliminar todas las tarjetas de la pantalla"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Limpiar Todo
                    </button>
                  )}

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Nueva Tarjeta de Ruta
                  </button>
                </div>
              </div>

              {/* BARRA FLOTANTE DE ACCIONES EN MASA DE TARJETAS */}
              {selectedScheduleIds.length > 0 && (
                <div className="bg-gradient-to-r from-blue-950 via-zinc-900 to-red-950 border-2 border-blue-500 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-fadeIn">
                  <div className="flex items-center gap-2 text-white font-black text-xs">
                    <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center font-mono text-xs">
                      {selectedScheduleIds.length}
                    </span>
                    <span>Tarjeta(s) Seleccionada(s)</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={handleBulkDeleteSchedules}
                      className="bg-red-600 hover:bg-red-500 text-white font-black px-3.5 py-1.5 rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar {selectedScheduleIds.length} Tarjeta(s) Seleccionada(s)
                    </button>

                    <button
                      onClick={() => setSelectedScheduleIds([])}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      Desmarcar Todo
                    </button>
                  </div>
                </div>
              )}

              {/* ESTADO VACÍO CUANDO NO HAY TARJETAS */}
              {filteredSchedules.length === 0 ? (
                <div className="bg-[#121318] border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-4">
                  <p className="text-zinc-400 font-bold text-xs">
                    No hay tarjetas activas en la parrilla.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => {
                        const newId = `RUTA-TUL-QUI-${Date.now().toString().slice(-4)}`;
                        AdminService.saveExecutiveSchedule({
                          id: newId,
                          route: 'Tulcán-Quito',
                          originCity: 'Tulcán',
                          destinationCity: 'Quito',
                          departureTime: '03:00 AM',
                          departureDate: new Date().toISOString().split('T')[0],
                          price: 25.00,
                          totalSeats: 4,
                          availableSeats: 4,
                          status: 'programado',
                          notes: 'Turno Madrugada Puerta a Puerta',
                          tripType: 'ida',
                          passengerIds: [],
                          passengersList: [],
                          assignedUnits: []
                        });
                        loadSchedules();
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-blue-400" /> Crear Tulcán ➔ Quito (03:00 AM)
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Crear Otra Ruta Personalizada
                    </button>
                  </div>
                </div>
              ) : (
                /* GRID DE TARJETAS COMPACTAS (3 A 4 POR FILA EN PANTALLA) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {filteredSchedules.map((schedule) => {
                    const isDispatched = schedule.status === 'despachado';
                    const storedPax = schedule.passengersList || [];
                    const totalOccupied = storedPax.reduce((sum, p) => sum + (p.seats || 1), 0);
                    const assignedCount = schedule.assignedUnits?.length || 0;
                    const firstDriver = schedule.assignedUnits?.[0];
                    const isScheduleChecked = selectedScheduleIds.includes(schedule.id);

                    return (
                      <div
                        key={schedule.id}
                        className={`bg-[#121318] border rounded-2xl p-3.5 flex flex-col justify-between transition-all shadow-md ${
                          isScheduleChecked
                            ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-950/20'
                            : isDispatched
                            ? 'border-emerald-500/50 shadow-emerald-500/5'
                            : assignedCount > 0
                            ? 'border-blue-500/40 shadow-blue-500/5'
                            : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {/* HEADER COMPACTO */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isScheduleChecked}
                                onChange={() => toggleSelectSchedule(schedule.id)}
                                className="w-4 h-4 accent-blue-500 cursor-pointer rounded shrink-0"
                                title="Seleccionar esta tarjeta para borrar en lote"
                              />
                              <div>
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                                  {schedule.departureDate}
                                </span>
                                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-1 mt-0.5">
                                  <span>{schedule.originCity || schedule.route.split('-')[0]}</span>
                                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                                  <span>{schedule.destinationCity || schedule.route.split('-')[1]}</span>
                                </h3>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-black text-xs px-2 py-0.5 rounded-md inline-block">
                                ${schedule.price.toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleDeleteCard(schedule.id, schedule.route)}
                                className="text-zinc-500 hover:text-red-400 text-[10px] block mt-1 ml-auto cursor-pointer"
                                title="Borrar tarjeta"
                              >
                                ✕ Borrar
                              </button>
                            </div>
                          </div>

                        {/* HORA Y ESTADO */}
                        <div className="flex items-center justify-between bg-zinc-900/80 px-2.5 py-1.5 rounded-xl border border-zinc-800 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs font-black text-white">{schedule.departureTime}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                            isDispatched 
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {isDispatched ? 'En Ruta' : 'Programado'}
                          </span>
                        </div>

                        {/* LISTA DE RESERVAS / RECOGIDAS */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-zinc-400">
                              Pasajeros ({totalOccupied}/{schedule.totalSeats}):
                            </span>
                            <button
                              onClick={() => setBookingScheduleId(schedule.id)}
                              className="text-blue-400 hover:text-blue-300 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Inscribir
                            </button>
                          </div>

                          {storedPax.length === 0 ? (
                            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl py-2 px-2.5 text-center text-[10px] text-zinc-500">
                              Sin reservas aún. Presiona "+ Inscribir"
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                              {storedPax.map((p, idx) => (
                                <div
                                  key={p.id}
                                  className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800/80 text-[11px]"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="text-[10px] font-bold text-zinc-400">{idx + 1}.</span>
                                      <span className="font-bold text-white truncate">{p.name}</span>
                                      <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1 rounded">
                                        {p.seats} as.
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-400 text-[10px] shrink-0">
                                      ${p.fare.toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="flex items-start gap-1 text-[10px] text-zinc-300 mt-1">
                                    <MapPin className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                    <span className="truncate">{p.pickupLocation}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CONDUCTOR ASIGNADO */}
                        <div className="pt-2 border-t border-zinc-800/80 mb-3 space-y-1.5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                            Conductor Asignado:
                          </span>

                          {firstDriver ? (
                            <div className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate">
                                <img
                                  src={firstDriver.driverPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                                  className="w-7 h-7 rounded-lg object-cover shrink-0"
                                  alt="Chofer"
                                />
                                <div className="truncate">
                                  <p className="font-bold text-white text-[11px] truncate leading-tight">
                                    {firstDriver.driverName}
                                  </p>
                                  <p className="text-[9px] text-zinc-400 font-mono">
                                    {firstDriver.unitId} • {firstDriver.plate}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveUnitFromSchedule(schedule.id, firstDriver.unitId)}
                                className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                                title="Cambiar chofer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <select
                              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                              value=""
                              onChange={(e) => handleAssignUnitToSchedule(schedule.id, e.target.value)}
                            >
                              <option value="">+ ASIGNAR CONDUCTOR</option>
                              {units.map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.id} - {u.driverName}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* BOTONES DIRECTOS AL PANEL DEL CONDUCTOR Y ACCIONES */}
                      <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                        {/* BOTÓN ESTRELLA: ENVIAR DIRECTAMENTE AL PANEL DEL CONDUCTOR */}
                        <button
                          onClick={() => handleSendDirectToDriverPanel(schedule)}
                          disabled={assignedCount === 0}
                          className={`w-full py-2 rounded-xl text-xs font-black uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            assignedCount > 0
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow'
                              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                          }`}
                          title="Envía la hoja con las paradas de recogida directamente al panel del conductor"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Enviar a Panel Conductor
                        </button>

                        {/* ACCIONES SECUNDARIAS COMPACTAS: WHATSAPP / VER PANEL */}
                        <div className="flex items-center gap-1.5">
                          {firstDriver && (
                            <button
                              onClick={() => {
                                setDriverViewUnitId(firstDriver.unitId);
                                setActiveTab('conductor');
                              }}
                              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-1.5 rounded-xl text-[10px] font-bold border border-zinc-800 transition text-center cursor-pointer"
                            >
                              Ver Panel Chofer
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenWhatsAppModal(schedule)}
                            className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-[#25D366]/30 transition flex items-center gap-1 cursor-pointer"
                            title="Enviar por WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

        {/* ------------------------------------------------------------ */}
        {/* VISTA 2: PANEL DEL CONDUCTOR (RECOGIDAS EN PUERTA & GPS) */}
        {/* ------------------------------------------------------------ */}
        {activeTab === 'conductor' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* BARRA SUPERIOR DEL CHOFER */}
            <div className="bg-[#121318] border border-zinc-800 p-3 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">
                    Panel Móvil del Conductor
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Itinerario de recogidas en puerta y navegación satelital
                  </p>
                </div>
              </div>

              {/* SELECTOR DE CONDUCTOR ACTIVO */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-500">Unidad:</span>
                <select
                  value={driverViewUnitId}
                  onChange={(e) => setDriverViewUnitId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white font-bold text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.id} - {u.driverName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LISTA DE TURNOS ASIGNADOS A ESTE CONDUCTOR */}
            {driverAssignedSchedules.length === 0 ? (
              <div className="bg-[#121318] border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                Este conductor no tiene turnos asignados por la central.
                <button
                  onClick={() => setActiveTab('parrilla')}
                  className="block mx-auto mt-2 text-blue-400 font-bold underline cursor-pointer"
                >
                  Ir a Parrilla para Asignar
                </button>
              </div>
            ) : (
              driverAssignedSchedules.map(sch => {
                const paxList = sch.passengersList || [];
                const onboardCount = paxList.filter(p => p.pickupStatus === 'a_bordo').length;

                return (
                  <div key={sch.id} className="bg-[#121318] border border-zinc-800 rounded-2xl p-4 space-y-3.5">
                    {/* RESUMEN DEL TURNO */}
                    <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3">
                      <div>
                        <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded uppercase">
                          Turno Oficial
                        </span>
                        <h4 className="text-base font-black text-white uppercase mt-1">
                          {sch.originCity || sch.route.split('-')[0]} ➔ {sch.destinationCity || sch.route.split('-')[1]}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Salida: <strong className="text-white">{sch.departureTime}</strong> ({sch.departureDate})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                          {onboardCount} de {paxList.length} A Bordo
                        </span>
                      </div>
                    </div>

                    {/* PARADAS DE RECOGIDA */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase block">
                        Paradas de Recogida en Domicilio ({paxList.length}):
                      </span>

                      {paxList.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-2">Central no ha añadido pasajeros a esta salida aún.</p>
                      ) : (
                        paxList.map((p, idx) => {
                          const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.pickupLocation)}`;
                          const isAboard = p.pickupStatus === 'a_bordo';

                          return (
                            <div
                              key={p.id}
                              className={`p-3 rounded-xl border transition ${
                                isAboard
                                  ? 'bg-emerald-950/20 border-emerald-500/30'
                                  : 'bg-zinc-900/90 border-zinc-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-200 text-[10px] font-bold flex items-center justify-center">
                                      {idx + 1}
                                    </span>
                                    <span className="font-bold text-white text-xs">{p.name}</span>
                                    <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
                                      {p.seats} as.
                                    </span>
                                  </div>

                                  <div className="mt-1 flex items-start gap-1 text-zinc-300">
                                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                    <span className="font-semibold text-xs text-white leading-tight">
                                      {p.pickupLocation}
                                    </span>
                                  </div>

                                  {p.pickupReference && (
                                    <p className="text-[10px] text-zinc-400 mt-0.5 pl-4.5">
                                      Ref: {p.pickupReference}
                                    </p>
                                  )}

                                  <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                                    <span className="text-emerald-400 font-mono font-bold">
                                      ${p.fare.toFixed(2)} USD
                                    </span>
                                    <span className="text-zinc-500">•</span>
                                    <span className="text-zinc-400">
                                      {p.paymentStatus === 'pagado' ? '✅ Ya Pagó' : '💵 Cobrar en efectivo'}
                                    </span>
                                  </div>
                                </div>

                                {/* ACCIONES DEL CHOFER */}
                                <div className="flex flex-col gap-1.5 shrink-0">
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={mapLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                    >
                                      <Navigation className="w-3 h-3" /> GPS
                                    </a>
                                    <a
                                      href={`tel:${p.phone}`}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                    >
                                      <Phone className="w-3 h-3" /> Llamar
                                    </a>
                                  </div>

                                  <button
                                    onClick={() => handleUpdatePassengerStatus(
                                      sch.id, 
                                      p.id, 
                                      isAboard ? 'pendiente' : 'a_bordo'
                                    )}
                                    className={`py-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                                      isAboard
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-zinc-800 text-zinc-300 hover:text-white'
                                    }`}
                                  >
                                    {isAboard ? '✓ A Bordo' : 'Marcar A Bordo'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* VISTA 3: SIMULADOR CLIENTE (RESERVA RÁPIDA) */}
        {/* ------------------------------------------------------------ */}
        {activeTab === 'cliente' && (
          <div className="max-w-md mx-auto bg-[#121318] border border-zinc-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              Simulador de Reserva Cliente
            </h3>

            {schedules.length === 0 ? (
              <p className="text-xs text-zinc-500">Crea primero una tarjeta en la parrilla para probar reservas.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!paxName.trim() || !paxPhone.trim()) return;
                  const sch = schedules[0];
                  AdminService.addPassengerToExecutiveSchedule(sch.id, {
                    id: `PAX-${Date.now().toString().slice(-4)}`,
                    name: paxName.trim(),
                    phone: paxPhone.trim(),
                    seats: paxSeats,
                    pickupLocation: paxPickup.trim() || 'Dirección del cliente',
                    fare: sch.price * paxSeats,
                    paymentStatus: 'cobrar_efectivo',
                    pickupStatus: 'pendiente',
                    bookedAt: new Date().toISOString()
                  });
                  loadSchedules();
                  setPaxName('');
                  setPaxPickup('');
                  audioService.playSuccessTone();
                  alert('¡Reserva registrada! Se ha enviado directamente al panel del conductor.');
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={paxName}
                    onChange={(e) => setPaxName(e.target.value)}
                    placeholder="Nombre del pasajero"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Celular</label>
                    <input
                      type="text"
                      required
                      value={paxPhone}
                      onChange={(e) => setPaxPhone(e.target.value)}
                      placeholder="09..."
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-mono font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Asientos</label>
                    <select
                      value={paxSeats}
                      onChange={(e) => setPaxSeats(parseInt(e.target.value) || 1)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-bold outline-none cursor-pointer"
                    >
                      <option value="1">1 Asiento</option>
                      <option value="2">2 Asientos</option>
                      <option value="3">3 Asientos</option>
                      <option value="4">4 Asientos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Lugar de Recogida (Dónde ir)</label>
                  <input
                    type="text"
                    required
                    value={paxPickup}
                    onChange={(e) => setPaxPickup(e.target.value)}
                    placeholder="Ej: Barrio Tajamar, Calle Sucre y Pichincha"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl uppercase text-xs transition cursor-pointer"
                >
                  Confirmar Reserva y Enviar a Conductor
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-medium">Soporte AndesMovi:</span>
              <a
                href="https://api.whatsapp.com/send?phone=593998566503&text=Hola%20Soporte%20AndesMovi%2C%20necesito%20ayuda%20con%20mi%20reserva"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-mono font-bold flex items-center gap-1"
              >
                <Phone className="w-3 h-3" /> +593 99 856 6503
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: CREAR NUEVA RUTA (COMPACTO) */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black text-white uppercase mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-500" />
              Nueva Tarjeta de Ruta
            </h3>

            <form onSubmit={handleCreateCustomRouteCard} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Origen</label>
                  <input
                    type="text"
                    required
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="Tulcán"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Destino</label>
                  <input
                    type="text"
                    required
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    placeholder="Quito"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Hora Salida</label>
                  <input
                    type="text"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="03:00 AM"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Tarifa ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    value={isNaN(newPrice) ? '' : newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Descripción / Tipo</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Puerta a Puerta"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl uppercase transition cursor-pointer"
                >
                  Crear Tarjeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: INSCRIBIR RESERVA / RECOGIDA (COMPACTO) */}
      {/* ============================================================== */}
      {bookingScheduleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <button
              onClick={() => setBookingScheduleId(null)}
              className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black text-white uppercase mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-500" />
              Inscribir Pasajero
            </h3>

            <form onSubmit={handleAddPassengerToCard} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Nombre Pasajero *</label>
                <input
                  type="text"
                  required
                  value={paxName}
                  onChange={(e) => setPaxName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Teléfono Celular *</label>
                  <input
                    type="text"
                    required
                    value={paxPhone}
                    onChange={(e) => setPaxPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Asientos</label>
                  <select
                    value={paxSeats}
                    onChange={(e) => setPaxSeats(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none cursor-pointer"
                  >
                    <option value="1">1 Asiento</option>
                    <option value="2">2 Asientos</option>
                    <option value="3">3 Asientos</option>
                    <option value="4">4 Asientos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                  📍 Dirección Exacta de Recogida *
                </label>
                <input
                  type="text"
                  required
                  value={paxPickup}
                  onChange={(e) => setPaxPickup(e.target.value)}
                  placeholder="Ej: Barrio Tajamar, Calle Sucre y Pichincha"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-semibold outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">Referencia</label>
                <input
                  type="text"
                  value={paxReference}
                  onChange={(e) => setPaxReference(e.target.value)}
                  placeholder="Frente a la farmacia / casa blanca"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl uppercase transition cursor-pointer"
                >
                  Registrar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ENVIAR WHATSAPP RÁPIDO */}
      {/* ============================================================== */}
      {whatsAppModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <button
              onClick={() => setWhatsAppModalSchedule(null)}
              className="absolute top-3.5 right-3.5 text-zinc-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black text-white uppercase mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#25D366]" />
              Enviar Hoja a WhatsApp
            </h3>

            {copiedNotification && (
              <div className="mb-2 p-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold">
                ✓ Copiado al portapapeles
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">WhatsApp Chofer</label>
                <input
                  type="text"
                  value={waDriverPhone}
                  onChange={(e) => setWaDriverPhone(e.target.value)}
                  placeholder="0984123890"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-mono font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleSendToWhatsApp(whatsAppModalSchedule)}
                  className="bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-2 rounded-xl text-[11px] uppercase transition cursor-pointer"
                >
                  Abrir WhatsApp
                </button>
                <button
                  onClick={() => handleCopyWhatsApp(whatsAppModalSchedule)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl text-[11px] uppercase transition cursor-pointer border border-zinc-700"
                >
                  Copiar Texto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
