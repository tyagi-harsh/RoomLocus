import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface FlatPayload {
  type: string;
  city: string;
  townSector: string;
  location?: string;
  landmark?: string;
  BHK: string;
  bhk?: string;
  maxPrice: number;
  minPrice: number;
  offer?: string;
  security: number;
  maintenance: number;
  totalFlat: number;
  address: string;
  totalFloor: number;
  waterSupply: number;
  powerBackup: number;
  noticePeriod: string;
  furnishingType: string;
  accomoType: string;
  parking: string[];
  preferTenants: string[];
  petsAllowed: boolean;
  genderPrefer: string;
  flatType: string;
  careTaker?: string;
  mobile: string;
  contactName?: string;
  listingShowNo?: string;
  latitude?: number;
  longitude?: number;
  state: string;
  isLiveLocation?: boolean;
  flatInside: string[];
  flatOutside: string[];
  isVerified?: boolean;
  verificationPending?: boolean;
  paymentDone?: boolean;
  isVisible?: boolean;
  isDraft?: boolean;
  postPropertyByAdmin?: boolean;
}

export interface RoomPayload {
  city: string;
  townSector: string;
  location?: string;
  landmark?: string;
  minprice: number;
  maxprice: number;
  security: number;
  maintenance: number;
  totalFloor: number;
  totalRoom: number;
  waterSupply: number;
  powerBackup: number;
  noticePeriod: string;
  offer?: string;
  listingShowNo?: string;
  careTaker?: string;
  mobile: string;
  contactName?: string;
  bhk: string;
  address: string;
  roomAvailable?: string;
  furnishingType: string;
  accomoType: string;
  petsAllowed: string;
  genderPrefer: string;
  roomType: string;
  parking: string[];
  preferTenants: string[];
  insideFacilities: string[];
  outsideFacilities: string[];
}

export interface PGPayload {
  type: string;
  city: string;
  townSector: string;
  location?: string;
  landmark?: string;
  bhk: string;
  minPrice: number;
  maxPrice: number;
  address: string;
  offer?: string;
  security: number;
  maintenance: number;
  totalPg: number;
  totalFloor: number;
  waterSupply: number;
  powerBackup: number;
  noticePeriod: string;
  furnishingType: string;
  accomoType: string;
  pgType: string;
  bedCount: number;
  foodAvailable: boolean;
  timeRestrict: boolean;
  genderPrefer: string;
  careTaker?: string;
  mobile: string;
  contactName?: string;
  petsAllowed: boolean;
  parking: string[];
  preferTenants: string[];
  pgInside: string[];
  pgOutside: string[];
  isVisible?: boolean;
  isDraft?: boolean;
  verificationPending?: boolean;
}

export interface HourlyRoomPayload {
  type: string;
  city: string;
  townSector: string;
  location?: string;
  landmark?: string;
  luxury?: string;
  luxuryTier?: string;
  bedCount?: number;
  guestCapacity?: number;
  noOfGuests?: number;
  totalFloor: number;
  palaceName?: string;
  totalRoom: number;
  minPrice: number;
  maxPrice: number;
  address: string;
  manager?: string;
  mobile: string;
  contactName?: string;
  furnishingType: string;
  accomoType: string;
  genderPrefer: string;
  foodAvailable: boolean;
  roomType: string;
  acType: string;
  parking: string[];
  preferTenants: string[];
  insideFacilities: string[];
  outsideFacilities: string[];
  roomInside?: string[];
  roomOutside?: string[];
  verificationPending?: boolean;
  isDraft?: boolean;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PropertyCreationService {
  private readonly PRIVATE_API = 'http://localhost:8082/api/v1/private';

  constructor(private http: HttpClient) { }

  /**
   * Create a new flat listing for the given owner.
   */
  createFlat(ownerId: number, payload: FlatPayload): Observable<ApiResult<any>> {
    const url = `${this.PRIVATE_API}/flats/owner/${ownerId}`;
    return this.http.post<any>(url, payload).pipe(
      map((resp) => {
        // Backend wraps in ApiResponse { success, data, message }
        if (resp && resp.success !== undefined) {
          return { success: resp.success, data: resp.data, error: resp.message };
        }
        // If raw entity returned, treat as success
        return { success: true, data: resp };
      }),
      catchError((error) => {
        console.error('createFlat error:', error);
        const message =
          error?.error?.message || error?.error?.error || error?.message || 'Failed to create flat';
        return of({ success: false, error: message });
      })
    );
  }

  /**
   * Create a new room listing for the given owner.
   */
  createRoom(ownerId: number, payload: RoomPayload): Observable<ApiResult<any>> {
    const url = `${this.PRIVATE_API}/rooms/owner/${ownerId}`;
    return this.http.post<any>(url, payload).pipe(
      map((resp) => {
        if (resp && resp.success !== undefined) {
          return { success: resp.success, data: resp.data, error: resp.message };
        }
        return { success: true, data: resp };
      }),
      catchError((error) => {
        console.error('createRoom error:', error);
        const message =
          error?.error?.message || error?.error?.error || error?.message || 'Failed to create room';
        return of({ success: false, error: message });
      })
    );
  }

  /**
   * Create a new PG listing for the given owner.
   */
  createPG(ownerId: number, payload: PGPayload): Observable<ApiResult<any>> {
    const url = `${this.PRIVATE_API}/pgs/owner/${ownerId}`;
    return this.http.post<any>(url, payload).pipe(
      map((resp) => {
        if (resp && resp.success !== undefined) {
          return { success: resp.success, data: resp.data, error: resp.message };
        }
        return { success: true, data: resp };
      }),
      catchError((error) => {
        console.error('createPG error:', error);
        const message =
          error?.error?.message || error?.error?.error || error?.message || 'Failed to create PG';
        return of({ success: false, error: message });
      })
    );
  }

  createHourlyRoom(ownerId: number, payload: HourlyRoomPayload): Observable<ApiResult<any>> {
    const url = `${this.PRIVATE_API}/hourly_rooms/owner/${ownerId}`;
    return this.http.post<any>(url, payload).pipe(
      map((resp) => {
        if (resp && resp.success !== undefined) {
          return { success: resp.success, data: resp.data, error: resp.message };
        }
        return { success: true, data: resp };
      }),
      catchError((error) => {
        console.error('createHourlyRoom error:', error);
        const message =
          error?.error?.message || error?.error?.error || error?.message || 'Failed to create hourly room listing';
        return of({ success: false, error: message });
      })
    );
  }

  /**
   * Helper to get the current owner ID from localStorage.
   * Returns null if not logged in or not an owner.
   */
  getOwnerId(): number | null {
    const id = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');
    const accessToken = localStorage.getItem('accessToken');

    console.debug('getOwnerId check:', { id, userType, hasAccessToken: !!accessToken });

    // Check if userType is OWNER (case-insensitive) and has a valid id
    if (id && userType && userType.toUpperCase() === 'OWNER') {
      const parsed = parseInt(id, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // If no userId but user is logged in as OWNER, log a warning
    if (userType && userType.toUpperCase() === 'OWNER' && accessToken) {
      console.warn('User is logged in as OWNER but userId is missing or invalid:', id);
    }

    return null;
  }
}
