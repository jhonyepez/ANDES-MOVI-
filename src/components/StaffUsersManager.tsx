import React, { useState, useEffect, useMemo } from 'react';
import { StaffWorkerModel, WorkerRole, FleetUnit } from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import {
  Users,
  UserPlus,
  Key,
  Shield,
  Eye,
  EyeOff,
  Copy,
  MessageSquare,
  Trash2,
  CheckCircle,
  XCircle,
  Edit3,
  Phone,
  MapPin,
  Clock,
  Lock,
  Unlock,
  User,
  RefreshCw,
  Search,
  Printer,
  Check,
  X,
  Ban,
} from 'lucide-react';

interface Props {
  units: FleetUnit[];
}

const AVAILABLE_ROLES: WorkerRole[] = [
  'Operador de Radio y Despacho',
  'Conductor Ejecutivo / Flota',
  'Supervisor de Operaciones',
  'Cajero / Finanzas y Encomiendas',
  'Atención al Cliente y Reservas',
  'Administrador de Sede',
];

const AVAILABLE_MODULES = [
  { id: 'despacho', label: 'Radio-Despacho' },
  { id: 'viajes_ejecutivos', label: 'Frecuencias y Rutas' },
  { id: 'panel_conductor', label: 'Panel del Conductor' },
  { id: 'encomiendas', label: 'Encomiendas y Envíos' },
  { id: 'finanzas', label: 'Finanzas y Caja' },
  { id: 'flota', label: 'Flota y Socios' },
];

