import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, delay, map, shareReplay, tap } from 'rxjs/operators';
import { City } from '../interface/City';
import { ApiResponse, PageResponse, PropertySearchResponse, PropertySearchResult } from '../interface/api-response';

@Injectable({
    providedIn: 'root',
})
export class PropertySearchService {
    private readonly API_URL = 'http://localhost:8082';
    private readonly SEARCH_BASE = `${this.API_URL}/api/v1/internal/searching`;
    private readonly LOCATION_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private readonly LOCATION_CACHE_MAX_ENTRIES = 10;
    private locationCache = new Map<string, { data: string[]; timestamp: number }>();
    private citiesCache$?: Observable<City[]>;

    public lastLocationsRequest$ = new BehaviorSubject<string | null>(null);
    public lastLocationsResponse$ = new BehaviorSubject<any | null>(null);

    private readonly cityImageMap: Record<string, string> = {
        bangalore: 'assets/images/bangalore.jfif',
        delhi: 'assets/images/DELHI.png',
        mumbai: 'assets/images/MUMBAI.jpg',
        noida: 'assets/images/NOIDA.png',
        'greater-noida': 'assets/images/greater-noida.png',
        ghaziabad: 'assets/images/ghaziabad.jpg',
        dehradun: 'assets/images/dehradun.jpg',
        chennai: 'assets/images/chennai.jpg',
        gurugram: 'assets/images/gurugram.jpg',
        hyderabad: 'assets/images/HYDERABAD.jpg',
    };

    constructor(private http: HttpClient) { }

    getLookingForOptions(): Observable<string[]> {
        return of(['Flat', 'Room', 'PG', 'Hourly Room']).pipe(delay(200));
    }

    getCities(forceRefresh = false): Observable<City[]> {
        if (forceRefresh || !this.citiesCache$) {
            this.citiesCache$ = this.createCitiesStream();
        }
        return this.citiesCache$;
    }

    refreshCities(): Observable<City[]> {
        this.citiesCache$ = undefined;
        return this.getCities(true);
    }

