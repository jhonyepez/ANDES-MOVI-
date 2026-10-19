import React, { useState, useEffect } from 'react';
import {
  SocioModel,
  FleetUnit,
  TripModel,
} from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import {
  Users,
  DollarSign,
  Plus,
  Search,
  Phone,
  CheckCircle,
  X,
  Trash2,
  User,
} from 'lucide-react';

interface Props {
  units: FleetUnit[];
  trips?: TripModel[];
  onViewUnitOnMap?: (unitId: string) => void;
  commissionRate: number;
}

export const SociosManager: React.FC<Props> = () => {
  const [socios, setSocios] = useState<SocioModel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSocioModal, setShowAddSocioModal] = useState(false);

  // Campos simples: solo el nombre y la persona que es (y capital/contacto opcional)
  const [newFullName, setNewFullName] = useState('');
  const [newRoleNote, setNewRoleNote] = useState('Socio Inversionista de Capital');
  const [newPhone, setNewPhone] = useState('');
  const [newCapital, setNewCapital] = useState<number>(1000);

  useEffect(() => {
    setSocios(AdminService.getStoredSocios());
  }, []);

  const filteredSocios = socios.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.nationalId.toLowerCase().includes(q)
    );
  });

  const totalCapital = socios.reduce((sum, s) => sum + (s.investedCapital || 0), 0);

  const handleCreateSocio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;

    AdminService.addSocio({
      fullName: newFullName.trim(),
      nationalId: newRoleNote.trim() || 'Socio Inversionista Particular',
      phone: newPhone.trim() || 'Personal',
      email: '',
      cooperative: 'Inversionista Particular',
      assignedUnits: [],
      status: 'activo',
      investedCapital: isNaN(newCapital) ? 0 : newCapital,
      bankAccount: {
        bank: 'Directo',
        accountType: 'Ahorros',
        accountNumber: '',
      },
      monthlyDuePaid: true,
      lastAppLogin: 'Registrado',
    });

    audioService.playSuccessTone();
    setSocios(AdminService.getStoredSocios());
    setShowAddSocioModal(false);

    setNewFullName('');
    setNewRoleNote('Socio Inversionista de Capital');
    setNewPhone('');
    setNewCapital(1000);
  };

  const handleDeleteSocio = (id: string, _name: string) => {
    AdminService.deleteSocio(id);
    setSocios(AdminService.getStoredSocios());
    audioService.playPTTKey();
  };

  const handleClearAllSocios = () => {
    AdminService.saveSocios([]);
    setSocios([]);
    audioService.playPTTKey();
  };

  return (
    <div className="bg-[#090a0f] min-h-screen text-zinc-100 p-4 md:p-5 space-y-4 font-sans text-xs">
      {/* CABECERA SIMPLE Y LIMPIA */}
      <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Socios Inversionistas de la Plataforma
              </h2>
              <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                {socios.length} personas
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Personas particulares que invierten capital en nuestra plataforma (sin cooperativas ni cupos).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {socios.length > 0 && (
            <button
              onClick={handleClearAllSocios}
              className="bg-zinc-900 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar Lista
            </button>
          )}

          <button
            onClick={() => setShowAddSocioModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Agregar Socio Particular
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y RESUMEN */}
      <div className="bg-[#121318] border border-zinc-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de la persona..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-4 px-2">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Total Socios</span>
            <span className="text-sm font-black text-white">{socios.length} Personas</span>
          </div>
          {totalCapital > 0 && (
            <div className="border-l border-zinc-800 pl-4">
              <span className="text-[10px] text-zinc-500 uppercase block">Capital Total Registrado</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                ${totalCapital.toFixed(2)} USD
              </span>
            </div>
          )}
        </div>
      </div>

      {/* LISTA LIMPIA DE PERSONAS / SOCIOS PARTICULARES */}
      {filteredSocios.length === 0 ? (
        <div className="bg-[#121318] border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-3">
          <p className="text-zinc-400 font-bold">
            No hay socios registrados en la lista.
          </p>
          <button
            onClick={() => setShowAddSocioModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Registrar Persona / Socio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredSocios.map((s) => (
            <div
              key={s.id}
              className="bg-[#121318] border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between transition shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight">
                        {s.fullName}
                      </h3>
                      <span className="text-[11px] font-semibold text-emerald-400 block mt-0.5">
                        Socio Inversionista Particular
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSocio(s.id, s.fullName)}
                    className="text-zinc-500 hover:text-red-400 p-1 transition cursor-pointer"
                    title="Eliminar de la lista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
                  {s.phone && s.phone !== 'Personal' && (
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Contacto:</span>
                      <span className="font-mono text-zinc-200 font-bold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" /> {s.phone}
                      </span>
                    </div>
                  )}

                  {s.investedCapital !== undefined && s.investedCapital > 0 && (
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Capital Invertido:</span>
                      <span className="font-mono text-emerald-400 font-black">
                        ${s.investedCapital.toFixed(2)} USD
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle className="w-3 h-3" /> Activo en Plataforma
                </span>
                <span>Desde {s.joinDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL SIMPLE: SOLO EL NOMBRE Y LA PERSONA QUE ES */}
      {showAddSocioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#14151a] border border-zinc-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative">
            <button
              onClick={() => setShowAddSocioModal(false)}
              className="absolute top-3.5 right-3.5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-black text-white uppercase mb-1 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              Registrar Socio Inversionista
            </h3>
            <p className="text-[11px] text-zinc-400 mb-3">
              Ingresa únicamente el nombre de la persona que invierte en la plataforma.
            </p>

            <form onSubmit={handleCreateSocio} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-300 block mb-1">
                  Nombre Completo de la Persona *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ej: Carlos Andrés Montenegro"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                  Descripción / Quién es (Opcional)
                </label>
                <input
                  type="text"
                  value={newRoleNote}
                  onChange={(e) => setNewRoleNote(e.target.value)}
                  placeholder="Socio Inversionista de Capital"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="099..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                    Capital ($ Opcional)
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={isNaN(newCapital) ? '' : newCapital}
                    onChange={(e) => setNewCapital(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-emerald-400 font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl uppercase transition cursor-pointer"
                >
                  Guardar Socio Particular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
