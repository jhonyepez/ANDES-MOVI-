import {
  FleetUnit,
  DriverVerificationRequest,
  CantonTariff,
  DispatchServiceRequest,
  EmergencyAlert,
  RadioTransmission,
  ParcelModel,
  PlatformSettings,
  TripModel,
  SocioModel,
  AppRevenueTransaction,
  AlliedOffice,
  FinancialTransaction,
  UserWalletBalance,
  DriverRechargeRequest,
  SupportedRechargeBank,
  ExecutiveSchedule,
  ExecutivePassenger,
  StaffWorkerModel,
} from '../models/admin_models';
import { ALLIED_COOPERATIVES_DB } from '../data/allied_cooperatives';


const STORAGE_KEYS = {
  LOGGED_IN: 'andesmovi_admin_logged',
  CURRENT_USER: 'andesmovi_current_user',
  UNITS: 'andesmovi_units_v1',
  REQUESTS: 'andesmovi_requests_v1',
  TARIFFS: 'andesmovi_tariffs_v1',
  DISPATCHES: 'andesmovi_dispatches_v1',
  ALERTS: 'andesmovi_alerts_v1',
  TRANSMISSIONS: 'andesmovi_transmissions_v1',
  PARCELS: 'andesmovi_parcels_v1',
  SETTINGS: 'andesmovi_settings_v1',
  SOCIOS: 'andesmovi_socios_v1',
  REVENUE_TXS: 'andesmovi_revenue_txs_v1',
  ALLIED_OFFICES: 'andesmovi_allied_offices_v1',
  FINANCIAL_TXS: 'andesmovi_financial_txs_v1',
  WALLETS: 'andesmovi_wallets_v1',
  RECHARGE_REQUESTS: 'andesmovi_recharge_requests_v1',
  EXECUTIVE_SCHEDULES: 'andesmovi_executive_schedules_v1',
  STAFF_USERS: 'andesmovi_staff_users_v1',
};

export class AdminService {
  // Clave maestra del administrador
  public static readonly masterAdminPin = '1234';

