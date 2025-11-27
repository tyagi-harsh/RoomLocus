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
  private readonly API_URL = 'http://localhost:8082';

  constructor(private http: HttpClient) {}

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
