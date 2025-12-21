import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OwnerRental {
  id: number;
  city?: string | null;
  townSector?: string | null;
  location?: string | null;
  type?: string | null;
  landmark?: string | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  bhk?: string | null;
  gallery?: string[] | null;
  imageUrl?: string | null;
  verified?: boolean | null;
}

export interface OwnerRentalPage {
  content: OwnerRental[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { status: number; message: string; details?: unknown };
}

@Injectable({ providedIn: 'root' })
export class OwnerRentalsService {
  constructor(private readonly http: HttpClient) { }

  /**
   * Fetch properties listed by an owner. If `type` is provided (flat|room|pg|hourlyroom),
   * the backend will filter by that type; otherwise all property types are returned.
   */
  getOwnerRentals(
    ownerId: number,
    page = 0,
    size = 12,
    type?: 'flat' | 'room' | 'pg' | 'hourlyroom'
  ): Observable<OwnerRentalPage> {
    const url = `${environment.apiUrl}/api/v1/private/owners/${ownerId}/properties`;
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<ApiResponse<OwnerRentalPage>>(url, { params }).pipe(
      map((resp) => {
        if (resp && resp.success && resp.data) {
          // Normalize content array
          const data = resp.data;
          data.content = data.content || [];
          return data;
        }
        return { content: [], page, size, totalElements: 0, totalPages: 0 };
      })
    );
  }
}
