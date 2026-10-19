export type UnitStatus = 'disponible' | 'en_carrera' | 'en_camino' | 'offline' | 'sos' | 'deshabilitado';

export interface FleetUnit {
  id: string; // e.g. AM-012
  driverName: string;
  vehicle: string;
  plate: string;
  status: UnitStatus;
  canton: string;
  rating: number;
  completedTrips: number;
  unitNumber?: number; // Sequential vehicle number (1 to infinity)
  // Extended fields for real-time dispatch & monitoring
  phone?: string;
  lat?: number;
  lng?: number;
  batteryLevel?: number;
  cooperative?: string;
  currentPassenger?: string;
  currentOrigin?: string;
  currentDestination?: string;
  lastUpdated?: string;
  driverPhoto?: string;
  vehiclePhoto?: string;
  licenseType?: string;
  antPoints?: number;
  vehicleYear?: number;
  soatStatus?: string;
  speedKmh?: number;
  assignedParcelId?: string;
  features?: string[]; // e.g. ["Aire Acondicionado", "Wifi", "Maletero Amplio", "Asientos Cuero"]
}

export interface AssignedUnit {
  unitId: string;
  driverName: string;
  driverPhone?: string;
  plate: string;
  vehicle: string;
  vehiclePhoto?: string;
  driverPhoto?: string;
}

export interface ExecutivePassenger {
  id: string;
  name: string;
  phone: string;
  seats: number;
  pickupLocation: string;
  pickupReference?: string;
  dropoffLocation?: string;
  notes?: string;
  fare: number;
  paymentStatus?: 'pendiente' | 'pagado' | 'cobrar_efectivo';
  pickupStatus?: 'pendiente' | 'en_camino' | 'a_bordo' | 'ausente';
  bookedAt: string;
}

export interface ExecutiveSchedule {
  id: string;
  route: string; // e.g. "Tulcan-Quito" or "Coca-Quito"
  originCity?: string; // e.g. "Tulcán"
  destinationCity?: string; // e.g. "Quito"
  departureTime: string; // e.g. "03:00 AM"
  departureDate: string; // e.g. "2026-10-20"
  returnTime?: string; // e.g. "02:00 PM"
  returnDate?: string; // e.g. "2026-10-20"
  assignedUnits?: AssignedUnit[];
  price: number;
  availableSeats: number;
  totalSeats: number;
  status: 'programado' | 'despachado' | 'en_curso' | 'completado' | 'cancelado';
  notes?: string;
  passengerIds?: string[]; // List of passenger trip IDs in this frequency
  passengersList?: ExecutivePassenger[];
  dispatchedAt?: string;
  shiftBlock?: 'bloque_1' | 'bloque_2' | 'personalizado';
  tripType?: 'ida' | 'retorno';
}

export type VerificationStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'observado';

export interface DriverVerificationRequest {
  id: string;
  name: string;
  canton: string;
  licenseType: string;
  vehicle: string;
  plate: string;
  soatExpiry: string;
  phone: string;
  // Extended verification documents
  status?: VerificationStatus;
  submittedAt?: string;
  nationalId?: string; // Cédula ecuatoriana
  criminalRecordStatus?: 'Limpio / Sin antecedentes' | 'En revisión' | 'Observado';
  antPoints?: number; // Puntos de licencia ANT (máx 30)
  vehicleYear?: number;
  reviewNotes?: string;
}

export interface CantonTariff {
  canton: string;
  baseFare: number;
  perKmRate: number;
  nightSurcharge: number;
  // Additional Ecuador-specific params
  minFare?: number;
  waitMinuteRate?: number;
  airportSurcharge?: number;
  commissionPercentage?: number;
}

export interface DispatchServiceRequest {
  id: string;
  clientName: string;
  clientPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  canton: string;
  requestedAt: string;
  estimatedKm: number;
  estimatedFare: number;
  status: 'esperando_unidad' | 'asignado' | 'en_curso' | 'completado' | 'cancelado';
  assignedUnitId?: string;
  assignedDriver?: string;
  notes?: string;
  channel?: string;
}

