import React, { useState } from 'react';
import { RadioTransmission } from '../models/admin_models';
import { audioService } from '../services/audio_service';
import { Radio, Mic, Volume2, VolumeX, Send, Wifi } from 'lucide-react';

interface Props {
  transmissions: RadioTransmission[];
  onTransmit: (text: string, channel: string) => void;
  selectedUnitId?: string;
}

const CHANNELS = [
  { id: 'ch1', name: 'CANAL 1 - TULCÁN MATRIZ', freq: '144.520 MHz', coverage: 'Tulcán / Rumichaca / Urbano' },
  { id: 'ch2', name: 'CANAL 2 - MONTÚFAR / SAN GABRIEL', freq: '146.100 MHz', coverage: 'Montúfar / Bolívar / Espejo' },
  { id: 'ch3', name: 'CANAL 3 - IBARRA / IMBABURA', freq: '147.250 MHz', coverage: 'Ibarra / Otavalo / Corredor Norte' },
  { id: 'ch_sos', name: 'FRECUENCIA NACIONAL SOS / EMERGENCIAS', freq: '155.000 MHz', coverage: 'Enlace ECU-911 y Alertas' },
];

export const RadioPTTConsole: React.FC<Props> = ({ transmissions, onTransmit, selectedUnitId }) => {
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0].name);
  const [customMsg, setCustomMsg] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [soundOn, setSoundOn] = useState(audioService.isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audioService.setSoundEnabled(next);
    if (next) {
      audioService.playSuccessTone();
    }
  };

  const startPTT = () => {
    setIsTransmitting(true);
    audioService.playPTTKey();
  };

  const stopPTT = () => {
    setIsTransmitting(false);
    audioService.playRogerBeep();

    const textToBroadcast = customMsg.trim() || (selectedUnitId
      ? `Central despachando a ${selectedUnitId}: Reporte estado de servicio en frecuencia.`
      : 'Central AndesMovi a todas las unidades en frecuencia: Verifiquen disponibilidad y reporte de ubicación.');

    onTransmit(textToBroadcast, activeChannel);
    setCustomMsg('');
  };

  const handleSendQuick = (preset: string) => {
    audioService.playPTTKey();
    setTimeout(() => {
      audioService.playRogerBeep();
      onTransmit(preset, activeChannel);
    }, 200);
  };

  return (
    <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col h-full text-zinc-200">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              Consola de Radio-Frecuencia VHF / UHF
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                EN VIVO
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Central Matriz AndesMovi Ecuador • Repetidora Cerro Troya
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleSound}
          title={soundOn ? 'Desactivar audio de radio' : 'Activar audio de radio'}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
        </button>
      </div>

      {/* Channel selector grid */}
      <div className="grid grid-cols-2 gap-1.5 my-3">
        {CHANNELS.map((ch) => {
          const isSelected = activeChannel === ch.name;
          const isSos = ch.id === 'ch_sos';

          return (
            <button
              key={ch.id}
              onClick={() => {
                setActiveChannel(ch.name);
                audioService.playPTTKey();
              }}
              className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer ${
                isSelected
                  ? isSos
                    ? 'bg-red-950/80 border-red-500 text-red-200 shadow-md shadow-red-950'
                    : 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-950'
                  : 'bg-[#18191e] border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] truncate">{ch.name.split(' - ')[0]}</span>
                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/40">{ch.freq}</span>
              </div>
              <div className="text-[10px] opacity-75 truncate mt-0.5">{ch.coverage}</div>
            </button>
          );
        })}
      </div>

      {/* Live Radio Log Screen (CRT style) */}
      <div className="flex-1 min-h-[170px] max-h-[220px] bg-[#090b0e] border border-zinc-800 rounded-xl p-2.5 font-mono text-[11px] overflow-y-auto space-y-2 select-text">
        <div className="text-[10px] text-zinc-500 border-b border-zinc-900 pb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-emerald-400" /> Canal Activo: {activeChannel}
          </span>
          <span>SQL: AUTO • RF: 100%</span>
        </div>

        {transmissions.map((t) => {
          const isCentral = t.sender === 'CENTRAL';
          return (
            <div
              key={t.id}
              className={`p-1.5 rounded-lg border text-xs leading-relaxed ${
                isCentral
                  ? 'bg-blue-950/30 border-blue-900/60 text-blue-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] opacity-75 font-bold mb-0.5">
                <span className={isCentral ? 'text-blue-400' : 'text-amber-400'}>
                  [{t.sender}] {t.unitId ? `• ${t.unitId}` : ''}
                </span>
                <span className="text-zinc-500">{t.timestamp}</span>
              </div>
              <div>{t.message}</div>
            </div>
          );
        })}
      </div>

      {/* PTT and Mic Controls */}
      <div className="mt-3 space-y-2">
        {/* Quick dispatch broadcast phrases */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
          <button
            onClick={() => handleSendQuick('Central: ¿Qué unidad está disponible en sector Parque Central para carrera inmediata?')}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 whitespace-nowrap cursor-pointer transition"
          >
            Preguntar Disponibilidad Parque
          </button>
          <button
            onClick={() => handleSendQuick('Central: Atención unidades vía Rumichaca, reporte estado de vía y flujo vehicular.')}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 whitespace-nowrap cursor-pointer transition"
          >
            Reporte Vía Rumichaca
          </button>
          <button
            onClick={() => handleSendQuick('Atención general: Mantengan precaución por lluvia en sector El Ángel y San Gabriel.')}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 whitespace-nowrap cursor-pointer transition"
          >
            Alerta Lluvia en Ruta
          </button>
        </div>

        {/* Input box */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customMsg.trim()) {
                stopPTT();
              }
            }}
            placeholder={
              selectedUnitId
                ? `Mensaje radial directo a ${selectedUnitId}...`
                : 'Escribir mensaje para emitir por frecuencia...'
            }
            className="flex-1 bg-[#18191e] border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={() => {
              if (customMsg.trim()) stopPTT();
            }}
            disabled={!customMsg.trim()}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition cursor-pointer"
            title="Emitir mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Big PTT (Push-To-Talk) button */}
        <div className="pt-1">
          <button
            onMouseDown={startPTT}
            onMouseUp={stopPTT}
            onTouchStart={startPTT}
            onTouchEnd={stopPTT}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 tracking-wider transition-all select-none cursor-pointer border ${
              isTransmitting
                ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/50 scale-[0.99] ring-4 ring-red-500/30'
                : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 border-blue-400/40 text-white shadow-md shadow-blue-900/40'
            }`}
          >
            <Mic className={`w-4 h-4 ${isTransmitting ? 'animate-pulse' : ''}`} />
            {isTransmitting ? 'TRANSMITIENDO EN FRECUENCIA (SUELTA PARA CORTAR)...' : 'MANTENER PRESIONADO PARA HABLAR (PTT)'}
          </button>
        </div>
      </div>
    </div>
  );
};
