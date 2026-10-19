import React, { useState } from 'react';
import { PlatformSettings, FirebaseConfigModel } from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { firebaseSyncService } from '../services/firebase_service';
import { audioService } from '../services/audio_service';
import {
  Settings,
  Database,
  Percent,
  Building,
  Phone,
  Shield,
  Volume2,
  VolumeX,
  Save,
  CheckCircle,
  Copy,
  Radio,
  FileCode,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  settings: PlatformSettings;
  onSettingsSaved: (updated: PlatformSettings) => void;
  onCommissionRateChange: (rate: number) => void;
}

export const PlatformSettingsPanel: React.FC<Props> = ({
  settings,
  onSettingsSaved,
  onCommissionRateChange,
}) => {
  const [formData, setFormData] = useState<PlatformSettings>({ ...settings });
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfigModel>(() => {
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
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const [allowDeleteInRules, setAllowDeleteInRules] = useState(true);

  const FIRESTORE_RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /viajes/{viajeId} {
      allow read: if true;
      allow create: if request.resource.data.estado == 'buscando';
      allow update: if true;
      allow delete: if ${allowDeleteInRules ? 'true' : 'false'}; // ${allowDeleteInRules ? 'Habilitado para administración' : 'Bloqueado'}
    }
    match /encomiendas/{encomiendaId} {
      allow read, write: if true;
    }
    match /conductores/{conductorId} {
      allow read, write: if true;
    }
  }
}`;

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    AdminService.saveSettings(formData);
    onCommissionRateChange(formData.commissionRate);
    onSettingsSaved(formData);

    // Save Firebase Config
    firebaseSyncService.initFirebase(firebaseConfig);

    audioService.playSuccessTone();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_TEXT);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#121316] border border-zinc-800 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Configuración Total de la Plataforma</h2>
            <p className="text-xs text-zinc-400 font-mono">
              Parámetros de comisiones, Firebase Firestore, despacho y seguridad
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Configuración guardada exitosamente
          </div>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-5 text-xs">
        {/* Section 1: Commissions & Operations */}
        <div className="bg-[#121316] border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-zinc-800 pb-3">
            <Percent className="w-4 h-4 text-emerald-400" />
            <span>Comisiones y Modo Operativo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Porcentaje de Comisión AndesMovi (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  required
                  value={formData.commissionRate}
                  onChange={(e) =>
                    setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 10 })
                  }
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Se descuenta automáticamente del valor recaudado en cada carrera finalizada.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Cantón Operativo Predeterminado
              </label>
              <select
                value={formData.defaultCanton}
                onChange={(e) => setFormData({ ...formData, defaultCanton: e.target.value })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="Tulcán">Tulcán (Carchi)</option>
                <option value="San Gabriel / Montúfar">San Gabriel / Montúfar</option>
                <option value="Ibarra / Otavalo">Ibarra / Otavalo</option>
                <option value="Quito Norte">Quito Norte / Carcelén</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Modo de Asignación de Despacho
              </label>
              <select
                value={formData.autoDispatch ? 'auto' : 'manual'}
                onChange={(e) => setFormData({ ...formData, autoDispatch: e.target.value === 'auto' })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="manual">Manual por Operador / Radio PTT</option>
                <option value="auto">Automático por Proximidad GPS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Firebase Firestore Configuration & Security Rules */}
        <div className="bg-[#121316] border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Conexión Firebase Firestore y Reglas de Seguridad</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
              Colección: {formData.firestoreCollection}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Firebase Project ID *
              </label>
              <input
                type="text"
                required
                value={firebaseConfig.projectId}
                onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Nombre de Colección de Carreras
              </label>
              <input
                type="text"
                required
                value={formData.firestoreCollection}
                onChange={(e) => setFormData({ ...formData, firestoreCollection: e.target.value })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                API Key (Web SDK)
              </label>
              <input
                type="text"
                value={firebaseConfig.apiKey}
                onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                App ID
              </label>
              <input
                type="text"
                value={firebaseConfig.appId}
                onChange={(e) => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Rules Code Display & Elimination Toggle */}
          <div className="mt-4 bg-[#09090b] border border-zinc-800 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-zinc-300 font-mono text-xs flex items-center gap-1.5 font-bold">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  Reglas de Seguridad para `firestore.rules`:
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Configuración para creación ('buscando') y eliminación administrativa
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Deletion Permission Toggle */}
                <label className="flex items-center gap-2 bg-[#18191e] border border-zinc-700 px-2.5 py-1 rounded-xl text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDeleteInRules}
                    onChange={(e) => setAllowDeleteInRules(e.target.checked)}
                    className="rounded accent-emerald-500 cursor-pointer"
                  />
                  <span className={`font-mono font-bold ${allowDeleteInRules ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    allow delete: {allowDeleteInRules ? 'true' : 'false'}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleCopyRules}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedRules ? '¡Copiado!' : 'Copiar Reglas'}
                </button>
              </div>
            </div>
            <pre className="text-emerald-400 font-mono text-[11px] overflow-x-auto p-3 bg-[#121316] rounded-xl border border-zinc-800/80 leading-relaxed">
              {FIRESTORE_RULES_TEXT}
            </pre>
          </div>
        </div>

        {/* Section 3: Corporate Details */}
        <div className="bg-[#121316] border border-zinc-800 p-5 rounded-3xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-zinc-800 pb-3">
            <Building className="w-4 h-4 text-blue-400" />
            <span>Datos Corporativos & Central de Radio</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Razón Social / Empresa
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Número Oficial de Soporte AndesMovi
              </label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+593 99 856 6503"
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Línea de Enlace de Emergencia
              </label>
              <input
                type="text"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                className="w-full bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración General
          </button>
        </div>
      </form>
    </div>
  );
};