export interface EmergencyAlert {
  id: string;
  unitId: string;
  driverName: string;
  vehicle: string;
  plate: string;
  canton: string;
  timestamp: string;
  locationDescription: string;
  lat: number;
  lng: number;
  resolved: boolean;
  notes?: string;
  escalatedTo911: boolean;
}

export interface RadioTransmission {
  id: string;
  timestamp: string;
  channel: string;
  unitId: string;
  sender: 'CENTRAL' | 'UNIDAD';
  message: string;
  audioSimulated?: boolean;
}

// Modelo de Viaje exacto compatible con Dart TripModel y Firestore 'viajes'
export type TripStatus =
  | 'buscando'
  | 'contraofertado'
  | 'aceptado'
  | 'en_camino'
  | 'finalizado'
  | 'cancelado';

export interface TripModel {
  id: string;
  passengerName: string;
  passengerPhone: string;
  passengerRating: number;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  offeredFare: number; // Pasos de ±$0.25
  paymentMethod: 'Efectivo' | 'Transferencia';
  status: TripStatus;
  driverId?: string | null;
  driverName?: string | null;
  driverUnit?: string | null;
  driverPlate?: string | null;
  counterOfferPrice?: number | null;
  createdAt?: any;
  notes?: string;
  serviceType?: 'carrera' | 'encomienda' | 'ejecutivo';
  scheduleId?: string; // Link to a fixed frequency schedule
}

// Modelo para Encomiendas y Paquetería
export type ParcelStatus =
  | 'recibido'
  | 'asignado'
  | 'en_transito'
  | 'entregado'
  | 'cancelado';

export interface AlliedOffice {
  id: string; // e.g. OFI-TUL-01
  name: string; // e.g. Oficina Central Matriz Tulcán
  shortName: string; // e.g. Tulcán Matriz
  canton: string; // Tulcán
  address: string; // Calle Sucre y Bolívar #14-20
  lat: number;
  lng: number;
  phone: string;
  agentName: string; // Encargado de recepción
  status: 'activa' | 'mantenimiento';
  hours: string;
  packagesReceived: number;
}

export interface ParcelModel {
  id: string;
  guideNumber?: string; // Guía de Encomienda oficial e.g. GUIA-ANDES-001
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageDescription: string;
  packageWeight?: string;
  fare: number;
  paymentMethod: 'Efectivo' | 'Transferencia';
  status: ParcelStatus;
  assignedUnitId?: string | null;
  assignedDriver?: string | null;
  createdAt: string;
  deliveredAt?: string;
  // Campos de Oficinas Aliadas y Descarga Automática
  originOfficeId?: string;
  originOfficeName?: string;
  destinationOfficeId?: string;
  destinationOfficeName?: string;
  dropOffOfficeId?: string;
  dropOffOfficeName?: string;
  dropOffTimestamp?: string;
  autoDeliveredByOffice?: boolean;
  receivedByAgent?: string;
  securityPin?: string;
}

