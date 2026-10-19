import React, { useState } from 'react';
import { FleetUnit } from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import { UserPlus, Car, Phone, MapPin, Building, ShieldCheck, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDriverAdded: (newUnit: FleetUnit) => void;
}

export const AddDriverModal: React.FC<Props> = ({ isOpen, onClose, onDriverAdded }) => {
  const [driverName, setDriverName] = useState('');
  const [vehicle, setVehicle] = useState('Chevrolet Sail');
  const [plate, setPlate] = useState('PBC-');
  const [canton, setCanton] = useState('Tulcán');
  const [phone, setPhone] = useState('09');
  const [cooperative] = useState('Conductor Particular');
  const [unitNumber, setUnitNumber] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim() || !plate.trim() || !vehicle.trim()) return;

    const newUnit = AdminService.registerNewDriverAndUnit({
      driverName: driverName.trim(),
      vehicle: vehicle.trim(),
      plate: plate.trim(),
      canton,
      phone: phone.trim(),
      cooperative: cooperative.trim(),
      initialUnitNumber: unitNumber.trim() || undefined,
    });

    audioService.playSuccessTone();
    onDriverAdded(newUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#14151a] border border-zinc-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#18191e] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base">Registrar Nuevo Conductor y Unidad</h3>
              <p className="text-xs text-zinc-400 font-mono">
                Alta inmediata en la flota operativa de AndesMovi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Nombre Completo del Conductor *
            </label>
            <input
              type="text"
              required
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Ej. Rodrigo Benavides Fueltala"
              className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-blue-400" />
                Vehículo (Marca y Modelo) *
              </label>
              <input
                type="text"
                required
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="Ej. Kia Rio Sedan 2022"
                className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Placa Ecuatoriana (ANT) *
              </label>
              <input
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="PBC-1234"
                className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Teléfono Celular *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0984123890"
                className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Número de Unidad (Opcional)
              </label>
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="Ej. 088 (dejar vacío para auto)"
                className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Ciudad / Zona Base
            </label>
            <select
              value={canton}
              onChange={(e) => setCanton(e.target.value)}
              className="w-full bg-[#1c1d24] border border-zinc-700 rounded-xl px-3 py-2 text-white"
            >
              <option value="Tulcán">Tulcán (Carchi)</option>
              <option value="San Gabriel / Montúfar">San Gabriel / Montúfar</option>
              <option value="Ibarra / Otavalo">Ibarra / Otavalo (Imbabura)</option>
              <option value="Quito Norte">Quito</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-[11px] text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              La unidad se dará de alta con estado <strong>Disponible</strong> y calificación inicial de 5.0★ en el radar de OpenStreetMap.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Guardar y Activar Unidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