    private createCitiesStream(): Observable<City[]> {
        return this.http.get<ApiResponse<string[]>>(`${this.SEARCH_BASE}/city`).pipe(
            map((response) => {
                if (!response || !response.success) {
                    throw new Error(response?.message || 'Failed to load cities');
                }

                const names: string[] = response.data || [];
                return names.map((name) => {
                    const slug = this.slugify(name);
                    return {
                        id: name,
                        name,
                        imageUrl: this.cityImageMap[slug] || 'assets/images/logo.png',
                    } as City;
                });
            }),
            tap((cities) => {
                if (cities.length === 0) {
                    console.warn('[PropertySearchService] No cities returned from API');
                }
            }),
            catchError((error) => {
                console.error('[PropertySearchService] getCities error', error);
                const fallback: City[] = Object.keys(this.cityImageMap).map((slug) => ({
                    id: slug.replace(/-/g, ' '),
                    name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    imageUrl: this.cityImageMap[slug],
                }));
                return of(fallback);
            }),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    getTownSectors(cityName: string, type: string): Observable<string[]> {
        const normalizedType = this.normalizeTypeParam(type);
        let params = new HttpParams().set('city', cityName).set('page', '0').set('size', '1000');
        if (normalizedType) params = params.set('type', normalizedType);

        const requestUrl = `${this.SEARCH_BASE}/townSector?${params.toString()}`;
        this.lastLocationsRequest$.next(requestUrl);

        const cacheKey = `${cityName}|${normalizedType}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.lastLocationsResponse$.next({ cache: true, data: cached });
            return of(cached);
        }

        return this.http.get<ApiResponse<PageResponse<{ townSector: string }> | string[]>>(requestUrl).pipe(
            map((response) => {
                if (!response || !response.success) {
                    throw new Error(response?.message || 'Failed to load locations');
                }

                const result = this.parseTownSectorPayload(response.data);
                this.writeToCache(cacheKey, result);
                this.lastLocationsResponse$.next({ raw: response, parsed: result });
                return result;
            }),
            catchError((error) => {
                console.error('[PropertySearchService] getTownSectors error', error);
                return of([]);
            })
        );
    }

    private parseTownSectorPayload(data: PageResponse<{ townSector: string }> | string[] | undefined): string[] {
        if (Array.isArray(data)) {
            return data
                .map((item: string | undefined) => item?.toString().trim())
                .filter((name: string | undefined): name is string => !!name);
        }

        const content = data?.content ?? [];
        return content
            .map((item?: { townSector?: string }) => item?.townSector?.toString().trim())
            .filter((name: string | undefined): name is string => !!name);
    }

    searchProperties(type: string, city: string, townSector: string, page = 0, size = 10): Observable<PropertySearchResponse> {
        const normalizedType = this.normalizeTypeParam(type);
        let params = new HttpParams()
            .set('type', normalizedType)
            .set('city', city)
            .set('townSector', townSector)
            .set('page', page)
            .set('size', size);

        const url = `${this.SEARCH_BASE}/search?${params.toString()}`;

        return this.http.get<ApiResponse<PageResponse<PropertySearchResult>>>(url).pipe(
            map((response) => {
                if (!response || !response.success) {
                    throw new Error(response?.message || 'Failed to search properties');
                }
                const content = response.data?.content ?? [];
                const totalElements = response.data?.totalElements ?? content.length;
                const results = content.map((item: PropertySearchResult) => ({
                    id: item.id,
                    city: item.city,
                    townSector: item.townSector,
                    location: item.location,
                    type: item.type,
                    landmark: item.landmark,
                    minPrice: item.minPrice,
                    maxPrice: item.maxPrice,
                    bhk: item.bhk,
                }));
                return { results, totalElements };
            }),
            catchError((error) => {
                console.error('[PropertySearchService] searchProperties error', error);
                return of({ results: [], totalElements: 0 });
            })
        );
    }

        getPropertyDetails(type: string, id: number): Observable<any> {
            const normalizedType = this.normalizeTypeParam(type);
            const typeParam = normalizedType || type;
            const params = new HttpParams().set('type', typeParam).set('id', id.toString());            const url = `${this.SEARCH_BASE}/details?${params.toString()}`;

            return this.http.get<ApiResponse<any>>(url).pipe(
                map((response) => {
                    if (!response || !response.success) {
                        throw new Error(response?.message || 'Failed to fetch property details');
                    }
                    return response.data;
                }),
                catchError((error) => {
                    console.error('[PropertySearchService] getPropertyDetails error', error);
                    return of(null);
                })
            );
        }

    clearLocationCache(reason: string = 'manual'): void {
        this.locationCache.clear();
        this.lastLocationsResponse$.next({ cacheCleared: true, reason, at: new Date().toISOString() });
    }

    private slugify(name: string): string {
        return name?.toLowerCase().replace(/\s+/g, '-').replace(/[.,]/g, '') || '';
    }

    private getFromCache(key: string): string[] | null {
        const cached = this.locationCache.get(key);
        if (!cached) {
            return null;
        }
        const expired = Date.now() - cached.timestamp > this.LOCATION_CACHE_TTL_MS;
        if (expired) {
            this.locationCache.delete(key);
            return null;
        }
        return cached.data;
    }

    private writeToCache(key: string, data: string[]): void {
        if (this.locationCache.size >= this.LOCATION_CACHE_MAX_ENTRIES) {
            const oldestKey = this.locationCache.keys().next().value;
            if (oldestKey) {
                this.locationCache.delete(oldestKey);
            }
        }
        this.locationCache.set(key, { data, timestamp: Date.now() });
    }
    
    private normalizeTypeParam(rawType?: string | null): string {
        if (!rawType) {
            return '';
        }
        return rawType.toString().trim().replace(/\s+/g, '').toLowerCase();
    }
}