export interface FirebaseConfigModel {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface PlatformSettings {
  commissionRate: number; // Porcentaje de comisión ej. 10%
  enableSound: boolean;
  autoDispatch: boolean;
  defaultCanton: string;
  companyName: string;
  contactPhone: string;
  emergencyPhone: string;
  firebaseActive: boolean;
  firestoreCollection: string;
}

// Modelo de Socio Inversionista Particular de la Plataforma
export interface SocioModel {
  id: string; // ej. SOC-001
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  cooperative: string; // Categoría ej. "Inversionista Particular"
  assignedUnits: string[];
  joinDate: string;
  status: 'activo' | 'inactivo' | 'suspendido';
  investedCapital?: number; // Capital invertido en la plataforma ($ USD)
  bankAccount: {
    bank: string;
    accountType: 'Ahorros' | 'Corriente';
    accountNumber: string;
  };
  totalEarningsGross: number;
  platformCommissionPaid: number;
  netPayout: number;
  lastAppLogin: string;
  appLoginsCount: number;
  monthlyDuePaid: boolean;
}

// Registro de Entradas Financieras a la App
export interface AppRevenueTransaction {
  id: string;
  timestamp: string;
  type: 'carrera' | 'encomienda' | 'recarga_saldo' | 'cuota_socio';
  description: string;
  unitId?: string;
  socioName?: string;
  grossAmount: number;
  platformFee: number;
  netPartnerAmount: number;
  paymentMethod: 'Efectivo' | 'Transferencia';
}

// ============================================================================
// MÓDULO DE CONTROL DE INGRESOS Y EGRESOS (FINANZAS DE ANDES MOVI - FIRESTORE)
// ============================================================================

export type FinancialMovementType = 'INGRESO' | 'EGRESO';

export type FinancialCategory =
  | 'cobro_viaje'
  | 'cobro_encomienda'
  | 'recarga_conductor'
  | 'recarga_cliente'
  | 'cuota_cooperativa'
  | 'liquidacion_conductor'
  | 'comision_retenida'
  | 'gasto_operativo'
  | 'mantenimiento_repetidora'
  | 'reembolso_cliente';

export type SupportedRechargeBank =
  | 'Banco del Austro'
  | 'Produbanco'
  | 'Banco Guayaquil'
  | 'Banco Pichincha'
  | 'Deuna! / Banco Pichincha';

export type RechargeRequestStatus = 'pendiente' | 'aprobada' | 'rechazada';

export interface DriverRechargeRequest {
  id: string; // ej. REC-SOL-101
  driverId: string;
  driverName: string; // Nombre del conductor
  driverNationalId: string; // Cédula o identificación del conductor
  driverPlate: string; // Placa del vehículo particular
  driverVehicle?: string;
  driverPhone?: string;
  bankMethod: SupportedRechargeBank;
  reportedAmount: number; // Monto reportado ($ USD)
  referenceNumber: string; // Número de comprobante o referencia bancaria
  receiptImageUrl: string; // Imagen del comprobante o captura de transferencia subida por el conductor
  status: RechargeRequestStatus;
  submittedAt: string; // ISO 8601 timestamp
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface FinancialInvolvedUser {
  id: string;
  name: string;
  nationalId?: string;
  plate?: string;
  role: 'conductor' | 'cliente' | 'socio' | 'oficina_aliada' | 'administracion';
  unitId?: string;
  phone?: string;
}

export interface FinancialTransaction {
  id: string; // ej. FIN-2026-001
  type: FinancialMovementType; // 'INGRESO' | 'EGRESO'
  category: FinancialCategory;
  amount: number; // Monto total del movimiento ($ USD)
  commissionAmount: number; // Comisión retenida o generada para Andes Movi ($ USD)
  netPlatformEffect: number; // Impacto real en la caja neta de Andes Movi (+ o -)
  paymentMethod:
    | SupportedRechargeBank
    | 'Efectivo'
    | 'Transferencia Bancaria'
    | 'Billetera AndesMovi'
    | 'DeUna / QR Pichincha';
  description: string;
  referenceNumber?: string; // Comprobante o guía asociada (ej. GUIA-ANDES-001, TRIP-EC-101)
  canton: string;
  createdAt: string; // ISO 8601 timestamp para filtros de Día, Semana y Mes
  involvedUser: FinancialInvolvedUser;
  status: 'procesado' | 'pendiente' | 'anulado';
  notes?: string;
}

export interface UserWalletBalance {
  id: string; // ej. WAL-DRV-012
  ownerId: string;
  ownerName: string;
  nationalId?: string;
  ownerRole: 'conductor' | 'cliente';
  unitId?: string;
  plate?: string;
  vehicle?: string;
  balance: number; // Saldo disponible en billetera virtual ($ USD)
  totalRecharged: number;
  totalCommissionDeducted: number;
  totalLiquidated: number;
  lastMovementAt: string;
  status: 'activo' | 'bloqueado_saldo_bajo';
}

export type WorkerRole =
  | 'Operador de Radio y Despacho'
  | 'Conductor Ejecutivo / Flota'
  | 'Supervisor de Operaciones'
  | 'Cajero / Finanzas y Encomiendas'
  | 'Atención al Cliente y Reservas'
  | 'Administrador de Sede';

export interface StaffWorkerModel {
  id: string;
  fullName: string;
  cedula: string;
  phone: string;
  username: string;
  password: string;
  role: WorkerRole;
  cityBranch: string;
  shift: string;
  status: 'activo' | 'suspendido';
  assignedUnitId?: string;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
  notes?: string;
}
