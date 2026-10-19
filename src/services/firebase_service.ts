import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Firestore,
  query,
  orderBy,
  where,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { TripModel, TripStatus, FirebaseConfigModel, FleetUnit, FinancialTransaction, DriverRechargeRequest } from '../models/admin_models';
import { AdminService } from './admin_service';

const STORAGE_KEYS = {
  FIREBASE_CONFIG: 'andesmovi_firebase_config_v1',
  FIREBASE_ACTIVE: 'andesmovi_firebase_active_v1',
  LOCAL_TRIPS: 'andesmovi_firestore_trips_v1',
};

// Default sample trips in Ecuador (Tulcán, Ipiales border, San Gabriel, Ibarra)
const INITIAL_DEMO_TRIPS: TripModel[] = [
  {
    id: 'TRIP-EC-101',
    passengerName: 'Carlos M. Yandún',
    passengerPhone: '0987654321',
    passengerRating: 4.9,
    origin: 'Terminal Terrestre de Tulcán',
    destination: 'Puente Internacional de Rumichaca',
    originLat: 0.8124,
    originLng: -77.7174,
    destLat: 0.8198,
    destLng: -77.6653,
    offeredFare: 3.50,
    paymentMethod: 'Efectivo',
    status: 'en_camino',
    driverId: 'AM-012',
    driverName: 'Marco Rosero',
    driverUnit: 'Unidad 012',
    driverPlate: 'PBC-4921',
    counterOfferPrice: null,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    notes: 'Pasajero con equipaje ligero hacia frontera.',
  },
  {
    id: 'TRIP-EC-102',
    passengerName: 'Dra. María Elena Pozo',
    passengerPhone: '0991234567',
    passengerRating: 5.0,
    origin: 'Hospital Luis G. Dávila',
    destination: 'Parque Central 24 de Mayo',
    originLat: 0.8189,
    originLng: -77.7245,
    destLat: 0.8116,
    destLng: -77.7173,
    offeredFare: 1.75,
    paymentMethod: 'Transferencia',
    status: 'aceptado',
    driverId: 'AM-028',
    driverName: 'Edwin Paspuel',
    driverUnit: 'Unidad 028',
    driverPlate: 'IBC-8120',
    counterOfferPrice: null,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'TRIP-EC-103',
    passengerName: 'Jhonathan Benavides',
    passengerPhone: '0978901234',
    passengerRating: 4.8,
    origin: 'Barrio Tajamar, Av. Veintimilla',
    destination: 'Universidad Politécnica Estatal del Carchi (UPEC)',
    originLat: 0.8090,
    originLng: -77.7130,
    destLat: 0.8250,
    destLng: -77.7210,
    offeredFare: 2.25,
    paymentMethod: 'Efectivo',
    status: 'buscando',
    driverId: null,
    driverName: null,
    driverUnit: null,
    driverPlate: null,
    counterOfferPrice: null,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 'TRIP-EC-104',
    passengerName: 'Silvia Cuasquer',
    passengerPhone: '0961122334',
    passengerRating: 4.7,
    origin: 'Mercado Central de Tulcán',
    destination: 'San Gabriel Centro (Parque Central)',
    originLat: 0.8116,
    originLng: -77.7173,
    destLat: 0.5925,
    destLng: -77.8310,
    offeredFare: 12.00,
    paymentMethod: 'Transferencia',
    status: 'contraofertado',
    driverId: 'AM-035',
    driverName: 'Byron Narváez',
    driverUnit: 'Unidad 035',
    driverPlate: 'PBI-2049',
    counterOfferPrice: 14.50,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    notes: 'Intercantonal Tulcán - Montúfar',
  },
  {
    id: 'TRIP-EC-105',
    passengerName: 'Roberto Caicedo',
    passengerPhone: '0983344556',
    passengerRating: 4.9,
    origin: 'Ciudadela El Maestro',
    destination: 'Parque Isidro Ayora',
    originLat: 0.8050,
    originLng: -77.7250,
    destLat: 0.8130,
    destLng: -77.7160,
    offeredFare: 1.50,
    paymentMethod: 'Efectivo',
    status: 'finalizado',
    driverId: 'AM-050',
    driverName: 'Germán Montenegro',
    driverUnit: 'Unidad 050',
    driverPlate: 'CBA-3190',
    counterOfferPrice: null,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'TRIP-EXEC-001',
    passengerName: 'Ing. Javier Solís',
    passengerPhone: '0990011223',
    passengerRating: 5.0,
    origin: 'Terminal Terrestre El Coca',
    destination: 'Quito - Sector La Carolina',
    originLat: -0.4667,
    originLng: -76.9833,
    destLat: -0.1807,
    destLng: -78.4842,
    offeredFare: 25.00,
    paymentMethod: 'Transferencia',
    status: 'buscando',
    serviceType: 'ejecutivo',
    createdAt: new Date().toISOString(),
    notes: 'Viaje Ejecutivo Directo - Por favor asignar SUV cómoda.',
  },
  {
    id: 'TRIP-EXEC-FIX-001',
    passengerName: 'Carlos Narváez',
    passengerPhone: '0988776655',
    passengerRating: 4.8,
    origin: 'Terminal Tulcán',
    destination: 'Quito Centro',
    originLat: 0.8124,
    originLng: -77.7174,
    destLat: -0.1807,
    destLng: -78.4842,
    offeredFare: 25.00,
    paymentMethod: 'Efectivo',
    status: 'buscando',
    serviceType: 'ejecutivo',
    scheduleId: `BLOCK-AM-PM-${new Date().toISOString().split('T')[0]}`,
    createdAt: new Date().toISOString(),
    notes: 'Reserva Frecuencia 03:00 AM',
  },
  {
    id: 'TRIP-EXEC-FIX-002',
    passengerName: 'Dra. Lucía Paz',
    passengerPhone: '0992233445',
    passengerRating: 5.0,
    origin: 'Terminal Tulcán',
    destination: 'Quito Norte',
    originLat: 0.8124,
    originLng: -77.7174,
    destLat: -0.1023,
    destLng: -78.4876,
    offeredFare: 25.00,
    paymentMethod: 'Transferencia',
    status: 'buscando',
    serviceType: 'ejecutivo',
    scheduleId: `BLOCK-AM-PM-${new Date().toISOString().split('T')[0]}`,
    createdAt: new Date().toISOString(),
    notes: 'Reserva Frecuencia 03:00 AM',
  },
];

