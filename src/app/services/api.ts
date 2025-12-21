import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { parseBackendErrorString } from '../utils/error-utils';

//mock data for cities

interface City {
  id: string;
  name: string;
  imageUrl: string;
}

interface SearchParams {
  type?: string;
  city?: string;
  townSector?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const citiesData: City[] = [
  { id: 'bangalore', name: 'Bangalore', imageUrl: 'assets/images/bangalore.jfif' },
  { id: 'delhi', name: 'Delhi', imageUrl: 'assets/images/DELHI.png' },
  { id: 'mumbai', name: 'Mumbai', imageUrl: 'assets/images/MUMBAI.jpg' },
  { id: 'noida', name: 'Noida', imageUrl: 'assets/images/NOIDA.png' },
  { id: 'greater-noida', name: 'Greater Noida', imageUrl: 'assets/images/greater-noida.png' },
  { id: 'ghaziabad', name: 'Ghaziabad', imageUrl: 'assets/images/ghaziabad.jpg' },
  { id: 'dehradun', name: 'Dehradun', imageUrl: 'assets/images/dehradun.jpg' },
  { id: 'chennai', name: 'Chennai', imageUrl: 'assets/images/chennai.jpg' },
  { id: 'gurugram', name: 'Gurugram', imageUrl: 'assets/images/gurugram.jpg' },
  { id: 'hyderabad', name: 'Hyderabad', imageUrl: 'assets/images/HYDERABAD.jpg' },
];

const locationsDB: { [cityId: string]: string[] } = {
  bangalore: ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout'],
  delhi: ['Connaught Place', 'Saket', 'Hauz Khas Village', 'Dwarka Sector 21'],
  mumbai: ['Bandra', 'Andheri West', 'Juhu', 'Colaba'],
  noida: ['Sector 18', 'Sector 62', 'Sector 15', 'Noida Extension'],
  'greater-noida': ['Pari Chowk', 'Alpha 1', 'Beta 2', 'Knowledge Park 3'],
  ghaziabad: ['Indirapuram', 'Vaishali', 'Kaushambi', 'Raj Nagar Extension'],
  dehradun: ['Rajpur Road', 'Chakrata Road', 'Clement Town', 'Dalanwala'],
  chennai: ['T. Nagar', 'Anna Nagar', 'OMR', 'Velachery'],
  gurugram: ['Sector 29', 'Sector 56', 'Golf Course Road', 'Cyber City'],
  hyderabad: ['Hitech City', 'Gachibowli', 'Banjara Hills', 'Kondapur'],
};

const lookingForOptions: string[] = ['Flat', 'Room', 'PG', 'Hourly Room'];

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  // Backend base includes the internal API prefix used by the server
  private readonly API_URL = 'http://localhost:8082/api/v1/internal';
  private readonly BASE_URL = 'http://localhost:8082/api/v1';

  constructor(private http: HttpClient) { }

  /**
   * Fetch the RSA public key from the backend as plain text (PEM).
   * Expected endpoint: GET /api/auth/public-key
   */
  getPublicKey(): Observable<string> {
    return this.http.get(`${this.API_URL}/auth/public-key`, { responseType: 'text' }).pipe(
      catchError((error) => {
        console.error('Failed to fetch public key:', error);
        return of('');
      })
    );
  }

  /**
   * Register a new user with the backend. Expects a payload matching UserRegistrationRequest.
   */
  register(payload: { username: string; email: string; mobile: string; password: string; userType: string }): Observable<any> {
    // Backend returns a plain map with accessToken/refreshToken on success.
    return this.http.post<any>(`${this.API_URL}/auth/register`, payload).pipe(
      map((response) => {
        // If backend returns an object with accessToken, treat as success.
        return response;
      }),
      catchError((error) => {
        console.error('Register API error:', error);
        // Normalize error shape for the UI
        const message = (error && error.error && (error.error.message || error.error.error)) || error.message || 'Unknown error';
        return of({ success: false, error: message });
      })
    );
  }

