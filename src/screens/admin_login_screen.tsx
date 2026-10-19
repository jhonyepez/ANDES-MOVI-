import React, { useState } from 'react';
import { AdminService } from '../services/admin_service';
import { audioService } from '../services/audio_service';
import { Shield, Lock, User, Radio, CheckCircle, ArrowRight } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
}

export const AdminLoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [pin, setPin] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    audioService.playPTTKey();

    // Emulate brief verification delay
    setTimeout(async () => {
      const ok = await AdminService.login(username, pin);
      setIsLoading(false);

      if (ok) {
        audioService.playSuccessTone();
        onLoginSuccess();
      } else {
        setErrorMsg('Credenciales no autorizadas. Verifica tu usuario y clave.');
      }
    }, 350);
  };

  const handleQuickFill = (user: string, secretPin: string) => {
    setUsername(user);
    setPin(secretPin);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center p-4 sm:p-6 text-zinc-100 font-sans relative overflow-hidden">
      {/* Background ambient glowing gradient circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-[440px] z-10">
        {/* Main Card */}
        <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header & Andean Shield Icon */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-2xl bg-blue-600/15 border-2 border-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="w-10 h-10 text-blue-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#121316] border border-zinc-700 flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Central Administrativa
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              AndesMovi Ecuador • Despacho y Monitoreo Cantonal
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/70 border border-blue-800/60 text-[10px] text-blue-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              SISTEMA OPERATIVO v1.0 • ECUADOR
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Usuario / Operador
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin o despacho"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-zinc-700/80 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Contraseña / Clave de Acceso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-blue-400" />
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Ingresa tu contraseña asignada"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-zinc-700/80 rounded-2xl text-sm text-white placeholder-zinc-500 font-mono tracking-widest focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs text-center font-medium animate-shake">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar a la Central</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Access Credentials helper for instant testing */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <div className="text-[11px] font-semibold text-zinc-400 mb-2 text-center uppercase tracking-wider">
              Accesos Directos (Dueño y Personal Contratado):
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', '1234')}
                className="p-2 rounded-xl bg-[#18181b] hover:bg-zinc-800 border border-zinc-700/60 text-left transition cursor-pointer"
              >
                <div className="font-bold text-blue-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Administrador
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">admin / 1234</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('sofia.despacho', 'Tulcan2026')}
                className="p-2 rounded-xl bg-[#18181b] hover:bg-zinc-800 border border-zinc-700/60 text-left transition cursor-pointer"
              >
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Personal Turno
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">sofia.despacho</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-5 text-[11px] text-zinc-500 font-mono">
          AndesMovi Ecuador • Tulcán • San Gabriel • Ibarra • Quito
        </div>
      </div>
    </div>
  );
};