class FirebaseSyncService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private activeConfig: FirebaseConfigModel | null = null;
  private isConnected = false;
  private localListeners: Array<(trips: TripModel[]) => void> = [];

  constructor() {
    this.loadSavedConfig();
  }

  public getSavedConfig(): FirebaseConfigModel | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  public isFirebaseEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.FIREBASE_ACTIVE) === 'true';
  }

  public setFirebaseEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FIREBASE_ACTIVE, enabled ? 'true' : 'false');
    }
    if (enabled && this.activeConfig) {
      this.initFirebase(this.activeConfig);
    }
  }

  public loadSavedConfig(): void {
    const config = this.getSavedConfig();
    const enabled = this.isFirebaseEnabled();
    if (config && config.projectId && enabled) {
      this.initFirebase(config);
    }
  }

  public initFirebase(config: FirebaseConfigModel): boolean {
    try {
      this.activeConfig = config;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
        localStorage.setItem(STORAGE_KEYS.FIREBASE_ACTIVE, 'true');
      }

      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.app = existingApps[0];
      } else {
        this.app = initializeApp(config);
      }
      this.db = getFirestore(this.app);
      this.isConnected = true;
      return true;
    } catch (err) {
      console.warn('Firebase init warning:', err);
      this.isConnected = false;
      return false;
    }
  }

  public disconnectFirebase(): void {
    this.isConnected = false;
    this.db = null;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FIREBASE_ACTIVE, 'false');
    }
    this.notifyLocalSubscribers();
  }

  public isCloudConnected(): boolean {
    return this.isConnected && this.db !== null;
  }

  // Local storage reactive sync for trips
  public getLocalTrips(): TripModel[] {
    if (typeof window === 'undefined') return INITIAL_DEMO_TRIPS;
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_TRIPS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_TRIPS, JSON.stringify(INITIAL_DEMO_TRIPS));
      return INITIAL_DEMO_TRIPS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_DEMO_TRIPS;
    }
  }

  public saveLocalTrips(trips: TripModel[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LOCAL_TRIPS, JSON.stringify(trips));
    }
    this.notifyLocalSubscribers(trips);
  }

  private notifyLocalSubscribers(trips?: TripModel[]): void {
    const data = trips || this.getLocalTrips();
    this.localListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        console.error('Error notifying trip listener:', e);
      }
    });
  }

  /**
   * Subscribe in real-time to the 'viajes' collection.
   * If Firebase Firestore is active, hooks into onSnapshot.
   * Else, uses the reactive local event-bus and storage.
   */
  public subscribeToViajes(callback: (trips: TripModel[]) => void): () => void {
    if (this.isConnected && this.db) {
      try {
        const colRef = collection(this.db, 'viajes');
        const q = query(colRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: TripModel[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                passengerName: data.passengerName || 'Pasajero',
                passengerPhone: data.passengerPhone || '',
                passengerRating: Number(data.passengerRating ?? 4.9),
                origin: data.origin || '',
                destination: data.destination || '',
                originLat: Number(data.originLat ?? 0.8116),
                originLng: Number(data.originLng ?? -77.7173),
                destLat: Number(data.destLat ?? 0.805),
                destLng: Number(data.destLng ?? -77.725),
                offeredFare: Number(data.offeredFare ?? 2.0),
                paymentMethod: data.paymentMethod || 'Efectivo',
                status: (data.status || data.estado || 'buscando') as TripStatus,
                driverId: data.driverId || null,
                driverName: data.driverName || null,
                driverUnit: data.driverUnit || null,
                driverPlate: data.driverPlate || null,
                counterOfferPrice: data.counterOfferPrice ? Number(data.counterOfferPrice) : null,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
                notes: data.notes || '',
              });
            });
            callback(list);
          },
          (err) => {
            console.warn('Firestore snapshot error, falling back to local reactive trips:', err);
            // Fallback to local
            callback(this.getLocalTrips());
          }
        );

        return () => unsubscribe();
      } catch (e) {
        console.warn('Error setting up Firestore listener:', e);
      }
    }

    // Default / Local mode listener
    this.localListeners.push(callback);
    // Initial call
    callback(this.getLocalTrips());

    // Window storage listener for multi-tab sync
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.LOCAL_TRIPS) {
        callback(this.getLocalTrips());
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', storageHandler);
    }

    return () => {
      this.localListeners = this.localListeners.filter((l) => l !== callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', storageHandler);
      }
    };
  }

  /**
   * Create a new trip in collection 'viajes' (rules state: allow create if estado == 'buscando')
   */
  public async createTrip(tripData: Omit<TripModel, 'id' | 'createdAt'>): Promise<string> {
    const id = `TRIP-${Date.now().toString(36).toUpperCase()}`;
    const newTrip: TripModel = {
      ...tripData,
      id,
      createdAt: new Date().toISOString(),
      status: 'buscando',
    };

    if (this.isConnected && this.db) {
      try {
        const colRef = collection(this.db, 'viajes');
        const docRef = await addDoc(colRef, {
          passengerName: tripData.passengerName,
          passengerPhone: tripData.passengerPhone,
          passengerRating: tripData.passengerRating,
          origin: tripData.origin,
          destination: tripData.destination,
          originLat: tripData.originLat,
          originLng: tripData.originLng,
          destLat: tripData.destLat,
          destLng: tripData.destLng,
          offeredFare: tripData.offeredFare,
          paymentMethod: tripData.paymentMethod,
          status: 'buscando',
          estado: 'buscando', // match rule: allow create if request.resource.data.estado == 'buscando'
          driverId: null,
          driverName: null,
          driverUnit: null,
          driverPlate: null,
          counterOfferPrice: null,
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (e) {
        console.warn('Error pushing to Firestore, saving locally:', e);
      }
    }

    // Save locally
    const current = this.getLocalTrips();
    const updated = [newTrip, ...current];
    this.saveLocalTrips(updated);
    return id;
  }

  /**
   * Update status of a trip (e.g. buscando -> aceptado -> en_camino -> finalizado | cancelado)
   */
  public async updateTripStatus(
    tripId: string,
    status: TripStatus,
    patch: Partial<TripModel> = {}
  ): Promise<void> {
    if (this.isConnected && this.db) {
      try {
        const ref = doc(this.db, 'viajes', tripId);
        await updateDoc(ref, {
          status,
          estado: status,
          ...patch,
        });
        return;
      } catch (e) {
        console.warn('Error updating trip in Firestore, saving locally:', e);
      }
    }

    const current = this.getLocalTrips();
    const index = current.findIndex((t) => t.id === tripId);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        status,
        ...patch,
      };
      this.saveLocalTrips([...current]);
    }
  }

  /**
   * Assign a fleet unit to a trip
   */
  public async assignUnitToTrip(tripId: string, unit: FleetUnit): Promise<void> {
    await this.updateTripStatus(tripId, 'aceptado', {
      driverId: unit.id,
      driverName: unit.driverName,
      driverUnit: `Unidad ${unit.id.replace('AM-', '')}`,
      driverPlate: unit.plate,
    });
  }

  /**
   * Delete a trip document directly from the 'viajes' collection in Firestore.
   * Also updates local reactive storage so all listeners instantly reflect the removal.
   */
  public async deleteTrip(tripId: string): Promise<boolean> {
    let cloudDeleted = false;
    if (this.isConnected && this.db) {
      try {
        const ref = doc(this.db, 'viajes', tripId);
        await deleteDoc(ref);
        cloudDeleted = true;
      } catch (e) {
        console.warn('Firestore deleteDoc note (local deletion will proceed):', e);
      }
    }

    const current = this.getLocalTrips();
    const updated = current.filter((t) => t.id !== tripId);
    this.saveLocalTrips(updated);
    return cloudDeleted;
  }

  /**
   * Batch delete an array of trips by their IDs
   */
  public async deleteMultipleTrips(tripIds: string[]): Promise<number> {
    const idsSet = new Set(tripIds);
    if (this.isConnected && this.db) {
      for (const id of tripIds) {
        try {
          const ref = doc(this.db, 'viajes', id);
          await deleteDoc(ref);
        } catch (e) {
          console.warn(`Error deleting trip ${id} from Firestore:`, e);
        }
      }
    }

    const current = this.getLocalTrips();
    const updated = current.filter((t) => !idsSet.has(t.id));
    this.saveLocalTrips(updated);
    return tripIds.length;
  }

  /**
   * Delete trips by status or condition (e.g. finalizados, cancelados o todos)
   */
  public async clearTripsByStatus(
    filter: 'finalizados_o_cancelados' | 'cancelado' | 'finalizado' | 'todos'
  ): Promise<number> {
    const current = this.getLocalTrips();
    let toDelete: TripModel[] = [];

    if (filter === 'todos') {
      toDelete = [...current];
    } else if (filter === 'finalizados_o_cancelados') {
      toDelete = current.filter((t) => t.status === 'finalizado' || t.status === 'cancelado');
    } else {
      toDelete = current.filter((t) => t.status === filter);
    }

    const ids = toDelete.map((t) => t.id);
    await this.deleteMultipleTrips(ids);
    return ids.length;
  }

  /**
   * Delete or clear trips for resetting test environment
   */
  public resetDemoTrips(): void {
    this.saveLocalTrips(INITIAL_DEMO_TRIPS);
  }

  // ==========================================================================
  // COLECCIÓN FIRESTORE: 'transacciones_financieras' (INGRESOS Y EGRESOS)
  // ==========================================================================

  /**
   * Registra un movimiento financiero en Firestore ('transacciones_financieras')
   * y en el almacenamiento reactivo local de Andes Movi.
   */
  public async addFinancialTransactionToCloud(
    txData: Omit<FinancialTransaction, 'id' | 'createdAt'> & { createdAt?: string }
  ): Promise<FinancialTransaction> {
    const localSaved = AdminService.recordFinancialTransaction(txData);

    if (this.isConnected && this.db) {
      try {
        const colRef = collection(this.db, 'transacciones_financieras');
        await addDoc(colRef, {
          ...localSaved,
          createdAtTimestamp: serverTimestamp(),
          dateIso: localSaved.createdAt,
        });
      } catch (e) {
        console.warn('Firestore transacciones_financieras sync note:', e);
      }
    }

    return localSaved;
  }

  /**
   * Sincroniza / Siembra el libro diario actual en la colección 'transacciones_financieras' de Firestore
   */
  public async syncFinancialLedgerToFirestore(): Promise<{ synced: number; cloudActive: boolean }> {
    const txs = AdminService.getStoredFinancialTransactions();
    if (!this.isConnected || !this.db) {
      return { synced: txs.length, cloudActive: false };
    }

    let count = 0;
    const colRef = collection(this.db, 'transacciones_financieras');
    for (const tx of txs.slice(0, 15)) {
      try {
        await addDoc(colRef, {
          ...tx,
          syncedAt: serverTimestamp(),
        });
        count++;
      } catch (e) {
        console.warn('Error syncing tx to Firestore:', e);
      }
    }
    return { synced: count, cloudActive: true };
  }

  /**
   * Aprueba una solicitud de recarga de conductor en Firestore:
   * - Actualiza el documento en 'solicitudes_recarga' a estado 'aprobada'
   * - Actualiza automáticamente el saldo en la billetera virtual en 'billeteras'
   * - Registra el movimiento de ingreso en 'transacciones_financieras'
   */
  public async approveDriverRechargeInCloud(requestId: string) {
    const res = AdminService.approveDriverRechargeRequest(requestId);

    if (res.success && this.isConnected && this.db && res.request && res.wallet && res.transaction) {
      try {
        await setDoc(
          doc(this.db, 'solicitudes_recarga', res.request.id),
          {
            ...res.request,
            status: 'aprobada',
            updatedAtTimestamp: serverTimestamp(),
          },
          { merge: true }
        );

        await setDoc(
          doc(this.db, 'billeteras', res.wallet.id),
          {
            ...res.wallet,
            updatedAtTimestamp: serverTimestamp(),
          },
          { merge: true }
        );

        await addDoc(collection(this.db, 'transacciones_financieras'), {
          ...res.transaction,
          createdAtTimestamp: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Firestore recharge approval sync note:', e);
      }
    }

    return res;
  }

  public async rejectDriverRechargeInCloud(requestId: string, reason?: string) {
    const res = AdminService.rejectDriverRechargeRequest(requestId, reason);

    if (res.success && this.isConnected && this.db && res.request) {
      try {
        await setDoc(
          doc(this.db, 'solicitudes_recarga', res.request.id),
          {
            ...res.request,
            status: 'rechazada',
            updatedAtTimestamp: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Firestore recharge rejection sync note:', e);
      }
    }

    return res;
  }

  /**
   * Elimina un conductor de Firestore y del almacenamiento local
   */
  public async deleteDriverFromCloud(unitId: string): Promise<void> {
    AdminService.deleteUnit(unitId);

    if (this.isConnected && this.db) {
      try {
        await deleteDoc(doc(this.db, 'conductores', unitId));
        await deleteDoc(doc(this.db, 'unidades', unitId));
        await deleteDoc(doc(this.db, 'billeteras', `WAL-${unitId}`));
      } catch (e) {
        console.warn('Firestore driver deletion sync note:', e);
      }
    }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
