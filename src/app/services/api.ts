import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

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
   * Request an OTP for the given mobile and userType. Purpose is 'S' (signup) or 'F' (forgot).
   */
  getOtp(payload: { mobile: string; userType: string; purpose: string }): Observable<any> {
    // Debug: log endpoint and payload to help trace calls from the UI
    try {
      console.debug('ApiService.getOtp -> POST', `${this.API_URL}/auth/get-otp`, payload);
    } catch (e) {
      /* ignore when server-side or non-browser env */
    }
    return this.http.post<any>(`${this.API_URL}/auth/get-otp`, payload).pipe(
      map((resp) => {
        // Backend wraps result in ApiResponse.success -> { success: true, data: {...} }
        if (resp && resp.success && resp.data) return resp.data;
        // If backend returned the raw map (older style), return it directly
        return resp;
      }),
      catchError((error) => {
        console.error('getOtp API error:', error);
        const message = (error && error.error && error.error.message) || error.message || 'Unknown error';
        return of({ success: false, error: message });
      })
    );
  }

  /**
   * Verify OTP for the given mobile and userType and purpose.
   */
  verifyOtp(payload: { mobile: string; userType: string; otp: string; purpose: string }): Observable<any> {
    try {
      console.debug('ApiService.verifyOtp -> POST', `${this.API_URL}/auth/verify-otp`, payload);
    } catch (e) {
      /* ignore */
    }
    // Observe full response so caller can act on HTTP status (200 = verified, 400 = invalid/expired)
    return this.http.post<any>(`${this.API_URL}/auth/verify-otp`, payload, { observe: 'response' as const }).pipe(
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

  resetPassword(payload: { mobile: string; otp: string; newPassword: string; userType: string }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/auth/reset-password`, payload).pipe(
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
}
