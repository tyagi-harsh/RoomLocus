export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements?: number;
}

export interface PropertySearchResult {
  id: number;
  city: string;
  townSector: string;
  location: string;
  type?: string | null;
  landmark?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  bhk?: string | null;
  verified?: boolean | null;
}

export interface PropertySearchResponse {
  results: PropertySearchResult[];
  totalElements: number;
}