  /**
   * Login with mobile, encrypted password and userType.
   */
  login(payload: { mobile: string; password: string; userType: string }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/auth/login`, payload).pipe(
      map((resp) => resp),
      catchError((error) => {
        console.error('Login API error:', error);
        const message = (error && error.error && (error.error.message || error.error.error)) || error.message || 'Unknown error';
        return of({ success: false, error: message });
      })
    );
  }

  /**
   * Retrieve token details to prove that a login attempt succeeded.
   */
  getTokenInfo(token: string): Observable<any | null> {
    if (!token) {
      return of(null);
    }
    const params = new HttpParams().set('token', token);
    return this.http.get<any>(`${this.API_URL}/auth/token-info`, { params }).pipe(
      map((resp) => resp),
      catchError((error) => {
        console.error('Token info API error:', error);
        return of(null);
      })
    );
  }

  /**
   * Request an OTP for the given mobile and userType. Purpose is 'S' (signup), 'F' (forgot), or 'R' (rental).
   * For purpose 'R', accessToken is required and userType should be omitted.
   */
  getOtp(payload: { mobile: string; userType?: string | null; purpose: string; accessToken?: string }): Observable<any> {
    // Build request body, omitting userType if null/empty (for purpose R)
    const requestBody: Record<string, unknown> = {
      mobile: payload.mobile,
      purpose: payload.purpose,
    };
    if (payload.userType) {
      requestBody['userType'] = payload.userType;
    }
    if (payload.accessToken) {
      requestBody['accessToken'] = payload.accessToken;
    }

    // Debug: log endpoint and payload to help trace calls from the UI
    try {
      console.debug('ApiService.getOtp -> POST', `${this.API_URL}/auth/get-otp`, requestBody);
    } catch (e) {
      /* ignore when server-side or non-browser env */
    }
    return this.http.post<any>(`${this.API_URL}/auth/get-otp`, requestBody).pipe(
      map((resp) => {
        // Backend wraps result in ApiResponse.success -> { success: true, data: {...} }
        if (resp && resp.success && resp.data) return resp.data;
        // If backend returned the raw map (older style), return it directly
        return resp;
      }),
      catchError((error) => {
        console.error('getOtp API error:', error);
        // Prefer server-provided message (may be JSON string or object) over Angular's generic HttpErrorResponse.message
        const serverMsg = parseBackendErrorString(error?.error) || parseBackendErrorString(error);
        const message = serverMsg || error?.statusText || error?.message || 'Unknown error';
        return of({ success: false, error: message, status: error?.status || 0 });
      })
    );
  }

  /**
   * Verify OTP for the given mobile and userType and purpose.
   * For purpose 'R', userType should be null/omitted.
   */
  verifyOtp(payload: { mobile: string; userType?: string | null; otp: string; purpose: string }): Observable<any> {
    // Build request body, omitting userType if null/empty (for purpose R)
    const requestBody: Record<string, unknown> = {
      mobile: payload.mobile,
      otp: payload.otp,
      purpose: payload.purpose,
    };
    if (payload.userType) {
      requestBody['userType'] = payload.userType;
    }

    try {
      console.debug('ApiService.verifyOtp -> POST', `${this.API_URL}/auth/verify-otp`, requestBody);
    } catch (e) {
      /* ignore */
    }
    // Observe full response so caller can act on HTTP status (200 = verified, 400 = invalid/expired)
    return this.http.post<any>(`${this.API_URL}/auth/verify-otp`, requestBody, { observe: 'response' as const }).pipe(
      map((resp) => {
        return { status: resp.status, body: resp.body };
      }),
      catchError((error) => {
        console.error('verifyOtp API error:', error);
        // Normalize the error into an object with status and body so callers can inspect status codes
        const status = (error && error.status) || 0;
        const body = (error && error.error) || null;
        return of({ status, body });
      })
    );
  }

  resetPassword(
    payload: { mobile: string; otp: string; newPassword: string; userType: string },
    options?: { authorizationToken?: string }
  ): Observable<any> {
    const headers = options?.authorizationToken
      ? new HttpHeaders({ Authorization: `Bearer ${options.authorizationToken}` })
      : undefined;
    const httpOptions = headers ? { headers } : {};

    return this.http.post<any>(`${this.API_URL}/auth/reset-password`, payload, httpOptions).pipe(
      map((resp) => resp),
      catchError((error) => {
        console.error('resetPassword API error:', error);
        const message = (error && error.error && (error.error.message || error.error.error)) || error.message || 'Unknown error';
        return of({ success: false, error: message });
      })
    );
  }

  getCities(): Observable<City[]> {
    return of(citiesData).pipe(delay(500));
  }

  getLocations(cityId: string): Observable<string[]> {
    const locations = locationsDB[cityId] || [];
    return of(locations);
  }

  getLookingForOptions(): Observable<string[]> {
    return of(lookingForOptions).pipe(delay(200));
  }

  getCitiesWithApi(params: SearchParams): Observable<City[]> {
    // Build query parameters
    let httpParams = new HttpParams();
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.city) httpParams = httpParams.set('city', params.city);
    if (params.townSector) httpParams = httpParams.set('townSector', params.townSector);

    // Make the API call
    return this.http
      .get<ApiResponse<City[]>>(`${this.API_URL}/search`, { params: httpParams })
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error(response.message || 'API call failed');
          }
          return response.data;
        }),
        catchError((error) => {
          console.error('Search API error:', error);
          return of([]); // Return empty array on error
        })
      );
  }

  /**
   * Contact the owner of a property. Requires Authorization bearer token.
   * Backend endpoint: POST /property-owner/contact
   */
  getOwnerContact(payload: { type: 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM'; id: number }): Observable<any> {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('accessToken') : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const options = headers ? { headers } : {} as any;

    try {
      console.debug('ApiService.getOwnerContact -> POST', `${this.API_URL}/property-owner/contact`, payload);
    } catch {
      /* noop */
    }

    return this.http.post<any>(`${this.API_URL}/property-owner/contact`, payload, options as any).pipe(
      map((resp: any) => {
        // Prefer standard ApiResponse shape if present
        if (resp && resp.success !== undefined) {
          return resp;
        }
        // Fallback: wrap raw response
        return { success: true, data: resp };
      }),
      catchError((error) => {
        console.error('getOwnerContact API error:', error);
        const msg = parseBackendErrorString(error?.error) || parseBackendErrorString(error) || error?.statusText || error?.message || 'Unknown error';
        const status = error?.status || 0;
        return of({ success: false, error: msg, status });
      })
    );
  }

  /**
   * Like a property (END_USER). Calls PATCH /api/v1/private/end_user
   * Payload: { propertyType, propertyId } — user inferred from token unless provided.
   */
  likeProperty(payload: { propertyType: 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM'; propertyId: number; userId?: string | number }): Observable<{ success: boolean; error?: string }> {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('accessToken') : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const options = headers ? { headers } : {} as any;
    const storedUserId = (typeof localStorage !== 'undefined') ? Number(localStorage.getItem('userId')) : undefined;
    const effectiveUserId = (payload.userId ?? storedUserId) as number | undefined;
    const url = `${this.BASE_URL}/private/end_user`;
    const body = {
      userId: effectiveUserId,
      propertyType: payload.propertyType,
      propertyId: payload.propertyId,
    };

    try { console.debug('ApiService.likeProperty -> PATCH', url, body); } catch { }

    return this.http.patch<any>(url, body as any, options as any).pipe(
      map((resp: any) => {
        if (resp && resp.success !== undefined) return resp;
        return { success: true };
      }),
      catchError((error) => {
        console.error('likeProperty API error:', error);
        const msg = parseBackendErrorString(error?.error) || parseBackendErrorString(error) || error?.statusText || error?.message || 'Unknown error';
        return of({ success: false, error: msg });
      })
    );
  }

  /**
   * Unlike a property (END_USER). Calls DELETE /api/v1/private/end_user
   * Note: Use http.request to support a request body with DELETE.
   */
  unlikeProperty(payload: { propertyType: 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM'; propertyId: number; userId?: string | number }): Observable<{ success: boolean; error?: string }> {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('accessToken') : null;
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const storedUserId = (typeof localStorage !== 'undefined') ? Number(localStorage.getItem('userId')) : undefined;
    const effectiveUserId = (payload.userId ?? storedUserId) as number | undefined;
    const url = `${this.BASE_URL}/private/end_user`;
    const body = {
      userId: effectiveUserId,
      propertyType: payload.propertyType,
      propertyId: payload.propertyId,
    };

    try { console.debug('ApiService.unlikeProperty -> DELETE', url, body); } catch { }

    return this.http.request<any>('DELETE', url, { body: body as any, headers } as any).pipe(
      map((resp: any) => {
        if (resp && resp.success !== undefined) return resp;
        return { success: true };
      }),
      catchError((error) => {
        console.error('unlikeProperty API error:', error);
        const msg = parseBackendErrorString(error?.error) || parseBackendErrorString(error) || error?.statusText || error?.message || 'Unknown error';
        return of({ success: false, error: msg });
      })
    );
  }

  /**
   * Fetch wishlist entries for an END_USER by userId.
   * Endpoint: GET /api/v1/private/end_user/{userId}
   * Requires Authorization: Bearer {accessToken}
   * Returns ApiResponse<{ id, userId, propertyType, propertyId, createdAt }[]>.
   */
  getEndUserWishlist(userId: number): Observable<{ success: boolean; data: Array<{ id: number; userId: number; propertyType: 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM'; propertyId: number; createdAt: string; location?: string; landmark?: string; city?: string; minprice?: number; maxprice?: number }>; error?: string }> {
    const url = `${this.BASE_URL}/private/end_user/${userId}`;

    try { console.debug('ApiService.getEndUserWishlist -> GET', url); } catch { }

    return this.http.get<any>(url).pipe(
      map((resp: any) => {
        // Prefer standard ApiResponse shape
        if (resp && resp.success !== undefined) {
          return resp as { success: boolean; data: Array<{ id: number; userId: number; propertyType: 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM'; propertyId: number; createdAt: string; location?: string; landmark?: string; city?: string; minprice?: number; maxprice?: number }>; error?: string };
        }
        // Fallback: wrap raw array
        const data = Array.isArray(resp) ? resp : [];
        return { success: true, data } as any;
      }),
      catchError((error) => {
        console.error('getEndUserWishlist API error:', error);
        const msg = parseBackendErrorString(error?.error) || parseBackendErrorString(error) || error?.statusText || error?.message || 'Unknown error';
        return of({ success: false, data: [], error: msg });
      })
    );
  }

  /**
   * Fetch wishlist entries for an END_USER by userId with server-side pagination.
   * Endpoint: GET /api/v1/private/end_user/{userId}?page={page}&size={size}
   * Page is 0-based. Size default 12.
   * Returns ApiResponse<{ content: UserLikeDTO[]; totalElements: number; totalPages: number; pageNumber: number; pageSize: number }>
   */
  getEndUserWishlistPaged(userId: number, page: number, size: number): Observable<{
    success: boolean;
    data: {
      content: Array<{
        id: number;
        userId: number;
        propertyType: 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM';
        propertyId: number;
        createdAt: string;
        location?: string;
        landmark?: string;
        city?: string;
        minprice?: number;
        maxprice?: number;
      }>;
      totalElements: number;
      totalPages: number;
      pageNumber: number;
      pageSize: number;
    };
    error?: string;
  }> {
    const url = `${this.BASE_URL}/private/end_user/${userId}?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`;
    try { console.debug('ApiService.getEndUserWishlistPaged -> GET', url); } catch { }

    return this.http.get<any>(url).pipe(
      map((resp: any) => {
        if (resp && resp.success !== undefined && resp.data) {
          return resp as any;
        }
        // Fallback: if backend returns array (non-paginated), wrap it
        const content = Array.isArray(resp) ? resp : [];
        const fallback = {
          success: true,
          data: {
            content,
            totalElements: content.length,
            totalPages: 1,
            pageNumber: 0,
            pageSize: content.length,
          },
        };
        return fallback as any;
      }),
      catchError((error) => {
        console.error('getEndUserWishlistPaged API error:', error);
        const msg = parseBackendErrorString(error?.error) || parseBackendErrorString(error) || error?.statusText || error?.message || 'Unknown error';
        return of({ success: false, data: { content: [], totalElements: 0, totalPages: 0, pageNumber: page, pageSize: size }, error: msg });
      })
    );
  }
}
