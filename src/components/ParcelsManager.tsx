import React, { useState, useEffect } from 'react';
import { ParcelModel, ParcelStatus, FleetUnit, AlliedOffice } from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Truck,
  Phone,
  Car,
  X,
  Building2,
  PackageCheck,
  QrCode,
  ShieldCheck,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  UserCheck,
  Trash2,
} from 'lucide-react';

interface Props {
  units: FleetUnit[];
}

export const ParcelsManager: React.FC<Props> = ({ units }) => {
  const [parcels, setParcels] = useState<ParcelModel[]>([]);
  const [alliedOffices, setAlliedOffices] = useState<AlliedOffice[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [assigningParcel, setAssigningParcel] = useState<ParcelModel | null>(null);
  const [viewingGuideReceipt, setViewingGuideReceipt] = useState<ParcelModel | null>(null);

  // Automatic Allied Office Drop-off states
  const [selectedDriverUnitId, setSelectedDriverUnitId] = useState<string>('AM-012');
  const [selectedAlliedOfficeId, setSelectedAlliedOfficeId] = useState<string>('OFI-SG-03');
  const [quickGuideScanInput, setQuickGuideScanInput] = useState<string>('');
  const [autoNotice, setAutoNotice] = useState<string | null>(null);

  // New parcel form state
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('09');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('09');
  const [originOfficeId, setOriginOfficeId] = useState('OFI-TUL-01');
  const [destinationOfficeId, setDestinationOfficeId] = useState('OFI-SG-03');
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [packageWeight, setPackageWeight] = useState('1.0 kg');
  const [fare, setFare] = useState<number>(3.5);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [initialUnitId, setInitialUnitId] = useState<string>('');

  const refreshData = () => {
    setParcels(AdminService.getStoredParcels());
    setAlliedOffices(AdminService.getStoredAlliedOffices());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const showTemporaryNotice = (msg: string) => {
    setAutoNotice(msg);
    setTimeout(() => {
      setAutoNotice((prev) => (prev === msg ? null : prev));
    }, 7000);
  };

  const handleCreateParcel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !recipientName || !packageDescription) {
      return;
    }

    const originOffice = alliedOffices.find((o) => o.id === originOfficeId) || alliedOffices[0];
    const destOffice = alliedOffices.find((o) => o.id === destinationOfficeId) || alliedOffices[1];
    const chosenUnit = units.find((u) => u.id === initialUnitId);

    AdminService.addParcel({
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      pickupAddress: pickupAddress.trim() || originOffice?.address || 'Oficina Central Tulcán',
      deliveryAddress: deliveryAddress.trim() || destOffice?.address || 'Agencia Aliada Destino',
      originOfficeId: originOffice?.id,
      originOfficeName: originOffice?.name,
      destinationOfficeId: destOffice?.id,
      destinationOfficeName: destOffice?.name,
      packageDescription: packageDescription.trim(),
      packageWeight: packageWeight.trim(),
      fare,
      paymentMethod,
      status: chosenUnit ? 'en_transito' : 'recibido',
      assignedUnitId: chosenUnit ? chosenUnit.id : null,
      assignedDriver: chosenUnit ? `${chosenUnit.driverName} (${chosenUnit.id})` : null,
    });

    refreshData();
    audioService.playSuccessTone();
    setShowNewModal(false);
    setSenderName('');
    setRecipientName('');
    setPickupAddress('');
    setDeliveryAddress('');
    setPackageDescription('');
    setInitialUnitId('');
  };

  const handleAssignUnit = (parcelId: string, unit: FleetUnit) => {
    AdminService.updateParcelStatus(parcelId, 'en_transito', unit);
    refreshData();
    audioService.playDispatchTone();
    setAssigningParcel(null);
    showTemporaryNotice(
      `Guía ${parcelId} asignada y despachada con el conductor ${unit.driverName} (${unit.id}).`
    );
  };

  const handleStatusChange = (parcelId: string, status: ParcelStatus) => {
    AdminService.updateParcelStatus(parcelId, status);
    refreshData();
    audioService.playBeepTone();
  };

  const handleDeleteParcel = (parcel: ParcelModel) => {
    if (confirm(`¿Eliminar directamente la encomienda / guía ${parcel.id} (${parcel.guideNumber || parcel.id})? Se borrará de la base de datos.`)) {
      AdminService.deleteParcel(parcel.id);
      refreshData();
      audioService.playBeepTone();
      showTemporaryNotice(`Guía ${parcel.id} eliminada permanentemente.`);
    }
  };

  // Automatic marking when driver drops off parcel at allied office (per parcel row)
  const handleOneClickOfficeDropoff = (parcel: ParcelModel) => {
    const targetOfficeId = parcel.destinationOfficeId || selectedAlliedOfficeId || 'OFI-TUL-01';
    const res = AdminService.markParcelDispatchedAndDeliveredAtOffice(parcel.id, targetOfficeId);
    if (res.success) {
      audioService.playSuccessTone();
      refreshData();
      showTemporaryNotice(res.message);
    }
  };

  // Automatic batch dropoff when a driver arrives at an allied office
  const handleDriverArrivalAtAlliedOffice = () => {
    if (!selectedDriverUnitId || !selectedAlliedOfficeId) return;
    const res = AdminService.autoDropoffByDriverUnit(selectedDriverUnitId, selectedAlliedOfficeId);
    if (res.updatedCount > 0) {
      audioService.playSuccessTone();
      refreshData();
      showTemporaryNotice(res.message);
    } else {
      // If no active parcels were pending on that unit, check if there is any 'recibido' or 'en_transito' parcel to associate and complete
      const office = alliedOffices.find((o) => o.id === selectedAlliedOfficeId) || alliedOffices[0];
      const unit = units.find((u) => u.id === selectedDriverUnitId);
      const pendingParcel = parcels.find((p) => p.status !== 'entregado' && p.status !== 'cancelado');

      if (pendingParcel && unit) {
        AdminService.updateParcelStatus(pendingParcel.id, 'en_transito', unit);
        const singleRes = AdminService.markParcelDispatchedAndDeliveredAtOffice(
          pendingParcel.id,
          office.id
        );
        audioService.playSuccessTone();
        refreshData();
        showTemporaryNotice(singleRes.message);
      } else {
        audioService.playBeepTone();
        showTemporaryNotice(res.message);
      }
    }
  };

  // Quick scan / guide code input dropoff at allied office
  const handleQuickGuideScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = quickGuideScanInput.trim().toUpperCase();
    if (!code) return;

    const res = AdminService.markParcelDispatchedAndDeliveredAtOffice(code, selectedAlliedOfficeId);
    if (res.success) {
      audioService.playSuccessTone();
      refreshData();
      showTemporaryNotice(res.message);
      setQuickGuideScanInput('');
    } else {
      audioService.playBeepTone();
      showTemporaryNotice(`No se encontró la guía "${code}". Verifique el código (ej. ENC-001 o GUIA-ANDES-001).`);
    }
  };

  const filteredParcels = parcels.filter((p) => {
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSender = p.senderName.toLowerCase().includes(q);
      const matchRecip = p.recipientName.toLowerCase().includes(q);
      const matchDesc = p.packageDescription.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      const matchGuide = (p.guideNumber || '').toLowerCase().includes(q);
      const matchOffice = (p.destinationOfficeName || '').toLowerCase().includes(q);
      if (!matchSender && !matchRecip && !matchDesc && !matchId && !matchGuide && !matchOffice) return false;
    }
    return true;
  });

  const getStatusBadge = (parcel: ParcelModel) => {
    switch (parcel.status) {
      case 'recibido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Recibido en Oficina
          </span>
        );
      case 'asignado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Car className="w-3.5 h-3.5" />
            Conductor Asignado
          </span>
        );
      case 'en_transito':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Truck className="w-3.5 h-3.5 animate-pulse" />
            Despachado / En Tránsito
          </span>
        );
      case 'entregado':
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Despachado y Entregado
            </span>
            {parcel.autoDeliveredByOffice && (
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                ⚡ Auto-Oficina Aliada
              </span>
            )}
          </div>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Automatic Notification Banner */}
      {autoNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-emerald-300 uppercase text-[10px] tracking-wider">
                Sistema Automático de Oficinas Aliadas AndesMovi
              </div>
              <div className="font-bold text-white text-xs mt-0.5">{autoNotice}</div>
            </div>
          </div>
          <button
            onClick={() => setAutoNotice(null)}
            className="text-emerald-400 hover:text-white px-2 py-1 rounded-lg font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#121316] border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-zinc-400 text-xs font-mono uppercase">Total Guías Emitidas</span>
            <div className="text-2xl font-black text-white font-mono mt-1">{parcels.length}</div>
            <span className="text-[11px] text-zinc-500">Corredor Norte E35</span>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121316] border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-zinc-400 text-xs font-mono uppercase">En Tránsito / Activas</span>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {parcels.filter((p) => p.status === 'recibido' || p.status === 'asignado' || p.status === 'en_transito').length}
            </div>
            <span className="text-[11px] text-zinc-500">Hacia oficinas aliadas</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Truck className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-[#121316] border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-zinc-400 text-xs font-mono uppercase">Despachadas y Entregadas</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {parcels.filter((p) => p.status === 'entregado').length}
            </div>
            <span className="text-[11px] text-emerald-500/80 font-mono">Recepción automática en oficina</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121316] border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-zinc-400 text-xs font-mono uppercase">Oficinas Aliadas Activas</span>
            <div className="text-2xl font-black text-sky-400 font-mono mt-1">{alliedOffices.length}</div>
            <span className="text-[11px] text-zinc-400">Tulcán, Rumichaca, S. Gabriel, Ibarra, Quito</span>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* PANEL DE RECEPCIÓN AUTOMÁTICA EN OFICINAS ALIADAS                       */}
      {/* "Las guías se marcan automáticamente despachados y entregados cuando    */}
      {/*  el conductor deja la encomienda en las oficinas aliadas"               */}
      {/* ======================================================================= */}
      <div className="bg-gradient-to-r from-[#12151e] via-[#131822] to-[#12151e] border border-emerald-800/60 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  Recepción Automática de Guías en Oficinas Aliadas
                </h3>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  AUTO-DESPACHO Y ENTREGA ACTIVO
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cuando el conductor deja la encomienda en cualquiera de nuestras oficinas aliadas, las guías se marcan automáticamente como <strong className="text-emerald-300">Despachadas y Entregadas</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Left: Driver Drop-off at Allied Office */}
          <div className="lg:col-span-7 bg-[#161820] border border-zinc-800 p-3.5 rounded-xl space-y-3">
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4" />
              <span>1. Registrar Llegada y Entrega de Conductor en Oficina Aliada</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Conductor que entrega la encomienda:</label>
                <select
                  value={selectedDriverUnitId}
                  onChange={(e) => setSelectedDriverUnitId(e.target.value)}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id} — {u.driverName} ({u.vehicle.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Oficina Aliada donde deja el paquete:</label>
                <select
                  value={selectedAlliedOfficeId}
                  onChange={(e) => setSelectedAlliedOfficeId(e.target.value)}
                  className="w-full bg-[#1e2029] border border-zinc-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {alliedOffices.map((o) => (
                    <option key={o.id} value={o.id}>
                      🏢 {o.name} ({o.canton})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleDriverArrivalAtAlliedOffice}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar que el Conductor Dejó la Encomienda en Oficina Aliada (Marcar Despachado y Entregado)</span>
            </button>
          </div>

          {/* Right: Quick Guide Code Scanner */}
          <form
            onSubmit={handleQuickGuideScan}
            className="lg:col-span-5 bg-[#161820] border border-zinc-800 p-3.5 rounded-xl space-y-3"
          >
            <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
              <QrCode className="w-4 h-4" />
              <span>2. Escaneo Rápido de Guía en Ventanilla Aliada</span>
            </div>
            <div className="text-xs">
              <label className="text-[11px] text-zinc-400 block mb-1">
                Código de Guía (Ej: ENC-001, ENC-002 o GUIA-ANDES-001):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickGuideScanInput}
                  onChange={(e) => setQuickGuideScanInput(e.target.value)}
                  placeholder="Ingresar o escanear N° de Guía..."
                  className="flex-1 bg-[#1e2029] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap"
                >
                  Auto-Entregar Guía
                </button>
              </div>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono flex items-center justify-between pt-1">
              <span>Agencia receptora activa:</span>
              <span className="text-sky-400 font-bold">
                {alliedOffices.find((o) => o.id === selectedAlliedOfficeId)?.shortName}
              </span>
            </div>
          </form>
        </div>

        {/* Allied Offices Horizontal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {alliedOffices.map((off) => (
            <div
              key={off.id}
              onClick={() => setSelectedAlliedOfficeId(off.id)}
              className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                selectedAlliedOfficeId === off.id
                  ? 'bg-sky-950/40 border-sky-500/80 text-white'
                  : 'bg-[#14161d] border-zinc-800/90 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-sky-400">{off.id}</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-mono border border-emerald-800">
                  {off.packagesReceived} recibidos
                </span>
              </div>
              <div className="font-bold text-white text-xs mt-1 truncate">🏢 {off.shortName}</div>
              <div className="text-[10px] text-zinc-400 truncate mt-0.5">{off.address}</div>
              <div className="text-[10px] text-zinc-500 font-mono mt-1 truncate">{off.agentName}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#121316] border border-zinc-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por N° de guía (GUIA-ANDES-001), remitente, destinatario u oficina aliada..."
              className="w-full bg-[#18191e] border border-zinc-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#18191e] border border-zinc-700/80 p-0.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400 ml-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-zinc-200 px-2 py-1 text-xs focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Estados ({parcels.length})</option>
              <option value="recibido">Recibidos en Oficina</option>
              <option value="asignado">Conductor Asignado</option>
              <option value="en_transito">Despachados / En Tránsito</option>
              <option value="entregado">Despachados y Entregados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + Emitir Nueva Guía de Encomienda
        </button>
      </div>

      {/* Parcels & Waybills Table */}
      <div className="bg-[#121316] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#18191e] text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-mono">
                <th className="py-3 px-4 font-bold">Guía Oficial</th>
                <th className="py-3 px-4 font-bold">Ruta de Oficinas Aliadas</th>
                <th className="py-3 px-4 font-bold">Remitente ➔ Destinatario</th>
                <th className="py-3 px-4 font-bold">Detalle de Encomienda</th>
                <th className="py-3 px-3 font-bold text-right">Valor</th>
                <th className="py-3 px-4 font-bold">Conductor / Unidad</th>
                <th className="py-3 px-3 font-bold text-center">Estado de Guía</th>
                <th className="py-3 px-4 font-bold text-right">Acciones / Oficina</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
              {filteredParcels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <Package className="w-10 h-10 mx-auto text-zinc-600 mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No hay guías de encomienda que coincidan con el filtro</p>
                  </td>
                </tr>
              ) : (
                filteredParcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-[#181a20] transition">
                    {/* Guía ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-black text-blue-400 text-xs">{parcel.id}</div>
                      <div className="font-mono text-[10px] text-zinc-400">
                        {parcel.guideNumber || `GUIA-${parcel.id}`}
                      </div>
                    </td>

                    {/* Oficinas Aliadas Origen -> Destino */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <span className="text-zinc-500 font-mono text-[10px]">De:</span>
                          <span className="font-semibold">{parcel.originOfficeName || 'Central Tulcán'}</span>
                        </span>
                        <span className="text-sky-300 flex items-center gap-1">
                          <span className="text-zinc-500 font-mono text-[10px]">A:</span>
                          <span className="font-bold">
                            🏢 {parcel.destinationOfficeName || 'Agencia Aliada Destino'}
                          </span>
                        </span>
                        {parcel.dropOffOfficeName && (
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/60 inline-block w-fit">
                            ✓ Recibido en: {parcel.dropOffOfficeName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Remitente / Destinatario */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-white">{parcel.senderName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mb-1">{parcel.senderPhone}</div>
                      <div className="text-emerald-300 font-bold text-[11px]">➔ {parcel.recipientName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{parcel.recipientPhone}</div>
                    </td>

                    {/* Paquete */}
                    <td className="py-3.5 px-4 max-w-[210px]">
                      <div className="text-zinc-200 line-clamp-2 font-medium">{parcel.packageDescription}</div>
                      {parcel.packageWeight && (
                        <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.2 rounded mt-1 inline-block">
                          Peso: {parcel.packageWeight}
                        </span>
                      )}
                    </td>

                    {/* Tarifa */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      <div className="text-white">${parcel.fare.toFixed(2)}</div>
                      <div className="text-[10px] text-zinc-400">{parcel.paymentMethod}</div>
                    </td>

                    {/* Unidad */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {parcel.assignedDriver ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-100">
                            <Car className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{parcel.assignedDriver}</span>
                          </div>
                          {parcel.receivedByAgent && (
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              Agente: {parcel.receivedByAgent.split('(')[0]}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningParcel(parcel)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          + Asignar Conductor
                        </button>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(parcel)}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {parcel.status !== 'entregado' && parcel.status !== 'cancelado' && (
                          <button
                            onClick={() => handleOneClickOfficeDropoff(parcel)}
                            title="El conductor deja la encomienda en la oficina aliada: marca automáticamente Despachado y Entregado"
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Dejar en Oficina Aliada</span>
                          </button>
                        )}

                        {parcel.status === 'recibido' && (
                          <button
                            onClick={() => setAssigningParcel(parcel)}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Asignar
                          </button>
                        )}

                        <button
                          onClick={() => setViewingGuideReceipt(parcel)}
                          title="Ver comprobante oficial de Guía"
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteParcel(parcel)}
                          title="Eliminar encomienda de la base de datos"
                          className="p-1.5 rounded-xl bg-rose-900/30 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-700/50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODAL: COMPROBANTE OFICIAL DE GUÍA DE ENCOMIENDA                        */}
      {/* ======================================================================= */}
      {viewingGuideReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-xs">
            <div className="p-4 bg-[#18191e] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-black text-white text-sm">
                    Guía Oficial de Encomienda {viewingGuideReceipt.id}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {viewingGuideReceipt.guideNumber || `GUIA-ANDES-${viewingGuideReceipt.id}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingGuideReceipt(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-[#181a22] border border-zinc-800 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400 font-mono text-[10px]">ESTADO DE LA GUÍA:</span>
                  {getStatusBadge(viewingGuideReceipt)}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Oficina Aliada Origen:</span>
                    <span className="font-bold text-white">
                      {viewingGuideReceipt.originOfficeName || 'Oficina Central Tulcán'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Oficina Aliada Destino:</span>
                    <span className="font-bold text-sky-400">
                      {viewingGuideReceipt.destinationOfficeName || 'Agencia Aliada Destino'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#181a22] border border-zinc-800 p-3.5 rounded-2xl">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Remitente:</span>
                  <span className="font-bold text-white block">{viewingGuideReceipt.senderName}</span>
                  <span className="font-mono text-zinc-400 text-[11px]">{viewingGuideReceipt.senderPhone}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Destinatario:</span>
                  <span className="font-bold text-emerald-300 block">{viewingGuideReceipt.recipientName}</span>
                  <span className="font-mono text-zinc-400 text-[11px]">{viewingGuideReceipt.recipientPhone}</span>
                </div>
              </div>

              <div className="bg-[#181a22] border border-zinc-800 p-3.5 rounded-2xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Contenido:</span>
                  <span className="font-bold text-white">{viewingGuideReceipt.packageDescription}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Conductor Asignado:</span>
                  <span className="font-bold text-blue-400">
                    {viewingGuideReceipt.assignedDriver || 'Pendiente de asignar'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tarifa Pagada:</span>
                  <span className="font-mono font-black text-emerald-400">
                    ${viewingGuideReceipt.fare.toFixed(2)} USD ({viewingGuideReceipt.paymentMethod})
                  </span>
                </div>
                {viewingGuideReceipt.dropOffOfficeName && (
                  <div className="pt-2 mt-2 border-t border-zinc-800 space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Certificación de Entrega en Oficina Aliada:</span>
                    </div>
                    <div className="text-zinc-300 text-[11px]">
                      Dejado en: <strong>{viewingGuideReceipt.dropOffOfficeName}</strong>
                    </div>
                    <div className="text-zinc-400 text-[10px] font-mono">
                      Agente receptor: {viewingGuideReceipt.receivedByAgent}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                {viewingGuideReceipt.status !== 'entregado' && (
                  <button
                    onClick={() => {
                      handleOneClickOfficeDropoff(viewingGuideReceipt);
                      setViewingGuideReceipt(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Marcar Dejado en Oficina Aliada
                  </button>
                )}
                <button
                  onClick={() => setViewingGuideReceipt(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Parcel Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#18191e] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Emitir Nueva Guía de Encomienda</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParcel} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Oficina Aliada de Origen *</label>
                  <select
                    value={originOfficeId}
                    onChange={(e) => setOriginOfficeId(e.target.value)}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    {alliedOffices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.shortName} ({o.canton})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Oficina Aliada de Destino *</label>
                  <select
                    value={destinationOfficeId}
                    onChange={(e) => setDestinationOfficeId(e.target.value)}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    {alliedOffices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.shortName} ({o.canton})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Remitente *</label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Nombre o Negocio"
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Teléfono Remitente *</label>
                  <input
                    type="text"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Destinatario *</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Persona o Agencia que recibe"
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Teléfono Destinatario *</label>
                  <input
                    type="text"
                    required
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Conductor Asignado (Opcional)</label>
                <select
                  value={initialUnitId}
                  onChange={(e) => setInitialUnitId(e.target.value)}
                  className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Dejar en recepción de oficina para asignar luego --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id} - {u.driverName} ({u.vehicle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-zinc-300 mb-1">Descripción del Paquete *</label>
                  <input
                    type="text"
                    required
                    value={packageDescription}
                    onChange={(e) => setPackageDescription(e.target.value)}
                    placeholder="Ej. Medicinas, repuestos, sobre cerrado"
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Peso Aprox.</label>
                  <input
                    type="text"
                    value={packageWeight}
                    onChange={(e) => setPackageWeight(e.target.value)}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Tarifa de Envío (USD)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="1.00"
                    value={isNaN(fare) ? '' : fare}
                    onChange={(e) => setFare( parseFloat(e.target.value) || 2.0 )}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'Efectivo' | 'Transferencia')}
                    className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/30"
                >
                  Registrar Guía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Unit Modal */}
      {assigningParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#18191e] border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">
                  Asignar Unidad a Encomienda {assigningParcel.id}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Destino: {assigningParcel.destinationOfficeName || assigningParcel.deliveryAddress}
                </p>
              </div>
              <button
                onClick={() => setAssigningParcel(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {units.filter((u) => u.status === 'disponible').length === 0 ? (
                <p className="text-center py-6 text-zinc-500 text-xs">
                  No hay unidades disponibles en este momento.
                </p>
              ) : (
                units
                  .filter((u) => u.status === 'disponible')
                  .map((unit) => (
                    <div
                      key={unit.id}
                      onClick={() => handleAssignUnit(assigningParcel.id, unit)}
                      className="p-3 rounded-2xl bg-[#1a1c23] hover:bg-blue-600/15 border border-zinc-800 hover:border-blue-500/40 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-xs">
                          {unit.id}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{unit.driverName}</div>
                          <div className="text-[11px] text-zinc-400">
                            {unit.vehicle} • {unit.plate}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px]">
                        Despachar
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
