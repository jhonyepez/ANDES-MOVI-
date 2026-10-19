import React, { useState, useEffect, useMemo } from 'react';
import {
  FinancialTransaction,
  FinancialMovementType,
  FinancialCategory,
  UserWalletBalance,
  FleetUnit,
  TripModel,
  DriverRechargeRequest,
  SupportedRechargeBank,
} from '../models/admin_models';
import { AdminService } from '../services/admin_service';
import { firebaseSyncService } from '../services/firebase_service';
import { audioService } from '../services/audio_service';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Search,
  Download,
  Database,
  CheckCircle2,
  FileText,
  Building2,
  UserCheck,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Code2,
  PieChart,
  Scale,
  Receipt,
  Sparkles,
  X,
  Eye,
  XCircle,
  Upload,
  Clock,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  units: FleetUnit[];
  trips?: TripModel[];
  commissionRate: number;
}

type PeriodFilter = 'dia' | 'semana' | 'mes' | 'todos';
type SubTab = 'recargas_pendientes' | 'libro_caja' | 'billeteras_recargas' | 'arquitectura_firebase';

const BANK_METHODS: SupportedRechargeBank[] = [
  'Deuna! / Banco Pichincha',
  'Banco Pichincha',
  'Banco Guayaquil',
  'Produbanco',
  'Banco del Austro',
];

const BANK_BADGE_STYLES: Record<SupportedRechargeBank, string> = {
  'Deuna! / Banco Pichincha': 'bg-purple-950/90 text-purple-200 border-purple-500/70',
  'Banco Pichincha': 'bg-yellow-950/90 text-yellow-200 border-yellow-500/70',
  'Banco Guayaquil': 'bg-pink-950/90 text-pink-200 border-pink-500/70',
  'Produbanco': 'bg-emerald-950/90 text-emerald-200 border-emerald-500/70',
  'Banco del Austro': 'bg-blue-950/90 text-blue-200 border-blue-500/70',
};

const CATEGORY_LABELS: Record<FinancialCategory, { label: string; badgeColor: string; type: FinancialMovementType }> = {
  cobro_viaje: {
    label: 'Cobro Servicio de Viaje',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70',
    type: 'INGRESO',
  },
  cobro_encomienda: {
    label: 'Cobro Guía de Encomienda',
    badgeColor: 'bg-teal-950/80 text-teal-300 border-teal-700/70',
    type: 'INGRESO',
  },
  recarga_conductor: {
    label: 'Recarga Aprobada Conductor',
    badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-700/70',
    type: 'INGRESO',
  },
  recarga_cliente: {
    label: 'Recarga Saldo Cliente',
    badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/70',
    type: 'INGRESO',
  },
  cuota_cooperativa: {
    label: 'Aporte Plataforma',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70',
    type: 'INGRESO',
  },
  liquidacion_conductor: {
    label: 'Liquidación / Pago a Conductor',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700/70',
    type: 'EGRESO',
  },
  comision_retenida: {
    label: 'Comisión Retenida / Agencia',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700/70',
    type: 'EGRESO',
  },
  gasto_operativo: {
    label: 'Gasto Operativo Plataforma',
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-700/70',
    type: 'EGRESO',
  },
  mantenimiento_repetidora: {
    label: 'Mantenimiento Cloud / Sistema',
    badgeColor: 'bg-red-950/80 text-red-300 border-red-700/70',
    type: 'EGRESO',
  },
  reembolso_cliente: {
    label: 'Reembolso / Devolución',
    badgeColor: 'bg-orange-950/80 text-orange-300 border-orange-700/70',
    type: 'EGRESO',
  },
};

