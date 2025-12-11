import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, of, combineLatest, Subject } from 'rxjs';
import { startWith, catchError, tap, distinctUntilChanged, takeUntil, take, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

import { CarouselModule } from 'ngx-owl-carousel-o';
import { City } from '../../interface/City';
import { PropertySearchResponse } from '../../interface/api-response';
import { PropertySearchService } from '../../services/property-search.service';

@Component({
  selector: 'app-home-page-content',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    CarouselModule,
  ],
  templateUrl: './home-page-content.html',
  styleUrls: ['./home-page-content.css'],
})
export class HomePageContent implements OnInit, OnDestroy {
  searchForm!: FormGroup;
  private readonly citiesSubject = new BehaviorSubject<City[]>([]);
  cities$ = this.citiesSubject.asObservable();
  private readonly cityFilterSubject = new BehaviorSubject<string>('');
  filteredCities$ = combineLatest([this.cities$, this.cityFilterSubject.asObservable()]).pipe(
    map(([cities, filter]) => this.filterCities(cities, filter))
  );
  lookingForOptions$!: Observable<string[]>;
  private locationsSubject = new BehaviorSubject<string[]>([]);
  locations$ = this.locationsSubject.asObservable();
  private readonly locationFilterSubject = new BehaviorSubject<string>('');
  filteredLocations$ = combineLatest([this.locations$, this.locationFilterSubject.asObservable()]).pipe(
    map(([locations, filter]) => this.filterLocations(locations, filter))
  );
  private locationLoadingSubject = new BehaviorSubject<boolean>(false);
  isLocationLoading$ = this.locationLoadingSubject.asObservable();
  private citiesLoaded = false;

