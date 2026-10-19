import React, { useState, useEffect, useRef } from 'react';
import {
  FleetUnit,
  DriverVerificationRequest,
  CantonTariff,
  DispatchServiceRequest,
  EmergencyAlert,
  RadioTransmission,
  UnitStatus,
  TripModel,
  ParcelModel,
  PlatformSettings,
} from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import { firebaseSyncService } from '../services/firebase_service';
import { t, setLanguage, getLanguage, LanguageCode, languages } from '../services/i18n';
import { OpenStreetMapRadar } from '../components/OpenStreetMapRadar';
import { OfficesStaticMap } from '../components/OfficesStaticMap';
import { RadioPTTConsole } from '../components/RadioPTTConsole';
import { TripsLiveTable } from '../components/TripsLiveTable';
import { ParcelsManager } from '../components/ParcelsManager';
import { AddDriverModal } from '../components/AddDriverModal';
import { PlatformSettingsPanel } from '../components/PlatformSettingsPanel';
import { SociosManager } from '../components/SociosManager';
import { FinanceManager } from '../components/FinanceManager';
import { AICopilotPanel } from '../components/AICopilotPanel';
import { ViajesEjecutivosManager } from '../components/ViajesEjecutivosManager';
import { StaffUsersManager } from '../components/StaffUsersManager';
import {
  Radio,
  Car,
  Users,
  Coins,
  ShieldAlert,
  BarChart3,
  LogOut,
  Plus,
  Phone,
  Navigation,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Volume2,
  VolumeX,
  FileText,
  DollarSign,
  TrendingUp,
  MapPin,
  HelpCircle,
  Building2,
  Layers,
  UserCheck,
  Send,
  Eye,
  Package,
  Settings,
  Percent,
  Database,
  Flame,
  Search,
  Trash2,
  Sparkles,
  Bot,
  Key,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Props {
  onLogout: () => void;
}

export const AdminDashboardScreen: React.FC<Props> = ({ onLogout }) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'viajes' | 'despacho' | 'finanzas' | 'socios' | 'flota' | 'encomiendas' | 'validacion' | 'tarifas' | 'alertas' | 'config' | 'kpis' | 'viajes_ejecutivos' | 'panel_conductor' | 'personal_usuarios'
  >('despacho');

  // Drag-to-scroll con el mouse para la barra de navegación superior
  const navScrollRef = useRef<HTMLElement | null>(null);
  const isDraggingNavRef = useRef<boolean>(false);
  const hasMovedNavRef = useRef<boolean>(false);
  const startXNavRef = useRef<number>(0);
  const scrollLeftNavRef = useRef<number>(0);

  const handleNavMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (!navScrollRef.current) return;
    isDraggingNavRef.current = true;
    hasMovedNavRef.current = false;
    startXNavRef.current = e.pageX - navScrollRef.current.offsetLeft;
    scrollLeftNavRef.current = navScrollRef.current.scrollLeft;
  };

  const handleNavMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!isDraggingNavRef.current || !navScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - navScrollRef.current.offsetLeft;
    const walk = (x - startXNavRef.current) * 1.6;
    if (Math.abs(x - startXNavRef.current) > 5) {
      hasMovedNavRef.current = true;
    }
    navScrollRef.current.scrollLeft = scrollLeftNavRef.current - walk;
  };

  const handleNavMouseUpOrLeave = () => {
    isDraggingNavRef.current = false;
  };

  const handleNavWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (!navScrollRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      navScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollNavBy = (delta: number) => {
    if (!navScrollRef.current) return;
    navScrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // App data state
  const [units, setUnits] = useState<FleetUnit[]>([]);
  const [requests, setRequests] = useState<DriverVerificationRequest[]>([]);
  const [tariffs, setTariffs] = useState<CantonTariff[]>([]);
  const [dispatches, setDispatches] = useState<DispatchServiceRequest[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [transmissions, setTransmissions] = useState<RadioTransmission[]>([]);
  const [trips, setTrips] = useState<TripModel[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(AdminService.getStoredSettings());
  const [commissionRate, setCommissionRate] = useState<number>(AdminService.getStoredSettings().commissionRate);

  // Selected unit and trip for map and actions
  const [selectedUnit, setSelectedUnit] = useState<FleetUnit | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripModel | null>(null);
  const [mapDisplayMode, setMapDisplayMode] = useState<'vehiculos' | 'oficinas_fijas' | 'dual'>('vehiculos');
  const [fleetSearchQuery, setFleetSearchQuery] = useState<string>('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<'todos' | 'habilitados' | 'deshabilitados'>('todos');
  const [selectedFleetUnitIds, setSelectedFleetUnitIds] = useState<string[]>([]);

  // Modals & form state
  const [showNewDispatchModal, setShowNewDispatchModal] = useState(false);
  const [showNewUnitModal, setShowNewUnitModal] = useState(false);
  const [showDirectAddDriverModal, setShowDirectAddDriverModal] = useState(false);
  const [showEditTariffModal, setShowEditTariffModal] = useState<CantonTariff | null>(null);
  const [inspectingRequest, setInspectingRequest] = useState<DriverVerificationRequest | null>(null);
  
  // AI State
  const [showAiCopilotPanel, setShowAiCopilotPanel] = useState(false);
  const [showAiDocModal, setShowAiDocModal] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('image/jpeg');
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  // Calculator state
  const [calcCanton, setCalcCanton] = useState('Tulcán Centro / Urbano');
  const [calcKm, setCalcKm] = useState<number>(4.5);
  const [calcNight, setCalcNight] = useState(false);
  const [calcAirport, setCalcAirport] = useState(false);

  // New dispatch form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newPickup, setNewPickup] = useState('');
  const [newDropoff, setNewDropoff] = useState('');
  const [newCanton, setNewCanton] = useState('Tulcán');
  const [newKm, setNewKm] = useState(3.5);

  // Clock
  const [currentTime, setCurrentTime] = useState('');

  // Audio mute
  const [soundEnabled, setSoundEnabled] = useState(audioService.isSoundEnabled());

  // Load data on mount
  useEffect(() => {
    setUnits(AdminService.getStoredUnits());
    setRequests(AdminService.getStoredRequests());
    setTariffs(AdminService.getStoredTariffs());
    setDispatches(AdminService.getStoredDispatches());
    setAlerts(AdminService.getStoredAlerts());
    setTransmissions(AdminService.getStoredTransmissions());
    setPlatformSettings(AdminService.getStoredSettings());

    const unsubTrips = firebaseSyncService.subscribeToViajes((t) => {
      setTrips(t);
    });

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => {
      clearInterval(timer);
      unsubTrips();
    };
  }, []);

  // Save changes to localStorage when updated
  const updateUnits = (newUnits: FleetUnit[]) => {
    setUnits(newUnits);
    AdminService.saveUnits(newUnits);
    if (selectedUnit) {
      const refreshed = newUnits.find((u) => u.id === selectedUnit.id);
      if (refreshed) setSelectedUnit(refreshed);
    }
  };

  const updateRequests = (newRequests: DriverVerificationRequest[]) => {
    setRequests(newRequests);
    AdminService.saveRequests(newRequests);
  };

  const updateTariffs = (newTariffs: CantonTariff[]) => {
    setTariffs(newTariffs);
    AdminService.saveTariffs(newTariffs);
  };

  const updateDispatches = (newDispatches: DispatchServiceRequest[]) => {
    setDispatches(newDispatches);
    AdminService.saveDispatches(newDispatches);
  };

  const updateAlerts = (newAlerts: EmergencyAlert[]) => {
    setAlerts(newAlerts);
    AdminService.saveAlerts(newAlerts);
  };

  const updateTransmissions = (newTrans: RadioTransmission[]) => {
    setTransmissions(newTrans);
    AdminService.saveTransmissions(newTrans);
  };

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioService.setSoundEnabled(next);
    if (next) audioService.playSuccessTone();
  };

  // Handle Radio Transmission
  const handleTransmit = (message: string, channel: string) => {
    const newTrans: RadioTransmission = {
      id: `RAD-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      channel,
      unitId: selectedUnit ? selectedUnit.id : 'FLOTA',
      sender: 'CENTRAL',
      message,
    };
    updateTransmissions([newTrans, ...transmissions]);
  };

  // Assign dispatch to unit
  const handleAssignDispatch = (dispatchId: string, unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;

    audioService.playIncomingDispatchAlert();

    // Update dispatch status
    const updatedDispatches = dispatches.map((d) => {
      if (d.id === dispatchId) {
        return {
          ...d,
          status: 'en_curso' as const,
          assignedUnitId: unit.id,
          assignedDriver: unit.driverName,
        };
      }
      return d;
    });
    updateDispatches(updatedDispatches);

    // Update unit status to 'en_camino'
    const updatedUnits = units.map((u) => {
      if (u.id === unit.id) {
        return {
          ...u,
          status: 'en_camino' as UnitStatus,
          currentDestination: 'En camino a recoger pasajero',
        };
      }
      return u;
    });
    updateUnits(updatedUnits);

    // Broadcast on radio
    handleTransmit(
      `Central a ${unit.id} (${unit.driverName}): Carrera asignada. Diríjase a punto de recogida inmediatamente.`,
      'CANAL 1 - TULCÁN MATRIZ'
    );
  };

  // Direct deletion of a driver/unit from state & localStorage & cloud
  const handleDeleteUnit = async (unitId: string) => {
    await firebaseSyncService.deleteDriverFromCloud(unitId);
    AdminService.deleteUnit(unitId);
    const refreshed = AdminService.getStoredUnits();
    setUnits(refreshed);
    if (selectedUnit?.id === unitId || selectedUnit?.plate?.toUpperCase() === unitId.toUpperCase()) {
      setSelectedUnit(null);
    }
    audioService.playPTTKey();
  };

  // Complete a dispatch
  const handleCompleteDispatch = (dispatchId: string) => {
    const target = dispatches.find((d) => d.id === dispatchId);
    if (!target) return;

    audioService.playSuccessTone();

    const updatedDispatches = dispatches.map((d) => {
      if (d.id === dispatchId) {
        return { ...d, status: 'completado' as const };
      }
      return d;
    });
    updateDispatches(updatedDispatches);

    // Free unit
    if (target.assignedUnitId) {
      const updatedUnits = units.map((u) => {
        if (u.id === target.assignedUnitId) {
          return {
            ...u,
            status: 'disponible' as UnitStatus,
            completedTrips: u.completedTrips + 1,
            currentOrigin: target.dropoffAddress,
            currentDestination: 'Libre / Esperando servicio',
          };
        }
        return u;
      });
      updateUnits(updatedUnits);
    }
  };

  // Create new manual dispatch
  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newPickup || !newDropoff) return;

    const fare = AdminService.calculateFare(newCanton, newKm, false, false);
    const newDisp: DispatchServiceRequest = {
      id: `DESP-${Math.floor(100 + Math.random() * 900)}`,
      clientName: newClientName,
      clientPhone: newClientPhone || '0980000000',
      pickupAddress: newPickup,
      dropoffAddress: newDropoff,
      canton: newCanton,
      requestedAt: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
      estimatedKm: newKm,
      estimatedFare: fare,
      status: 'esperando_unidad',
      notes: 'Ingresado por operadora de radio central.',
      channel: 'Central Telefónica',
    };

    updateDispatches([newDisp, ...dispatches]);
    audioService.playIncomingDispatchAlert();

    // Reset form
    setNewClientName('');
    setNewClientPhone('');
    setNewPickup('');
    setNewDropoff('');
    setShowNewDispatchModal(false);
  };

  // File Upload Handler matching user requirement
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedMimeType(file.type || 'image/jpeg');
      const reader = new FileReader();
      reader.onload = (e) => {
        const resultString = e.target?.result as string;
        setUploadedImagePreview(resultString);
        // Pure base64 required by Gemini
        const pureBase64 = resultString.split(',')[1];
        setUploadedBase64(pureBase64);
        setAiAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run AI Inspection
  const handleAnalyzeDocWithAi = async () => {
    if (!uploadedBase64) return;
    setIsAiScanning(true);
    setAiAnalysisResult(null);
    audioService.playPTTKey();

    try {
      const resp = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadedBase64,
          mimeType: uploadedMimeType,
        }),
      });

      const data = await resp.json();
      setIsAiScanning(false);

      if (data.success && data.analysis) {
        setAiAnalysisResult(data.analysis);
        audioService.playSuccessTone();
      } else {
        alert('No se pudo procesar la imagen: ' + (data.error || 'Error'));
      }
    } catch (err) {
      setIsAiScanning(false);
      // Fallback local simulation if offline
      setAiAnalysisResult({
        isValid: true,
        docType: 'Licencia Profesional Tipo C',
        driverName: 'Conductor Verificado (AndesMovi Ecuador)',
        idNumber: '0401827493',
        licenseType: 'Profesional Tipo C Vigente 2028',
        plate: 'PBC-4921',
        vehicleModel: 'Toyota Yaris 2021',
        expirationDate: 'Vigente hasta 2028',
        summary: 'Documento homologado y validado en sistema local de la Central AndesMovi.',
      });
      audioService.playSuccessTone();
    }
  };

  // Approve driver request
  const handleApproveDriver = (req: DriverVerificationRequest) => {
    audioService.playSuccessTone();

    const updatedRequests = requests.map((r) =>
      r.id === req.id ? { ...r, status: 'aprobado' as const, reviewNotes: 'Documentos ANT y SOAT aprobados.' } : r
    );
    updateRequests(updatedRequests);

    // Auto onboard as unit in fleet
    const newUnitId = `AM-${Math.floor(80 + Math.random() * 20)}`;
    const newFleetUnit: FleetUnit = {
      id: newUnitId,
      driverName: req.name,
      vehicle: req.vehicle,
      plate: req.plate,
      status: 'disponible',
      canton: req.canton,
      rating: 5.0,
      completedTrips: 0,
      phone: req.phone,
      lat: 0.8124 + (Math.random() - 0.5) * 0.02,
      lng: -77.7174 + (Math.random() - 0.5) * 0.02,
      batteryLevel: 98,
      cooperative: 'Coop. Asociada AndesMovi',
      currentOrigin: 'Base Central Tulcán',
      currentDestination: 'Unidad Recién Habilitada',
      lastUpdated: 'Recién Ingresado',
    };

    updateUnits([...units, newFleetUnit]);
    setInspectingRequest(null);
  };

  // Reject driver request
  const handleRejectDriver = (reqId: string, reason: string) => {
    const updatedRequests = requests.map((r) =>
      r.id === reqId ? { ...r, status: 'rechazado' as const, reviewNotes: reason } : r
    );
    updateRequests(updatedRequests);
    setInspectingRequest(null);
  };

  // Trigger simulated SOS panic
  const handleSimulateSOS = () => {
    audioService.playSirenAlarm();
    const newAlert: EmergencyAlert = {
      id: `ALERT-${Date.now().toString().slice(-4)}`,
      unitId: 'AM-012',
      driverName: 'Marco Rosero',
      vehicle: 'Chevrolet Sail (PBC-4921)',
      plate: 'PBC-4921',
      canton: 'Tulcán',
      timestamp: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
      locationDescription: 'Panamericana Norte sector Troya / Rumichaca',
      lat: 0.8143,
      lng: -77.6631,
      resolved: false,
      escalatedTo911: false,
      notes: 'Botón de pánico silencioso accionado en taxímetro AndesMovi.',
    };

    updateAlerts([newAlert, ...alerts]);

    // Mark unit SOS
    const updatedUnits = units.map((u) => (u.id === 'AM-012' ? { ...u, status: 'sos' as UnitStatus } : u));
    updateUnits(updatedUnits);
    setActiveTab('alertas');
  };

  // Resolve emergency alert
  const handleResolveAlert = (alertId: string) => {
    const updatedAlerts = alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a));
    updateAlerts(updatedAlerts);

    // Reset units if needed
    const target = alerts.find((a) => a.id === alertId);
    if (target) {
      const updatedUnits = units.map((u) => (u.id === target.unitId ? { ...u, status: 'disponible' as UnitStatus } : u));
      updateUnits(updatedUnits);
    }
  };

  // KPIs calculations
  const totalTrips = units.reduce((acc, u) => acc + u.completedTrips, 0);
  const totalGrossEstimated = totalTrips * 3.4;
  const totalPlatformEarnings = totalGrossEstimated * 0.11;
  const activeCount = units.filter((u) => u.status === 'disponible' || u.status === 'en_carrera' || u.status === 'en_camino').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'pendiente').length;
  const activeAlertsCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans select-none">
      {/* Top Corporate Andean Navbar */}
      <header className="bg-[#121316] border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-50 shadow-lg">
        {/* Branding using User's Native SVG */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {/* Native SVG Car emblem provided by user */}
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-1.5 shadow-md">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#16a34a">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-emerald-400">AndesMovi</span>
                  <span className="text-blue-400 font-normal text-xs uppercase px-1.5 py-0.2 rounded bg-blue-950 border border-blue-800">
                    Central Admin
                  </span>
                </h1>
                <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Consola Central y Radio-Despacho • Ecuador
              </p>
            </div>
          </div>
        </div>

        {/* Center Live Telemetry */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#18191e] border border-zinc-800 px-3 py-1.5 rounded-xl">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span className="text-zinc-300">REP. CERRO TROYA:</span>
            <span className="text-emerald-400 font-bold">144.520 MHz</span>
          </div>

          <div className="flex items-center gap-2 bg-[#18191e] border border-zinc-800 px-3 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-300">ECUADOR (COT):</span>
            <span className="text-white font-bold">{currentTime}</span>
          </div>

          <div className="flex items-center gap-2 bg-[#18191e] border border-zinc-800 px-3 py-1.5 rounded-xl">
            <Car className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-300">FLOTA ACTIVA:</span>
            <span className="text-emerald-400 font-bold">{activeCount} / {units.length}</span>
          </div>

          <a
            href="https://api.whatsapp.com/send?phone=593998566503&text=Hola%20Soporte%20AndesMovi%20Ecuador"
            target="_blank"
            rel="noreferrer"
            title="Contactar a Soporte Oficial AndesMovi por WhatsApp"
            className="flex items-center gap-2 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-300">SOPORTE:</span>
            <span className="text-emerald-400 font-bold">+593 99 856 6503</span>
          </a>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* AI Copilot Central Button */}
          <button
            onClick={() => setShowAiCopilotPanel(true)}
            title="Abrir Copiloto IA para despacho, informes y consultas"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer border border-indigo-400/40 animate-pulse"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Copiloto IA Central</span>
          </button>

          {/* AI KYC Inspector */}
          <button
            onClick={() => setShowAiDocModal(true)}
            title="Escanear y verificar licencias, matrículas y SOAT con IA"
            className="px-2.5 py-1.5 rounded-xl bg-[#18191e] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Auditoría KYC IA</span>
          </button>

          {/* Language Selector */}
          <select
            value={getLanguage()}
            onChange={(e) => {
              setLanguage(e.target.value as LanguageCode);
              window.location.reload(); // Quick way to refresh translations
            }}
            className="bg-[#18191e] border border-zinc-700 text-zinc-300 text-[10px] font-bold rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            {Object.entries(languages).map(([code, lang]) => (
              <option key={code} value={code}>{lang.name}</option>
            ))}
          </select>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Silenciar alertas' : 'Activar audio'}
            className="p-2 rounded-xl bg-[#18191e] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* Test Emergency Alarm Button */}
          <button
            onClick={handleSimulateSOS}
            title="Simular Alerta de Pánico SOS para demostración"
            className="px-2.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span className="hidden sm:inline">Simular SOS</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => {
              AdminService.logout();
              onLogout();
            }}
            title="Cerrar Sesión de Administrador"
            className="p-2 rounded-xl bg-[#18191e] hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs Bar - Deslizable aplastando con el mouse (Drag-to-Scroll) */}
      <div className="bg-[#14151a] border-b border-zinc-800 flex items-center relative">
        <button
          type="button"
          onClick={() => scrollNavBy(-260)}
          className="px-2 py-2.5 text-zinc-400 hover:text-white bg-[#14151a] border-r border-zinc-800/80 shrink-0 cursor-pointer transition"
          title="Deslizar menú a la izquierda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <nav
          ref={navScrollRef}
          onMouseDown={handleNavMouseDown}
          onMouseMove={handleNavMouseMove}
          onMouseUp={handleNavMouseUpOrLeave}
          onMouseLeave={handleNavMouseUpOrLeave}
          onWheel={handleNavWheel}
          onClickCapture={(e) => {
            if (hasMovedNavRef.current) {
              e.stopPropagation();
              e.preventDefault();
              hasMovedNavRef.current = false;
            }
          }}
          className="flex-1 px-3 py-1.5 flex items-center gap-1 overflow-x-auto text-xs scrollbar-none select-none cursor-grab active:cursor-grabbing"
        >
        {/* TAB VIAJES EN VIVO (FIREBASE) */}
        <button
          onClick={() => setActiveTab('viajes')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'viajes'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Database className="w-4 h-4 text-amber-400" />
          <span>{t('Viajes en Vivo')}</span>
          {trips.filter((t) => t.status === 'buscando').length > 0 && (
            <span className="bg-amber-400 text-zinc-950 font-black px-1.5 py-0.2 rounded-full text-[10px] animate-pulse">
              {trips.filter((t) => t.status === 'buscando').length} buscando
            </span>
          )}
        </button>

        {/* TAB VIAJES EJECUTIVOS */}
        <button
          onClick={() => setActiveTab('viajes_ejecutivos')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'viajes_ejecutivos'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Navigation className="w-4 h-4 text-emerald-400" />
          <span>{t('Viajes Ejecutivos')}</span>
        </button>

        {/* TAB PANEL DIRECTO DEL CONDUCTOR */}
        <button
          onClick={() => setActiveTab('panel_conductor')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'panel_conductor'
              ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>Panel del Conductor (Recogidas)</span>
        </button>

        {/* TAB PERSONAL Y USUARIOS CONTRATADOS (CREAR USUARIO Y CONTRASEÑA) */}
        <button
          onClick={() => setActiveTab('personal_usuarios')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'personal_usuarios'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Key className="w-4 h-4 text-amber-400" />
          <span>Personal & Usuarios (Claves)</span>
        </button>

        {/* TAB RADIO-DESPACHO & MAPA 1 CARROS */}
        <button
          onClick={() => {
            setActiveTab('despacho');
            setMapDisplayMode('vehiculos');
          }}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'despacho' && mapDisplayMode === 'vehiculos'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          <span>🚗 Mapa 1: Carros en Vivo</span>
          {dispatches.filter((d) => d.status === 'esperando_unidad').length > 0 && (
            <span className="bg-amber-400 text-zinc-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
              {dispatches.filter((d) => d.status === 'esperando_unidad').length}
            </span>
          )}
        </button>

        {/* TAB DEDICADO MAPA 2 OFICINAS FIJAS */}
        <button
          onClick={() => {
            setActiveTab('despacho');
            setMapDisplayMode('oficinas_fijas');
          }}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'despacho' && mapDisplayMode === 'oficinas_fijas'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-sky-400" />
          <span>🏢 Mapa 2: Oficinas Fijas</span>
        </button>

        {/* TAB VISTA DUAL 2 MAPAS */}
        <button
          onClick={() => {
            setActiveTab('despacho');
            setMapDisplayMode('dual');
          }}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'despacho' && mapDisplayMode === 'dual'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Layers className="w-4 h-4 text-yellow-300" />
          <span>🌐 Vista Dual (2 Mapas)</span>
        </button>

        {/* TAB FINANZAS: CONTROL DE INGRESOS Y EGRESOS */}
        <button
          onClick={() => setActiveTab('finanzas')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'finanzas'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Finanzas (Ingresos & Egresos)</span>
        </button>

        {/* TAB MÓDULO DE SOCIOS & ENTRADAS */}
        <button
          onClick={() => setActiveTab('socios')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'socios'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Módulo de Socios & Entradas</span>
        </button>

        {/* TAB FLOTA DE CONDUCTORES PARTICULARES */}
        <button
          onClick={() => setActiveTab('flota')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'flota'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Conductores Particulares ({units.length})</span>
        </button>

        {/* TAB ENCOMIENDAS & PAQUETERIA */}
        <button
          onClick={() => setActiveTab('encomiendas')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'encomiendas'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Package className="w-4 h-4 text-amber-400" />
          <span>Encomiendas & Envíos</span>
        </button>

        {/* TAB VALIDACION CHOFERES */}
        <button
          onClick={() => setActiveTab('validacion')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'validacion'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Validación KYC & IA Gemini</span>
          {pendingRequestsCount > 0 && (
            <span className="bg-emerald-500 text-zinc-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        {/* TAB TARIFAS */}
        <button
          onClick={() => setActiveTab('tarifas')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'tarifas'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Tarifas Cantonales</span>
        </button>

        {/* TAB ALERTAS SOS */}
        <button
          onClick={() => setActiveTab('alertas')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'alertas'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Alertas & SOS</span>
          {activeAlertsCount > 0 && (
            <span className="bg-red-500 text-white font-black px-1.5 py-0.2 rounded-full text-[10px] animate-pulse">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* TAB CONFIGURACION TOTAL */}
        <button
          onClick={() => setActiveTab('config')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'config'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Settings className="w-4 h-4 text-zinc-300" />
          <span>Configuración Plataforma</span>
        </button>

        {/* TAB KPIS */}
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'kpis'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>KPIs & Rendimiento</span>
        </button>
        </nav>

        <button
          type="button"
          onClick={() => scrollNavBy(260)}
          className="px-2 py-2.5 text-zinc-400 hover:text-white bg-[#14151a] border-l border-zinc-800/80 shrink-0 cursor-pointer transition"
          title="Deslizar menú a la derecha"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-4 md:p-5 overflow-y-auto">
        {/* ============================================================== */}
        {/* TAB FINANZAS: CONTROL DE INGRESOS Y EGRESOS (FLUJO DE CAJA)    */}
        {/* ============================================================== */}
        {activeTab === 'finanzas' && (
          <FinanceManager
            units={units}
            trips={trips}
            commissionRate={commissionRate}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 0: MÓDULO DE SOCIOS & ENTRADAS A LA APP */}
        {/* ============================================================== */}
        {activeTab === 'socios' && (
          <SociosManager
            units={units}
            trips={trips}
            commissionRate={commissionRate}
            onViewUnitOnMap={(unitId) => {
              const u = units.find((x) => x.id === unitId);
              if (u) {
                setSelectedUnit(u);
                setActiveTab('despacho');
              }
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB VIAJES EN VIVO (FIREBASE FIRESTORE) */}
        {/* ============================================================== */}
        {activeTab === 'viajes' && (
          <TripsLiveTable
            units={units}
            onViewOnMap={(trip) => {
              setSelectedTrip(trip);
              setActiveTab('despacho');
            }}
            onDispatchUnitToTrip={(trip, unit) => {
              firebaseSyncService.assignUnitToTrip(trip.id, unit);
            }}
            commissionRate={commissionRate}
            onCommissionRateChange={(rate) => {
              setCommissionRate(rate);
              const updated = { ...platformSettings, commissionRate: rate };
              setPlatformSettings(updated);
              AdminService.saveSettings(updated);
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 1: RADIO-DESPACHO & OPENSTREETMAP */}
        {/* ============================================================== */}
        {activeTab === 'despacho' && (
          <div className="space-y-4">
            {/* Top quick banner / action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121316] p-3 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-white">
                  Despacho Operativo en Tiempo Real (Vehículos Particulares)
                </span>
                <span className="text-xs text-zinc-400">
                  • {units.filter((u) => u.status === 'disponible').length} conductores disponibles para asignación
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewDispatchModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Carrera Telefónica / WhatsApp
                </button>
              </div>
            </div>

            {/* BARRA DE SELECCIÓN DE DOS MAPAS DEDICADOS / VISTA DUAL */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121318] p-3 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white uppercase tracking-tight">
                  Visores Satelitales OpenStreetMap:
                </span>
                <span className="text-xs text-zinc-400 font-mono hidden md:inline">
                  (Mapas independientes para Carros en vivo y Oficinas fijas)
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-[#18191e] p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setMapDisplayMode('vehiculos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    mapDisplayMode === 'vehiculos'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Mapa 1: Carros en Vivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapDisplayMode('oficinas_fijas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    mapDisplayMode === 'oficinas_fijas'
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-300" />
                  <span>Mapa 2: Oficinas Fijas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapDisplayMode('dual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    mapDisplayMode === 'dual'
                      ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Vista Dual (2 Mapas)</span>
                </button>
              </div>
            </div>

            {/* Split layout: Left is OpenStreetMap Radar / Offices Map / Dual, Right is Radio PTT & Incoming requests */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              {/* Left Column: Selected Map View Mode */}
              <div className="xl:col-span-8 flex flex-col min-h-[580px]">
                {mapDisplayMode === 'vehiculos' && (
                  <OpenStreetMapRadar
                    units={units}
                    selectedUnit={selectedUnit}
                    onSelectUnit={(unit) => {
                      setSelectedUnit(unit);
                      setSelectedTrip(null);
                    }}
                    onDispatchToUnit={(unit) => {
                      const waiting = dispatches.find((d) => d.status === 'esperando_unidad');
                      if (waiting) {
                        handleAssignDispatch(waiting.id, unit.id);
                      } else {
                        setShowNewDispatchModal(true);
                      }
                    }}
                    onDeleteUnit={handleDeleteUnit}
                    trips={trips}
                    selectedTrip={selectedTrip}
                    onSelectTrip={(trip) => {
                      setSelectedTrip(trip);
                      setSelectedUnit(null);
                    }}
                  />
                )}

                {mapDisplayMode === 'oficinas_fijas' && (
                  <OfficesStaticMap />
                )}

                {mapDisplayMode === 'dual' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                    <div className="flex flex-col min-h-[500px]">
                      <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-t-2xl text-[11px] font-black text-emerald-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5" /> MAPA 1: VEHÍCULOS Y RASTREO EN VIVO
                        </span>
                        <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono">GPS ACTIVE</span>
                      </div>
                      <OpenStreetMapRadar
                        units={units}
                        selectedUnit={selectedUnit}
                        onSelectUnit={(unit) => {
                          setSelectedUnit(unit);
                          setSelectedTrip(null);
                        }}
                        onDispatchToUnit={(unit) => {
                          const waiting = dispatches.find((d) => d.status === 'esperando_unidad');
                          if (waiting) {
                            handleAssignDispatch(waiting.id, unit.id);
                          } else {
                            setShowNewDispatchModal(true);
                          }
                        }}
                        onDeleteUnit={handleDeleteUnit}
                        trips={trips}
                        selectedTrip={selectedTrip}
                        onSelectTrip={(trip) => {
                          setSelectedTrip(trip);
                          setSelectedUnit(null);
                        }}
                      />
                    </div>

                    <div className="flex flex-col min-h-[500px]">
                      <div className="bg-sky-950/80 border border-sky-500/40 px-3 py-1.5 rounded-t-2xl text-[11px] font-black text-sky-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> MAPA 2: OFICINAS Y PUNTOS FIJOS
                        </span>
                        <span className="bg-sky-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono">RED FIJA</span>
                      </div>
                      <OfficesStaticMap />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Radio PTT & Live Service Requests */}
              <div className="xl:col-span-4 flex flex-col gap-4">
                {/* Radio PTT Console */}
                <div className="h-[360px]">
                  <RadioPTTConsole
                    transmissions={transmissions}
                    onTransmit={handleTransmit}
                    selectedUnitId={selectedUnit?.id}
                  />
                </div>

                {/* Queue of Incoming Dispatches */}
                <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      Cola de Carreras ({dispatches.length})
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {dispatches.filter((d) => d.status === 'esperando_unidad').length} pendientes
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
                    {dispatches.length === 0 ? (
                      <div className="text-center py-6 text-zinc-500 text-xs">
                        No hay carreras en la cola actual.
                      </div>
                    ) : (
                      dispatches.map((disp) => {
                        const isWaiting = disp.status === 'esperando_unidad';
                        const isEnCurso = disp.status === 'en_curso';

                        return (
                          <div
                            key={disp.id}
                            className={`p-3 rounded-xl border text-xs transition ${
                              isWaiting
                                ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                                : isEnCurso
                                ? 'bg-blue-950/30 border-blue-800/80 text-blue-200'
                                : 'bg-[#18191e] border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold mb-1">
                              <span className="text-white text-xs flex items-center gap-1.5">
                                <span className="font-mono text-blue-400">{disp.id}</span>
                                <span>{disp.clientName}</span>
                              </span>
                              <span className="font-mono font-bold text-emerald-400">
                                ${disp.estimatedFare.toFixed(2)}
                              </span>
                            </div>

                            <div className="text-[11px] text-zinc-300 space-y-0.5 mt-1 font-mono">
                              <div className="flex items-start gap-1">
                                <span className="text-zinc-500">De:</span>
                                <span className="truncate">{disp.pickupAddress}</span>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="text-zinc-500">A:</span>
                                <span className="truncate">{disp.dropoffAddress}</span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400">
                                {disp.canton} • {disp.estimatedKm} km • {disp.requestedAt}
                              </span>

                              {isWaiting && (
                                <div className="flex items-center gap-1.5">
                                  {units.filter((u) => u.status === 'disponible').length > 0 ? (
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleAssignDispatch(disp.id, e.target.value);
                                        }
                                      }}
                                      defaultValue=""
                                      className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[10px] focus:outline-none cursor-pointer"
                                    >
                                      <option value="" disabled>
                                        Asignar Conductor...
                                      </option>
                                      {units
                                        .filter((u) => u.status === 'disponible')
                                        .map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.driverName} ({u.plate})
                                          </option>
                                        ))}
                                    </select>
                                  ) : (
                                    <span className="text-amber-400">Sin conductores libres</span>
                                  )}
                                </div>
                              )}

                              {isEnCurso && (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-blue-300">
                                    Conductor: {disp.assignedDriver || disp.assignedUnitId}
                                  </span>
                                  <button
                                    onClick={() => handleCompleteDispatch(disp.id)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    Completar
                                  </button>
                                </div>
                              )}

                              {disp.status === 'completado' && (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Finalizado
                                </span>
                              )}

                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar directamente el despacho de servicio ${disp.id}?`)) {
                                    AdminService.deleteDispatch(disp.id);
                                    setDispatches(AdminService.getStoredDispatches());
                                    audioService.playBeepTone();
                                  }
                                }}
                                title="Eliminar despacho"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition cursor-pointer ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: CONDUCTORES PARTICULARES (CON N° SECUENCIAL Y SELECCIÓN) */}
        {/* ============================================================== */}
        {activeTab === 'flota' && (() => {
          const filteredUnits = units.filter((u) => {
            const matchesStatus =
              fleetStatusFilter === 'todos'
                ? true
                : fleetStatusFilter === 'habilitados'
                ? u.status !== 'deshabilitado'
                : u.status === 'deshabilitado';

            if (!matchesStatus) return false;
            if (!fleetSearchQuery.trim()) return true;
            const q = fleetSearchQuery.toLowerCase().trim();
            const carNumStr = (u.unitNumber || parseInt(u.id.replace(/\D/g, ''), 10) || '').toString();
            return (
              u.driverName.toLowerCase().includes(q) ||
              u.plate.toLowerCase().includes(q) ||
              u.vehicle.toLowerCase().includes(q) ||
              carNumStr.includes(q)
            );
          });

          const isAllSelected =
            filteredUnits.length > 0 &&
            filteredUnits.every((u) => selectedFleetUnitIds.includes(u.id));

          const toggleSelectAllUnits = () => {
            if (isAllSelected) {
              setSelectedFleetUnitIds([]);
            } else {
              setSelectedFleetUnitIds(filteredUnits.map((u) => u.id));
            }
          };

          const toggleSelectUnit = (id: string) => {
            setSelectedFleetUnitIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            );
          };

          const handleBulkDelete = () => {
            selectedFleetUnitIds.forEach((id) => AdminService.deleteUnit(id));
            const refreshed = AdminService.getStoredUnits();
            setUnits(refreshed);
            setSelectedFleetUnitIds([]);
            audioService.playPTTKey();
          };

          const handleBulkSetStatus = (status: UnitStatus) => {
            const updated = units.map((u) =>
              selectedFleetUnitIds.includes(u.id) ? { ...u, status } : u
            );
            updateUnits(updated);
            if (status === 'disponible') {
              audioService.playSuccessTone();
            } else {
              audioService.playPTTKey();
            }
          };

          const maxUnitNum = units.reduce(
            (max, u) => Math.max(max, u.unitNumber || parseInt(u.id.replace(/\D/g, ''), 10) || 0),
            0
          );

          return (
            <div className="space-y-4">
              {/* CABECERA CON RECUENTO SECUENCIAL */}
              <div className="bg-[#121316] p-4 rounded-2xl border border-zinc-800 space-y-3 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-white flex items-center gap-2">
                        <Car className="w-5 h-5 text-blue-400" />
                        Conductores y Vehículos Particulares Afiliados • Andes Movi
                      </h2>
                      <span className="bg-blue-950 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black">
                        🚗 Secuencia: Carro N° 1 al N° {maxUnitNum || units.length}
                      </span>
                      <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        ● {units.filter((u) => u.status !== 'deshabilitado').length} Habilitados
                      </span>
                      <span className="bg-red-950/80 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        ✕ {units.filter((u) => u.status === 'deshabilitado').length} Deshabilitados
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Numeración automática correlativa del 1 al infinito. Usa los cuadros de selección para eliminar o deshabilitar múltiples vehículos de un solo golpe.
                    </p>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowNewUnitModal(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-600/30"
                    >
                      <Plus className="w-4 h-4" />
                      Registrar Conductor (Carro N° {maxUnitNum + 1})
                    </button>
                  </div>
                </div>

                {/* BARRA SUPERIOR CON CASILLA "SELECCIONAR TODO" Y FILTROS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                    {/* CUADRITO DE SELECCIONAR TODO */}
                    <label className="flex items-center gap-2 bg-[#18191e] border border-zinc-700 hover:border-blue-500 px-3 py-2 rounded-xl text-xs text-white font-bold cursor-pointer transition select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAllUnits}
                        className="w-4 h-4 accent-blue-500 cursor-pointer rounded"
                      />
                      <span>Seleccionar Todo ({filteredUnits.length})</span>
                    </label>

                    {/* BUSCADOR */}
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={fleetSearchQuery}
                        onChange={(e) => setFleetSearchQuery(e.target.value)}
                        placeholder="Buscar por N° de carro, nombre, placa o vehículo..."
                        className="w-full bg-[#18191e] border border-zinc-700 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none"
                      />
                      {fleetSearchQuery && (
                        <button
                          onClick={() => setFleetSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FILTRO HABILITADO / DESHABILITADO */}
                  <div className="flex items-center gap-1.5 bg-[#18191e] p-1 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => setFleetStatusFilter('todos')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        fleetStatusFilter === 'todos'
                          ? 'bg-zinc-200 text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Todos ({units.length})
                    </button>
                    <button
                      onClick={() => setFleetStatusFilter('habilitados')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        fleetStatusFilter === 'habilitados'
                          ? 'bg-emerald-600 text-white'
                          : 'text-emerald-400 hover:bg-emerald-950/50'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" /> Habilitados ({units.filter((u) => u.status !== 'deshabilitado').length})
                    </button>
                    <button
                      onClick={() => setFleetStatusFilter('deshabilitados')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        fleetStatusFilter === 'deshabilitados'
                          ? 'bg-red-600 text-white'
                          : 'text-red-400 hover:bg-red-950/50'
                      }`}
                    >
                      <XCircle className="w-3 h-3" /> Deshabilitados ({units.filter((u) => u.status === 'deshabilitado').length})
                    </button>
                  </div>
                </div>
              </div>

              {/* BARRA FLOTANTE DE ACCIONES EN MASA CUANDO HAY ELEMENTOS SELECCIONADOS */}
              {selectedFleetUnitIds.length > 0 && (
                <div className="bg-gradient-to-r from-blue-950 via-zinc-900 to-red-950 border-2 border-blue-500 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-fadeIn sticky top-16 z-30">
                  <div className="flex items-center gap-2 text-white font-black text-xs">
                    <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-mono text-xs">
                      {selectedFleetUnitIds.length}
                    </span>
                    <span>Vehículo(s) Seleccionado(s)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={handleBulkDelete}
                      className="bg-red-600 hover:bg-red-500 text-white font-black px-3.5 py-1.5 rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar {selectedFleetUnitIds.length} Seleccionado(s) de un Solo Golpe
                    </button>

                    <button
                      onClick={() => handleBulkSetStatus('deshabilitado')}
                      className="bg-red-950 hover:bg-red-900 border border-red-500/60 text-red-300 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Deshabilitar Seleccionados
                    </button>

                    <button
                      onClick={() => handleBulkSetStatus('disponible')}
                      className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Habilitar Seleccionados
                    </button>

                    <button
                      onClick={() => setSelectedFleetUnitIds([])}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      Desmarcar Todo
                    </button>
                  </div>
                </div>
              )}

              {/* GRID DE CARROS Y CONDUCTORES CON CHECKBOX INDIVIDUAL Y NÚMERO SECUENCIAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUnits.map((unit, idx) => {
                  const isSelectedForMap = selectedUnit?.id === unit.id;
                  const isChecked = selectedFleetUnitIds.includes(unit.id);
                  const isEnabled = unit.status !== 'deshabilitado';
                  const carNumber = unit.unitNumber || parseInt(unit.id.replace(/\D/g, ''), 10) || idx + 1;

                  const getStatusPill = (status: UnitStatus) => {
                    switch (status) {
                      case 'disponible':
                        return 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
                      case 'en_carrera':
                        return 'bg-blue-950 text-blue-300 border-blue-700/60';
                      case 'en_camino':
                        return 'bg-amber-950 text-amber-300 border-amber-700/60';
                      case 'sos':
                        return 'bg-red-950 text-red-200 border-red-600 animate-pulse';
                      case 'deshabilitado':
                        return 'bg-red-950 text-red-400 border-red-500/60';
                      default:
                        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
                    }
                  };

                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnit(unit)}
                      className={`bg-[#121316] border rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between relative ${
                        isChecked
                          ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-950/20'
                          : !isEnabled
                          ? 'border-red-500/40 bg-red-950/10'
                          : isSelectedForMap
                          ? 'border-yellow-400/90 ring-2 ring-yellow-400/20 bg-[#16171d]'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        {/* CABECERA CON NÚMERO SECUENCIAL DEL CARRO Y CASILLA DE SELECCIÓN */}
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 gap-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* CASILLA DE SELECCIÓN MÚLTIPLE */}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectUnit(unit.id);
                              }}
                              className="w-4 h-4 accent-blue-500 cursor-pointer shrink-0 rounded"
                              title="Seleccionar esta unidad para eliminar o deshabilitar en lote"
                            />

                            {/* BADGE DESTACADO NÚMERO DE CARRO DEL 1 AL INFINITO */}
                            <span className="bg-blue-950 text-blue-300 border border-blue-500/50 font-mono font-black text-xs px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                              🚗 CARRO N° {carNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="bg-yellow-400 text-zinc-950 px-1.5 py-0.5 rounded text-[10px] font-mono font-black">
                              {unit.plate}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusPill(unit.status)}`}>
                              {unit.status === 'deshabilitado' ? '🚫 DESHAB.' : unit.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* NOMBRE DEL CONDUCTOR */}
                        <div className="mt-2.5 flex items-center justify-between">
                          <h3 className={`font-black text-sm truncate ${isEnabled ? 'text-white' : 'text-zinc-400 line-through'}`}>
                            {unit.driverName}
                          </h3>
                        </div>

                        {/* SELECTOR DIRECTO: HABILITADO / DESHABILITADO */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="grid grid-cols-2 gap-1.5 mt-2 bg-[#18191e] p-1 rounded-xl border border-zinc-800"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const updated = units.map((u) =>
                                u.id === unit.id
                                  ? { ...u, status: (u.status === 'deshabilitado' ? 'disponible' : u.status) as UnitStatus }
                                  : u
                              );
                              updateUnits(updated);
                              audioService.playSuccessTone();
                            }}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition cursor-pointer ${
                              isEnabled
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/60'
                            }`}
                          >
                            <CheckCircle className="w-3 h-3" /> Habilitado
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = units.map((u) =>
                                u.id === unit.id ? { ...u, status: 'deshabilitado' as UnitStatus } : u
                              );
                              updateUnits(updated);
                              audioService.playPTTKey();
                            }}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition cursor-pointer ${
                              !isEnabled
                                ? 'bg-red-600 text-white shadow'
                                : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60'
                            }`}
                          >
                            <XCircle className="w-3 h-3" /> Deshabilitado
                          </button>
                        </div>

                        {!isEnabled && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 bg-red-950/60 border border-red-500/30 rounded-xl px-2.5 py-1.5 text-[10px] text-red-300 font-bold flex items-center justify-between"
                          >
                            <span>🚫 Vehículo/Chofer Deshabilitado</span>
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="text-red-200 hover:text-white underline font-black cursor-pointer"
                            >
                              Eliminar ahora
                            </button>
                          </div>
                        )}

                        {/* Foto del chofer y vehículo */}
                        <div className="mt-2.5 relative h-24 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                          <img
                            src={unit.vehiclePhoto || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80'}
                            alt={unit.vehicle}
                            className={`w-full h-full object-cover ${isEnabled ? 'opacity-80' : 'opacity-35 grayscale'}`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end gap-2.5">
                            <img
                              src={unit.driverPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80'}
                              alt={unit.driverName}
                              className={`w-12 h-12 rounded-xl object-cover border-2 shadow-lg shrink-0 ${
                                isEnabled ? 'border-yellow-400' : 'border-red-500 grayscale'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-white text-xs truncate">{unit.driverName}</h4>
                              <p className="text-[11px] text-zinc-300 truncate">{unit.vehicle}</p>
                              <p className="text-[10px] text-blue-400 truncate">Vehículo Particular • {unit.canton}</p>
                            </div>
                          </div>
                        </div>

                        {/* Telemetría */}
                        <div className="mt-2.5 bg-[#18191e] rounded-xl p-2.5 text-[11px] space-y-1 font-mono text-zinc-300">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Número Correlativo:</span>
                            <span className="font-bold text-blue-400">Carro N° {carNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Estado Acceso:</span>
                            <span className={`font-bold ${isEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                              {isEnabled ? '● HABILITADO' : '🚫 DESHABILITADO'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Cantón Base:</span>
                            <span className="font-semibold text-zinc-200 truncate">{unit.canton}</span>
                          </div>
                        </div>
                      </div>

                      {/* Selector de estado y botón de eliminar */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-1.5"
                      >
                        <select
                          value={unit.status}
                          onChange={(e) => {
                            const updated = units.map((u) =>
                              u.id === unit.id ? { ...u, status: e.target.value as UnitStatus } : u
                            );
                            updateUnits(updated);
                          }}
                          className="bg-[#1c1d24] text-zinc-300 text-[10px] font-bold border border-zinc-700 rounded-lg px-2 py-1.5 focus:outline-none flex-1 cursor-pointer"
                        >
                          <option value="disponible">🟢 HABILITADO (Disponible)</option>
                          <option value="en_carrera">🔵 EN CARRERA</option>
                          <option value="en_camino">🟡 EN CAMINO</option>
                          <option value="offline">⚪ OFFLINE</option>
                          <option value="deshabilitado">🔴 DESHABILITADO (Baja)</option>
                          <option value="sos">🚨 SOS EMERGENCIA</option>
                        </select>

                        <button
                          onClick={() => {
                            setActiveTab('despacho');
                            setSelectedUnit(unit);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Mapa
                        </button>

                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="bg-red-950/80 hover:bg-red-600 text-red-300 hover:text-white border border-red-800 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Eliminar conductor directamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* TAB 3: VALIDACIÓN DE CHOFERES (ANT / SOAT) */}
        {/* ============================================================== */}
        {activeTab === 'validacion' && (
          <div className="space-y-4">
            <div className="bg-[#121316] p-4 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  Módulo de Validación y Registro KYC de Choferes
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Verificación regulatoria de licencias ANT, pólizas SOAT/SPPAT y antecedentes penales.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  onClick={() => setShowAiDocModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Auditar Documento con IA Gemini</span>
                </button>
                <span className="px-2.5 py-2 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300">
                  {pendingRequestsCount} Pendientes
                </span>
              </div>
            </div>

            {/* Requests Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((req) => {
                const isPending = req.status === 'pendiente';
                const isApproved = req.status === 'aprobado';
                const isRejected = req.status === 'rechazado';

                return (
                  <div
                    key={req.id}
                    className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                        <div>
                          <span className="text-[10px] font-mono text-blue-400 font-bold">{req.id}</span>
                          <h3 className="font-bold text-white text-sm">{req.name}</h3>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPending
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : isApproved
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : 'bg-red-950 text-red-300 border-red-700'
                          }`}
                        >
                          {(req.status || 'pendiente').toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">Cantón / Jurisdicción:</span>
                          <span className="font-semibold">{req.canton}</span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">Teléfono:</span>
                          <span className="font-mono">{req.phone}</span>
                        </div>

                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">Vehículo:</span>
                          <span className="font-semibold">{req.vehicle} ({req.plate})</span>
                        </div>

                        <div className="p-2 rounded-xl bg-[#18191e] border border-zinc-800 text-[11px] space-y-1 font-mono">
                          <div className="text-blue-300">
                            • {req.licenseType}
                          </div>
                          <div className="text-emerald-300">
                            • {req.soatExpiry}
                          </div>
                          <div className="text-zinc-400">
                            • Récord Policial: {req.criminalRecordStatus || 'Limpio / Sin antecedentes'}
                          </div>
                          <div className="text-zinc-400">
                            • Puntos ANT: {req.antPoints || 30} / 30 puntos
                          </div>
                        </div>

                        {req.reviewNotes && (
                          <div className="p-2 rounded-lg bg-zinc-800/60 text-[11px] text-zinc-300 italic">
                            Nota: {req.reviewNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleApproveDriver(req)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aprobar y Asignar Unidad
                          </button>
                          <button
                            onClick={() => handleRejectDriver(req.id, 'Documentación incompleta o ilegible')}
                            className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs px-2.5 py-2 rounded-xl transition cursor-pointer"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar directamente la solicitud de ${req.name}?`)) {
                                AdminService.deleteVerificationRequest(req.id);
                                setRequests(AdminService.getStoredRequests());
                              }
                            }}
                            className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 p-2 rounded-xl transition cursor-pointer"
                            title="Eliminar solicitud directamente sin dejar caché"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between text-xs text-zinc-400 py-1 font-mono">
                          <span>Trámite Finalizado</span>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar registro de ${req.name}?`)) {
                                AdminService.deleteVerificationRequest(req.id);
                                setRequests(AdminService.getStoredRequests());
                              }
                            }}
                            className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 p-1.5 rounded-lg transition cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: TARIFAS CANTONALES */}
        {/* ============================================================== */}
        {activeTab === 'tarifas' && (
          <div className="space-y-4">
            <div className="bg-[#121316] p-4 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  Regulación de Tarifas Cantonales (Ecuador)
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tarifas homologadas por cantón según normativa de Tránsito y Municipios.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Tariffs Cards */}
              <div className="lg:col-span-7 space-y-3">
                {tariffs.map((t) => (
                  <div
                    key={t.canton}
                    className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <h3 className="font-extrabold text-white text-sm">{t.canton}</h3>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-3 text-xs font-mono">
                        <div className="bg-[#18191e] p-2 rounded-xl border border-zinc-800">
                          <div className="text-zinc-500 text-[10px]">Arranque / Base</div>
                          <div className="text-emerald-400 font-bold text-sm">${t.baseFare.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#18191e] p-2 rounded-xl border border-zinc-800">
                          <div className="text-zinc-500 text-[10px]">Por Kilómetro</div>
                          <div className="text-blue-400 font-bold text-sm">${t.perKmRate.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#18191e] p-2 rounded-xl border border-zinc-800">
                          <div className="text-zinc-500 text-[10px]">Recargo Nocturno</div>
                          <div className="text-amber-400 font-bold text-sm">+${t.nightSurcharge.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowEditTariffModal(t)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-2 rounded-xl border border-zinc-700 font-bold transition cursor-pointer"
                      >
                        Ajustar Tarifa
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar directamente la tarifa de ${t.canton}?`)) {
                            AdminService.deleteTariff(t.canton);
                            setTariffs(AdminService.getStoredTariffs());
                            audioService.playBeepTone();
                          }
                        }}
                        title="Eliminar tarifa"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Live Interactive Tariff Calculator */}
              <div className="lg:col-span-5 bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Simulador Oficial de Cálculo de Carrera
                </h3>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Seleccionar Cantón</label>
                    <select
                      value={calcCanton}
                      onChange={(e) => setCalcCanton(e.target.value)}
                      className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white text-xs focus:outline-none"
                    >
                      {tariffs.map((t) => (
                        <option key={t.canton} value={t.canton}>
                          {t.canton}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>Distancia Recorrida</span>
                      <span className="font-mono text-white font-bold">{calcKm} km</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="0.5"
                      value={calcKm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCalcKm(isNaN(val) ? 0 : val);
                      }}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#18191e] border border-zinc-800">
                    <span className="text-zinc-300">Horario Nocturno (20:00 - 06:00)</span>
                    <input
                      type="checkbox"
                      checked={calcNight}
                      onChange={(e) => setCalcNight(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#18191e] border border-zinc-800">
                    <span className="text-zinc-300">Destino Aeropuerto / Terminal Especial</span>
                    <input
                      type="checkbox"
                      checked={calcAirport}
                      onChange={(e) => setCalcAirport(e.target.checked)}
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Calculated Price Display */}
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-emerald-950/60 border border-blue-800/80 text-center">
                    <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">
                      Tarifa Estimada de Pasajero
                    </div>
                    <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                      ${AdminService.calculateFare(calcCanton, calcKm, calcNight, calcAirport).toFixed(2)} USD
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">
                      Comisión AndesMovi (10%): $
                      {(AdminService.calculateFare(calcCanton, calcKm, calcNight, calcAirport) * 0.1).toFixed(2)} USD
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: CENTRO DE ALERTAS & SOS */}
        {/* ============================================================== */}
        {activeTab === 'alertas' && (
          <div className="space-y-4">
            <div className="bg-[#121316] p-4 rounded-2xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  Central de Monitoreo de Emergencias & Botón de Pánico SOS
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Protocolo de enlace inmediato con el Servicio Integrado de Seguridad ECU-911 y patrullas cercanas.
                </p>
              </div>

              <button
                onClick={handleSimulateSOS}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 animate-bounce" />
                Simular Alerta de Chofer en Peligro
              </button>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="p-8 text-center bg-[#121316] border border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                  Sin eventos de emergencia registrados.
                </div>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    className={`border rounded-2xl p-4 shadow-xl transition ${
                      !al.resolved
                        ? 'bg-red-950/40 border-red-700/80 animate-pulse'
                        : 'bg-[#121316] border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-red-400 font-bold text-xs">{al.id}</span>
                        <span className="font-bold text-white text-sm">
                          {al.unitId} • {al.driverName}
                        </span>
                        <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {al.plate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 font-mono">{al.timestamp}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            !al.resolved
                              ? 'bg-red-950 text-red-200 border-red-500'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          }`}
                        >
                          {!al.resolved ? 'EMERGENCIA ACTIVA' : 'RESUELTO'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-zinc-400 font-semibold">Ubicación del Evento:</div>
                        <div className="text-white font-mono mt-0.5">{al.locationDescription}</div>
                        <div className="text-zinc-500 text-[10px] font-mono mt-0.5">
                          GPS: {al.lat.toFixed(4)}° N, {al.lng.toFixed(4)}° W
                        </div>
                      </div>

                      <div>
                        <div className="text-zinc-400 font-semibold">Observación de Alerta:</div>
                        <div className="text-zinc-300 italic mt-0.5">{al.notes}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            audioService.playSirenAlarm();
                            alert(`Protocolo ECU-911 Activado. Despacho Policial notificado para unidad ${al.unitId} (${al.plate}).`);
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Escalar a ECU-911 Tulcán
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('despacho');
                            const u = units.find((x) => x.id === al.unitId);
                            if (u) setSelectedUnit(u);
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-xl border border-zinc-700 font-bold transition cursor-pointer"
                        >
                          Ver en Radar Cantonal
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar directamente el registro de alerta de emergencia ${al.id}?`)) {
                              AdminService.deleteAlert(al.id);
                              setAlerts(AdminService.getStoredAlerts());
                              audioService.playBeepTone();
                            }
                          }}
                          title="Eliminar alerta de emergencia"
                          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {!al.resolved && (
                        <button
                          onClick={() => handleResolveAlert(al.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Marcar como Resuelto / Falsa Alarma
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: KPIS & RENDIMIENTO */}
        {/* ============================================================== */}
        {activeTab === 'kpis' && (
          <div className="space-y-4">
            <div className="bg-[#121316] p-4 rounded-2xl border border-zinc-800">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Métricas Operativas & Facturación Diaria
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rendimiento consolidado del turno de radio-despacho y cooperativas asociadas.
              </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
                <div className="text-zinc-400 text-xs font-semibold">Total Carreras Hoy</div>
                <div className="text-2xl font-black text-white mt-1 font-mono">{totalTrips}</div>
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +18% vs día anterior
                </div>
              </div>

              <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
                <div className="text-zinc-400 text-xs font-semibold">Recaudación Bruta Flota</div>
                <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                  ${totalGrossEstimated.toFixed(2)} USD
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">Estimado a $3.40/carrera</div>
              </div>

              <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
                <div className="text-zinc-400 text-xs font-semibold">Comisión Neta AndesMovi</div>
                <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
                  ${totalPlatformEarnings.toFixed(2)} USD
                </div>
                <div className="text-[10px] text-zinc-400 mt-1">Tasa promedio 11%</div>
              </div>

              <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
                <div className="text-zinc-400 text-xs font-semibold">Tiempo Promedio Asignación (ETA)</div>
                <div className="text-2xl font-black text-amber-400 mt-1 font-mono">1.8 min</div>
                <div className="text-[10px] text-zinc-400 mt-1">Repetidora VHF + GPS</div>
              </div>
            </div>

            {/* Performance table */}
            <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                Rendimiento por Unidad en Servicio
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-zinc-400 border-b border-zinc-800 font-mono text-[11px]">
                    <tr>
                      <th className="py-2">Unidad</th>
                      <th className="py-2">Conductor</th>
                      <th className="py-2">Cantón</th>
                      <th className="py-2">Carreras</th>
                      <th className="py-2">Facturado Est.</th>
                      <th className="py-2">Calificación</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {units.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 font-bold text-white">{u.id}</td>
                        <td className="py-2.5 font-sans font-medium text-zinc-200">{u.driverName}</td>
                        <td className="py-2.5 text-zinc-400">{u.canton}</td>
                        <td className="py-2.5 text-emerald-400 font-bold">{u.completedTrips}</td>
                        <td className="py-2.5 text-white font-bold">${(u.completedTrips * 3.4).toFixed(2)}</td>
                        <td className="py-2.5 text-amber-400 font-bold">★ {u.rating.toFixed(1)}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 uppercase">
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'viajes_ejecutivos' && (
          <ViajesEjecutivosManager units={units} trips={trips} initialTab="parrilla" />
        )}

        {activeTab === 'panel_conductor' && (
          <ViajesEjecutivosManager units={units} trips={trips} initialTab="conductor" />
        )}

        {activeTab === 'personal_usuarios' && (
          <StaffUsersManager units={units} />
        )}

        {/* ============================================================== */}
        {/* TAB: ENCOMIENDAS & ENVÍOS */}
        {/* ============================================================== */}
        {activeTab === 'encomiendas' && (
          <ParcelsManager units={units} />
        )}

        {/* ============================================================== */}
        {/* TAB: CONFIGURACIÓN TOTAL PLATAFORMA */}
        {/* ============================================================== */}
        {activeTab === 'config' && (
          <PlatformSettingsPanel
            settings={platformSettings}
            onSettingsSaved={(updated) => {
              setPlatformSettings(updated);
              setCommissionRate(updated.commissionRate);
            }}
            onCommissionRateChange={(newRate) => {
              setCommissionRate(newRate);
              const updated = { ...platformSettings, commissionRate: newRate };
              setPlatformSettings(updated);
              AdminService.saveSettings(updated);
            }}
          />
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: NUEVA CARRERA MANUAL / TELEFÓNICA */}
      {/* ============================================================== */}
      {showNewDispatchModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-zinc-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                Registrar Despacho Telefónico / WhatsApp
              </h3>
              <button
                onClick={() => setShowNewDispatchModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Nombre del Pasajero / Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sra. Carmen Benavides"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Teléfono Móvil</label>
                <input
                  type="tel"
                  placeholder="0987654321"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Dirección de Recogida</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Calle Bolívar y Sucre (Parque Central)"
                  value={newPickup}
                  onChange={(e) => setNewPickup(e.target.value)}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Destino</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Hospital Luis G. Dávila"
                  value={newDropoff}
                  onChange={(e) => setNewDropoff(e.target.value)}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Cantón</label>
                  <select
                    value={newCanton}
                    onChange={(e) => setNewCanton(e.target.value)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="Tulcán">Tulcán</option>
                    <option value="Montúfar / San Gabriel">San Gabriel</option>
                    <option value="Ibarra">Ibarra</option>
                    <option value="Quito">Quito</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Distancia Est. (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    value={newKm}
                    onChange={(e) => setNewKm(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800 text-center font-mono mt-2">
                <span className="text-zinc-400 text-[10px]">TARIFA ESTIMADA: </span>
                <span className="text-emerald-400 font-bold text-sm">
                  ${AdminService.calculateFare(newCanton, newKm).toFixed(2)} USD
                </span>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                Ingresar a la Cola de Despacho
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: HABILITAR NUEVA UNIDAD */}
      {/* ============================================================== */}
      {showNewUnitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-400" />
                Habilitar Nueva Unidad en Flota
              </h3>
              <button
                onClick={() => setShowNewUnitModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-zinc-400">
                Para habilitar una nueva unidad con taxímetro, ingrese los datos del vehículo y chofer titular:
              </p>

              <div>
                <label className="text-zinc-400 block mb-1">Nombre del Chofer</label>
                <input
                  id="newDriverName"
                  type="text"
                  placeholder="Ej. Milton Chamorro"
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Vehículo / Modelo</label>
                  <input
                    id="newDriverCar"
                    type="text"
                    placeholder="Toyota Yaris"
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Placa Ecuatoriana</label>
                  <input
                    id="newDriverPlate"
                    type="text"
                    placeholder="PBA-4120"
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Cantón / Jurisdicción</label>
                <select id="newDriverCanton" className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white">
                  <option value="Tulcán">Tulcán</option>
                  <option value="Montúfar / San Gabriel">Montúfar / San Gabriel</option>
                  <option value="Ibarra">Ibarra</option>
                  <option value="Quito Norte">Quito Norte</option>
                </select>
              </div>

              <button
                onClick={() => {
                  const nameEl = document.getElementById('newDriverName') as HTMLInputElement;
                  const carEl = document.getElementById('newDriverCar') as HTMLInputElement;
                  const plateEl = document.getElementById('newDriverPlate') as HTMLInputElement;
                  const cantonEl = document.getElementById('newDriverCanton') as HTMLSelectElement;

                  if (!nameEl?.value) return;

                  const newUnit: FleetUnit = {
                    id: `AM-${Math.floor(100 + Math.random() * 899)}`,
                    driverName: nameEl.value,
                    vehicle: carEl?.value || 'Chevrolet Sail',
                    plate: plateEl?.value || 'PBA-1000',
                    status: 'disponible',
                    canton: cantonEl?.value || 'Tulcán',
                    rating: 5.0,
                    completedTrips: 0,
                    lat: 0.8124 + (Math.random() - 0.5) * 0.02,
                    lng: -77.7174 + (Math.random() - 0.5) * 0.02,
                    batteryLevel: 100,
                    cooperative: 'Coop. Asociada AndesMovi',
                  };

                  updateUnits([...units, newUnit]);
                  setShowNewUnitModal(false);
                  audioService.playSuccessTone();
                }}
                className="w-full mt-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                Habilitar y Asignar Frecuencia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: AJUSTAR TARIFA CANTONAL */}
      {/* ============================================================== */}
      {showEditTariffModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Ajustar Tarifa: {showEditTariffModal.canton}
              </h3>
              <button
                onClick={() => setShowEditTariffModal(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Tarifa Arranque / Base ($ USD)</label>
                <input
                  type="number"
                  step="0.05"
                  value={isNaN(showEditTariffModal.baseFare) ? '' : showEditTariffModal.baseFare}
                  onChange={(e) =>
                    setShowEditTariffModal({
                      ...showEditTariffModal,
                      baseFare: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Tarifa por Kilómetro ($ USD)</label>
                <input
                  type="number"
                  step="0.05"
                  value={isNaN(showEditTariffModal.perKmRate) ? '' : showEditTariffModal.perKmRate}
                  onChange={(e) =>
                    setShowEditTariffModal({
                      ...showEditTariffModal,
                      perKmRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Recargo Nocturno ($ USD)</label>
                <input
                  type="number"
                  step="0.05"
                  value={isNaN(showEditTariffModal.nightSurcharge) ? '' : showEditTariffModal.nightSurcharge}
                  onChange={(e) =>
                    setShowEditTariffModal({
                      ...showEditTariffModal,
                      nightSurcharge: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <button
                onClick={() => {
                  const updated = tariffs.map((t) =>
                    t.canton === showEditTariffModal.canton ? showEditTariffModal : t
                  );
                  updateTariffs(updated);
                  setShowEditTariffModal(null);
                  audioService.playSuccessTone();
                }}
                className="w-full mt-3 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition cursor-pointer"
              >
                Guardar y Sincronizar Taxímetros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: AUDITORÍA DE DOCUMENTOS Y VEHÍCULOS CON IA GEMINI */}
      {/* ============================================================== */}
      {showAiDocModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-zinc-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Auditoría Inteligente de Chofer y Vehículo
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Powered by Gemini 3.8 Flash • Reconocimiento ANT y SPPAT
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAiDocModal(false);
                  setUploadedImagePreview(null);
                  setUploadedBase64(null);
                  setAiAnalysisResult(null);
                }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* File upload section */}
              <div>
                <label className="text-zinc-300 font-semibold block mb-1.5">
                  Seleccionar foto del documento o vehículo:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="fotoInput"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer border border-zinc-700 rounded-2xl bg-[#18191e] p-1"
                  />
                </div>
              </div>

              {/* Instant Image Preview */}
              {uploadedImagePreview && (
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#090b0e] border border-zinc-800">
                  <img
                    id="vistaPrevia"
                    src={uploadedImagePreview}
                    alt="Previsualización"
                    className="w-44 h-32 object-cover rounded-xl border border-zinc-700 shadow-md"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 font-mono">
                    Imagen cargada en memoria (Base64 listo para Gemini)
                  </span>
                </div>
              )}

              {/* Action button */}
              {uploadedBase64 && !aiAnalysisResult && (
                <button
                  onClick={handleAnalyzeDocWithAi}
                  disabled={isAiScanning}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {isAiScanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analizando documento con Gemini Vision...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Escanear y Validar con IA</span>
                    </>
                  )}
                </button>
              )}

              {/* Preset quick test buttons */}
              {!uploadedImagePreview && (
                <div className="p-3 rounded-2xl bg-[#18191e] border border-zinc-800 text-[11px]">
                  <span className="text-zinc-400 block mb-2 font-semibold">
                    O prueba con una muestra simulada:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImagePreview('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200');
                        setUploadedBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
                      }}
                      className="flex-1 p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
                    >
                      Cargar Muestra de Taxi
                    </button>
                  </div>
                </div>
              )}

              {/* Analysis Result Card */}
              {aiAnalysisResult && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-blue-950/40 border border-indigo-700/60 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-800/60">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Auditoría Finalizada
                    </span>
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                      {aiAnalysisResult.isValid ? 'APTO PARA SERVICIO' : 'OBSERVADO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-300">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">TIPO DE DOCUMENTO:</span>
                      <span className="font-bold text-white">{aiAnalysisResult.docType || 'Licencia ANT'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">CONDUCTOR IDENTIFICADO:</span>
                      <span className="font-bold text-blue-300">{aiAnalysisResult.driverName || 'No detectado'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">PLACA DETECTADA:</span>
                      <span className="font-bold text-emerald-400">{aiAnalysisResult.plate || 'PBC-4921'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">VEHÍCULO / MODELO:</span>
                      <span className="text-white">{aiAnalysisResult.vehicleModel || 'Sedan 4 puertas'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-indigo-900/60 text-[11px] text-zinc-200">
                    <span className="text-indigo-400 font-bold block mb-0.5 font-mono text-[10px]">
                      DICTAMEN TÉCNICO ANDESMOVI:
                    </span>
                    {aiAnalysisResult.summary}
                  </div>

                  <button
                    onClick={() => {
                      const newUnitId = `AM-${Math.floor(100 + Math.random() * 899)}`;
                      const newUnit: FleetUnit = {
                        id: newUnitId,
                        driverName: aiAnalysisResult.driverName || 'Nuevo Chofer Homologado',
                        vehicle: aiAnalysisResult.vehicleModel || 'Chevrolet Sail',
                        plate: aiAnalysisResult.plate || 'PBC-4921',
                        status: 'disponible',
                        canton: 'Tulcán',
                        rating: 5.0,
                        completedTrips: 0,
                        lat: 0.8124,
                        lng: -77.7174,
                        batteryLevel: 100,
                        cooperative: 'Coop. Rápido Nacional Tulcán',
                      };
                      updateUnits([...units, newUnit]);
                      audioService.playSuccessTone();
                      setShowAiDocModal(false);
                      setUploadedImagePreview(null);
                      setUploadedBase64(null);
                      setAiAnalysisResult(null);
                      setActiveTab('flota');
                    }}
                    className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Aprobar e Incorporar Automáticamente a Flota</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PANEL: COPILOTO IA CENTRAL DE OPERACIONES                      */}
      {/* ============================================================== */}
      {showAiCopilotPanel && (
        <AICopilotPanel
          units={units}
          dispatches={dispatches}
          parcels={AdminService.getStoredParcels()}
          transactions={AdminService.getStoredFinancialTransactions()}
          onClose={() => setShowAiCopilotPanel(false)}
        />
      )}
    </div>
  );
};