export const FinanceManager: React.FC<Props> = ({ units, commissionRate }) => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [wallets, setWallets] = useState<UserWalletBalance[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<DriverRechargeRequest[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('recargas_pendientes');

  // Filters: Fecha (día, semana, mes, todos) + Conductor + Lupita (Nombre o Placa)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('mes');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS');
  const [rechargeStatusFilter, setRechargeStatusFilter] = useState<'pendiente' | 'aprobada' | 'rechazada' | 'todas'>('pendiente');

  // Modals
  const [inspectingReceiptReq, setInspectingReceiptReq] = useState<DriverRechargeRequest | null>(null);
  const [showNewRechargeModal, setShowNewRechargeModal] = useState<boolean>(false);
  const [showNewMovementModal, setShowNewMovementModal] = useState<FinancialMovementType | null>(null);
  const [selectedWalletForAction, setSelectedWalletForAction] = useState<{
    wallet: UserWalletBalance;
    mode: 'recarga' | 'liquidacion';
  } | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<FinancialTransaction | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // New Recharge Request Form State (for simulating driver upload)
  const [newRecDriverName, setNewRecDriverName] = useState<string>('Marco Rosero');
  const [newRecNationalId, setNewRecNationalId] = useState<string>('0401589210');
  const [newRecPlate, setNewRecPlate] = useState<string>('PBC-4921');
  const [newRecBank, setNewRecBank] = useState<SupportedRechargeBank>('Deuna! / Banco Pichincha');
  const [newRecAmount, setNewRecAmount] = useState<string>('25.00');
  const [newRecReference, setNewRecReference] = useState<string>('DEUNA-994021');
  const [newRecCustomImage, setNewRecCustomImage] = useState<string | null>(null);

  // Form State for New Income / Expense
  const [formCategory, setFormCategory] = useState<FinancialCategory>('recarga_conductor');
  const [formAmount, setFormAmount] = useState<string>('15.00');
  const [formCommission, setFormCommission] = useState<string>('1.50');
  const [formPaymentMethod, setFormPaymentMethod] = useState<FinancialTransaction['paymentMethod']>('Banco Pichincha');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formReference, setFormReference] = useState<string>('');
  const [formCanton, setFormCanton] = useState<string>('Tulcán');
  const [formUserRole, setFormUserRole] = useState<FinancialTransaction['involvedUser']['role']>('conductor');
  const [formUserName, setFormUserName] = useState<string>('Marco Rosero');
  const [formPlate, setFormPlate] = useState<string>('PBC-4921');

  // Wallet Modal Form State
  const [walletActionAmount, setWalletActionAmount] = useState<string>('20.00');
  const [walletActionMethod, setWalletActionMethod] = useState<FinancialTransaction['paymentMethod']>('Banco Pichincha');
  const [walletActionRef, setWalletActionRef] = useState<string>('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setTransactions(AdminService.getStoredFinancialTransactions());
    setWallets(AdminService.getStoredWallets());
    setRechargeRequests(AdminService.getStoredRechargeRequests());
  };

  const triggerToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 5500);
  };

  // List of unique driver names for the driver filter dropdown
  const driverOptions = useMemo(() => {
    const map = new Map<string, { name: string; plate: string }>();
    units.forEach((u) => {
      map.set(u.driverName, { name: u.driverName, plate: u.plate });
    });
    rechargeRequests.forEach((r) => {
      if (!map.has(r.driverName)) {
        map.set(r.driverName, { name: r.driverName, plate: r.driverPlate });
      }
    });
    return Array.from(map.values());
  }, [units, rechargeRequests]);

  // Filtered Recharge Requests (by status, driver selector, and Lupita search by name or plate)
  const filteredRechargeRequests = useMemo(() => {
    return rechargeRequests.filter((req) => {
      if (rechargeStatusFilter !== 'todas' && req.status !== rechargeStatusFilter) return false;
      if (
        selectedDriverFilter !== 'todos' &&
        req.driverName.toLowerCase() !== selectedDriverFilter.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = req.driverName.toLowerCase().includes(q);
        const matchPlate = req.driverPlate.toLowerCase().includes(q);
        const matchCedula = req.driverNationalId.toLowerCase().includes(q);
        const matchBank = req.bankMethod.toLowerCase().includes(q);
        const matchRef = req.referenceNumber.toLowerCase().includes(q);
        if (!matchName && !matchPlate && !matchCedula && !matchBank && !matchRef) return false;
      }
      return true;
    });
  }, [rechargeRequests, rechargeStatusFilter, selectedDriverFilter, searchQuery]);

  // Filtered Financial Transactions (by Period: Día, Semana, Mes + Conductor + Lupita search by name or plate)
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 3600 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 3600 * 1000;

    return transactions.filter((tx) => {
      const txTime = new Date(tx.createdAt).getTime();

      if (periodFilter === 'dia' && txTime < startOfToday) return false;
      if (periodFilter === 'semana' && txTime < sevenDaysAgo) return false;
      if (periodFilter === 'mes' && txTime < thirtyDaysAgo) return false;

      if (typeFilter !== 'TODOS' && tx.type !== typeFilter) return false;

      if (
        selectedDriverFilter !== 'todos' &&
        !tx.involvedUser.name.toLowerCase().includes(selectedDriverFilter.toLowerCase())
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = tx.involvedUser.name.toLowerCase().includes(q);
        const matchPlate = (tx.involvedUser.plate || '').toLowerCase().includes(q);
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchRef = (tx.referenceNumber || '').toLowerCase().includes(q);
        // Also check if the driver in units matches the plate searched
        const unitMatch = units.find(
          (u) =>
            u.driverName.toLowerCase() === tx.involvedUser.name.toLowerCase() &&
            u.plate.toLowerCase().includes(q)
        );
        if (!matchUser && !matchPlate && !matchDesc && !matchRef && !unitMatch) return false;
      }

      return true;
    });
  }, [transactions, periodFilter, typeFilter, selectedDriverFilter, searchQuery, units]);

  // Filtered Wallets by Lupita search & Driver filter
  const filteredWallets = useMemo(() => {
    return wallets.filter((w) => {
      if (
        selectedDriverFilter !== 'todos' &&
        !w.ownerName.toLowerCase().includes(selectedDriverFilter.toLowerCase())
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = w.ownerName.toLowerCase().includes(q);
        const matchPlate = (w.plate || '').toLowerCase().includes(q);
        const matchCedula = (w.nationalId || '').toLowerCase().includes(q);
        if (!matchName && !matchPlate && !matchCedula) return false;
      }
      return true;
    });
  }, [wallets, selectedDriverFilter, searchQuery]);

  // Real-time Analytical Summary (Ingresos Totales, Egresos/Comisiones, Balance Neto)
  const metrics = useMemo(() => {
    let totalIngresos = 0;
    let totalEgresos = 0;
    let ingresosViajesYEncomiendas = 0;
    let ingresosRecargasAprobadas = 0;
    let egresosLiquidacionesConductores = 0;
    let egresosGastosOperativos = 0;
    let comisionesPlataforma = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.status === 'anulado') return;

      if (tx.type === 'INGRESO') {
        totalIngresos += tx.amount;
        comisionesPlataforma += tx.commissionAmount || 0;

        if (tx.category === 'cobro_viaje' || tx.category === 'cobro_encomienda') {
          ingresosViajesYEncomiendas += tx.amount;
        } else {
          ingresosRecargasAprobadas += tx.amount;
        }
      } else if (tx.type === 'EGRESO') {
        totalEgresos += tx.amount;
        comisionesPlataforma += tx.commissionAmount || 0;

        if (tx.category === 'liquidacion_conductor' || tx.category === 'comision_retenida') {
          egresosLiquidacionesConductores += tx.amount;
        } else {
          egresosGastosOperativos += tx.amount;
        }
      }
    });

    const balanceNeto = totalIngresos - totalEgresos;
    const gananciaLiquidaPlataforma = comisionesPlataforma - egresosGastosOperativos;
    const marginPercent =
      totalIngresos > 0 ? Math.round((balanceNeto / totalIngresos) * 100) : 0;

    return {
      totalIngresos,
      totalEgresos,
      balanceNeto,
      gananciaLiquidaPlataforma,
      ingresosViajesYEncomiendas,
      ingresosRecargasAprobadas,
      egresosLiquidacionesConductores,
      egresosGastosOperativos,
      comisionesPlataforma,
      marginPercent,
    };
  }, [filteredTransactions]);

  // Approve Driver Recharge Request -> Updates Wallet in Firebase + Marks "Aprobada" + Adds to Ingresos
  const handleApproveRecharge = async (req: DriverRechargeRequest) => {
    const res = await firebaseSyncService.approveDriverRechargeInCloud(req.id);
    if (res.success) {
      audioService.playSuccessTone();
      refreshData();
      if (inspectingReceiptReq?.id === req.id && res.request) {
        setInspectingReceiptReq(res.request);
      }
      triggerToast(res.message);
    }
  };

  // Reject Driver Recharge Request
  const handleRejectRecharge = async (req: DriverRechargeRequest) => {
    const res = await firebaseSyncService.rejectDriverRechargeInCloud(
      req.id,
      'Rechazado por administración tras verificación de comprobante bancario'
    );
    if (res.success) {
      audioService.playBeepTone();
      refreshData();
      if (inspectingReceiptReq?.id === req.id && res.request) {
        setInspectingReceiptReq(res.request);
      }
      triggerToast(res.message);
    }
  };

  // Handle uploading custom receipt image when simulating a new recharge request
  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewRecCustomImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit new simulated driver recharge request
  const handleCreateRechargeRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newRecAmount) || 0;
    if (amount <= 0 || !newRecDriverName.trim()) return;

    const created = AdminService.submitDriverRechargeRequest({
      driverName: newRecDriverName.trim(),
      driverNationalId: newRecNationalId.trim() || '0401500000',
      driverPlate: newRecPlate.trim().toUpperCase() || 'PBC-1020',
      bankMethod: newRecBank,
      reportedAmount: amount,
      referenceNumber: newRecReference.trim() || `COMP-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptImageUrl: newRecCustomImage || undefined,
    });

    audioService.playSuccessTone();
    refreshData();
    setShowNewRechargeModal(false);
    setNewRecCustomImage(null);
    setRechargeStatusFilter('pendiente');
    triggerToast(
      `Nueva solicitud de recarga (${created.bankMethod} por $${created.reportedAmount.toFixed(2)} USD) de ${created.driverName} agregada a la Bandeja de Pendientes.`
    );
  };

  // Open Modal to Register Manual Income or Expense
  const handleOpenMovementModal = (type: FinancialMovementType) => {
    setShowNewMovementModal(type);
    const firstDriver = units[0];
    if (type === 'INGRESO') {
      setFormCategory('cobro_encomienda');
      setFormAmount('12.00');
      setFormCommission(((12 * commissionRate) / 100).toFixed(2));
      setFormUserRole('conductor');
      setFormUserName(firstDriver?.driverName || 'Marco Rosero');
      setFormPlate(firstDriver?.plate || 'PBC-4921');
      setFormDescription('Cobro por servicio de encomienda / viaje realizado');
      setFormReference(`MOV-${Math.floor(10000 + Math.random() * 90000)}`);
    } else {
      setFormCategory('liquidacion_conductor');
      setFormAmount('25.00');
      setFormCommission(((25 * commissionRate) / 100).toFixed(2));
      setFormUserRole('conductor');
      setFormUserName(firstDriver?.driverName || 'Marco Rosero');
      setFormPlate(firstDriver?.plate || 'PBC-4921');
      setFormDescription('Pago / Liquidación de servicios a conductor particular');
      setFormReference(`LIQ-${Math.floor(10000 + Math.random() * 90000)}`);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNewMovementModal) return;

    const amountVal = parseFloat(formAmount) || 0;
    if (amountVal <= 0) return;

    const commVal = parseFloat(formCommission) || 0;
    const netEffect = showNewMovementModal === 'INGRESO' ? amountVal : -amountVal;

    const created = await firebaseSyncService.addFinancialTransactionToCloud({
      type: showNewMovementModal,
      category: formCategory,
      amount: amountVal,
      commissionAmount: commVal,
      netPlatformEffect: netEffect,
      paymentMethod: formPaymentMethod,
      description:
        formDescription.trim() ||
        `${CATEGORY_LABELS[formCategory].label} • Conductor: ${formUserName}`,
      referenceNumber: formReference.trim() || `MOV-${Date.now().toString().slice(-5)}`,
      canton: formCanton,
      involvedUser: {
        id: `DRV-${formPlate.replace(/[^A-Z0-9]/gi, '')}`,
        name: formUserName.trim() || 'Conductor Particular',
        plate: formPlate.trim().toUpperCase(),
        role: formUserRole,
      },
      status: 'procesado',
    });

    audioService.playSuccessTone();
    refreshData();
    setShowNewMovementModal(null);
    triggerToast(
      `Movimiento ${created.id} (${created.type}: $${created.amount.toFixed(2)} USD) contabilizado para ${created.involvedUser.name}.`
    );
  };

  // Handle Direct Wallet Recharge or Liquidation
  const handleConfirmWalletAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletForAction) return;

    const amount = parseFloat(walletActionAmount) || 0;
    if (amount <= 0) return;

    const { wallet, mode } = selectedWalletForAction;

    if (mode === 'recarga') {
      const res = AdminService.rechargeUserWallet(
        wallet.id,
        amount,
        walletActionMethod,
        walletActionRef.trim() || undefined
      );
      if (res.transaction) {
        audioService.playSuccessTone();
        refreshData();
        triggerToast(
          `Recarga acreditada: +$${amount.toFixed(2)} USD en la billetera virtual de ${wallet.ownerName}. Saldo actual: $${res.wallet?.balance.toFixed(2)} USD.`
        );
      }
    } else {
      const res = AdminService.liquidateDriverWallet(
        wallet.id,
        amount,
        walletActionMethod,
        walletActionRef.trim() || undefined
      );
      if (res.transaction) {
        audioService.playSuccessTone();
        refreshData();
        triggerToast(
          `Liquidación enviada a ${wallet.ownerName}: $${res.transaction.amount.toFixed(2)} USD netos (Comisión retenida: $${res.transaction.commissionAmount.toFixed(2)} USD).`
        );
      }
    }

    setSelectedWalletForAction(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Transaccion',
      'Fecha Hora',
      'Tipo',
      'Categoria',
      'Monto USD',
      'Comision AndesMovi USD',
      'Metodo o Banco',
      'Nombre Conductor o Usuario',
      'Placa',
      'Referencia Bancaria',
      'Descripcion',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      new Date(t.createdAt).toLocaleString('es-EC'),
      t.type,
      CATEGORY_LABELS[t.category]?.label || t.category,
      t.amount.toFixed(2),
      t.commissionAmount.toFixed(2),
      `"${t.paymentMethod}"`,
      `"${t.involvedUser.name}"`,
      t.involvedUser.plate || 'Particular',
      t.referenceNumber || '',
      `"${t.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finanzas_andesmovi_${periodFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    audioService.playSuccessTone();
    triggerToast(`Reporte financiero CSV (${filteredTransactions.length} movimientos) exportado.`);
  };

  const handleSyncToFirestore = async () => {
    setIsSyncingCloud(true);
    const res = await firebaseSyncService.syncFinancialLedgerToFirestore();
    setIsSyncingCloud(false);
    audioService.playSuccessTone();
    if (res.cloudActive) {
      triggerToast(`¡Sincronización exitosa! ${res.synced} transacciones respaldadas en Firestore.`);
    } else {
      triggerToast(`Datos contables verificados y listos (${res.synced} registros).`);
    }
  };

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(key);
    setTimeout(() => setCopiedBlock(null), 2500);
  };

  const pendingRechargesCount = rechargeRequests.filter((r) => r.status === 'pendiente').length;
  const totalWalletsBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  // Helper to get driver's plate from units if not explicitly on the transaction
  const getDriverPlate = (driverName: string, existingPlate?: string): string => {
    if (existingPlate) return existingPlate;
    const found = units.find((u) => u.driverName.toLowerCase() === driverName.toLowerCase());
    return found ? found.plate : '';
  };

  return (
    <div className="space-y-4">
      {/* Top Notification Toast */}
      {toastBanner && (
        <div className="bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastBanner}</span>
          </div>
          <button
            onClick={() => setToastBanner(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Main Actions Bar */}
      <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white">
                Gestión de Recargas de Conductores y Flujo Financiero • Andes Movi
              </h2>
              {pendingRechargesCount > 0 && (
                <span className="bg-amber-400 text-zinc-950 font-black text-[10px] px-2.5 py-0.5 rounded-full animate-pulse">
                  {pendingRechargesCount} Recargas Pendientes de Aprobar
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Validación de comprobantes bancarios (Pichincha, Deuna!, Guayaquil, Produbanco, Austro), acreditación automática a billetera virtual y balance neto.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de vaciar el caché y restablecer los datos por defecto?')) {
                AdminService.clearAllCacheAndReset();
                refreshData();
                triggerToast('¡Caché limpiada y datos restablecidos correctamente!');
              }
            }}
            className="bg-zinc-800 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-zinc-700 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="Vaciar caché local y reiniciar registros"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            Limpiar Caché y Reiniciar
          </button>

          <button
            onClick={() => setShowNewRechargeModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/25 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            + Subir Solicitud de Recarga
          </button>

          <button
            onClick={() => handleOpenMovementModal('INGRESO')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            + Registrar Ingreso
          </button>

          <button
            onClick={() => handleOpenMovementModal('EGRESO')}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-600/25 transition cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            - Registrar Egreso / Liquidación
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* GLOBAL SEARCH (LUPITA POR NOMBRE O PLACA) + FILTROS FECHA Y CONDUCTOR */}
      {/* ==================================================================== */}
      <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* LUPITA: Buscar por Nombre del Conductor o Número de Placa */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre del conductor o número de placa (ej. Marco Rosero, PBC-4921)..."
            className="w-full bg-[#18191e] border border-zinc-700 focus:border-emerald-500 rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selector por Conductor Particular */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#18191e] border border-zinc-700 rounded-xl px-3 py-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-zinc-400 font-semibold">Conductor:</span>
            <select
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="todos" className="bg-[#18191e]">
                Todos los Conductores
              </option>
              {driverOptions.map((d) => (
                <option key={d.name} value={d.name} className="bg-[#18191e]">
                  {d.name} ({d.plate})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Fecha: Día, Semana, Mes, Todos */}
          <div className="flex items-center gap-1 bg-[#18191e] p-1 rounded-xl border border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-400 px-2 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              FECHA:
            </span>
            {(
              [
                { id: 'dia', label: 'Día (Hoy)' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mes' },
                { id: 'todos', label: 'Histórico' },
              ] as { id: PeriodFilter; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  periodFilter === p.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RESUMEN ANALÍTICO DEL FLUJO DE CAJA (INGRESOS, EGRESOS, BALANCE NETO) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ingresos Totales */}
        <div className="bg-[#121316] border border-emerald-900/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              Ingresos Totales
            </span>
            <span className="text-[10px] font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md">
              + Recaudación
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            +${metrics.totalIngresos.toFixed(2)} <span className="text-xs text-zinc-400">USD</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-zinc-500 block">Viajes/Encomiendas:</span>
              <span className="text-emerald-300 font-bold">${metrics.ingresosViajesYEncomiendas.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Recargas Aprobadas:</span>
              <span className="text-blue-300 font-bold">${metrics.ingresosRecargasAprobadas.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Egresos / Comisiones y Liquidaciones */}
        <div className="bg-[#121316] border border-rose-900/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4" />
              Egresos / Liquidaciones
            </span>
            <span className="text-[10px] font-mono bg-rose-950/90 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-md">
              - Salidas
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            -${metrics.totalEgresos.toFixed(2)} <span className="text-xs text-zinc-400">USD</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-zinc-500 block">Pagos a Conductores:</span>
              <span className="text-amber-300 font-bold">${metrics.egresosLiquidacionesConductores.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Gastos Operativos:</span>
              <span className="text-rose-300 font-bold">${metrics.egresosGastosOperativos.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Balance Neto (Ganancia Líquida) */}
        <div className="bg-gradient-to-br from-[#121820] to-[#121316] border border-blue-800/70 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4" />
              Balance Neto (Flujo Líquido)
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                metrics.balanceNeto >= 0
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border-rose-700'
              }`}
            >
              {metrics.marginPercent}% Rentabilidad
            </span>
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              metrics.balanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.balanceNeto >= 0 ? '+' : ''}${metrics.balanceNeto.toFixed(2)}{' '}
            <span className="text-xs text-zinc-400">USD</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-400">Utilidad Neta Comisiones:</span>
            <span className="text-amber-300 font-bold">${metrics.gananciaLiquidaPlataforma.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Card 4: Billeteras Virtuales & Recargas Pendientes */}
        <div className="bg-gradient-to-br from-amber-950/25 to-[#121316] border border-amber-700/60 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              Billeteras de Conductores
            </span>
            <span className="text-[10px] font-mono bg-amber-950/90 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-md">
              {pendingRechargesCount} Pendientes
            </span>
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono mt-2">
            ${totalWalletsBalance.toFixed(2)} <span className="text-xs text-zinc-400">USD</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-400">Saldo total acreditado</span>
            <span className="text-emerald-400 font-bold">Comisión {commissionRate}%</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#121316] p-2.5 rounded-2xl border border-zinc-800">
        <button
          onClick={() => setActiveSubTab('recargas_pendientes')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'recargas_pendientes'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bandeja de Aprobación de Recargas</span>
          {pendingRechargesCount > 0 && (
            <span className="bg-amber-400 text-zinc-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
              {pendingRechargesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('libro_caja')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'libro_caja'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Control Financiero (Ingresos y Egresos) ({filteredTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('billeteras_recargas')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'billeteras_recargas'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Billeteras Virtuales de Conductores ({filteredWallets.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('arquitectura_firebase')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'arquitectura_firebase'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Estructura Firebase & Consultas</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* SUB-TAB 1: BANDEJA DE PENDIENTES (APROBACIÓN DE RECARGAS BANCARIAS)  */}
      {/* ==================================================================== */}
      {activeSubTab === 'recargas_pendientes' && (
        <div className="space-y-4">
          {/* Status Filter Bar for Recharges */}
          <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-white uppercase tracking-wider mr-1">
                Estado de Solicitudes:
              </span>
              {(
                [
                  {
                    id: 'pendiente',
                    label: `Pendientes (${rechargeRequests.filter((r) => r.status === 'pendiente').length})`,
                  },
                  {
                    id: 'aprobada',
                    label: `Aprobadas (${rechargeRequests.filter((r) => r.status === 'aprobada').length})`,
                  },
                  {
                    id: 'rechazada',
                    label: `Rechazadas (${rechargeRequests.filter((r) => r.status === 'rechazada').length})`,
                  },
                  { id: 'todas', label: `Todas (${rechargeRequests.length})` },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  onClick={() => setRechargeStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    rechargeStatusFilter === st.id
                      ? st.id === 'pendiente'
                        ? 'bg-amber-500 text-zinc-950 shadow'
                        : st.id === 'aprobada'
                        ? 'bg-emerald-600 text-white shadow'
                        : st.id === 'rechazada'
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-blue-600 text-white shadow'
                      : 'bg-[#18191e] text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-zinc-400 font-mono">
              Bancos habilitados: Banco del Austro • Produbanco • Banco Guayaquil • Banco Pichincha • Deuna!
            </div>
          </div>

          {/* Cards Grid of Driver Recharge Requests */}
          {filteredRechargeRequests.length === 0 ? (
            <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">
                No hay solicitudes de recarga en este filtro
              </div>
              <p className="text-xs text-zinc-400">
                Puedes cambiar el filtro de estado o hacer clic en "+ Subir Solicitud de Recarga" para registrar un nuevo comprobante.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRechargeRequests.map((req) => {
                const isPending = req.status === 'pendiente';
                const isApproved = req.status === 'aprobada';
                const bankBadge =
                  BANK_BADGE_STYLES[req.bankMethod] ||
                  'bg-zinc-800 text-zinc-200 border-zinc-700';

                // Check current driver wallet balance
                const driverWallet = wallets.find(
                  (w) =>
                    w.ownerName.toLowerCase() === req.driverName.toLowerCase() ||
                    (w.plate && w.plate.toUpperCase() === req.driverPlate.toUpperCase())
                );

                return (
                  <div
                    key={req.id}
                    className={`bg-[#121316] rounded-2xl border p-4 shadow-xl flex flex-col justify-between transition ${
                      isPending
                        ? 'border-amber-600/60 hover:border-amber-500'
                        : isApproved
                        ? 'border-emerald-700/60'
                        : 'border-rose-800/60 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Top Header: Driver Name, National ID & Plate */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white">{req.driverName}</span>
                            <span className="bg-yellow-400 text-zinc-950 font-mono font-black text-[10px] px-2 py-0.5 rounded-md">
                              {req.driverPlate}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            Cédula / ID: <span className="text-zinc-200 font-bold">{req.driverNationalId}</span>
                          </div>
                          {driverWallet && (
                            <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                              Saldo actual en billetera: <strong>${driverWallet.balance.toFixed(2)} USD</strong>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase border ${
                              isPending
                                ? 'bg-amber-950 text-amber-300 border-amber-600'
                                : isApproved
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                : 'bg-rose-950 text-rose-300 border-rose-600'
                            }`}
                          >
                            {req.status}
                          </span>
                          <button
                            onClick={() => {
                              AdminService.deleteDriverRechargeRequest(req.id);
                              refreshData();
                              triggerToast(`Solicitud de recarga ${req.id} eliminada.`);
                            }}
                            title="Eliminar solicitud"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bank Method & Reported Amount */}
                      <div className="mt-3 flex items-center justify-between gap-2 bg-[#18191f] p-3 rounded-xl border border-zinc-800">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-mono block uppercase">
                            Método / Banco Seleccionado
                          </span>
                          <span
                            className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${bankBadge}`}
                          >
                            🏦 {req.bankMethod}
                          </span>
                          <div className="text-[10px] font-mono text-zinc-400 mt-1">
                            Comprobante: <span className="text-zinc-200">#{req.referenceNumber}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 font-mono block uppercase">
                            Monto Reportado
                          </span>
                          <span className="text-2xl font-black font-mono text-emerald-400">
                            ${req.reportedAmount.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono block">USD</span>
                        </div>
                      </div>

                      {/* Transfer Receipt Image Preview */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1.5">
                          <span>CAPTURA DE TRANSFERENCIA SUBIDA:</span>
                          <button
                            onClick={() => setInspectingReceiptReq(req)}
                            className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ampliar Comprobante
                          </button>
                        </div>

                        <div
                          onClick={() => setInspectingReceiptReq(req)}
                          className="relative h-44 w-full rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 cursor-pointer group"
                        >
                          <img
                            src={req.receiptImageUrl}
                            alt={`Comprobante ${req.referenceNumber}`}
                            className="w-full h-full object-contain bg-slate-900 group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <span className="bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-600 flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-emerald-400" />
                              Inspeccionar Captura
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Aprobar o Rechazar */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80">
                      {isPending ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => handleApproveRecharge(req)}
                            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Aprobar (+${req.reportedAmount.toFixed(2)})
                          </button>

                          <button
                            onClick={() => handleRejectRecharge(req)}
                            className="py-2.5 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/80 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 text-rose-400" />
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span>
                            {isApproved
                              ? '✓ Saldo acreditado en billetera Firebase'
                              : '✕ Solicitud rechazada por administración'}
                          </span>
                          <span>
                            {req.reviewedAt
                              ? new Date(req.reviewedAt).toLocaleTimeString('es-EC', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 2: CONTROL FINANCIERO (LIBRO DE INGRESOS Y EGRESOS)          */}
      {/* ==================================================================== */}
      {activeSubTab === 'libro_caja' && (
        <div className="space-y-4">
          {/* Proportion Bar */}
          <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                Flujo de Caja Analítico ({periodFilter.toUpperCase()})
                {selectedDriverFilter !== 'todos' && (
                  <span className="text-blue-400 font-mono">• Conductor: {selectedDriverFilter}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {(['TODOS', 'INGRESO', 'EGRESO'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      typeFilter === t
                        ? t === 'INGRESO'
                          ? 'bg-emerald-600 text-white'
                          : t === 'EGRESO'
                          ? 'bg-rose-600 text-white'
                          : 'bg-zinc-700 text-white'
                        : 'bg-[#18191e] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t === 'TODOS' ? 'Todos' : t === 'INGRESO' ? 'Solo Ingresos (+)' : 'Solo Egresos (-)'}
                  </button>
                ))}
              </div>
            </div>

            {metrics.totalIngresos + metrics.totalEgresos > 0 ? (
              <div className="w-full h-3.5 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
                <div
                  style={{
                    width: `${Math.round(
                      (metrics.totalIngresos / (metrics.totalIngresos + metrics.totalEgresos)) * 100
                    )}%`,
                  }}
                  className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full transition-all duration-500"
                />
                <div
                  style={{
                    width: `${Math.round(
                      (metrics.totalEgresos / (metrics.totalIngresos + metrics.totalEgresos)) * 100
                    )}%`,
                  }}
                  className="bg-gradient-to-r from-rose-600 to-amber-500 h-full transition-all duration-500"
                />
              </div>
            ) : (
              <div className="w-full h-3 bg-zinc-800 rounded-full" />
            )}
          </div>

          {/* Financial Ledger Table (Showing ONLY Driver Name and Plate, no taxi units) */}
          <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Historial de Ingresos, Recargas Aprobadas y Liquidaciones ({filteredTransactions.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-zinc-400 border-b border-zinc-800 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-2">Código / Fecha</th>
                    <th className="py-2.5 px-2">Movimiento</th>
                    <th className="py-2.5 px-2">Categoría</th>
                    <th className="py-2.5 px-2">Conductor / Usuario</th>
                    <th className="py-2.5 px-2">Banco / Método</th>
                    <th className="py-2.5 px-2">Concepto</th>
                    <th className="py-2.5 px-2 text-right">Monto</th>
                    <th className="py-2.5 px-2 text-right">Comisión</th>
                    <th className="py-2.5 px-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-zinc-500">
                        No se encontraron movimientos para el filtro actual.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const catMeta = CATEGORY_LABELS[tx.category] || {
                        label: tx.category,
                        badgeColor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                      };
                      const isIngreso = tx.type === 'INGRESO';
                      const plate = getDriverPlate(tx.involvedUser.name, tx.involvedUser.plate);

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-800/35 transition">
                          <td className="py-3 px-2 font-mono">
                            <div className="font-bold text-white text-[11px]">{tx.id}</div>
                            <div className="text-[10px] text-zinc-400">
                              {new Date(tx.createdAt).toLocaleString('es-EC', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-black border ${
                                isIngreso
                                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                                  : 'bg-rose-950/90 text-rose-300 border-rose-700'
                              }`}
                            >
                              {isIngreso ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownLeft className="w-3 h-3" />
                              )}
                              {tx.type}
                            </span>
                          </td>

                          <td className="py-3 px-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${catMeta.badgeColor}`}
                            >
                              {catMeta.label}
                            </span>
                          </td>

                          <td className="py-3 px-2">
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{tx.involvedUser.name}</span>
                              {plate && (
                                <span className="bg-zinc-800 text-yellow-300 border border-zinc-700 px-1.5 py-0.2 rounded font-mono text-[10px]">
                                  {plate}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {tx.involvedUser.role === 'conductor' ? 'Conductor Particular' : tx.involvedUser.role}
                            </div>
                          </td>

                          <td className="py-3 px-2 font-mono text-[11px] text-zinc-200">
                            {tx.paymentMethod}
                          </td>

                          <td className="py-3 px-2 max-w-[250px]">
                            <div className="text-zinc-200 leading-snug">{tx.description}</div>
                            {tx.referenceNumber && (
                              <span className="inline-block mt-0.5 text-[10px] font-mono text-blue-400">
                                Comprobante: #{tx.referenceNumber}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-right font-mono">
                            <span
                              className={`text-sm font-black ${
                                isIngreso ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isIngreso ? '+' : '-'}${tx.amount.toFixed(2)}
                            </span>
                          </td>

                          <td className="py-3 px-2 text-right font-mono">
                            {tx.commissionAmount > 0 ? (
                              <span className="text-amber-300 font-bold text-xs">
                                ${tx.commissionAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedReceiptTx(tx)}
                                title="Ver Comprobante"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-400 border border-zinc-700 transition cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  AdminService.deleteFinancialTransaction(tx.id);
                                  refreshData();
                                  triggerToast(`Movimiento ${tx.id} eliminado.`);
                                }}
                                title="Eliminar registro"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 3: BILLETERAS VIRTUALES DE CONDUCTORES                       */}
      {/* ==================================================================== */}
      {activeSubTab === 'billeteras_recargas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWallets.map((w) => {
              const isDriver = w.ownerRole === 'conductor';
              const isLow = w.balance < 5;

              return (
                <div
                  key={w.id}
                  className={`bg-[#121316] rounded-2xl p-4 border shadow-xl flex flex-col justify-between transition ${
                    isLow ? 'border-amber-700/80' : 'border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                            isDriver
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-purple-950 text-purple-300 border-purple-800'
                          }`}
                        >
                          {isDriver ? 'CONDUCTOR PARTICULAR' : 'CLIENTE CORPORATIVO'}
                        </span>
                        <h4 className="text-sm font-black text-white mt-1.5">{w.ownerName}</h4>
                        {w.plate && (
                          <div className="text-[11px] font-mono text-yellow-300 font-bold mt-0.5">
                            Placa: {w.plate}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono text-zinc-400 block">SALDO VIRTUAL</span>
                        <span
                          className={`text-xl font-black font-mono ${
                            isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          ${w.balance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-zinc-800/80 grid grid-cols-3 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-zinc-500 block">Recargado:</span>
                        <span className="text-emerald-300 font-bold">${w.totalRecharged.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Comisión App:</span>
                        <span className="text-amber-300 font-bold">${w.totalCommissionDeducted.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Liquidado:</span>
                        <span className="text-blue-300 font-bold">${w.totalLiquidated.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedWalletForAction({ wallet: w, mode: 'recarga' });
                        setWalletActionAmount('20.00');
                        setWalletActionRef(`REC-${Math.floor(1000 + Math.random() * 9000)}`);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Recargar Saldo
                    </button>

                    {isDriver && (
                      <button
                        onClick={() => {
                          setSelectedWalletForAction({ wallet: w, mode: 'liquidacion' });
                          setWalletActionAmount(Math.max(10, w.balance).toFixed(2));
                          setWalletActionRef(`LIQ-${Math.floor(1000 + Math.random() * 9000)}`);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Liquidar Conductor
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar directamente la billetera de ${w.ownerName}?`)) {
                          AdminService.deleteWallet(w.id);
                          refreshData();
                          triggerToast(`Billetera de ${w.ownerName} eliminada.`);
                        }
                      }}
                      title="Eliminar Billetera"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 4: ESTRUCTURA EN FIREBASE & CONSULTAS                        */}
      {/* ==================================================================== */}
      {activeSubTab === 'arquitectura_firebase' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-950/40 via-[#121316] to-emerald-950/30 border border-amber-700/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                Colecciones Firestore: Solicitudes de Recarga, Billeteras y Transacciones Financieras
              </h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                Al aprobar una solicitud en la bandeja, se ejecuta una transacción atómica que actualiza el saldo del conductor y registra el ingreso.
              </p>
            </div>
            <button
              onClick={handleSyncToFirestore}
              disabled={isSyncingCloud}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Sincronizando...' : 'Sincronizar con Cloud Firestore'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <span className="text-xs font-black text-emerald-400 font-mono flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  1. Colección: /solicitudes_recarga/{'{solicitudId}'}
                </span>
                <button
                  onClick={() =>
                    copyCode(
                      'col_rec',
                      `{\n  "id": "REC-SOL-101",\n  "driverName": "Marco Rosero",\n  "driverNationalId": "0401589210",\n  "driverPlate": "PBC-4921",\n  "bankMethod": "Deuna! / Banco Pichincha",\n  "reportedAmount": 25.00,\n  "referenceNumber": "DEUNA-8849201",\n  "receiptImageUrl": "https://storage.googleapis.com/...",\n  "status": "aprobada",\n  "submittedAt": "2026-10-17T16:30:00Z"\n}`
                    )
                  }
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedBlock === 'col_rec' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBlock === 'col_rec' ? 'Copiado' : 'Copiar JSON'}
                </button>
              </div>
              <pre className="mt-3 p-3 rounded-xl bg-[#090a0d] border border-zinc-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`{
  "id": "REC-SOL-101",
  "driverName": "Marco Rosero",
  "driverNationalId": "0401589210",
  "driverPlate": "PBC-4921",
  "bankMethod": "Deuna! / Banco Pichincha",
  "reportedAmount": 25.00,
  "referenceNumber": "DEUNA-8849201",
  "receiptImageUrl": "https://...",
  "status": "aprobada", // "pendiente" | "aprobada" | "rechazada"
  "submittedAt": "2026-10-17T16:30:00Z",
  "reviewedAt": "2026-10-17T16:35:00Z"
}`}
              </pre>
            </div>

            <div className="bg-[#121316] border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <span className="text-xs font-black text-blue-400 font-mono flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  2. Transacción Atómica de Aprobación en Firestore
                </span>
              </div>
              <pre className="mt-3 p-3 rounded-xl bg-[#090a0d] border border-zinc-800 text-[11px] font-mono text-blue-300 overflow-x-auto leading-relaxed">
{`import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';

export async function aprobarRecargaConductor(db, solicitud) {
  const solRef = doc(db, 'solicitudes_recarga', solicitud.id);
  const walletRef = doc(db, 'billeteras', \`WAL-\${solicitud.driverPlate}\`);
  const txRef = doc(collection(db, 'transacciones_financieras'));

  await runTransaction(db, async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    const saldoActual = walletSnap.exists() ? walletSnap.data().balance : 0;

    transaction.update(solRef, { status: 'aprobada', reviewedAt: serverTimestamp() });
    transaction.set(walletRef, {
      ownerName: solicitud.driverName,
      nationalId: solicitud.driverNationalId,
      plate: solicitud.driverPlate,
      balance: saldoActual + solicitud.reportedAmount,
    }, { merge: true });
    transaction.set(txRef, {
      type: 'INGRESO',
      category: 'recarga_conductor',
      amount: solicitud.reportedAmount,
      paymentMethod: solicitud.bankMethod,
      involvedUser: { name: solicitud.driverName, plate: solicitud.driverPlate }
    });
  });
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: VISOR DE CAPTURA DE COMPROBANTE BANCARIO EN ALTA RESOLUCIÓN   */}
      {/* ==================================================================== */}
      {inspectingReceiptReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-700 rounded-3xl p-5 w-full max-w-lg shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Comprobante de Recarga • {inspectingReceiptReq.driverName}
                </h3>
                <p className="text-[11px] font-mono text-zinc-400">
                  Cédula: {inspectingReceiptReq.driverNationalId} • Placa: {inspectingReceiptReq.driverPlate} • {inspectingReceiptReq.bankMethod}
                </p>
              </div>
              <button
                onClick={() => setInspectingReceiptReq(null)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 bg-slate-900 rounded-2xl p-3 border border-zinc-800 flex items-center justify-center max-h-[420px] overflow-hidden">
              <img
                src={inspectingReceiptReq.receiptImageUrl}
                alt="Captura de Transferencia"
                className="max-h-[390px] w-auto object-contain rounded-xl"
              />
            </div>

            {inspectingReceiptReq.status === 'pendiente' ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleApproveRecharge(inspectingReceiptReq)}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Aprobar y Acreditar +${inspectingReceiptReq.reportedAmount.toFixed(2)}
                </button>
                <button
                  onClick={() => handleRejectRecharge(inspectingReceiptReq)}
                  className="py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar Solicitud
                </button>
              </div>
            ) : (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setInspectingReceiptReq(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer"
                >
                  Cerrar Visor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SUBIR / SIMULAR NUEVA SOLICITUD DE RECARGA DE CONDUCTOR       */}
      {/* ==================================================================== */}
      {showNewRechargeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                Registrar Solicitud de Recarga de Conductor
              </h3>
              <button
                onClick={() => setShowNewRechargeModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRechargeRequest} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Seleccionar Conductor Particular</label>
                <select
                  value={newRecDriverName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewRecDriverName(name);
                    const found = units.find((u) => u.driverName === name);
                    if (found) setNewRecPlate(found.plate);
                  }}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.driverName}>
                      {u.driverName} — Placa: {u.plate}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Cédula / Identificación</label>
                  <input
                    type="text"
                    required
                    value={newRecNationalId}
                    onChange={(e) => setNewRecNationalId(e.target.value)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Número de Placa</label>
                  <input
                    type="text"
                    required
                    value={newRecPlate}
                    onChange={(e) => setNewRecPlate(e.target.value)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Banco o Método Seleccionado</label>
                <select
                  value={newRecBank}
                  onChange={(e) => setNewRecBank(e.target.value as SupportedRechargeBank)}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-bold focus:outline-none"
                >
                  {BANK_METHODS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Monto Reportado ($ USD)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    required
                    value={newRecAmount}
                    onChange={(e) => setNewRecAmount(e.target.value)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-emerald-400 font-mono font-black text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">N° Comprobante</label>
                  <input
                    type="text"
                    required
                    value={newRecReference}
                    onChange={(e) => setNewRecReference(e.target.value)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">
                  Subir Captura de Transferencia (Opcional — o se genera automática)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptImageUpload}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-[#18191e] border border-zinc-700 rounded-xl p-1.5"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                Enviar a Bandeja de Pendientes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: REGISTRAR INGRESO O EGRESO MANUAL                             */}
      {/* ==================================================================== */}
      {showNewMovementModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-extrabold text-sm text-white">
                {showNewMovementModal === 'INGRESO'
                  ? 'Registrar Nuevo Ingreso (+)'
                  : 'Registrar Nuevo Egreso / Liquidación (-)'}
              </h3>
              <button
                onClick={() => setShowNewMovementModal(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as FinancialCategory)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    {showNewMovementModal === 'INGRESO' ? (
                      <>
                        <option value="cobro_viaje">Cobro por Servicio de Viaje</option>
                        <option value="cobro_encomienda">Cobro por Servicio de Encomienda</option>
                        <option value="recarga_conductor">Recarga Aprobada de Conductor</option>
                        <option value="recarga_cliente">Recarga de Cliente</option>
                      </>
                    ) : (
                      <>
                        <option value="liquidacion_conductor">Liquidación / Pago a Conductor</option>
                        <option value="comision_retenida">Comisión Retenida</option>
                        <option value="gasto_operativo">Gasto Operativo</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Banco / Método de Pago</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) =>
                      setFormPaymentMethod(e.target.value as FinancialTransaction['paymentMethod'])
                    }
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="Deuna! / Banco Pichincha">Deuna! / Banco Pichincha</option>
                    <option value="Banco Pichincha">Banco Pichincha</option>
                    <option value="Banco Guayaquil">Banco Guayaquil</option>
                    <option value="Produbanco">Produbanco</option>
                    <option value="Banco del Austro">Banco del Austro</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Nombre del Conductor</label>
                  <select
                    value={formUserName}
                    onChange={(e) => {
                      setFormUserName(e.target.value);
                      const found = units.find((u) => u.driverName === e.target.value);
                      if (found) setFormPlate(found.plate);
                    }}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.driverName}>
                        {u.driverName} ({u.plate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Placa del Vehículo</label>
                  <input
                    type="text"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Monto ($ USD)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    required
                    value={formAmount}
                    onChange={(e) => {
                      setFormAmount(e.target.value);
                      const val = parseFloat(e.target.value) || 0;
                      setFormCommission(((val * commissionRate) / 100).toFixed(2));
                    }}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Comisión Andes Movi ($ USD)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formCommission}
                    onChange={(e) => setFormCommission(e.target.value)}
                    className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-amber-300 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Descripción / Concepto</label>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className={`w-full mt-2 py-3 rounded-xl font-bold text-xs text-white cursor-pointer ${
                  showNewMovementModal === 'INGRESO'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Guardar Movimiento Financiero
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: RECARGA O LIQUIDACIÓN DIRECTA DE BILLETERA                    */}
      {/* ==================================================================== */}
      {selectedWalletForAction && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-extrabold text-sm text-white">
                {selectedWalletForAction.mode === 'recarga'
                  ? `Recargar Billetera: ${selectedWalletForAction.wallet.ownerName}`
                  : `Liquidar Conductor: ${selectedWalletForAction.wallet.ownerName}`}
              </h3>
              <button
                onClick={() => setSelectedWalletForAction(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmWalletAction} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Monto ($ USD)</label>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  required
                  value={walletActionAmount}
                  onChange={(e) => setWalletActionAmount(e.target.value)}
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white font-mono text-sm font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Banco Seleccionado</label>
                <select
                  value={walletActionMethod}
                  onChange={(e) =>
                    setWalletActionMethod(e.target.value as FinancialTransaction['paymentMethod'])
                  }
                  className="w-full bg-[#18191e] border border-zinc-700 rounded-xl p-2.5 text-white focus:outline-none"
                >
                  <option value="Deuna! / Banco Pichincha">Deuna! / Banco Pichincha</option>
                  <option value="Banco Pichincha">Banco Pichincha</option>
                  <option value="Banco Guayaquil">Banco Guayaquil</option>
                  <option value="Produbanco">Produbanco</option>
                  <option value="Banco del Austro">Banco del Austro</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                Confirmar Operación
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: COMPROBANTE CONTABLE                                          */}
      {/* ==================================================================== */}
      {selectedReceiptTx && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121316] border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-black text-sm text-white">Comprobante {selectedReceiptTx.id}</h3>
              <button
                onClick={() => setSelectedReceiptTx(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-2 text-xs font-mono bg-[#090a0d] p-4 rounded-2xl border border-zinc-800">
              <div className="flex justify-between">
                <span className="text-zinc-500">CONDUCTOR:</span>
                <span className="text-white font-bold">{selectedReceiptTx.involvedUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">BANCO / MÉTODO:</span>
                <span className="text-blue-300">{selectedReceiptTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">MONTO:</span>
                <span className="text-emerald-400 font-black">${selectedReceiptTx.amount.toFixed(2)} USD</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 text-zinc-300 font-sans">
                {selectedReceiptTx.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