  public static async verifyAdminSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.LOGGED_IN) === 'true';
  }

  public static getCurrentUser(): { username: string; role: string; shift: string } {
    if (typeof window === 'undefined') {
      return { username: 'admin', role: 'Administrador General', shift: 'Matutino (Central Matriz)' };
    }
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return { username: 'admin', role: 'Administrador General', shift: 'Matutino (Central Matriz)' };
  }

  public static async login(user: string, pin: string): Promise<boolean> {
    const cleanUser = user.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (
      (cleanUser === 'admin' || cleanUser === 'despacho' || cleanUser === 'operador') &&
      (cleanPin === this.masterAdminPin || cleanPin === 'andes2026')
    ) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
        const role = cleanUser === 'admin' ? 'Administrador General' : 'Operador de Radio-Despacho';
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_USER,
          JSON.stringify({
            username: user.trim(),
            role,
            shift: 'Guardia Activa • Turno Central Andes',
          })
        );
      }
      return true;
    }

    // Verificar credenciales de trabajadores creadas por el administrador
    const workers = this.getStaffWorkers();
    const matchedWorker = workers.find(
      w => w.username.trim().toLowerCase() === cleanUser && w.password.trim() === cleanPin
    );

    if (matchedWorker) {
      if (matchedWorker.status === 'suspendido') {
        return false;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_USER,
          JSON.stringify({
            username: matchedWorker.fullName,
            loginId: matchedWorker.username,
            role: matchedWorker.role,
            shift: `${matchedWorker.shift} • Sede ${matchedWorker.cityBranch}`,
            workerId: matchedWorker.id,
          })
        );
        // Actualizar último acceso
        const updatedWorkers = workers.map(w =>
          w.id === matchedWorker.id
            ? { ...w, lastLogin: new Date().toLocaleString('es-EC') }
            : w
        );
        localStorage.setItem(STORAGE_KEYS.STAFF_USERS, JSON.stringify(updatedWorkers));
      }
      return true;
    }

    return false;
  }

  public static async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
    }
  }

  // Lista inicial de unidades
  public static getInitialUnits(): FleetUnit[] {
    return [
      {
        id: 'AM-012',
        driverName: 'Marco Rosero',
        vehicle: 'Chevrolet Sail Sedán 1.5L',
        plate: 'PBC-4921',
        status: 'disponible',
        canton: 'Tulcán',
        rating: 4.9,
        completedTrips: 14,
        phone: '0984123890',
        lat: 0.8124,
        lng: -77.7174,
        batteryLevel: 94,
        cooperative: 'Conductor Particular',
        currentOrigin: 'Parque Central 24 de Mayo',
        currentDestination: 'Libre / Esperando servicio',
        lastUpdated: 'Hace 1 min',
        driverPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo C',
        antPoints: 30,
        vehicleYear: 2022,
        soatStatus: 'SOAT Vigente hasta Nov 2027',
        speedKmh: 35,
        features: ['Aire Acondicionado', 'Cajuela Grande', 'Seguro de Vida'],
      },
      {
        id: 'AM-028',
        driverName: 'Edwin Paspuel',
        vehicle: 'Kia Rio Sedán 1.4L',
        plate: 'IBC-8120',
        status: 'en_carrera',
        canton: 'Tulcán',
        rating: 4.8,
        completedTrips: 11,
        phone: '0993874102',
        lat: 0.8189,
        lng: -77.7245,
        batteryLevel: 81,
        cooperative: 'Conductor Particular',
        currentPassenger: 'Dra. Carmen Benavides',
        currentOrigin: 'Hospital Luis G. Dávila',
        currentDestination: 'Terminal Terrestre de Tulcán',
        lastUpdated: 'En ruta (ETA 6m)',
        driverPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo C',
        antPoints: 28,
        vehicleYear: 2021,
        soatStatus: 'SOAT Vigente hasta Ene 2028',
        speedKmh: 48,
        features: ['Wifi', 'Asientos Cuero', 'Cargador USB'],
      },
      {
        id: 'AM-035',
        driverName: 'Byron Narváez',
        vehicle: 'Hyundai Accent Sedán',
        plate: 'PBI-2049',
        status: 'disponible',
        canton: 'Montúfar / San Gabriel',
        rating: 5.0,
        completedTrips: 8,
        phone: '0979043211',
        lat: 0.6012,
        lng: -77.8291,
        batteryLevel: 88,
        cooperative: 'Conductor Particular',
        currentOrigin: 'Plaza Central San Gabriel',
        currentDestination: 'Libre / Esperando servicio',
        lastUpdated: 'Hace 3 min',
        driverPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo C',
        antPoints: 30,
        vehicleYear: 2023,
        soatStatus: 'SOAT Vigente hasta Mar 2028',
        speedKmh: 20,
      },
      {
        id: 'AM-044',
        driverName: 'Javier Villarreal',
        vehicle: 'Nissan Versa Drive Sedán',
        plate: 'QBC-1192',
        status: 'offline',
        canton: 'Ibarra',
        rating: 4.7,
        completedTrips: 5,
        phone: '0968112345',
        lat: 0.3517,
        lng: -78.1223,
        batteryLevel: 42,
        cooperative: 'Flota Imbabura Urbana',
        currentOrigin: 'Base Talleres Ibarra',
        currentDestination: 'Descanso de almuerzo',
        lastUpdated: 'Hace 35 min',
        driverPhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo D',
        antPoints: 26,
        vehicleYear: 2020,
        soatStatus: 'SOAT Vigente hasta Sep 2027',
        speedKmh: 0,
      },
      {
        id: 'AM-051',
        driverName: 'Santiago Cárdenas',
        vehicle: 'Kia Soluto Sedán',
        plate: 'PBK-3490',
        status: 'en_camino',
        canton: 'Tulcán',
        rating: 4.9,
        completedTrips: 9,
        phone: '0987654320',
        lat: 0.8095,
        lng: -77.7121,
        batteryLevel: 76,
        cooperative: 'Conductor Particular',
        currentPassenger: 'Ing. Mateo Terán',
        currentOrigin: 'Calle Bolívar y Pichincha',
        currentDestination: 'Hacia recogida (ETA 3m)',
        lastUpdated: 'Despachado por Radio',
        driverPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo C',
        antPoints: 30,
        vehicleYear: 2022,
        soatStatus: 'SOAT Vigente hasta Feb 2028',
        speedKmh: 40,
      },
      {
        id: 'AM-063',
        driverName: 'Carlos Mideros',
        vehicle: 'Chevrolet Aveo Family Sedán',
        plate: 'IBB-7215',
        status: 'disponible',
        canton: 'Ibarra / Otavalo',
        rating: 4.8,
        completedTrips: 12,
        phone: '0991209843',
        lat: 0.3421,
        lng: -78.1154,
        batteryLevel: 65,
        cooperative: 'Conductor Particular',
        currentOrigin: 'Terminal Terrestre Ibarra',
        currentDestination: 'Libre / Base Norte',
        lastUpdated: 'Hace 2 min',
        driverPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo C',
        antPoints: 29,
        vehicleYear: 2021,
        soatStatus: 'SOAT Vigente hasta May 2028',
        speedKmh: 15,
      },
      {
        id: 'AM-072',
        driverName: 'Wilson Andrade',
        vehicle: 'Toyota Yaris Sedan XLI',
        plate: 'PBA-9104',
        status: 'disponible',
        canton: 'Quito Norte / Carcelén',
        rating: 4.95,
        completedTrips: 16,
        phone: '0981290345',
        lat: -0.1023,
        lng: -78.4876,
        batteryLevel: 92,
        cooperative: 'Ejecutivos del Norte Pichincha',
        currentOrigin: 'Intercambiador Carcelén',
        currentDestination: 'Libre / Esperando servicio',
        lastUpdated: 'Hace 4 min',
        driverPhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo C',
        antPoints: 30,
        vehicleYear: 2023,
        soatStatus: 'SOAT Vigente hasta Jul 2028',
        speedKmh: 55,
      },
      {
        id: 'AM-M01',
        driverName: 'Daniel Portilla',
        vehicle: 'Bajaj Pulsar NS200 (Moto Encomiendas)',
        plate: 'M-CAR-849',
        status: 'disponible',
        canton: 'Tulcán',
        rating: 4.95,
        completedTrips: 22,
        phone: '0984128833',
        lat: 0.8142,
        lng: -77.7145,
        batteryLevel: 96,
        cooperative: 'Moto-Express AndesMovi Tulcán',
        currentOrigin: 'Parque de la Independencia',
        currentDestination: 'Disponible para Envíos Rápidos',
        lastUpdated: 'En vivo (GPS activo)',
        driverPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&q=80',
        licenseType: 'Licencia Tipo A Profesional',
        antPoints: 30,
        vehicleYear: 2023,
        soatStatus: 'SOAT Vigente hasta Dic 2027',
        speedKmh: 42,
      },
      {
        id: 'AM-M02',
        driverName: 'Brayan Cadena',
        vehicle: 'Yamaha FZ-25 (Moto Mensajería)',
        plate: 'M-CAR-312',
        status: 'en_carrera',
        canton: 'Tulcán',
        rating: 4.88,
        completedTrips: 18,
        phone: '0993881290',
        lat: 0.8175,
        lng: -77.7210,
        batteryLevel: 89,
        cooperative: 'Moto-Express AndesMovi Tulcán',
        currentPassenger: 'Paquete Comercial Repuestos (ENC-002)',
        currentOrigin: 'Oficina Central Matriz Tulcán',
        currentDestination: 'Agencia Aliada Rumichaca Frontera',
        assignedParcelId: 'ENC-002',
        lastUpdated: 'En ruta de entrega hacia Rumichaca',
        driverPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=500&q=80',
        licenseType: 'Licencia Tipo A Profesional',
        antPoints: 29,
        vehicleYear: 2022,
        soatStatus: 'SOAT Vigente hasta Oct 2027',
        speedKmh: 45,
      },
      {
        id: 'AM-M03',
        driverName: 'Geovanny Benítez',
        vehicle: 'Honda CB190R (Moto Domicilios)',
        plate: 'M-IMB-551',
        status: 'disponible',
        canton: 'Ibarra',
        rating: 4.9,
        completedTrips: 15,
        phone: '0979114420',
        lat: 0.3540,
        lng: -78.1190,
        batteryLevel: 91,
        cooperative: 'Mensajería Express Imbabura',
        currentOrigin: 'Parque Pedro Moncayo Ibarra',
        currentDestination: 'Libre / Esperando pedidos',
        lastUpdated: 'En vivo (GPS activo)',
        driverPhoto: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=500&q=80',
        licenseType: 'Licencia Tipo A Profesional',
        antPoints: 30,
        vehicleYear: 2023,
        soatStatus: 'SOAT Vigente hasta Nov 2027',
        speedKmh: 28,
      },
      {
        id: 'AM-CO-01',
        driverName: 'Roberto Jimenez',
        vehicle: 'Toyota Fortuner SUV 4x4',
        plate: 'OBA-5512',
        status: 'disponible',
        canton: 'El Coca',
        rating: 5.0,
        completedTrips: 45,
        phone: '0995511223',
        lat: -0.4667,
        lng: -76.9833,
        batteryLevel: 98,
        cooperative: 'Coop. Amazonía Ejecutiva',
        currentOrigin: 'Terminal Terrestre El Coca',
        currentDestination: 'Libre / Esperando servicio',
        lastUpdated: 'En vivo',
        driverPhoto: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo E',
        antPoints: 30,
        vehicleYear: 2024,
        soatStatus: 'SOAT Vigente hasta Ene 2030',
        speedKmh: 0,
        features: ['Aire Acondicionado', '4x4', 'Wifi', 'Asientos de Cuero', 'GPS'],
      },
      {
        id: 'AM-CO-02',
        driverName: 'Gloria Velasco',
        vehicle: 'Hyundai Santa Fe SUV',
        plate: 'PKB-9901',
        status: 'disponible',
        canton: 'El Coca',
        rating: 4.9,
        completedTrips: 32,
        phone: '0981100223',
        lat: -0.4700,
        lng: -77.0000,
        batteryLevel: 95,
        cooperative: 'Coop. Amazonía Ejecutiva',
        currentOrigin: 'Malecón de El Coca',
        currentDestination: 'Libre',
        lastUpdated: 'Hace 5 min',
        driverPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
        vehiclePhoto: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&q=80',
        licenseType: 'Licencia Profesional Tipo C',
        antPoints: 30,
        vehicleYear: 2023,
        soatStatus: 'SOAT Vigente hasta Mar 2029',
        speedKmh: 0,
        features: ['Aire Acondicionado', 'Maletero Amplio', 'Cargador USB', 'Música'],
      },
    ];
  }

  // Lista inicial de solicitudes de validación
  public static getInitialRequests(): DriverVerificationRequest[] {
    return [
      {
        id: 'req_1',
        name: 'Cristian Fueltala',
        canton: 'Tulcán',
        licenseType: 'Licencia Profesional Tipo C (Vigente 2028)',
        vehicle: 'Toyota Yaris 2021',
        plate: 'CBC-5412',
        soatExpiry: 'SOAT Vigente hasta Nov 2027',
        phone: '0981234567',
        status: 'pendiente',
        submittedAt: 'Hoy, 08:15',
        nationalId: '0401827493',
        criminalRecordStatus: 'Limpio / Sin antecedentes',
        antPoints: 30,
        vehicleYear: 2021,
      },
      {
        id: 'req_2',
        name: 'Mauricio Revelo',
        canton: 'Espejo / El Ángel',
        licenseType: 'Licencia Profesional Tipo D',
        vehicle: 'Chevrolet Aveo Emotion',
        plate: 'PBN-3391',
        soatExpiry: 'SOAT Vigente hasta Ene 2028',
        phone: '0997654321',
        status: 'pendiente',
        submittedAt: 'Ayer, 17:40',
        nationalId: '0401569824',
        criminalRecordStatus: 'Limpio / Sin antecedentes',
        antPoints: 28,
        vehicleYear: 2019,
      },
      {
        id: 'req_3',
        name: 'Gonzalo Benalcázar',
        canton: 'San Gabriel / Montúfar',
        licenseType: 'Licencia Profesional Tipo C',
        vehicle: 'Kia Soluto 2022',
        plate: 'CBA-8819',
        soatExpiry: 'SOAT Vigente hasta Feb 2027',
        phone: '0984556677',
        status: 'aprobado',
        submittedAt: 'Ayer, 11:20',
        nationalId: '0401992831',
        criminalRecordStatus: 'Limpio / Sin antecedentes',
        antPoints: 30,
        vehicleYear: 2022,
        reviewNotes: 'Documentos verificados en sistema ANT y SPPAT. Unidad asignada.',
      },
    ];
  }

  // Tarifas Cantonales configuradas
  public static getInitialTariffs(): CantonTariff[] {
    return [
      {
        canton: 'Tulcán Centro / Urbano',
        baseFare: 1.50,
        perKmRate: 0.40,
        nightSurcharge: 0.25,
        minFare: 1.50,
        waitMinuteRate: 0.10,
        airportSurcharge: 2.00,
        commissionPercentage: 10,
      },
      {
        canton: 'San Gabriel / Montúfar',
        baseFare: 1.25,
        perKmRate: 0.40,
        nightSurcharge: 0.25,
        minFare: 1.25,
        waitMinuteRate: 0.08,
        airportSurcharge: 0.00,
        commissionPercentage: 10,
      },
      {
        canton: 'Ibarra / Otavalo',
        baseFare: 1.75,
        perKmRate: 0.45,
        nightSurcharge: 0.35,
        minFare: 1.75,
        waitMinuteRate: 0.12,
        airportSurcharge: 3.00,
        commissionPercentage: 12,
      },
      {
        canton: 'Quito Norte / Carcelén',
        baseFare: 2.00,
        perKmRate: 0.50,
        nightSurcharge: 0.50,
        minFare: 2.00,
        waitMinuteRate: 0.15,
        airportSurcharge: 4.50,
        commissionPercentage: 12,
      },
    ];
  }

  // Despachos en curso iniciales
  public static getInitialDispatches(): DispatchServiceRequest[] {
    return [
      {
        id: 'DESP-801',
        clientName: 'Sra. Elena Morales',
        clientPhone: '0982341109',
        pickupAddress: 'Av. Veintimilla y Olmedo (Frente a Banco Pichincha)',
        dropoffAddress: 'Terminal Terrestre de Tulcán',
        canton: 'Tulcán',
        requestedAt: '08:42 AM',
        estimatedKm: 3.8,
        estimatedFare: 3.02,
        status: 'esperando_unidad',
        notes: 'Cliente con dos maletas grandes. Despachar vehículo con baúl amplio.',
        channel: 'Teléfono Central (06) 298-0400',
      },
      {
        id: 'DESP-802',
        clientName: 'Ing. Mateo Terán',
        clientPhone: '0994112233',
        pickupAddress: 'Calle Bolívar y Pichincha, Edif. Plaza',
        dropoffAddress: 'Puente Internacional Rumichaca',
        canton: 'Tulcán',
        requestedAt: '08:35 AM',
        estimatedKm: 8.5,
        estimatedFare: 4.90,
        status: 'en_curso',
        assignedUnitId: 'AM-051',
        assignedDriver: 'Santiago Cárdenas',
        notes: 'Pago con transferencia / DeUna.',
        channel: 'WhatsApp Bot AndesMovi',
      },
      {
        id: 'DESP-803',
        clientName: 'Lic. Fernando Pozo',
        clientPhone: '0987722100',
        pickupAddress: 'Parque Central San Gabriel',
        dropoffAddress: 'Hostería La Rinconada, Montúfar',
        canton: 'Montúfar / San Gabriel',
        requestedAt: '08:18 AM',
        estimatedKm: 5.2,
        estimatedFare: 3.33,
        status: 'completado',
        assignedUnitId: 'AM-035',
        assignedDriver: 'Byron Narváez',
        notes: 'Carrera finalizada con calificación 5 estrellas.',
        channel: 'App Pasajero',
      },
    ];
  }

  // Alertas de emergencia iniciales
  public static getInitialAlerts(): EmergencyAlert[] {
    return [
      {
        id: 'ALERT-091',
        unitId: 'AM-028',
        driverName: 'Edwin Paspuel',
        vehicle: 'Kia Rio (IBC-8120)',
        plate: 'IBC-8120',
        canton: 'Tulcán',
        timestamp: 'Ayer, 21:14',
        locationDescription: 'Panamericana Norte Km 3 - Sector Julio Andrade',
        lat: 0.8189,
        lng: -77.7245,
        resolved: true,
        notes: 'Falsa alarma activada por presión accidental en botón de volante. Chofer contactado y verificado.',
        escalatedTo911: false,
      },
    ];
  }

  // Transmisiones de radio VHF
  public static getInitialTransmissions(): RadioTransmission[] {
    return [
      {
        id: 'RAD-101',
        timestamp: '08:44:12',
        channel: 'CANAL 1 - TULCÁN MATRIZ (144.520 MHz)',
        unitId: 'AM-012',
        sender: 'CENTRAL',
        message: 'Central a Unidad 12, reporte si está disponible en sector Parque Central para servicio hacia Terminal.',
      },
      {
        id: 'RAD-102',
        timestamp: '08:44:26',
        channel: 'CANAL 1 - TULCÁN MATRIZ (144.520 MHz)',
        unitId: 'AM-012',
        sender: 'UNIDAD',
        message: 'Roger Central, Unidad 12 libre y a 2 minutos. Copiado el servicio.',
      },
      {
        id: 'RAD-103',
        timestamp: '08:35:04',
        channel: 'CANAL 1 - TULCÁN MATRIZ (144.520 MHz)',
        unitId: 'AM-051',
        sender: 'CENTRAL',
        message: 'Unidad 51 asignada a carrera Rumichaca, cliente Ing. Terán esperando en Bolívar y Pichincha.',
      },
      {
        id: 'RAD-104',
        timestamp: '08:30:19',
        channel: 'CANAL 2 - MONTÚFAR / IBARRA (146.100 MHz)',
        unitId: 'AM-035',
        sender: 'UNIDAD',
        message: 'Unidad 35 reportando fin de carrera en Rinconada. Retornando a base parque.',
      },
    ];
  }

  // LocalStorage read helpers
  public static getStoredUnits(): FleetUnit[] {
    if (typeof window === 'undefined') return this.getInitialUnits();
    const data = localStorage.getItem(STORAGE_KEYS.UNITS);
    if (!data) {
      const initial = this.getInitialUnits();
      this.saveUnits(initial);
      return initial;
    }
    try {
      const parsed: FleetUnit[] = JSON.parse(data);
      const initial = this.getInitialUnits();
      const enriched = parsed.map((u) => {
        const found = initial.find((i) => i.id === u.id);
        if (found) {
          return {
            ...found,
            ...u,
            driverPhoto: u.driverPhoto || found.driverPhoto,
            vehiclePhoto: u.vehiclePhoto || found.vehiclePhoto,
            licenseType: u.licenseType || found.licenseType,
            antPoints: u.antPoints || found.antPoints,
            vehicleYear: u.vehicleYear || found.vehicleYear,
            soatStatus: u.soatStatus || found.soatStatus,
            speedKmh: u.speedKmh ?? found.speedKmh,
          };
        }
        return u;
      });

      return enriched;
    } catch {
      return this.getInitialUnits();
    }
  }

  public static saveUnits(units: FleetUnit[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(units));
    }
  }

  public static getStoredRequests(): DriverVerificationRequest[] {
    if (typeof window === 'undefined') return this.getInitialRequests();
    const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (!data) {
      const initial = this.getInitialRequests();
      this.saveRequests(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialRequests();
    }
  }

  public static saveRequests(requests: DriverVerificationRequest[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    }
  }

  public static getStoredTariffs(): CantonTariff[] {
    if (typeof window === 'undefined') return this.getInitialTariffs();
    const data = localStorage.getItem(STORAGE_KEYS.TARIFFS);
    if (!data) {
      const initial = this.getInitialTariffs();
      this.saveTariffs(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialTariffs();
    }
  }

  public static saveTariffs(tariffs: CantonTariff[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TARIFFS, JSON.stringify(tariffs));
    }
  }

  public static getStoredDispatches(): DispatchServiceRequest[] {
    if (typeof window === 'undefined') return this.getInitialDispatches();
    const data = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
    if (!data) {
      const initial = this.getInitialDispatches();
      this.saveDispatches(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialDispatches();
    }
  }

  public static saveDispatches(dispatches: DispatchServiceRequest[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(dispatches));
    }
  }

  public static getStoredAlerts(): EmergencyAlert[] {
    if (typeof window === 'undefined') return this.getInitialAlerts();
    const data = localStorage.getItem(STORAGE_KEYS.ALERTS);
    if (!data) {
      const initial = this.getInitialAlerts();
      this.saveAlerts(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialAlerts();
    }
  }

  public static saveAlerts(alerts: EmergencyAlert[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    }
  }

  public static getStoredTransmissions(): RadioTransmission[] {
    if (typeof window === 'undefined') return this.getInitialTransmissions();
    const data = localStorage.getItem(STORAGE_KEYS.TRANSMISSIONS);
    if (!data) {
      const initial = this.getInitialTransmissions();
      this.saveTransmissions(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialTransmissions();
    }
  }

  public static saveTransmissions(transmissions: RadioTransmission[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TRANSMISSIONS, JSON.stringify(transmissions));
    }
  }

  /**
   * Calculate fare for a given canton, distance in km, and night mode
   */
  public static calculateFare(
    cantonName: string,
    distanceKm: number,
    isNight: boolean = false,
    hasAirport: boolean = false
  ): number {
    const tariffs = this.getStoredTariffs();
    const tariff = tariffs.find(t => t.canton.toLowerCase().includes(cantonName.toLowerCase())) || tariffs[0];

    const base = tariff.baseFare;
    const distanceCost = distanceKm * tariff.perKmRate;
    const night = isNight ? tariff.nightSurcharge : 0;
    const airport = hasAirport ? (tariff.airportSurcharge || 0) : 0;

    const total = base + distanceCost + night + airport;
    const minFare = tariff.minFare || tariff.baseFare;
    return Math.max(minFare, Math.round(total * 100) / 100);
  }

  // --- ENCOMIENDAS (PARCELS & PACKAGES) ---
  public static getInitialParcels(): ParcelModel[] {
    return [
      {
        id: 'ENC-001',
        guideNumber: 'GUIA-ANDES-001',
        senderName: 'Farmacia San Francisco (Tulcán)',
        senderPhone: '0981234567',
        recipientName: 'Clínica Pasteur - Dr. Carlos C.',
        recipientPhone: '0998765432',
        pickupAddress: 'Calle Sucre y Bolívar #14-20',
        deliveryAddress: 'Terminal Terrestre San Gabriel, Local 12',
        originOfficeId: 'OFI-TUL-01',
        originOfficeName: 'Oficina Central Matriz Tulcán',
        destinationOfficeId: 'OFI-SG-03',
        destinationOfficeName: 'Agencia Aliada San Gabriel Terminal',
        packageDescription: 'Medicamentos refrigerados con sello de seguridad',
        packageWeight: '1.2 kg',
        fare: 3.50,
        paymentMethod: 'Efectivo',
        status: 'en_transito',
        assignedUnitId: 'AM-012',
        assignedDriver: 'Marco Rosero (AM-012)',
        createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 'ENC-002',
        guideNumber: 'GUIA-ANDES-002',
        senderName: 'Importadora Andina Carchi',
        senderPhone: '0962345678',
        recipientName: 'Agencia Aduanal Rumichaca',
        recipientPhone: '0953456789',
        pickupAddress: 'Parque Isidro Ayora Tulcán',
        deliveryAddress: 'Puente Internacional Rumichaca Módulo Binacional',
        originOfficeId: 'OFI-TUL-01',
        originOfficeName: 'Oficina Central Matriz Tulcán',
        destinationOfficeId: 'OFI-RUM-02',
        destinationOfficeName: 'Agencia Aliada Rumichaca Frontera',
        packageDescription: 'Documentos notariales y facturas de importación',
        packageWeight: '0.5 kg',
        fare: 2.75,
        paymentMethod: 'Transferencia',
        status: 'en_transito',
        assignedUnitId: 'AM-M02',
        assignedDriver: 'Brayan Cadena (AM-M02)',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 'ENC-003',
        guideNumber: 'GUIA-ANDES-003',
        senderName: 'Repuestos Automotrices El Volante',
        senderPhone: '0973456789',
        recipientName: 'Taller Mecánico Hermanos Ruano',
        recipientPhone: '0984567890',
        pickupAddress: 'Terminal Terrestre Local 8 Ibarra',
        deliveryAddress: 'Calle Sucre y Bolívar #14-20 Tulcán',
        originOfficeId: 'OFI-IB-04',
        originOfficeName: 'Agencia Aliada Ibarra Los Lagos',
        destinationOfficeId: 'OFI-TUL-01',
        destinationOfficeName: 'Oficina Central Matriz Tulcán',
        packageDescription: 'Bomba de gasolina y filtros para taxi Kia',
        packageWeight: '3.5 kg',
        fare: 4.50,
        paymentMethod: 'Efectivo',
        status: 'recibido',
        assignedUnitId: null,
        assignedDriver: null,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'ENC-004',
        guideNumber: 'GUIA-ANDES-004',
        senderName: 'Textiles del Norte Tulcán',
        senderPhone: '0988776655',
        recipientName: 'Almacenes El Sol Carcelén',
        recipientPhone: '0999887766',
        pickupAddress: 'Calle Bolívar 10-45 Tulcán',
        deliveryAddress: 'Terminal Terrestre Carcelén Bloque B Local 19',
        originOfficeId: 'OFI-TUL-01',
        originOfficeName: 'Oficina Central Matriz Tulcán',
        destinationOfficeId: 'OFI-UIO-05',
        destinationOfficeName: 'Agencia Aliada Quito Norte Carcelén',
        packageDescription: 'Muestras de hilado y confección artesanal',
        packageWeight: '2.0 kg',
        fare: 6.00,
        paymentMethod: 'Transferencia',
        status: 'entregado',
        assignedUnitId: 'AM-072',
        assignedDriver: 'Wilson Andrade (AM-072)',
        dropOffOfficeId: 'OFI-UIO-05',
        dropOffOfficeName: 'Agencia Aliada Quito Norte Carcelén',
        dropOffTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        deliveredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        autoDeliveredByOffice: true,
        receivedByAgent: 'Sr. Patricio Mora (Central Pichincha)',
        createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      },
    ];
  }

  public static getStoredParcels(): ParcelModel[] {
    if (typeof window === 'undefined') return this.getInitialParcels();
    const data = localStorage.getItem(STORAGE_KEYS.PARCELS);
    if (!data) {
      const initial = this.getInitialParcels();
      this.saveParcels(initial);
      return initial;
    }
    try {
      const parsed: ParcelModel[] = JSON.parse(data);
      const initial = this.getInitialParcels();
      const enriched: ParcelModel[] = parsed.map((p, idx) => {
        const found = initial.find((i) => i.id === p.id);
        return {
          ...(found || {}),
          ...p,
          guideNumber: p.guideNumber || found?.guideNumber || `GUIA-ANDES-${(idx + 1).toString().padStart(3, '0')}`,
          originOfficeId: p.originOfficeId || found?.originOfficeId || 'OFI-TUL-01',
          originOfficeName: p.originOfficeName || found?.originOfficeName || 'Oficina Central Matriz Tulcán',
          destinationOfficeId: p.destinationOfficeId || found?.destinationOfficeId || 'OFI-SG-03',
          destinationOfficeName: p.destinationOfficeName || found?.destinationOfficeName || 'Agencia Aliada San Gabriel Terminal',
        };
      });
      if (!enriched.some((x) => x.id === 'ENC-004')) {
        const enc4 = initial.find((i) => i.id === 'ENC-004');
        if (enc4) enriched.push(enc4);
      }
      return enriched;
    } catch {
      return this.getInitialParcels();
    }
  }

  public static saveParcels(parcels: ParcelModel[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    }
  }

  public static addParcel(parcel: Omit<ParcelModel, 'id' | 'createdAt'>): ParcelModel {
    const parcels = this.getStoredParcels();
    const newId = `ENC-${(parcels.length + 1).toString().padStart(3, '0')}`;
    const newParcel: ParcelModel = {
      ...parcel,
      id: newId,
      guideNumber: parcel.guideNumber || `GUIA-ANDES-${(parcels.length + 1).toString().padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newParcel, ...parcels];
    this.saveParcels(updated);
    return newParcel;
  }

  public static updateParcelStatus(id: string, status: ParcelModel['status'], assignedUnit?: FleetUnit): void {
    const parcels = this.getStoredParcels();
    const index = parcels.findIndex((p) => p.id === id);
    if (index !== -1) {
      parcels[index].status = status;
      if (assignedUnit) {
        parcels[index].assignedUnitId = assignedUnit.id;
        parcels[index].assignedDriver = `${assignedUnit.driverName} (${assignedUnit.id})`;
      }
      if (status === 'entregado') {
        parcels[index].deliveredAt = new Date().toISOString();
      }
      this.saveParcels([...parcels]);
    }
  }

  // Helper to map cities and provinces of Ecuador to real GPS coordinates inside Ecuador
  private static getEcuadorOfficeCoordinates(
    cityName: string,
    provinceName: string,
    officeName: string,
    officeIndex: number
  ): { lat: number; lng: number; customAddress?: string } {
    const cityLower = cityName.toLowerCase();
    const provLower = provinceName.toLowerCase();
    const offLower = officeName.toLowerCase();

    // Specific Tulcán Agencies
    if (cityLower.includes('tulcán') || cityLower.includes('tulcan')) {
      if (offLower.includes('centenario') || offLower.includes('bomba') || offLower.includes('tulcanaza')) {
        return { lat: 0.8172, lng: -77.7145, customAddress: 'Av. Centenario y Veintimilla (Sector Ex Bomba / Tulcanaza), Tulcán' };
      }
      if (offLower.includes('terminal')) {
        return { lat: 0.8062, lng: -77.7188, customAddress: 'Terminal Terrestre de Tulcán, Av. Universitaria' };
      }
      if (offLower.includes('centro') || offLower.includes('arellano')) {
        return { lat: 0.8118, lng: -77.7172, customAddress: 'Rafael Arellano y Roberto Sierra, Tulcán Centro' };
      }
      if (offLower.includes('matriz') || offLower.includes('veintimilla')) {
        return { lat: 0.8142, lng: -77.7160, customAddress: 'Av. Veintimilla y Cotopaxi, Matriz Tulcán' };
      }
      return { lat: 0.8124, lng: -77.7174, customAddress: `${officeName}, Tulcán, Carchi` };
    }

    if (cityLower.includes('rumichaca') || offLower.includes('rumichaca')) {
      return { lat: 0.8189, lng: -77.6621, customAddress: 'Puente Internacional Rumichaca, Frontera Ecuador-Colombia' };
    }

    if (cityLower.includes('gabriel') || cityLower.includes('montúfar') || cityLower.includes('montufar')) {
      return { lat: 0.6012, lng: -77.8291, customAddress: 'Panamericana Norte y Calle Los Ríos, San Gabriel, Carchi' };
    }

    // Specific Quito Agencies
    if (cityLower.includes('carcelén') || cityLower.includes('carcelen') || offLower.includes('carcelén') || offLower.includes('carcelen')) {
      return { lat: -0.0982, lng: -78.4762, customAddress: 'Terminal Terrestre Carcelén, Panamericana Norte, Quito' };
    }
    if (cityLower.includes('quitumbe') || offLower.includes('quitumbe')) {
      return { lat: -0.3012, lng: -78.5521, customAddress: 'Terminal Terrestre Quitumbe, Av. Cóndor Ñan, Quito Sur' };
    }
    if (cityLower.includes('quito') || provLower.includes('pichincha')) {
      if (offLower.includes('larrea') || offLower.includes('centro')) {
        return { lat: -0.2187, lng: -78.5085, customAddress: 'Calle Manuel Larrea y Asunción, Quito Centro' };
      }
      return { lat: -0.1807, lng: -78.4678, customAddress: 'Av. Amazonas y Naciones Unidas, Quito' };
    }

    // Guayaquil
    if (cityLower.includes('guayaquil') || provLower.includes('guayas')) {
      if (offLower.includes('terminal')) {
        return { lat: -2.1468, lng: -79.8832, customAddress: 'Terminal Terrestre Jaime Roldós Aguilera, Av. Benjamín Rosales, Guayaquil' };
      }
      return { lat: -2.1894, lng: -79.8891, customAddress: 'Av. 9 de Octubre y Malecón 2000, Guayaquil' };
    }

    // Cuenca
    if (cityLower.includes('cuenca') || provLower.includes('azuay')) {
      return { lat: -2.8912, lng: -78.9958, customAddress: 'Terminal Terrestre de Cuenca, Av. España y Gil Ramírez Dávalos' };
    }

    // Santo Domingo
    if (cityLower.includes('santo domingo') || provLower.includes('tsáchilas')) {
      return { lat: -0.2458, lng: -79.1689, customAddress: 'Terminal Terrestre de Santo Domingo, Av. Abraham Calazacón' };
    }

    // Ambato
    if (cityLower.includes('ambato') || provLower.includes('tungurahua')) {
      return { lat: -1.2589, lng: -78.6142, customAddress: 'Av. Bolivariana y El Salvador, Sector Mercado Mayorista, Ambato' };
    }

    // Riobamba
    if (cityLower.includes('riobamba') || provLower.includes('chimborazo')) {
      return { lat: -1.6582, lng: -78.6512, customAddress: 'Leonidas Proaño y Av. Lizarzaburo, Riobamba' };
    }

    // Ibarra
    if (cityLower.includes('ibarra') || provLower.includes('imbabura')) {
      if (offLower.includes('terminal')) {
        return { lat: 0.3517, lng: -78.1223, customAddress: 'Terminal Terrestre de Ibarra, Av. Eugenio Espejo' };
      }
      return { lat: 0.3562, lng: -78.1189, customAddress: 'Víctor Mideros y Raúl Montalvo, Ibarra Centro' };
    }

    // Loja
    if (cityLower.includes('loja')) {
      return { lat: -3.9852, lng: -79.2018, customAddress: 'Terminal Terrestre Reina del Cisne, Av. Gran Colombia, Loja' };
    }

    // Machala
    if (cityLower.includes('machala') || provLower.includes('el oro')) {
      return { lat: -3.2621, lng: -79.9482, customAddress: 'Terminal Terrestre de Machala, Av. Ferroviaria' };
    }

    // Manta / Portoviejo
    if (cityLower.includes('manta')) {
      return { lat: -0.9582, lng: -80.7089, customAddress: 'Terminal Terrestre de Manta, Sector El Jocay' };
    }
    if (cityLower.includes('portoviejo') || provLower.includes('manabí')) {
      return { lat: -1.0612, lng: -80.4482, customAddress: 'Terminal Terrestre de Portoviejo, Av. Real Tamarindos' };
    }

    // Esmeraldas
    if (cityLower.includes('esmeraldas')) {
      return { lat: 0.9582, lng: -79.6612, customAddress: 'Terminal Terrestre de Esmeraldas, Sector San Mateo' };
    }

    // Latacunga
    if (cityLower.includes('latacunga') || provLower.includes('cotopaxi')) {
      return { lat: -0.9282, lng: -78.6128, customAddress: 'Terminal Terrestre de Latacunga, Av. Marco Aurelio Subía' };
    }

    // Babahoyo / Quevedo
    if (cityLower.includes('babahoyo')) {
      return { lat: -1.7982, lng: -79.5289, customAddress: 'Terminal Terrestre de Babahoyo, Av. Universitaria' };
    }
    if (cityLower.includes('quevedo') || provLower.includes('los ríos')) {
      return { lat: -1.0289, lng: -79.4632, customAddress: 'Terminal Terrestre de Quevedo, Av. Walter Andrade' };
    }

    // Lago Agrio
    if (cityLower.includes('lago agrio') || cityLower.includes('nueva loja') || provLower.includes('sucumbíos')) {
      return { lat: 0.0882, lng: -76.8789, customAddress: 'Terminal Terrestre de Lago Agrio, Av. Quito, Nueva Loja' };
    }

    // El Coca
    if (cityLower.includes('coca') || provLower.includes('orellana')) {
      return { lat: -0.4612, lng: -76.9812, customAddress: 'Terminal Terrestre de Puerto Francisco de Orellana (El Coca)' };
    }

    return {
      lat: 0.8124,
      lng: -77.7174,
      customAddress: `${officeName}, ${cityName}, ${provinceName}`,
    };
  }

  // --- OFICINAS ALIADAS ---
  public static getInitialAlliedOffices(): AlliedOffice[] {
    const offices: AlliedOffice[] = [];
    let counter = 1;

    for (const [coopName, provinces] of Object.entries(ALLIED_COOPERATIVES_DB)) {
      for (const [provinceName, cities] of Object.entries(provinces)) {
        for (const [cityName, officesList] of Object.entries(cities)) {
          let officeIndexInCity = 0;
          for (const officeName of officesList) {
            const coords = this.getEcuadorOfficeCoordinates(cityName, provinceName, officeName, officeIndexInCity);
            offices.push({
              id: `OFI-${counter.toString().padStart(3, '0')}`,
              name: `${coopName} - ${officeName}`,
              shortName: officeName,
              canton: cityName,
              address: coords.customAddress || `${officeName}, ${cityName}, ${provinceName}`,
              lat: coords.lat,
              lng: coords.lng,
              phone: '+593 99 856 6503',
              agentName: 'Agente Autorizado de Recepción',
              status: 'activa',
              hours: '06:00 - 22:00',
              packagesReceived: Math.floor(8 + Math.random() * 35),
            });
            counter++;
            officeIndexInCity++;
          }
        }
      }
    }
    return offices;
  }

  public static getStoredAlliedOffices(): AlliedOffice[] {
    // FORCE REFRESH: Ensure all offices use exact updated addresses and coordinates (Tulcanaza Centenario, Ex Bomba, Carcelen, Quitumbe, etc.)
    const initial = this.getInitialAlliedOffices();
    this.saveAlliedOffices(initial);
    return initial;
  }

  public static saveAlliedOffices(offices: AlliedOffice[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ALLIED_OFFICES, JSON.stringify(offices));
    }
  }

  /**
   * Automáticamente marca una guía como despachada y entregada cuando el conductor
   * deja la encomienda en una oficina aliada.
   */
  public static markParcelDispatchedAndDeliveredAtOffice(
    parcelId: string,
    officeId: string,
    agentName?: string
  ): { success: boolean; parcel: ParcelModel | null; message: string } {
    const parcels = this.getStoredParcels();
    const offices = this.getStoredAlliedOffices();
    const office = offices.find((o) => o.id === officeId) || offices[0];
    const index = parcels.findIndex((p) => p.id === parcelId || p.guideNumber === parcelId);

    if (index === -1) {
      return { success: false, parcel: null, message: `Guía ${parcelId} no encontrada.` };
    }

    const p = parcels[index];
    const now = new Date().toISOString();
    const agent = agentName || office.agentName;

    // Se marca automáticamente como entregado en la oficina aliada
    p.status = 'entregado';
    p.dropOffOfficeId = office.id;
    p.dropOffOfficeName = office.name;
    p.dropOffTimestamp = now;
    p.deliveredAt = now;
    p.autoDeliveredByOffice = true;
    p.receivedByAgent = agent;

    parcels[index] = p;
    this.saveParcels([...parcels]);

    // Incrementar paquetes en oficina aliada
    office.packagesReceived = (office.packagesReceived || 0) + 1;
    this.saveAlliedOffices([...offices]);

    // Registrar automáticamente el ingreso financiero por la guía entregada
    const commRate = this.getStoredSettings().commissionRate || 10;
    const commAmount = Number(((p.fare * commRate) / 100).toFixed(2));
    this.recordFinancialTransaction({
      type: 'INGRESO',
      category: 'cobro_encomienda',
      amount: p.fare,
      commissionAmount: commAmount,
      netPlatformEffect: commAmount,
      paymentMethod: p.paymentMethod === 'Transferencia' ? 'Transferencia Bancaria' : 'Efectivo',
      description: `Cobro Guía ${p.guideNumber || p.id} entregada en ${office.shortName}`,
      referenceNumber: p.guideNumber || p.id,
      canton: office.canton,
      involvedUser: {
        id: p.assignedUnitId || 'OFICINA',
        name: p.assignedDriver || agent,
        role: 'conductor',
        unitId: p.assignedUnitId || undefined,
      },
      status: 'procesado',
    });

    return {
      success: true,
      parcel: p,
      message: `¡Guía ${p.id} (${p.guideNumber || p.id}) marcada automáticamente como DESPACHADA Y ENTREGADA en ${office.name}! Recibido por: ${agent}`,
    };
  }

  /**
   * Descarga automática por conductor en oficina aliada:
   * Cuando el conductor llega a la oficina aliada y deja las encomiendas,
   * todas las guías asignadas a esa unidad se marcan automáticamente como despachadas y entregadas.
   */
  public static autoDropoffByDriverUnit(
    unitId: string,
    officeId: string
  ): { updatedCount: number; parcels: ParcelModel[]; message: string } {
    const parcels = this.getStoredParcels();
    const offices = this.getStoredAlliedOffices();
    const office = offices.find((o) => o.id === officeId) || offices[0];
    const now = new Date().toISOString();

    const affected: ParcelModel[] = [];

    const updated = parcels.map((p) => {
      // Si la encomienda está asignada a esta unidad y no está cancelada ni entregada previamente
      if (p.assignedUnitId === unitId && p.status !== 'entregado' && p.status !== 'cancelado') {
        const modified: ParcelModel = {
          ...p,
          status: 'entregado',
          dropOffOfficeId: office.id,
          dropOffOfficeName: office.name,
          dropOffTimestamp: now,
          deliveredAt: now,
          autoDeliveredByOffice: true,
          receivedByAgent: office.agentName,
        };
        affected.push(modified);
        return modified;
      }
      return p;
    });

    if (affected.length > 0) {
      this.saveParcels(updated);
      office.packagesReceived = (office.packagesReceived || 0) + affected.length;
      this.saveAlliedOffices([...offices]);
      return {
        updatedCount: affected.length,
        parcels: affected,
        message: `${affected.length} guía(s) marcada(s) automáticamente como DESPACHADAS Y ENTREGADAS en ${office.name}. Conductor: ${unitId}`,
      };
    }

    return {
      updatedCount: 0,
      parcels: [],
      message: `No se encontraron encomiendas pendientes para la unidad ${unitId}.`,
    };
  }

  // --- CONFIGURACIÓN DE LA PLATAFORMA ---
  public static getInitialSettings(): PlatformSettings {
    return {
      commissionRate: 10, // 10% de comisión estándar
      enableSound: true,
      autoDispatch: false,
      defaultCanton: 'Tulcán',
      companyName: 'AndesMovi Ecuador',
      contactPhone: '+593 99 856 6503',
      emergencyPhone: '911 ECU-911',
      firebaseActive: false,
      firestoreCollection: 'viajes',
    };
  }

  public static getStoredSettings(): PlatformSettings {
    if (typeof window === 'undefined') return this.getInitialSettings();
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      const initial = this.getInitialSettings();
      this.saveSettings(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed.contactPhone === '06-2980-450 / 0984123890') {
        parsed.contactPhone = '+593 99 856 6503';
      }
      return { ...this.getInitialSettings(), ...parsed };
    } catch {
      return this.getInitialSettings();
    }
  }

  public static saveSettings(settings: PlatformSettings): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  }

  // --- DIRECT REGISTRATION DE NUEVO CHOFER / UNIDAD ---
  public static registerNewDriverAndUnit(driverData: {
    driverName: string;
    vehicle: string;
    plate: string;
    canton: string;
    phone: string;
    cooperative: string;
    initialUnitNumber?: string;
  }): FleetUnit {
    const units = this.getStoredUnits();
    const numVal = driverData.initialUnitNumber
      ? parseInt(driverData.initialUnitNumber.replace(/\D/g, ''), 10) || (units.length + 1)
      : units.length + 1;

    const unitId = driverData.initialUnitNumber
      ? `AM-${driverData.initialUnitNumber.padStart(3, '0')}`
      : `AM-${numVal.toString().padStart(3, '0')}`;

    const newUnit: FleetUnit = {
      id: unitId,
      unitNumber: numVal,
      driverName: driverData.driverName,
      vehicle: driverData.vehicle,
      plate: driverData.plate.toUpperCase(),
      status: 'disponible',
      canton: driverData.canton,
      rating: 5.0,
      completedTrips: 0,
      phone: driverData.phone,
      cooperative: driverData.cooperative,
      lat: 0.8116 + (Math.random() - 0.5) * 0.015,
      lng: -77.7173 + (Math.random() - 0.5) * 0.015,
      batteryLevel: 98,
      lastUpdated: 'Registrado ahora',
    };

    const updated = [newUnit, ...units];
    this.saveUnits(updated);
    return newUnit;
  }

  // --- MÓDULO DE SOCIOS INVERSIONISTAS PARTICULARES ---
  public static getInitialSocios(): SocioModel[] {
    return [
      {
        id: 'SOC-001',
        fullName: 'Dr. Fausto Revelo Narváez',
        nationalId: '0401298412',
        phone: '0984123890',
        email: 'fausto.revelo@gmail.com',
        cooperative: 'Inversionista Particular',
        assignedUnits: [],
        joinDate: '2025-01-15',
        status: 'activo',
        investedCapital: 5000.00,
        bankAccount: {
          bank: 'Banco Pichincha',
          accountType: 'Ahorros',
          accountNumber: '2204918201',
        },
        totalEarningsGross: 1420.50,
        platformCommissionPaid: 142.05,
        netPayout: 1278.45,
        lastAppLogin: 'Hoy, 08:30 AM',
        appLoginsCount: 48,
        monthlyDuePaid: true,
      },
      {
        id: 'SOC-002',
        fullName: 'Lic. Gladys Paspuel Huertas',
        nationalId: '0400874102',
        phone: '0993874102',
        email: 'gladys.paspuel@gmail.com',
        cooperative: 'Inversionista Particular',
        assignedUnits: [],
        joinDate: '2025-02-10',
        status: 'activo',
        investedCapital: 3500.00,
        bankAccount: {
          bank: 'Banco Pichincha',
          accountType: 'Ahorros',
          accountNumber: '102049182',
        },
        totalEarningsGross: 890.00,
        platformCommissionPaid: 89.00,
        netPayout: 801.00,
        lastAppLogin: 'Hoy, 09:12 AM',
        appLoginsCount: 35,
        monthlyDuePaid: true,
      },
      {
        id: 'SOC-003',
        fullName: 'Ing. Byron Narváez Montenegro',
        nationalId: '1002348190',
        phone: '0982736192',
        email: 'byron.narvaez@gmail.com',
        cooperative: 'Inversionista Particular',
        assignedUnits: [],
        joinDate: '2025-03-01',
        status: 'activo',
        investedCapital: 4000.00,
        bankAccount: {
          bank: 'Banco del Pacífico',
          accountType: 'Corriente',
          accountNumber: '7829104',
        },
        totalEarningsGross: 1150.75,
        platformCommissionPaid: 115.08,
        netPayout: 1035.67,
        lastAppLogin: 'Ayer, 18:45 PM',
        appLoginsCount: 29,
        monthlyDuePaid: true,
      },
    ];
  }

  public static getStoredSocios(): SocioModel[] {
    if (typeof window === 'undefined') return this.getInitialSocios();
    const data = localStorage.getItem(STORAGE_KEYS.SOCIOS);
    if (!data) {
      const initial = this.getInitialSocios();
      this.saveSocios(initial);
      return initial;
    }
    try {
      const parsed: SocioModel[] = JSON.parse(data);
      // Limpiar cualquier referencia antigua a cooperativas de taxis o cupos
      const cleaned = parsed.map(s => ({
        ...s,
        cooperative: 'Inversionista Particular',
        assignedUnits: [],
        investedCapital: s.investedCapital ?? 2500,
      }));
      return cleaned;
    } catch {
      return this.getInitialSocios();
    }
  }

  public static saveSocios(socios: SocioModel[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SOCIOS, JSON.stringify(socios));
    }
  }

  public static addSocio(socioData: Omit<SocioModel, 'id' | 'joinDate' | 'totalEarningsGross' | 'platformCommissionPaid' | 'netPayout' | 'appLoginsCount'>): SocioModel {
    const socios = this.getStoredSocios();
    const newSocio: SocioModel = {
      ...socioData,
      id: `SOC-${(socios.length + 1).toString().padStart(3, '0')}`,
      joinDate: new Date().toISOString().split('T')[0],
      totalEarningsGross: 0,
      platformCommissionPaid: 0,
      netPayout: 0,
      appLoginsCount: 1,
      lastAppLogin: 'Registrado ahora',
    };
    const updated = [newSocio, ...socios];
    this.saveSocios(updated);
    return newSocio;
  }

  public static updateSocio(id: string, patch: Partial<SocioModel>): void {
    const socios = this.getStoredSocios();
    const idx = socios.findIndex((s) => s.id === id);
    if (idx !== -1) {
      socios[idx] = { ...socios[idx], ...patch };
      this.saveSocios([...socios]);
    }
  }

  // --- TRANSACCIONES DE ENTRADAS A LA APP (INGRESOS EN VIVO) ---
  public static getInitialRevenueTransactions(): AppRevenueTransaction[] {
    return [
      {
        id: 'TX-REV-101',
        timestamp: 'Hoy, 09:45 AM',
        type: 'carrera',
        description: 'Comisión carrera Terminal Terrestre - Rumichaca ($3.50)',
        unitId: 'AM-012',
        socioName: 'Fausto Revelo',
        grossAmount: 3.50,
        platformFee: 0.35,
        netPartnerAmount: 3.15,
        paymentMethod: 'Efectivo',
      },
      {
        id: 'TX-REV-102',
        timestamp: 'Hoy, 09:20 AM',
        type: 'carrera',
        description: 'Comisión carrera Hospital Luis G. Dávila - Centro ($2.50)',
        unitId: 'AM-028',
        socioName: 'Gladys Paspuel',
        grossAmount: 2.50,
        platformFee: 0.25,
        netPartnerAmount: 2.25,
        paymentMethod: 'Transferencia',
      },
      {
        id: 'TX-REV-103',
        timestamp: 'Hoy, 08:50 AM',
        type: 'encomienda',
        description: 'Comisión envío paquete Farmacia San Francisco ($4.50)',
        unitId: 'AM-035',
        socioName: 'Byron Narváez',
        grossAmount: 4.50,
        platformFee: 0.45,
        netPartnerAmount: 4.05,
        paymentMethod: 'Efectivo',
      },
      {
        id: 'TX-REV-104',
        timestamp: 'Hoy, 08:00 AM',
        type: 'cuota_socio',
        description: 'Aporte cuota mensual de plataforma AndesMovi Socio #001',
        socioName: 'Fausto Revelo',
        grossAmount: 15.00,
        platformFee: 15.00,
        netPartnerAmount: 0.00,
        paymentMethod: 'Transferencia',
      },
      {
        id: 'TX-REV-105',
        timestamp: 'Ayer, 21:15 PM',
        type: 'carrera',
        description: 'Comisión intercantonal Tulcán - San Gabriel ($12.00)',
        unitId: 'AM-050',
        socioName: 'Germán Montenegro',
        grossAmount: 12.00,
        platformFee: 1.20,
        netPartnerAmount: 10.80,
        paymentMethod: 'Transferencia',
      },
    ];
  }

  public static getStoredRevenueTransactions(): AppRevenueTransaction[] {
    if (typeof window === 'undefined') return this.getInitialRevenueTransactions();
    const data = localStorage.getItem(STORAGE_KEYS.REVENUE_TXS);
    if (!data) {
      const initial = this.getInitialRevenueTransactions();
      this.saveRevenueTransactions(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialRevenueTransactions();
    }
  }

  public static saveRevenueTransactions(txs: AppRevenueTransaction[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.REVENUE_TXS, JSON.stringify(txs));
    }
  }

  public static recordRevenueTransaction(txData: Omit<AppRevenueTransaction, 'id' | 'timestamp'>): AppRevenueTransaction {
    const txs = this.getStoredRevenueTransactions();
    const newTx: AppRevenueTransaction = {
      ...txData,
      id: `TX-REV-${(txs.length + 101).toString()}`,
      timestamp: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [newTx, ...txs];
    this.saveRevenueTransactions(updated);
    return newTx;
  }

  // ==========================================================================
  // MÓDULO DE CONTROL DE INGRESOS Y EGRESOS (FINANZAS DE ANDES MOVI)
  // ==========================================================================

  public static getInitialFinancialTransactions(): FinancialTransaction[] {
    const now = Date.now();
    const hourMs = 3600 * 1000;
    const dayMs = 24 * hourMs;

    return [
      // --- MOVIMIENTOS DE HOY ---
      {
        id: 'FIN-2026-101',
        type: 'INGRESO',
        category: 'recarga_conductor',
        amount: 25.00,
        commissionAmount: 25.00,
        netPlatformEffect: 25.00,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Recarga de saldo billetera operativa Conductor AM-012 (Marco Rosero)',
        referenceNumber: 'REC-PICH-88412',
        canton: 'Tulcán',
        createdAt: new Date(now - 1 * hourMs).toISOString(),
        involvedUser: {
          id: 'DRV-012',
          name: 'Marco Rosero',
          role: 'conductor',
          unitId: 'AM-012',
          phone: '0984123890',
        },
        status: 'procesado',
        notes: 'Acreditación inmediata para descuento automático de comisiones de viajes',
      },
      {
        id: 'FIN-2026-102',
        type: 'INGRESO',
        category: 'cobro_encomienda',
        amount: 6.00,
        commissionAmount: 0.90,
        netPlatformEffect: 0.90,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Cobro servicio de encomienda GUIA-ANDES-004 (Tulcán -> Quito Carcelén)',
        referenceNumber: 'GUIA-ANDES-004',
        canton: 'Quito Norte',
        createdAt: new Date(now - 2 * hourMs).toISOString(),
        involvedUser: {
          id: 'DRV-072',
          name: 'Wilson Andrade',
          role: 'conductor',
          unitId: 'AM-072',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-103',
        type: 'INGRESO',
        category: 'recarga_cliente',
        amount: 40.00,
        commissionAmount: 4.00,
        netPlatformEffect: 40.00,
        paymentMethod: 'DeUna / QR Pichincha',
        description: 'Recarga de saldo corporativo Farmacia San Francisco (Envíos y Carreras)',
        referenceNumber: 'DEUNA-992014',
        canton: 'Tulcán',
        createdAt: new Date(now - 3.5 * hourMs).toISOString(),
        involvedUser: {
          id: 'CLI-201',
          name: 'Farmacia San Francisco (Convenio)',
          role: 'cliente',
          phone: '0981234567',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-104',
        type: 'INGRESO',
        category: 'cobro_viaje',
        amount: 12.00,
        commissionAmount: 1.44,
        netPlatformEffect: 1.44,
        paymentMethod: 'Billetera AndesMovi',
        description: 'Viaje ejecutivo intercantonal Tulcán - San Gabriel (TRIP-EC-104)',
        referenceNumber: 'TRIP-EC-104',
        canton: 'Montúfar / San Gabriel',
        createdAt: new Date(now - 4 * hourMs).toISOString(),
        involvedUser: {
          id: 'DRV-035',
          name: 'Byron Narváez',
          role: 'conductor',
          unitId: 'AM-035',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-105',
        type: 'EGRESO',
        category: 'liquidacion_conductor',
        amount: 18.50,
        commissionAmount: 2.05,
        netPlatformEffect: -18.50,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Pago / Liquidación de carreras corporativas a conductor Unidad AM-028',
        referenceNumber: 'LIQ-2026-049',
        canton: 'Tulcán',
        createdAt: new Date(now - 5 * hourMs).toISOString(),
        involvedUser: {
          id: 'DRV-028',
          name: 'Edwin Paspuel',
          role: 'conductor',
          unitId: 'AM-028',
        },
        status: 'procesado',
        notes: 'Liquidación neta descontada comisión del 10% de plataforma',
      },
      {
        id: 'FIN-2026-106',
        type: 'INGRESO',
        category: 'recarga_conductor',
        amount: 15.00,
        commissionAmount: 15.00,
        netPlatformEffect: 15.00,
        paymentMethod: 'Efectivo',
        description: 'Recarga de saldo en ventanilla Central Tulcán - Moto Encomiendas AM-M01',
        referenceNumber: 'REC-VENT-301',
        canton: 'Tulcán',
        createdAt: new Date(now - 6 * hourMs).toISOString(),
        involvedUser: {
          id: 'DRV-M01',
          name: 'Kevin Chamorro',
          role: 'conductor',
          unitId: 'AM-M01',
        },
        status: 'procesado',
      },
      // --- MOVIMIENTOS DE ESTA SEMANA (HACE 2 A 5 DÍAS) ---
      {
        id: 'FIN-2026-107',
        type: 'INGRESO',
        category: 'cuota_cooperativa',
        amount: 75.00,
        commissionAmount: 75.00,
        netPlatformEffect: 75.00,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Pago mensualidad de despacho satelital 5 unidades Coop. Rápido Nacional',
        referenceNumber: 'FAC-001-004912',
        canton: 'Tulcán',
        createdAt: new Date(now - 2 * dayMs).toISOString(),
        involvedUser: {
          id: 'SOC-001',
          name: 'Dr. Fausto Revelo Narváez',
          role: 'socio',
          unitId: 'AM-012',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-108',
        type: 'EGRESO',
        category: 'mantenimiento_repetidora',
        amount: 22.00,
        commissionAmount: 0,
        netPlatformEffect: -22.00,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Gasto operativo: Enlace fibra óptica y energía Repetidora VHF Cerro Troya',
        referenceNumber: 'EGR-TROYA-19',
        canton: 'Tulcán',
        createdAt: new Date(now - 3 * dayMs).toISOString(),
        involvedUser: {
          id: 'ADM-01',
          name: 'Administración Central Andes Movi',
          role: 'administracion',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-109',
        type: 'INGRESO',
        category: 'cobro_encomienda',
        amount: 28.50,
        commissionAmount: 4.28,
        netPlatformEffect: 4.28,
        paymentMethod: 'Efectivo',
        description: 'Lote de 8 guías despachadas Agencia Aliada Rumichaca Frontera',
        referenceNumber: 'LOTE-RUM-088',
        canton: 'Tulcán / Frontera',
        createdAt: new Date(now - 4 * dayMs).toISOString(),
        involvedUser: {
          id: 'OFI-RUM-02',
          name: 'Ing. Sandra Guerrón (Agencia Rumichaca)',
          role: 'oficina_aliada',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-110',
        type: 'EGRESO',
        category: 'comision_retenida',
        amount: 14.00,
        commissionAmount: 14.00,
        netPlatformEffect: -14.00,
        paymentMethod: 'Efectivo',
        description: 'Pago comisión de recepción a Agencia Aliada San Gabriel Terminal',
        referenceNumber: 'COM-OFI-SG03',
        canton: 'Montúfar / San Gabriel',
        createdAt: new Date(now - 5 * dayMs).toISOString(),
        involvedUser: {
          id: 'OFI-SG-03',
          name: 'Sr. Gonzalo Pozo (San Gabriel)',
          role: 'oficina_aliada',
        },
        status: 'procesado',
      },
      // --- MOVIMIENTOS DE ESTE MES (HACE 10 A 18 DÍAS) ---
      {
        id: 'FIN-2026-111',
        type: 'INGRESO',
        category: 'recarga_conductor',
        amount: 120.00,
        commissionAmount: 120.00,
        netPlatformEffect: 120.00,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Paquete recargas prepago flota interprovincial Carchi - Imbabura (6 unidades)',
        referenceNumber: 'REC-FLOTA-901',
        canton: 'Ibarra',
        createdAt: new Date(now - 11 * dayMs).toISOString(),
        involvedUser: {
          id: 'SOC-003',
          name: 'Ing. Byron Narváez Montenegro',
          role: 'socio',
          unitId: 'AM-035',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-112',
        type: 'EGRESO',
        category: 'gasto_operativo',
        amount: 35.00,
        commissionAmount: 0,
        netPlatformEffect: -35.00,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Impresión de talonarios térmicos de Guías de Encomienda y sellos de seguridad',
        referenceNumber: 'FAC-IMP-2210',
        canton: 'Tulcán',
        createdAt: new Date(now - 14 * dayMs).toISOString(),
        involvedUser: {
          id: 'ADM-01',
          name: 'Administración Central Andes Movi',
          role: 'administracion',
        },
        status: 'procesado',
      },
      {
        id: 'FIN-2026-113',
        type: 'EGRESO',
        category: 'liquidacion_conductor',
        amount: 45.00,
        commissionAmount: 5.00,
        netPlatformEffect: -45.00,
        paymentMethod: 'Transferencia Bancaria',
        description: 'Liquidación quincenal de envíos intercantonales Unidad AM-072',
        referenceNumber: 'LIQ-2026-031',
        canton: 'Quito Norte',
        createdAt: new Date(now - 16 * dayMs).toISOString(),
        involvedUser: {
          id: 'DRV-072',
          name: 'Wilson Andrade',
          role: 'conductor',
          unitId: 'AM-072',
        },
        status: 'procesado',
      },
    ];
  }

  public static getStoredFinancialTransactions(): FinancialTransaction[] {
    if (typeof window === 'undefined') return this.getInitialFinancialTransactions();
    const data = localStorage.getItem(STORAGE_KEYS.FINANCIAL_TXS);
    if (!data) {
      const initial = this.getInitialFinancialTransactions();
      this.saveFinancialTransactions(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialFinancialTransactions();
    }
  }

  public static saveFinancialTransactions(txs: FinancialTransaction[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FINANCIAL_TXS, JSON.stringify(txs));
    }
  }

  public static recordFinancialTransaction(
    txData: Omit<FinancialTransaction, 'id' | 'createdAt'> & { createdAt?: string }
  ): FinancialTransaction {
    const txs = this.getStoredFinancialTransactions();
    const newTx: FinancialTransaction = {
      ...txData,
      id: `FIN-2026-${(txs.length + 101).toString()}`,
      createdAt: txData.createdAt || new Date().toISOString(),
    };
    const updated = [newTx, ...txs];
    this.saveFinancialTransactions(updated);
    return newTx;
  }

  public static deleteFinancialTransaction(id: string): void {
    const txs = this.getStoredFinancialTransactions();
    this.saveFinancialTransactions(txs.filter((t) => t.id !== id));
  }

  // --- BILLETERAS Y SALDOS DE CONDUCTORES / CLIENTES ---
  public static getInitialWallets(): UserWalletBalance[] {
    return [
      {
        id: 'WAL-AM-012',
        ownerId: 'DRV-012',
        ownerName: 'Marco Rosero',
        ownerRole: 'conductor',
        unitId: 'AM-012',
        plate: 'PBC-4921',
        balance: 28.50,
        totalRecharged: 85.00,
        totalCommissionDeducted: 16.50,
        totalLiquidated: 40.00,
        lastMovementAt: 'Hace 1 hora',
        status: 'activo',
      },
      {
        id: 'WAL-AM-028',
        ownerId: 'DRV-028',
        ownerName: 'Edwin Paspuel',
        ownerRole: 'conductor',
        unitId: 'AM-028',
        plate: 'IBC-8120',
        balance: 14.20,
        totalRecharged: 50.00,
        totalCommissionDeducted: 17.30,
        totalLiquidated: 18.50,
        lastMovementAt: 'Hace 3 horas',
        status: 'activo',
      },
      {
        id: 'WAL-AM-035',
        ownerId: 'DRV-035',
        ownerName: 'Byron Narváez',
        ownerRole: 'conductor',
        unitId: 'AM-035',
        plate: 'PBI-2049',
        balance: 32.00,
        totalRecharged: 90.00,
        totalCommissionDeducted: 23.00,
        totalLiquidated: 35.00,
        lastMovementAt: 'Hoy, 09:30 AM',
        status: 'activo',
      },
      {
        id: 'WAL-AM-M01',
        ownerId: 'DRV-M01',
        ownerName: 'Kevin Chamorro (Moto Express)',
        ownerRole: 'conductor',
        unitId: 'AM-M01',
        plate: 'IA-492K',
        balance: 19.75,
        totalRecharged: 35.00,
        totalCommissionDeducted: 5.25,
        totalLiquidated: 10.00,
        lastMovementAt: 'Hoy, 08:15 AM',
        status: 'activo',
      },
      {
        id: 'WAL-AM-050',
        ownerId: 'DRV-050',
        ownerName: 'Germán Montenegro',
        ownerRole: 'conductor',
        unitId: 'AM-050',
        plate: 'CBA-3190',
        balance: 2.10,
        totalRecharged: 25.00,
        totalCommissionDeducted: 12.90,
        totalLiquidated: 10.00,
        lastMovementAt: 'Ayer, 19:40 PM',
        status: 'bloqueado_saldo_bajo',
      },
      {
        id: 'WAL-CLI-201',
        ownerId: 'CLI-201',
        ownerName: 'Farmacia San Francisco (Cliente Corporativo)',
        ownerRole: 'cliente',
        balance: 46.50,
        totalRecharged: 120.00,
        totalCommissionDeducted: 0,
        totalLiquidated: 73.50,
        lastMovementAt: 'Hace 2 horas',
        status: 'activo',
      },
      {
        id: 'WAL-CLI-202',
        ownerId: 'CLI-202',
        ownerName: 'Importadora Andina Carchi (Cliente Convenio)',
        ownerRole: 'cliente',
        balance: 64.00,
        totalRecharged: 150.00,
        totalCommissionDeducted: 0,
        totalLiquidated: 86.00,
        lastMovementAt: 'Ayer, 16:10 PM',
        status: 'activo',
      },
    ];
  }

  public static getStoredWallets(): UserWalletBalance[] {
    if (typeof window === 'undefined') return this.getInitialWallets();
    const data = localStorage.getItem(STORAGE_KEYS.WALLETS);
    if (!data) {
      const initial = this.getInitialWallets();
      this.saveWallets(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialWallets();
    }
  }

  public static saveWallets(wallets: UserWalletBalance[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
    }
  }

  public static rechargeUserWallet(
    walletId: string,
    amount: number,
    paymentMethod: FinancialTransaction['paymentMethod'],
    referenceNumber?: string,
    canton: string = 'Tulcán'
  ): { wallet: UserWalletBalance | null; transaction: FinancialTransaction | null } {
    const wallets = this.getStoredWallets();
    const idx = wallets.findIndex((w) => w.id === walletId);
    if (idx === -1) return { wallet: null, transaction: null };

    const w = wallets[idx];
    w.balance = Number((w.balance + amount).toFixed(2));
    w.totalRecharged = Number((w.totalRecharged + amount).toFixed(2));
    w.lastMovementAt = 'Hace instantes';
    w.status = w.balance >= 5 ? 'activo' : 'bloqueado_saldo_bajo';
    wallets[idx] = w;
    this.saveWallets([...wallets]);

    const tx = this.recordFinancialTransaction({
      type: 'INGRESO',
      category: w.ownerRole === 'conductor' ? 'recarga_conductor' : 'recarga_cliente',
      amount,
      commissionAmount: w.ownerRole === 'conductor' ? amount : Number((amount * 0.1).toFixed(2)),
      netPlatformEffect: amount,
      paymentMethod,
      description: `Recarga de saldo Billetera ${w.ownerRole === 'conductor' ? `Unidad ${w.unitId}` : 'Cliente'} - ${w.ownerName}`,
      referenceNumber: referenceNumber || `REC-${Date.now().toString().slice(-5)}`,
      canton,
      involvedUser: {
        id: w.ownerId,
        name: w.ownerName,
        role: w.ownerRole,
        unitId: w.unitId,
      },
      status: 'procesado',
    });

    return { wallet: w, transaction: tx };
  }

  public static liquidateDriverWallet(
    walletId: string,
    amount: number,
    paymentMethod: FinancialTransaction['paymentMethod'],
    referenceNumber?: string,
    canton: string = 'Tulcán'
  ): { wallet: UserWalletBalance | null; transaction: FinancialTransaction | null } {
    const wallets = this.getStoredWallets();
    const idx = wallets.findIndex((w) => w.id === walletId);
    if (idx === -1) return { wallet: null, transaction: null };

    const w = wallets[idx];
    const commRate = this.getStoredSettings().commissionRate || 10;
    const retainedComm = Number(((amount * commRate) / 100).toFixed(2));
    const netDisbursed = Number((amount - retainedComm).toFixed(2));

    w.balance = Math.max(0, Number((w.balance - amount).toFixed(2)));
    w.totalLiquidated = Number((w.totalLiquidated + netDisbursed).toFixed(2));
    w.totalCommissionDeducted = Number((w.totalCommissionDeducted + retainedComm).toFixed(2));
    w.lastMovementAt = 'Liquidado ahora';
    w.status = w.balance >= 5 ? 'activo' : 'bloqueado_saldo_bajo';
    wallets[idx] = w;
    this.saveWallets([...wallets]);

    const tx = this.recordFinancialTransaction({
      type: 'EGRESO',
      category: 'liquidacion_conductor',
      amount: netDisbursed,
      commissionAmount: retainedComm,
      netPlatformEffect: -netDisbursed,
      paymentMethod,
      description: `Liquidación a Conductor ${w.ownerName} (Placa: ${w.plate || 'Particular'}) • Retención comisión $${retainedComm.toFixed(2)}`,
      referenceNumber: referenceNumber || `LIQ-${Date.now().toString().slice(-5)}`,
      canton,
      involvedUser: {
        id: w.ownerId,
        name: w.ownerName,
        plate: w.plate,
        role: 'conductor',
        unitId: w.unitId,
      },
      status: 'procesado',
    });

    return { wallet: w, transaction: tx };
  }

  // ==========================================================================
  // BANDEJA DE SOLICITUDES DE RECARGA DE CONDUCTORES (VALIDACIÓN BANCARIA)
  // ==========================================================================

  /**
   * Genera una captura de comprobante bancario nítida en formato SVG Data URI
   * para cada banco ecuatoriano soportado (Pichincha, Deuna!, Guayaquil, Produbanco, Austro)
   */
  public static generateBankReceiptSvgDataUri(params: {
    bank: SupportedRechargeBank;
    amount: number;
    reference: string;
    driverName: string;
    dateStr: string;
  }): string {
    const { bank, amount, reference, driverName, dateStr } = params;

    let headerBg = '#facc15';
    let headerText = '#0f172a';
    let accentColor = '#ca8a04';
    let bankSubtitle = 'Banca Móvil Oficial';

    if (bank === 'Deuna! / Banco Pichincha') {
      headerBg = '#6d28d9';
      headerText = '#ffffff';
      accentColor = '#7c3aed';
      bankSubtitle = 'Pago Instantáneo QR / Deuna!';
    } else if (bank === 'Banco Guayaquil') {
      headerBg = '#d90479';
      headerText = '#ffffff';
      accentColor = '#be185d';
      bankSubtitle = 'Banca Virtual • Transferencia Directa';
    } else if (bank === 'Produbanco') {
      headerBg = '#15803d';
      headerText = '#ffffff';
      accentColor = '#166534';
      bankSubtitle = 'Grupo Promerica • Comprobante Digital';
    } else if (bank === 'Banco del Austro') {
      headerBg = '#1d4ed8';
      headerText = '#ffffff';
      accentColor = '#1e40af';
      bankSubtitle = 'AustroDigital • Transferencia Exitosa';
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="540" viewBox="0 0 420 540">
      <rect width="420" height="540" rx="24" fill="#f8fafc"/>
      <rect x="12" y="12" width="396" height="516" rx="18" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="12" y="12" width="396" height="96" rx="18" fill="${headerBg}"/>
      <text x="34" y="54" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="${headerText}">${bank}</text>
      <text x="34" y="78" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${headerText}" opacity="0.85">${bankSubtitle}</text>
      <circle cx="210" cy="146" r="24" fill="#dcfce7" stroke="#16a34a" stroke-width="2.5"/>
      <path d="M200 146 l7 7 l14 -14" stroke="#16a34a" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="210" y="192" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#15803d">¡TRANSFERENCIA EXITOSA!</text>
      <text x="210" y="232" text-anchor="middle" font-family="Courier New, monospace" font-size="34" font-weight="900" fill="#0f172a">$${amount.toFixed(2)} USD</text>
      <line x1="36" y1="256" x2="384" y2="256" stroke="#cbd5e1" stroke-dasharray="5,5" stroke-width="1.5"/>
      <text x="38" y="290" font-family="Arial, sans-serif" font-size="11" fill="#64748b" font-weight="bold">NRO. COMPROBANTE:</text>
      <text x="382" y="290" text-anchor="end" font-family="Courier New, monospace" font-size="13" fill="#0f172a" font-weight="bold">#${reference}</text>
      <text x="38" y="325" font-family="Arial, sans-serif" font-size="11" fill="#64748b" font-weight="bold">FECHA Y HORA:</text>
      <text x="382" y="325" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#1e293b" font-weight="bold">${dateStr}</text>
      <text x="38" y="360" font-family="Arial, sans-serif" font-size="11" fill="#64748b" font-weight="bold">ORDENANTE (CONDUCTOR):</text>
      <text x="382" y="360" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#0f172a" font-weight="bold">${driverName}</text>
      <text x="38" y="395" font-family="Arial, sans-serif" font-size="11" fill="#64748b" font-weight="bold">BENEFICIARIO:</text>
      <text x="382" y="395" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#0f172a" font-weight="bold">ANDES MOVI RECARGAS</text>
      <text x="38" y="430" font-family="Arial, sans-serif" font-size="11" fill="#64748b" font-weight="bold">CONCEPTO:</text>
      <text x="382" y="430" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="${accentColor}" font-weight="bold">Recarga Billetera Conductor</text>
      <rect x="34" y="458" width="352" height="44" rx="10" fill="#f1f5f9"/>
      <text x="210" y="484" text-anchor="middle" font-family="Courier New, monospace" font-size="11" fill="#475569" font-weight="bold">VALIDADO POR SISTEMA CONTABLE ANDES MOVI</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  public static getInitialRechargeRequests(): DriverRechargeRequest[] {
    const now = Date.now();
    const minMs = 60 * 1000;

    return [
      {
        id: 'REC-SOL-101',
        driverId: 'DRV-012',
        driverName: 'Marco Rosero',
        driverNationalId: '0401589210',
        driverPlate: 'PBC-4921',
        driverVehicle: 'Chevrolet Sail Sedán Particular',
        driverPhone: '0984123890',
        bankMethod: 'Deuna! / Banco Pichincha',
        reportedAmount: 25.00,
        referenceNumber: 'DEUNA-8849201',
        receiptImageUrl: this.generateBankReceiptSvgDataUri({
          bank: 'Deuna! / Banco Pichincha',
          amount: 25.00,
          reference: 'DEUNA-8849201',
          driverName: 'Marco Rosero',
          dateStr: 'Hoy, 11:42 AM',
        }),
        status: 'pendiente',
        submittedAt: new Date(now - 8 * minMs).toISOString(),
      },
      {
        id: 'REC-SOL-102',
        driverId: 'DRV-028',
        driverName: 'Edwin Paspuel',
        driverNationalId: '0400928174',
        driverPlate: 'IBC-8120',
        driverVehicle: 'Hyundai Accent Particular',
        driverPhone: '0991234567',
        bankMethod: 'Banco Pichincha',
        reportedAmount: 30.00,
        referenceNumber: 'PICH-5591024',
        receiptImageUrl: this.generateBankReceiptSvgDataUri({
          bank: 'Banco Pichincha',
          amount: 30.00,
          reference: 'PICH-5591024',
          driverName: 'Edwin Paspuel',
          dateStr: 'Hoy, 11:15 AM',
        }),
        status: 'pendiente',
        submittedAt: new Date(now - 24 * minMs).toISOString(),
      },
      {
        id: 'REC-SOL-103',
        driverId: 'DRV-035',
        driverName: 'Byron Narváez',
        driverNationalId: '1002348190',
        driverPlate: 'PBI-2049',
        driverVehicle: 'Kia Soluto Particular',
        driverPhone: '0982736192',
        bankMethod: 'Banco Guayaquil',
        reportedAmount: 20.00,
        referenceNumber: 'GYE-3301948',
        receiptImageUrl: this.generateBankReceiptSvgDataUri({
          bank: 'Banco Guayaquil',
          amount: 20.00,
          reference: 'GYE-3301948',
          driverName: 'Byron Narváez',
          dateStr: 'Hoy, 10:50 AM',
        }),
        status: 'pendiente',
        submittedAt: new Date(now - 45 * minMs).toISOString(),
      },
      {
        id: 'REC-SOL-104',
        driverId: 'DRV-M01',
        driverName: 'Kevin Chamorro',
        driverNationalId: '0401992831',
        driverPlate: 'IA-492K',
        driverVehicle: 'Bajaj Pulsar NS200 Particular',
        driverPhone: '0979112233',
        bankMethod: 'Produbanco',
        reportedAmount: 15.00,
        referenceNumber: 'PROD-7710293',
        receiptImageUrl: this.generateBankReceiptSvgDataUri({
          bank: 'Produbanco',
          amount: 15.00,
          reference: 'PROD-7710293',
          driverName: 'Kevin Chamorro',
          dateStr: 'Hoy, 10:10 AM',
        }),
        status: 'pendiente',
        submittedAt: new Date(now - 85 * minMs).toISOString(),
      },
      {
        id: 'REC-SOL-105',
        driverId: 'DRV-050',
        driverName: 'Germán Montenegro',
        driverNationalId: '0401567823',
        driverPlate: 'CBA-3190',
        driverVehicle: 'Renault Logan Particular',
        driverPhone: '0994567812',
        bankMethod: 'Banco del Austro',
        reportedAmount: 40.00,
        referenceNumber: 'AUSTRO-119204',
        receiptImageUrl: this.generateBankReceiptSvgDataUri({
          bank: 'Banco del Austro',
          amount: 40.00,
          reference: 'AUSTRO-119204',
          driverName: 'Germán Montenegro',
          dateStr: 'Hoy, 09:30 AM',
        }),
        status: 'pendiente',
        submittedAt: new Date(now - 120 * minMs).toISOString(),
      },
    ];
  }

  public static getStoredRechargeRequests(): DriverRechargeRequest[] {
    if (typeof window === 'undefined') return this.getInitialRechargeRequests();
    const data = localStorage.getItem(STORAGE_KEYS.RECHARGE_REQUESTS);
    if (!data) {
      const initial = this.getInitialRechargeRequests();
      this.saveRechargeRequests(initial);
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return this.getInitialRechargeRequests();
    }
  }

  public static saveRechargeRequests(requests: DriverRechargeRequest[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.RECHARGE_REQUESTS, JSON.stringify(requests));
    }
  }

  public static submitDriverRechargeRequest(params: {
    driverName: string;
    driverNationalId: string;
    driverPlate: string;
    driverVehicle?: string;
    bankMethod: SupportedRechargeBank;
    reportedAmount: number;
    referenceNumber: string;
    receiptImageUrl?: string;
  }): DriverRechargeRequest {
    const current = this.getStoredRechargeRequests();
    const newId = `REC-SOL-${(current.length + 101).toString()}`;
    const receipt =
      params.receiptImageUrl ||
      this.generateBankReceiptSvgDataUri({
        bank: params.bankMethod,
        amount: params.reportedAmount,
        reference: params.referenceNumber,
        driverName: params.driverName,
        dateStr: 'Recién subido',
      });

    const newReq: DriverRechargeRequest = {
      id: newId,
      driverId: `DRV-${params.driverPlate.replace(/[^A-Z0-9]/gi, '')}`,
      driverName: params.driverName,
      driverNationalId: params.driverNationalId,
      driverPlate: params.driverPlate.toUpperCase(),
      driverVehicle: params.driverVehicle || 'Vehículo Particular',
      bankMethod: params.bankMethod,
      reportedAmount: params.reportedAmount,
      referenceNumber: params.referenceNumber,
      receiptImageUrl: receipt,
      status: 'pendiente',
      submittedAt: new Date().toISOString(),
    };

    const updated = [newReq, ...current];
    this.saveRechargeRequests(updated);
    return newReq;
  }

  /**
   * Aprueba una solicitud de recarga de conductor:
   * 1. Cambia el estatus de la recarga a 'aprobada'.
   * 2. Actualiza automáticamente el saldo en la billetera virtual del conductor.
   * 3. Registra el ingreso aprobado en el flujo de caja de Andes Movi.
   */
  public static approveDriverRechargeRequest(requestId: string): {
    success: boolean;
    request: DriverRechargeRequest | null;
    wallet: UserWalletBalance | null;
    transaction: FinancialTransaction | null;
    message: string;
  } {
    const requests = this.getStoredRechargeRequests();
    const reqIdx = requests.findIndex((r) => r.id === requestId);
    if (reqIdx === -1) {
      return {
        success: false,
        request: null,
        wallet: null,
        transaction: null,
        message: 'Solicitud de recarga no encontrada.',
      };
    }

    const req = requests[reqIdx];
    if (req.status === 'aprobada') {
      return {
        success: false,
        request: req,
        wallet: null,
        transaction: null,
        message: 'Esta solicitud ya fue aprobada anteriormente.',
      };
    }

    req.status = 'aprobada';
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = 'Administrador Central';
    requests[reqIdx] = req;
    this.saveRechargeRequests([...requests]);

    // Actualizar o crear la billetera virtual del conductor
    const wallets = this.getStoredWallets();
    let walletIdx = wallets.findIndex(
      (w) =>
        w.ownerName.toLowerCase() === req.driverName.toLowerCase() ||
        (w.plate && w.plate.toUpperCase() === req.driverPlate.toUpperCase())
    );

    let updatedWallet: UserWalletBalance;
    if (walletIdx !== -1) {
      const w = wallets[walletIdx];
      w.balance = Number((w.balance + req.reportedAmount).toFixed(2));
      w.totalRecharged = Number((w.totalRecharged + req.reportedAmount).toFixed(2));
      w.nationalId = w.nationalId || req.driverNationalId;
      w.plate = w.plate || req.driverPlate;
      w.lastMovementAt = 'Recarga aprobada ahora';
      w.status = w.balance >= 5 ? 'activo' : 'bloqueado_saldo_bajo';
      wallets[walletIdx] = w;
      updatedWallet = w;
    } else {
      updatedWallet = {
        id: `WAL-${req.driverPlate}`,
        ownerId: req.driverId,
        ownerName: req.driverName,
        nationalId: req.driverNationalId,
        ownerRole: 'conductor',
        plate: req.driverPlate,
        vehicle: req.driverVehicle || 'Vehículo Particular',
        balance: req.reportedAmount,
        totalRecharged: req.reportedAmount,
        totalCommissionDeducted: 0,
        totalLiquidated: 0,
        lastMovementAt: 'Recarga aprobada ahora',
        status: 'activo',
      };
      wallets.unshift(updatedWallet);
    }
    this.saveWallets([...wallets]);

    // Registrar automáticamente el ingreso en el flujo financiero de Andes Movi
    const tx = this.recordFinancialTransaction({
      type: 'INGRESO',
      category: 'recarga_conductor',
      amount: req.reportedAmount,
      commissionAmount: req.reportedAmount,
      netPlatformEffect: req.reportedAmount,
      paymentMethod: req.bankMethod,
      description: `Recarga aprobada (${req.bankMethod}) • Conductor: ${req.driverName} (${req.driverPlate})`,
      referenceNumber: req.referenceNumber,
      canton: 'Tulcán',
      involvedUser: {
        id: req.driverId,
        name: req.driverName,
        nationalId: req.driverNationalId,
        plate: req.driverPlate,
        role: 'conductor',
      },
      status: 'procesado',
    });

    return {
      success: true,
      request: req,
      wallet: updatedWallet,
      transaction: tx,
      message: `¡Recarga APROBADA! Se acreditaron +$${req.reportedAmount.toFixed(2)} USD a la billetera virtual de ${req.driverName} (Placa ${req.driverPlate}). Nuevo saldo: $${updatedWallet.balance.toFixed(2)} USD.`,
    };
  }

  public static rejectDriverRechargeRequest(
    requestId: string,
    reason: string = 'Comprobante ilegible o referencia no coincide'
  ): {
    success: boolean;
    request: DriverRechargeRequest | null;
    message: string;
  } {
    const requests = this.getStoredRechargeRequests();
    const idx = requests.findIndex((r) => r.id === requestId);
    if (idx === -1) {
      return { success: false, request: null, message: 'Solicitud no encontrada.' };
    }

    requests[idx].status = 'rechazada';
    requests[idx].reviewedAt = new Date().toISOString();
    requests[idx].rejectionReason = reason;
    this.saveRechargeRequests([...requests]);

    return {
      success: true,
      request: requests[idx],
      message: `Solicitud ${requestId} de ${requests[idx].driverName} marcada como RECHAZADA.`,
    };
  }

  public static deleteUnit(unitId: string): void {
    const current = this.getStoredUnits();
    const target = current.find((u) => u.id === unitId || u.plate.toUpperCase() === unitId.toUpperCase());
    const targetName = target ? target.driverName.toLowerCase() : '';
    const targetPlate = target ? target.plate.toUpperCase() : '';

    const updated = current.filter((u) => u.id !== unitId && u.plate.toUpperCase() !== unitId.toUpperCase());
    this.saveUnits(updated);

    // Clean from socios
    const socios = this.getStoredSocios();
    this.saveSocios(
      socios.filter(
        (s) =>
          s.id !== unitId &&
          (!targetName || s.fullName.toLowerCase() !== targetName) &&
          !s.assignedUnits.includes(unitId)
      )
    );

    // Clean from wallets
    const wallets = this.getStoredWallets();
    this.saveWallets(
      wallets.filter(
        (w) =>
          w.unitId !== unitId &&
          w.id !== unitId &&
          (!targetName || w.ownerName.toLowerCase() !== targetName) &&
          (!targetPlate || w.plate?.toUpperCase() !== targetPlate)
      )
    );

    // Clean from requests
    const reqs = this.getStoredRequests();
    this.saveRequests(
      reqs.filter(
        (r) =>
          r.id !== unitId &&
          (!targetName || r.name.toLowerCase() !== targetName) &&
          (!targetPlate || r.plate?.toUpperCase() !== targetPlate)
      )
    );
  }

  public static deleteVerificationRequest(reqId: string): void {
    const current = this.getStoredRequests();
    this.saveRequests(current.filter((r) => r.id !== reqId));
  }

  public static deleteDriverRechargeRequest(requestId: string): void {
    const current = this.getStoredRechargeRequests();
    this.saveRechargeRequests(current.filter((r) => r.id !== requestId));
  }

  public static deleteWallet(walletId: string): void {
    const wallets = this.getStoredWallets();
    this.saveWallets(wallets.filter((w) => w.id !== walletId));
  }

  public static deleteSocio(socioId: string): void {
    const socios = this.getStoredSocios();
    const target = socios.find((s) => s.id === socioId);
    const targetName = target ? target.fullName.toLowerCase() : '';

    const updated = socios.filter((s) => s.id !== socioId);
    this.saveSocios(updated);

    // Clean from units
    const units = this.getStoredUnits();
    this.saveUnits(
      units.filter(
        (u) =>
          u.id !== socioId &&
          (!targetName || u.driverName.toLowerCase() !== targetName)
      )
    );

    // Clean from wallets
    const wallets = this.getStoredWallets();
    this.saveWallets(
      wallets.filter(
        (w) =>
          w.id !== socioId &&
          (!targetName || w.ownerName.toLowerCase() !== targetName)
      )
    );
  }

  public static deleteParcel(parcelId: string): void {
    const parcels = this.getStoredParcels();
    this.saveParcels(parcels.filter((p) => p.id !== parcelId && p.guideNumber !== parcelId));
  }

  public static deleteAlliedOffice(officeId: string): void {
    const offices = this.getStoredAlliedOffices();
    this.saveAlliedOffices(offices.filter((o) => o.id !== officeId));
  }

  public static deleteDispatch(dispatchId: string): void {
    const dispatches = this.getStoredDispatches();
    this.saveDispatches(dispatches.filter((d) => d.id !== dispatchId));
  }

  public static deleteTariff(cantonName: string): void {
    const tariffs = this.getStoredTariffs();
    this.saveTariffs(tariffs.filter((t) => t.canton !== cantonName));
  }

  public static deleteAlert(alertId: string): void {
    const alerts = this.getStoredAlerts();
    this.saveAlerts(alerts.filter((a) => a.id !== alertId));
  }

  public static deleteTransmission(txId: string): void {
    const transmissions = this.getStoredTransmissions();
    this.saveTransmissions(transmissions.filter((t) => t.id !== txId));
  }

  public static async requestEmergencyAudio(unitId: string): Promise<string> {
    // This is a simulated high-security, compliant audio bridge check.
    // In a real production system, this would interface with a secure WebRTC server 
    // or live audio stream, restricted ONLY to confirmed SOS alerts.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`bridge_stream_active_${unitId}_${Date.now()}`);
      }, 1500);
    });
  }

  public static getExecutiveSchedules(): ExecutiveSchedule[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES);
    if (!saved) return [];
    try {
      const parsed: ExecutiveSchedule[] = JSON.parse(saved);
      // Clean out any old static demo cards (FREQ-*) as requested by user
      const cleanCards = parsed.filter(s => !s.id.startsWith('FREQ-'));
      if (cleanCards.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES, JSON.stringify(cleanCards));
      }
      return cleanCards;
    } catch {
      return [];
    }
  }

  public static clearAllExecutiveSchedules(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES, JSON.stringify([]));
  }

  public static saveExecutiveSchedule(schedule: ExecutiveSchedule): void {
    if (typeof window === 'undefined') return;
    const current = this.getExecutiveSchedules();
    const index = current.findIndex(s => s.id === schedule.id);
    if (index >= 0) {
      current[index] = schedule;
    } else {
      current.push(schedule);
    }
    localStorage.setItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES, JSON.stringify(current));
  }

  public static addPassengerToExecutiveSchedule(scheduleId: string, passenger: ExecutivePassenger): boolean {
    if (typeof window === 'undefined') return false;
    const current = this.getExecutiveSchedules();
    const index = current.findIndex(s => s.id === scheduleId);
    if (index >= 0) {
      const schedule = current[index];
      const list = schedule.passengersList || [];
      const updatedList = [...list, passenger];
      current[index] = {
        ...schedule,
        passengersList: updatedList,
        availableSeats: Math.max(0, schedule.totalSeats - updatedList.reduce((acc, p) => acc + p.seats, 0))
      };
      localStorage.setItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES, JSON.stringify(current));
      return true;
    }
    return false;
  }

  public static updatePassengerPickupStatus(
    scheduleId: string,
    passengerId: string,
    pickupStatus: 'pendiente' | 'en_camino' | 'a_bordo' | 'ausente'
  ): void {
    if (typeof window === 'undefined') return;
    const current = this.getExecutiveSchedules();
    const index = current.findIndex(s => s.id === scheduleId);
    if (index >= 0) {
      const schedule = current[index];
      const list = schedule.passengersList || [];
      const updatedList = list.map(p => p.id === passengerId ? { ...p, pickupStatus } : p);
      current[index] = {
        ...schedule,
        passengersList: updatedList
      };
      localStorage.setItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES, JSON.stringify(current));
    }
  }

  public static deleteExecutiveSchedule(id: string): void {
    if (typeof window === 'undefined') return;
    const current = this.getExecutiveSchedules();
    const filtered = current.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES, JSON.stringify(filtered));
  }

  // ==========================================================
  // CONTROL DE PERSONAL Y TRABAJADORES CONTRATADOS (CREDENCIALES)
  // ==========================================================
  public static getStaffWorkers(): StaffWorkerModel[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEYS.STAFF_USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }

    const initialStaff: StaffWorkerModel[] = [
      {
        id: 'EMP-001',
        fullName: 'Lic. Sofía Méndez',
        cedula: '0401829341',
        phone: '0987451230',
        username: 'sofia.despacho',
        password: 'Tulcan2026',
        role: 'Operador de Radio y Despacho',
        cityBranch: 'Tulcán',
        shift: 'Mañana (06:00 - 14:00)',
        status: 'activo',
        permissions: ['despacho', 'viajes_ejecutivos', 'encomiendas'],
        createdAt: '2026-10-15',
        lastLogin: 'Hoy, 06:05 AM',
        notes: 'Encargada de despacho matutino y control de reservas Tulcán-Quito',
      },
      {
        id: 'EMP-002',
        fullName: 'Ing. Andrés Chamorro',
        cedula: '1723948102',
        phone: '0991238901',
        username: 'andres.quito',
        password: 'Quito2026',
        role: 'Supervisor de Operaciones',
        cityBranch: 'Quito',
        shift: 'Tarde (14:00 - 22:00)',
        status: 'activo',
        permissions: ['despacho', 'viajes_ejecutivos', 'panel_conductor', 'flota', 'finanzas'],
        createdAt: '2026-10-16',
        lastLogin: 'Ayer, 14:10 PM',
        notes: 'Coordinador de retornos y base operativa en Quito',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.STAFF_USERS, JSON.stringify(initialStaff));
    return initialStaff;
  }

  public static saveStaffWorker(worker: StaffWorkerModel): void {
    if (typeof window === 'undefined') return;
    const current = this.getStaffWorkers();
    const index = current.findIndex(w => w.id === worker.id);
    if (index >= 0) {
      current[index] = worker;
    } else {
      current.unshift(worker);
    }
    localStorage.setItem(STORAGE_KEYS.STAFF_USERS, JSON.stringify(current));
  }

  public static deleteStaffWorker(id: string): void {
    if (typeof window === 'undefined') return;
    const current = this.getStaffWorkers();
    const filtered = current.filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEYS.STAFF_USERS, JSON.stringify(filtered));
  }

  public static clearAllCacheAndReset(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.REVENUE_TXS);
      localStorage.removeItem(STORAGE_KEYS.FINANCIAL_TXS);
      localStorage.removeItem(STORAGE_KEYS.WALLETS);
      localStorage.removeItem(STORAGE_KEYS.RECHARGE_REQUESTS);
      localStorage.removeItem(STORAGE_KEYS.SOCIOS);
      localStorage.removeItem(STORAGE_KEYS.UNITS);
      localStorage.removeItem(STORAGE_KEYS.PARCELS);
      localStorage.removeItem(STORAGE_KEYS.EXECUTIVE_SCHEDULES);
      localStorage.removeItem(STORAGE_KEYS.STAFF_USERS);
      localStorage.removeItem('andesmovi_trips_v1');
    }
  }
}




