import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, of, combineLatest, Subject } from 'rxjs';
import { startWith, catchError, tap, distinctUntilChanged, takeUntil, take, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    MatAutocompleteModule,
    MatOptionModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    CarouselModule,
  ],
  templateUrl: './home-page-content.html',
  styleUrls: ['./home-page-content.css'],
})
export class HomePageContent implements OnInit, OnDestroy {
  searchForm!: FormGroup;
  private citiesSubject = new BehaviorSubject<City[]>([]);
  cities$ = this.citiesSubject.asObservable();
  filteredCities$: Observable<City[]>;
  lookingForOptions$!: Observable<string[]>;
  private cityFilterSubject = new BehaviorSubject<string>('');
  private locationsSubject = new BehaviorSubject<string[]>([]);
  locations$ = this.locationsSubject.asObservable();
  private locationFilterSubject = new BehaviorSubject<string>('');
  filteredLocations$: Observable<string[]>;
  private locationLoadingSubject = new BehaviorSubject<boolean>(false);
  isLocationLoading$ = this.locationLoadingSubject.asObservable();

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

  constructor(private fb: FormBuilder, public propertySearchService: PropertySearchService, private router: Router) {
    this.filteredCities$ = combineLatest([
      this.citiesSubject.asObservable(),
      this.cityFilterSubject.asObservable(),
    ]).pipe(map(([cities, filter]) => this.filterCities(cities, filter)));

    this.filteredLocations$ = combineLatest([
      this.locationsSubject.asObservable(),
      this.locationFilterSubject.asObservable(),
    ]).pipe(map(([locations, filter]) => this.filterLocations(locations, filter)));
  }

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
    this.setupAutocompleteSync();
    this.loadCities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearLocationCache(): void {
    this.propertySearchService.clearLocationCache('home-page-content');
    const locationControl = this.searchForm.get('location');
    const townControl = this.searchForm.get('townControl');
    if (locationControl) {
      locationControl.reset();
      locationControl.disable();
    }
    if (townControl) {
      townControl.reset('');
    }
    this.locationLoadingSubject.next(false);
    this.locationFilterSubject.next('');
    this.locationsSubject.next([]);
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      lookingFor: ['', Validators.required],
      city: ['', Validators.required],
      cityControl: ['', Validators.required],
      location: [{ value: '', disabled: true }, Validators.required],
      townControl: ['', Validators.required],
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
    const townControl = this.searchForm.get('townControl');

    if (cityControl && locationControl && lookingForControl) {
      locationControl.disable();

      combineLatest([
        cityControl.valueChanges.pipe(startWith(cityControl.value), distinctUntilChanged()),
        lookingForControl.valueChanges.pipe(startWith(lookingForControl.value), distinctUntilChanged()),
      ])
        .pipe(
          tap(([cityId, type]) => {
            locationControl.reset();
            townControl?.reset('');
            this.locationFilterSubject.next('');
            this.locationsSubject.next([]);
            this.locationLoadingSubject.next(false);

            const hasCityAndType = !!cityId && !!type;
            if (hasCityAndType) {
              locationControl.enable();
              this.loadLocations(cityId, type);
            } else {
              locationControl.disable();
            }
          }),
          takeUntil(this.destroy$)
        )
        .subscribe();
    }
  }

  private setupAutocompleteSync(): void {
    const cityControl = this.searchForm.get('cityControl');
    const townControl = this.searchForm.get('townControl');

    cityControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      const filterValue = typeof value === 'string' ? value : value?.name ?? '';
      this.cityFilterSubject.next(filterValue);
      if (typeof value === 'string') {
        this.searchForm.patchValue({ city: '' }, { emitEvent: true });
        if (!filterValue.trim()) {
          this.locationsSubject.next([]);
          this.locationFilterSubject.next('');
        }
      }
    });

    townControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      const filterValue = (value ?? '').toString();
      this.locationFilterSubject.next(filterValue);
      if (!filterValue.trim()) {
        this.searchForm.patchValue({ location: '' }, { emitEvent: false });
      }
    });
  }

  onCitySelected(city: City | null): void {
    if (!city) {
      return;
    }
    this.searchForm.patchValue(
      {
        city: city.id,
        location: '',
        townControl: '',
      },
      { emitEvent: true }
    );
    this.locationFilterSubject.next('');
  }

  onTownSelected(town: string | null): void {
    if (!town) {
      return;
    }
    this.searchForm.patchValue(
      {
        location: town,
        townControl: town,
      },
      { emitEvent: false }
    );
  }

  private loadLocations(city: string, type: string): void {
    if (!city || !type) {
      this.locationsSubject.next([]);
      this.locationLoadingSubject.next(false);
      return;
    }

    this.locationLoadingSubject.next(true);
    this.propertySearchService
      .getTownSectors(city, type)
      .pipe(take(1))
      .subscribe({
        next: (locations) => {
          this.locationsSubject.next(locations);
          this.locationLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Failed to load town/sector data:', err);
          this.locationLoadingSubject.next(false);
          this.locationsSubject.next([]);
        },
      });
  }

  displayCityName(city: City | string | null): string {
    if (!city) {
      return '';
    }
    return typeof city === 'string' ? city : city.name;
  }

  private filterCities(cities: City[], filter: string): City[] {
    const normalized = filter?.trim().toLowerCase() ?? '';
    if (!normalized) {
      return cities;
    }
    return cities.filter((city) => city.name?.toLowerCase().includes(normalized));
  }

  private filterLocations(locations: string[], filter: string): string[] {
    const normalized = filter?.trim().toLowerCase() ?? '';
    if (!normalized) {
      return locations;
    }
    return locations.filter((location) => location?.toLowerCase().includes(normalized));
  }
}
