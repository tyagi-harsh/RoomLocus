import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, of, combineLatest, Subject } from 'rxjs';
import { startWith, catchError, tap, distinctUntilChanged, takeUntil, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
  cities$: Observable<City[]> = of([]);
  lookingForOptions$!: Observable<string[]>;
  private locationsSubject = new BehaviorSubject<string[]>([]);
  locations$ = this.locationsSubject.asObservable();
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
    this.locationLoadingSubject.next(false);
  }

  onCityDropdownOpened(isOpen: boolean): void {
    if (!isOpen) {
      return;
    }
    if (!this.citiesLoaded) {
      this.loadCities();
      this.citiesLoaded = true;
    }
  }

  onLocationDropdownOpened(isOpen: boolean): void {
    if (!isOpen) {
      return;
    }

    const city = this.searchForm.get('city')?.value;
    const type = this.searchForm.get('lookingFor')?.value;

    if (!city || !type) {
      console.warn('Select both city and property type before choosing a location');
      this.locationsSubject.next([]);
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
    this.cities$ = this.propertySearchService.getCities(forceRefresh);
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

  private setupLocationControlState(): void {
    const cityControl = this.searchForm.get('city');
    const locationControl = this.searchForm.get('location');
    const lookingForControl = this.searchForm.get('lookingFor');

    if (cityControl && locationControl && lookingForControl) {
      locationControl.disable();

      combineLatest([
        cityControl.valueChanges.pipe(startWith(cityControl.value), distinctUntilChanged()),
        lookingForControl.valueChanges.pipe(startWith(lookingForControl.value), distinctUntilChanged()),
      ]).pipe(
        tap(([cityId, type]) => {
          locationControl.reset();

          const hasCityAndType = !!cityId && !!type;
          if (hasCityAndType) {
            locationControl.enable();
          } else {
            locationControl.disable();
            this.locationLoadingSubject.next(false);
            this.locationsSubject.next([]);
          }
        }),
        takeUntil(this.destroy$)
      ).subscribe();
    }
  }
}