export const StaffUsersManager: React.FC<Props> = ({ units }) => {
  const [workers, setWorkers] = useState<StaffWorkerModel[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'suspendido'>('todos');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  // Modal Crear / Editar Trabajador
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [cedula, setCedula] = useState<string>('');
  const [phone, setPhone] = useState<string>('09');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<WorkerRole>('Operador de Radio y Despacho');
  const [cityBranch, setCityBranch] = useState<string>('Tulcán');
  const [shift, setShift] = useState<string>('Mañana (06:00 - 14:00)');
  const [workerStatus, setWorkerStatus] = useState<'activo' | 'suspendido'>('activo');
  const [assignedUnitId, setAssignedUnitId] = useState<string>('');
  const [permissions, setPermissions] = useState<string[]>(['despacho', 'viajes_ejecutivos']);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Ficha de Entrega Personal / Credencial
  const [credentialWorker, setCredentialWorker] = useState<StaffWorkerModel | null>(null);

  const showToast = (text: string, type: 'success' | 'danger' = 'success') => {
    setFeedbackBanner({ text, type });
    setTimeout(() => {
      setFeedbackBanner(prev => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const loadWorkers = () => {
    setWorkers(AdminService.getStaffWorkers());
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  const enabledCount = useMemo(() => workers.filter(w => w.status === 'activo').length, [workers]);
  const disabledCount = useMemo(() => workers.filter(w => w.status === 'suspendido').length, [workers]);

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesRole = roleFilter === 'todos' || w.role === roleFilter;
      const matchesStatus = statusFilter === 'todos' || w.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        w.fullName.toLowerCase().includes(q) ||
        w.username.toLowerCase().includes(q) ||
        w.cedula.includes(q) ||
        w.cityBranch.toLowerCase().includes(q);
      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [workers, roleFilter, statusFilter, searchQuery]);

  // Sugerir usuario automáticamente según el nombre
  const handleSuggestUsername = (nameVal: string) => {
    const clean = nameVal
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      setUsername(`${parts[0]}.${parts[1]}`);
    } else if (parts.length === 1) {
      setUsername(`${parts[0]}.andes`);
    } else {
      setUsername(`trabajador${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  // Generar clave aleatoria fácil de entregar
  const handleGeneratePassword = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setPassword(`Andes${randomNum}`);
  };

  const handleOpenCreateModal = () => {
    setEditingWorkerId(null);
    setFullName('');
    setCedula('');
    setPhone('09');
    setUsername('');
    setPassword(`Andes${Math.floor(1000 + Math.random() * 9000)}`);
    setRole('Operador de Radio y Despacho');
    setCityBranch('Tulcán');
    setShift('Mañana (06:00 - 14:00)');
    setWorkerStatus('activo');
    setAssignedUnitId('');
    setPermissions(['despacho', 'viajes_ejecutivos']);
    setNotes('');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (w: StaffWorkerModel) => {
    setEditingWorkerId(w.id);
    setFullName(w.fullName);
    setCedula(w.cedula);
    setPhone(w.phone);
    setUsername(w.username);
    setPassword(w.password);
    setRole(w.role);
    setCityBranch(w.cityBranch);
    setShift(w.shift);
    setWorkerStatus(w.status);
    setAssignedUnitId(w.assignedUnitId || '');
    setPermissions(w.permissions || ['despacho']);
    setNotes(w.notes || '');
    setFormError(null);
    setShowModal(true);
  };

  const togglePermission = (modId: string) => {
    setPermissions(prev =>
      prev.includes(modId) ? prev.filter(p => p !== modId) : [...prev, modId]
    );
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setFormError('Por favor complete el nombre, usuario y contraseña del trabajador.');
      return;
    }

    // Verificar duplicado de username
    const duplicate = workers.find(
      w => w.username.toLowerCase() === username.trim().toLowerCase() && w.id !== editingWorkerId
    );
    if (duplicate) {
      setFormError(`El usuario "${username}" ya está asignado a ${duplicate.fullName}. Elija otro usuario.`);
      return;
    }

    const existing = editingWorkerId ? workers.find(w => w.id === editingWorkerId) : null;

    const workerObj: StaffWorkerModel = {
      id: editingWorkerId || `EMP-${Date.now().toString().slice(-4)}`,
      fullName: fullName.trim(),
      cedula: cedula.trim() || 'S/N',
      phone: phone.trim(),
      username: username.trim(),
      password: password.trim(),
      role,
      cityBranch: cityBranch.trim() || 'Tulcán',
      shift,
      status: workerStatus,
      assignedUnitId: assignedUnitId || undefined,
      permissions,
      createdAt: existing ? existing.createdAt : new Date().toISOString().split('T')[0],
      lastLogin: existing?.lastLogin,
      notes: notes.trim() || undefined,
    };

    AdminService.saveStaffWorker(workerObj);
    loadWorkers();
    setShowModal(false);
    audioService.playSuccessTone();
    showToast(
      editingWorkerId
        ? `Credenciales de ${workerObj.fullName} actualizadas (${workerObj.status === 'activo' ? 'Habilitado' : 'Deshabilitado'}).`
        : `Usuario ${workerObj.username} creado y habilitado.`
    );

    if (!editingWorkerId) {
      setCredentialWorker(workerObj);
    }
  };

  // Habilitar o Deshabilitar directamente
  const handleSetWorkerStatus = (w: StaffWorkerModel, newStatus: 'activo' | 'suspendido') => {
    const updated: StaffWorkerModel = {
      ...w,
      status: newStatus,
    };
    AdminService.saveStaffWorker(updated);
    loadWorkers();
    if (newStatus === 'activo') {
      audioService.playSuccessTone();
      showToast(`✅ Credencial HABILITADA para ${w.fullName} (${w.username})`, 'success');
    } else {
      audioService.playPTTKey();
      showToast(`🚫 Credencial DESHABILITADA para ${w.fullName}. Acceso bloqueado.`, 'danger');
    }
  };

  const handleToggleStatus = (w: StaffWorkerModel) => {
    handleSetWorkerStatus(w, w.status === 'activo' ? 'suspendido' : 'activo');
  };

  // Eliminar trabajador directamente (sin window.confirm que se bloquea en iframe)
  const handleDeleteWorker = (w: StaffWorkerModel) => {
    AdminService.deleteStaffWorker(w.id);
    if (credentialWorker?.id === w.id) {
      setCredentialWorker(null);
    }
    loadWorkers();
    audioService.playPTTKey();
    showToast(`🗑️ Trabajador ${w.fullName} (${w.username}) eliminado definitivamente del sistema.`, 'danger');
  };

  // Eliminar todos los deshabilitados de una sola vez
  const handleDeleteAllDisabled = () => {
    const disabledList = workers.filter(w => w.status === 'suspendido');
    if (disabledList.length === 0) return;
    disabledList.forEach(w => AdminService.deleteStaffWorker(w.id));
    loadWorkers();
    audioService.playPTTKey();
    showToast(`🗑️ Se eliminaron ${disabledList.length} trabajador(es) deshabilitado(s).`, 'danger');
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const buildCredentialsMessage = (w: StaffWorkerModel) => {
    let msg = `🪪 *ANDES MOVI ECUADOR - CREDENCIALES DE ACCESO PERSONAL* 🇪🇨\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Trabajador:* ${w.fullName}\n`;
    msg += `💼 *Cargo:* ${w.role}\n`;
    msg += `📍 *Sede:* ${w.cityBranch} | *Turno:* ${w.shift}\n`;
    msg += `📌 *Estado:* ${w.status === 'activo' ? '✅ HABILITADO' : '🚫 DESHABILITADO'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🔐 *TUS DATOS PARA ENTRAR AL SISTEMA:*\n`;
    msg += `👉 *Usuario:* ${w.username}\n`;
    msg += `👉 *Contraseña / Clave:* ${w.password}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚠️ *Importante:* Esta clave es de uso estrictamente personal e intransferible para tu turno de trabajo en AndesMovi.\n`;
    msg += `📞 *Soporte Central AndesMovi:* +593 99 856 6503`;
    return msg;
  };

  const handleCopyCredentials = (w: StaffWorkerModel) => {
    const text = buildCredentialsMessage(w);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(w.id);
      audioService.playSuccessTone();
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const handleSendCredentialsWhatsApp = (w: StaffWorkerModel) => {
    let cleanPhone = w.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '593' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('593')) {
      cleanPhone = '593' + cleanPhone;
    }
    const text = buildCredentialsMessage(w);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    audioService.playSuccessTone();
  };

  return (
    <div className="bg-[#090a0f] min-h-screen text-zinc-100 p-4 md:p-5 space-y-4 font-sans text-xs">
      {/* CABECERA COMPACTA */}
      <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Control de Personal y Credenciales de Acceso
              </h2>
              <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                ● {enabledCount} Habilitados
              </span>
              <span className="bg-red-950/80 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                ✕ {disabledCount} Deshabilitados
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Crea usuario y clave, habilita o deshabilita el acceso al instante, o elimina personal dado de baja.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {disabledCount > 0 && (
            <button
              onClick={handleDeleteAllDisabled}
              className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/40 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Eliminar definitivamente a todos los trabajadores que están deshabilitados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar Deshabilitados ({disabledCount})
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            + Contratar / Crear Usuario y Clave
          </button>
        </div>
      </div>

      {/* NOTIFICACIÓN DE ACCIÓN */}
      {feedbackBanner && (
        <div
          className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between animate-fadeIn ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/80 border-red-500/40 text-red-300'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* BARRA DE BÚSQUEDA, SELECCIONAR TODO, FILTROS */}
      <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* CUADRITO DE SELECCIONAR TODO */}
            <label className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-white font-bold cursor-pointer transition select-none shrink-0">
              <input
                type="checkbox"
                checked={
                  filteredWorkers.length > 0 &&
                  filteredWorkers.every((w) => selectedWorkerIds.includes(w.id))
                }
                onChange={() => {
                  const isAll =
                    filteredWorkers.length > 0 &&
                    filteredWorkers.every((w) => selectedWorkerIds.includes(w.id));
                  if (isAll) {
                    setSelectedWorkerIds([]);
                  } else {
                    setSelectedWorkerIds(filteredWorkers.map((w) => w.id));
                  }
                }}
                className="w-4 h-4 accent-blue-500 cursor-pointer rounded"
              />
              <span>Seleccionar Todo ({filteredWorkers.length})</span>
            </label>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar trabajador por nombre, usuario, cédula..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* FILTRO RÁPIDO: TODOS / HABILITADOS / DESHABILITADOS */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === 'todos'
                  ? 'bg-zinc-200 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({workers.length})
            </button>
            <button
              onClick={() => setStatusFilter('activo')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'activo'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:bg-emerald-950/50'
              }`}
            >
              <CheckCircle className="w-3 h-3" /> Habilitados ({enabledCount})
            </button>
            <button
              onClick={() => setStatusFilter('suspendido')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'suspendido'
                  ? 'bg-red-600 text-white'
                  : 'text-red-400 hover:bg-red-950/50'
              }`}
            >
              <Ban className="w-3 h-3" /> Deshabilitados ({disabledCount})
            </button>
          </div>
        </div>

        {/* FILTRO POR ROLES */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-800/70">
          <button
            onClick={() => setRoleFilter('todos')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              roleFilter === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Todos los Cargos
          </button>
          {AVAILABLE_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                roleFilter === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {r.split('/')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* BARRA FLOTANTE DE ACCIONES EN MASA DE TRABAJADORES */}
      {selectedWorkerIds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-950 via-zinc-900 to-red-950 border-2 border-blue-500 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-2 text-white font-black text-xs">
            <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center font-mono text-xs">
              {selectedWorkerIds.length}
            </span>
            <span>Trabajador(es) Seleccionado(s)</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => {
                selectedWorkerIds.forEach((id) => AdminService.deleteStaffWorker(id));
                loadWorkers();
                setSelectedWorkerIds([]);
                audioService.playPTTKey();
                showToast(`🗑️ Se eliminaron ${selectedWorkerIds.length} trabajador(es) de un solo golpe.`, 'danger');
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-black px-3.5 py-1.5 rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar {selectedWorkerIds.length} Seleccionado(s) de un Solo Golpe
            </button>

            <button
              onClick={() => setSelectedWorkerIds([])}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              Desmarcar Todo
            </button>
          </div>
        </div>
      )}

      {/* GRID COMPACTO DE TRABAJADORES Y SUS CREDENCIALES */}
      {filteredWorkers.length === 0 ? (
        <div className="bg-[#121318] border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-zinc-400 font-bold">No hay trabajadores registrados con ese filtro.</p>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Crear Nuevo Trabajador
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredWorkers.map((w) => {
            const isActive = w.status === 'activo';
            const showPass = !!visiblePasswords[w.id];
            const isCopied = copiedId === w.id;
            const isWorkerChecked = selectedWorkerIds.includes(w.id);

            return (
              <div
                key={w.id}
                className={`bg-[#121318] border rounded-2xl p-3.5 flex flex-col justify-between transition shadow-md ${
                  isWorkerChecked
                    ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-950/20'
                    : isActive
                    ? 'border-zinc-800 hover:border-blue-500/40'
                    : 'border-red-500/40 bg-red-950/10'
                }`}
              >
                <div>
                  {/* CABECERA DE TARJETA CON ESTADO HABILITADO / DESHABILITADO Y CHECKBOX */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isWorkerChecked}
                        onChange={() => {
                          setSelectedWorkerIds((prev) =>
                            prev.includes(w.id) ? prev.filter((i) => i !== w.id) : [...prev, w.id]
                          );
                        }}
                        className="w-4 h-4 accent-blue-500 cursor-pointer rounded shrink-0 mt-0.5"
                        title="Seleccionar este trabajador para eliminar en lote"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-zinc-400">{w.id}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[10px] font-bold text-blue-400 uppercase">
                            Sede {w.cityBranch}
                          </span>
                        </div>
                        <h3 className={`text-sm font-black mt-0.5 ${isActive ? 'text-white' : 'text-zinc-400 line-through'}`}>
                          {w.fullName}
                        </h3>
                        <p className="text-[11px] font-bold text-amber-400">{w.role}</p>
                      </div>
                    </div>

                    {/* BADGE DE ESTADO ACTUAL */}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shrink-0 ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-red-950 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Habilitado
                        </>
                      ) : (
                        <>
                          <Ban className="w-3 h-3" /> Deshabilitado
                        </>
                      )}
                    </span>
                  </div>

                  {/* SELECTOR DIRECTO: HABILITADO / DESHABILITADO */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleSetWorkerStatus(w, 'activo')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/60'
                      }`}
                    >
                      <Unlock className="w-3 h-3" /> Habilitado
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetWorkerStatus(w, 'suspendido')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition cursor-pointer ${
                        !isActive
                          ? 'bg-red-600 text-white shadow'
                          : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60'
                      }`}
                    >
                      <Ban className="w-3 h-3" /> Deshabilitado
                    </button>
                  </div>

                  {/* DATOS PERSONALES Y TURNO */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-400 mb-2.5 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/60">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase block">Cédula / ID</span>
                      <span className="font-mono text-zinc-200 font-bold">{w.cedula}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase block">Teléfono</span>
                      <span className="font-mono text-emerald-400 font-bold">{w.phone}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> {w.shift}
                      </span>
                      {w.lastLogin && (
                        <span className="text-[9px] text-zinc-500">Acceso: {w.lastLogin}</span>
                      )}
                    </div>
                  </div>

                  {/* CAJA DE USUARIO Y CONTRASEÑA (CREADA POR EL DUEÑO) */}
                  <div
                    className={`bg-[#090a0f] border rounded-xl p-2.5 mb-3 space-y-1.5 ${
                      isActive ? 'border-blue-500/30' : 'border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isActive ? 'text-blue-400' : 'text-red-400'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        {isActive ? 'Credenciales Activas' : 'Credenciales Bloqueadas'}
                      </span>
                      <button
                        onClick={() => handleOpenEditModal(w)}
                        className="text-[10px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Editar / Clave
                      </button>
                    </div>

                    {!isActive && (
                      <div className="bg-red-950/60 border border-red-500/30 rounded-lg px-2 py-1 text-[10px] text-red-300 font-bold flex items-center justify-between">
                        <span>🚫 Acceso al sistema deshabilitado</span>
                        <button
                          onClick={() => handleDeleteWorker(w)}
                          className="text-red-200 hover:text-white underline font-black cursor-pointer"
                        >
                          Eliminar ahora
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-zinc-900/90 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                        <span className="text-[9px] text-zinc-500 block">USUARIO:</span>
                        <span className="font-mono font-black text-white text-xs select-all">
                          {w.username}
                        </span>
                      </div>

                      <div className="bg-zinc-900/90 px-2.5 py-1.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-zinc-500 block">CONTRASEÑA:</span>
                          <span className="font-mono font-black text-emerald-400 text-xs select-all">
                            {showPass ? w.password : '••••••••'}
                          </span>
                        </div>
                        <button
                          onClick={() => togglePasswordVisibility(w.id)}
                          className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                          title={showPass ? 'Ocultar clave' : 'Ver clave'}
                        >
                          {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTONES PARA ENTREGAR CREDENCIALES O ELIMINAR */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendCredentialsWhatsApp(w)}
                      className="flex-1 bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-1.5 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1 shadow transition cursor-pointer"
                      title="Enviar usuario y contraseña al WhatsApp del trabajador"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </button>

                    <button
                      onClick={() => handleCopyCredentials(w)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-1.5 px-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1 border border-zinc-700 transition cursor-pointer"
                      title="Copiar usuario y contraseña"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setCredentialWorker(w)}
                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold py-1.5 px-2.5 rounded-xl text-[11px] border border-blue-500/30 transition cursor-pointer"
                      title="Ver tarjeta de credencial para entrega en persona"
                    >
                      🪪 Ficha
                    </button>

                    <button
                      onClick={() => handleDeleteWorker(w)}
                      className="bg-red-950/70 hover:bg-red-600 text-red-300 hover:text-white font-bold py-1.5 px-2.5 rounded-xl text-[11px] border border-red-500/30 flex items-center gap-1 transition cursor-pointer"
                      title="Eliminar definitivamente a este trabajador"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL CREAR / EDITAR USUARIO Y CONTRASEÑA DEL TRABAJADOR */}
      {/* ============================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 w-full max-w-md rounded-2xl p-4 sm:p-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black text-white uppercase mb-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-400" />
              {editingWorkerId ? 'Editar Credenciales de Trabajador' : 'Registrar Trabajador y Crear Clave'}
            </h3>
            <p className="text-[11px] text-zinc-400 mb-3">
              Asigna el usuario, contraseña y estado (Habilitado / Deshabilitado) del trabajador.
            </p>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveWorker} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                  Nombre Completo del Trabajador *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => {
                    setFullName(e.target.value);
                    if (!editingWorkerId && !username) {
                      handleSuggestUsername(e.target.value);
                    }
                  }}
                  placeholder="Ej: Lic. Sofía Méndez"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none focus:border-blue-500"
                />
              </div>

              {/* ESTADO DE ACCESO: HABILITADO O DESHABILITADO */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                  Estado de la Credencial de Acceso *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkerStatus('activo')}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      workerStatus === 'activo'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Habilitado
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkerStatus('suspendido')}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      workerStatus === 'suspendido'
                        ? 'bg-red-600/20 border-red-500 text-red-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" /> Deshabilitado
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                    Cédula / Identificación
                  </label>
                  <input
                    type="text"
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="0401..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="098..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                    Cargo / Función *
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as WorkerRole)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none cursor-pointer"
                  >
                    {AVAILABLE_ROLES.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                    Sede / Ciudad
                  </label>
                  <input
                    type="text"
                    value={cityBranch}
                    onChange={e => setCityBranch(e.target.value)}
                    placeholder="Tulcán, Quito..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-0.5">
                  Horario / Turno Asignado
                </label>
                <select
                  value={shift}
                  onChange={e => setShift(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-white font-bold outline-none cursor-pointer"
                >
                  <option value="Mañana (06:00 - 14:00)">Mañana (06:00 - 14:00)</option>
                  <option value="Tarde (14:00 - 22:00)">Tarde (14:00 - 22:00)</option>
                  <option value="Madrugada (22:00 - 06:00)">Madrugada (22:00 - 06:00)</option>
                  <option value="Turno Completo / Rotativo">Turno Completo / Rotativo</option>
                </select>
              </div>

              {/* SECCIÓN DESTACADA: CREAR USUARIO Y CONTRASEÑA */}
              <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-400 uppercase">
                    🔐 Credenciales para Entregar al Trabajador
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleSuggestUsername(fullName);
                      handleGeneratePassword();
                    }}
                    className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    ⚡ Autogenerar Ambos
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 block mb-0.5">
                      Usuario de Acceso *
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="ej: sofia.despacho"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-300 block mb-0.5">
                      Contraseña / Clave *
                    </label>
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="ej: Andes2026"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-emerald-400 font-mono font-black outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* PERMISOS */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                  Paneles Autorizados para este Trabajador:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {AVAILABLE_MODULES.map(mod => {
                    const checked = permissions.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => togglePermission(mod.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-left flex items-center gap-1.5 border transition cursor-pointer ${
                          checked
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <span className="w-3 h-3 rounded bg-zinc-800 flex items-center justify-center text-[9px]">
                          {checked ? '✓' : ''}
                        </span>
                        <span className="truncate">{mod.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl uppercase transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  {editingWorkerId ? 'Guardar Cambios de Acceso' : 'Crear Usuario y Generar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL FICHA DE ENTREGA PERSONAL DE CREDENCIALES */}
      {/* ============================================================== */}
      {credentialWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#14151a] border-2 border-blue-500/40 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <button
              onClick={() => setCredentialWorker(null)}
              className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center border-b border-zinc-800 pb-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-2 text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                AndesMovi Ecuador • Credencial Oficial
              </span>
              <h3 className="text-base font-black text-white mt-0.5">{credentialWorker.fullName}</h3>
              <p className="text-xs font-bold text-amber-400">{credentialWorker.role}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Sede {credentialWorker.cityBranch} • {credentialWorker.shift}
              </p>
            </div>

            <div className="bg-[#090a0f] border border-zinc-800 rounded-xl p-3 space-y-2 mb-4">
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                <span className="text-[10px] font-bold text-zinc-400">ESTADO DE ACCESO:</span>
                <span
                  className={`font-black text-xs uppercase ${
                    credentialWorker.status === 'activo' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {credentialWorker.status === 'activo' ? '● HABILITADO' : '🚫 DESHABILITADO'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                <span className="text-[10px] font-bold text-zinc-400">USUARIO ASIGNADO:</span>
                <span className="font-mono font-black text-sm text-white select-all">
                  {credentialWorker.username}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                <span className="text-[10px] font-bold text-zinc-400">CONTRASEÑA / CLAVE:</span>
                <span className="font-mono font-black text-sm text-emerald-400 select-all">
                  {credentialWorker.password}
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-[10px] font-bold text-zinc-400">SOPORTE ANDESMOVI:</span>
                <span className="font-mono font-bold text-xs text-blue-400 select-all">
                  +593 99 856 6503
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleSendCredentialsWhatsApp(credentialWorker)}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" /> Enviar Credencial por WhatsApp
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyCredentials(credentialWorker)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar Datos
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
