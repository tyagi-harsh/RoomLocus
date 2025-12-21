import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OwnerRental {
  propertyId: number;
  title: string;
  propertyType: string;
  rent?: number | null;
  status?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  locality?: string | null;
  pincode?: string | null;
  thumbnailUrl?: string | null;
  imageUrls?: string[] | null;
  createdAt?: string | null;
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
  constructor(private readonly http: HttpClient) {}

  getOwnerRentals(ownerId: number, page = 0, size = 10, type = 'flat'): Observable<OwnerRentalPage> {
    const url = `${environment.apiUrl}/api/v1/private/owners/${ownerId}/properties`;
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('type', type);

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