  carouselOptions = {
    loop: false,
    mouseDrag: false,
    touchDrag: false,
    pullDrag: false,
    dots: true,
    navSpeed: 1000,
    navText: ['', ''],
    margin: 6,
    stagePadding: 0,
    responsive: {
      0: { items: 2 }, // very small screens
      400: { items: 3 }, // small
      640: { items: 4 }, // slight big
      900: { items: 5 }, // large
      1024: { items: 6 }, // laptop and up
    },
    nav: false,
    autoplay: false,
    autoplayTimeout: 2200,
    autoplayHoverPause: true,
    smartSpeed: 300,
    autoplaySpeed: 300,
    fluidSpeed: true,
    dragEndSpeed: 300,
    slideTransition: 'ease-in-out',
  };
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, public propertySearchService: PropertySearchService, private router: Router) { }

  // Debug helpers bound to template (use getters to avoid initialization order issues)
  get lastLocationsRequest$() {
    return this.propertySearchService.lastLocationsRequest$;
  }

  get lastLocationsResponse$() {
    return this.propertySearchService.lastLocationsResponse$;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadLookingForOptions();
    this.setupLocationControlState();
    this.loadCities();
    this.citiesLoaded = true;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearLocationCache(): void {
    this.propertySearchService.clearLocationCache('home-page-content');
    const locationControl = this.searchForm.get('location');
    if (locationControl) {
      locationControl.reset();
      locationControl.disable();
    }
    this.locationFilterSubject.next('');
    this.locationLoadingSubject.next(false);
  }

  onCityInputFocus(): void {
    if (!this.citiesLoaded) {
      this.loadCities();
      this.citiesLoaded = true;
    }
  }

  onLocationDropdownOpened(isOpen: boolean): void {
    if (!isOpen) {
      return;
    }

    const cityId = this.searchForm.get('city')?.value;
    const type = this.searchForm.get('lookingFor')?.value;

    if (!this.isKnownCity(cityId) || !type) {
      console.warn('Select both city and property type before choosing a location');
      this.locationsSubject.next([]);
      return;
    }

    this.loadLocations(cityId);
  }

  onCityFilter(value: string): void {
    this.cityFilterSubject.next(value || '');
  }

  onLocationFilter(value: string): void {
    this.locationFilterSubject.next(value || '');
  }

  onCitySelected(event: MatAutocompleteSelectedEvent): void {
    const cityId = event.option?.value;
    if (cityId) {
      this.loadLocations(cityId);
      this.cityFilterSubject.next('');
    }
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      lookingFor: ['Flat', Validators.required],
      city: ['', Validators.required],
      location: [{ value: '', disabled: true }, Validators.required],
    });
  }

  private loadLookingForOptions(): void {
    this.lookingForOptions$ = this.propertySearchService.getLookingForOptions().pipe(
      tap((options) => {
        if (options.length === 0) {
          console.warn('No options loaded for lookingFor dropdown');
        }
      }),
      catchError((err) => {
        console.error('Failed to load looking for options:', err);
        return of([]);
      })
    );
  }

  private loadCities(forceRefresh = false): void {
    this.propertySearchService
      .getCities(forceRefresh)
      .pipe(take(1))
      .subscribe({
        next: (cities) => this.citiesSubject.next(cities),
        error: (err) => {
          console.error('Failed to load cities:', err);
          this.citiesSubject.next([]);
        },
      });
  }

  onSearch(): void {
    if (this.searchForm.valid) {
      const formValues = this.searchForm.value;
      this.propertySearchService
        .searchProperties(formValues.lookingFor, formValues.city, formValues.location)
        .pipe(take(1))
        .subscribe({
          next: (response: PropertySearchResponse) => {
            console.debug('[HomePageContent] search results', response.results);
            this.router.navigate(['/listings'], {
              queryParams: {
                type: formValues.lookingFor,
                city: formValues.city,
                sector: formValues.location,
              },
            });
          },
          error: (err) => {
            console.error('Search API error:', err);
          },
        });
    } else {
      this.searchForm.markAllAsTouched(); // Show validation errors
    }
  }

  onAddRentalClick(): void {
    // Check if user is already logged in as owner
    const token = localStorage.getItem('accessToken');
    const userType = localStorage.getItem('userType');
    
    if (token && userType === 'OWNER') {
      // Already logged in as owner, go directly to owner dashboard with rentals tab
      this.router.navigate(['/owner-dashboard'], { queryParams: { tab: 'rentals' } }).catch((err) => console.warn('Navigation failed', err));
    } else {
      // Not logged in or not an owner, redirect to owner login with returnUrl to rentals section
      this.router.navigate(['/login'], {
        queryParams: {
          userType: 'OWNER',
          returnUrl: '/owner-dashboard?tab=rentals'
        }
      }).catch((err) => console.warn('Navigation failed', err));
    }
  }

  private setupLocationControlState(): void {
    const cityControl = this.searchForm.get('city');
    const locationControl = this.searchForm.get('location');
    const lookingForControl = this.searchForm.get('lookingFor');

    if (cityControl && locationControl && lookingForControl) {
      locationControl.disable();

      combineLatest([

  private loadLocations(cityId: string): void {
    const type = this.searchForm.get('lookingFor')?.value;
    if (!type) {
      return;
    }

    this.locationLoadingSubject.next(true);
    this.propertySearchService
      .getTownSectors(cityId, type)
      .pipe(take(1))
      .subscribe({
        next: (locations) => {
          this.locationsSubject.next(locations);
          this.locationFilterSubject.next('');
          this.locationLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Failed to load town/sector data:', err);
          this.locationLoadingSubject.next(false);
          this.locationsSubject.next([]);
        },
      });
  }

  private filterCities(cities: City[], query: string): City[] {
    if (!query) {
      return cities;
    }
    const normalized = query.toLowerCase();
    return cities.filter((city) => city.name.toLowerCase().includes(normalized));
  }

  private filterLocations(locations: string[], query: string): string[] {
    if (!query) {
      return locations;
    }
    const normalized = query.toLowerCase();
    return locations.filter((location) => location.toLowerCase().includes(normalized));
  }

  displayCityName(cityId: string | null): string {
    if (!cityId) {
      return '';
    }
    const city = this.citiesSubject.getValue().find((item) => item.id === cityId);
    return city?.name ?? cityId;
  }

  private isKnownCity(cityId: string | null): boolean {
    if (!cityId) {
      return false;
    }
    return this.citiesSubject.getValue().some((item) => item.id === cityId);
  }
        cityControl.valueChanges.pipe(startWith(cityControl.value), distinctUntilChanged()),
        lookingForControl.valueChanges.pipe(startWith(lookingForControl.value), distinctUntilChanged()),
      ]).pipe(
        tap(([cityId, type]) => {
          locationControl.reset();
          this.locationsSubject.next([]);
          this.locationFilterSubject.next('');

          const hasCityAndType = this.isKnownCity(cityId) && !!type;
          if (hasCityAndType) {
            locationControl.enable();
          } else {
            locationControl.disable();
            this.locationLoadingSubject.next(false);
          }
        }),
        takeUntil(this.destroy$)
      ).subscribe();
    }
  }
}
