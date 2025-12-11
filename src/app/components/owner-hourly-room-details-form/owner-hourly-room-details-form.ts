import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OwnerListingFormService } from '../../services/owner-listing-form.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { PropertySearchService } from '../../services/property-search.service';
import { Observable, of, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { City } from '../../interface/City';
import { take, takeUntil, map } from 'rxjs/operators';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
} from '../../constants/facility-options';
import { NumericOnlyDirective } from '../../directives/numeric-only.directive';

@Component({
  selector: 'app-owner-hourly-room-details-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    NumericOnlyDirective
  ],
  templateUrl: './owner-hourly-room-details-form.html',
  styleUrl: './owner-hourly-room-details-form.css',
})
export class OwnerHourlyRoomDetailsForm implements OnInit, OnDestroy {
  private readonly citiesSubject = new BehaviorSubject<City[]>([]);
  cities$ = this.citiesSubject.asObservable();
  private readonly cityFilterSubject = new BehaviorSubject<string>('');
  filteredCities$ = combineLatest([this.cities$, this.cityFilterSubject.asObservable()]).pipe(
    map(([cities, filter]) => this.filterCities(cities, filter))
  );

  private locationsSubject = new BehaviorSubject<string[]>([]);
  locations$ = this.locationsSubject.asObservable();
  private readonly townFilterSubject = new BehaviorSubject<string>('');
  filteredLocations$ = combineLatest([this.locations$, this.townFilterSubject.asObservable()]).pipe(
    map(([locations, filter]) => this.filterLocations(locations, filter))
  );
  private locationLoadingSubject = new BehaviorSubject<boolean>(false);
  isLocationLoading$ = this.locationLoadingSubject.asObservable();
  private citiesLoaded = false;
  private destroy$ = new Subject<void>();

  get listingForm() {
    return this.listingFormService.form;
  }

  readonly insideFacilities = INSIDE_FACILITIES;
  readonly outsideFacilities = OUTSIDE_FACILITIES;

  constructor(
    private readonly listingFormService: OwnerListingFormService,
    private readonly router: Router,
    private propertySearchService: PropertySearchService
  ) {}

  ngOnInit(): void {
    this.loadCities();
    this.citiesLoaded = true;
    
    const currentCity = this.listingForm.get('city')?.value;
    if (this.isKnownCity(currentCity)) {
      this.loadLocations(currentCity);
    }
    
    this.listingForm.get('city')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
         this.listingForm.get('town')?.reset();
         this.locationsSubject.next([]);
         this.townFilterSubject.next('');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCities(forceRefresh = false): void {
    this.propertySearchService
      .getCities(forceRefresh)
      .pipe(take(1))
      .subscribe((cities) => this.citiesSubject.next(cities));
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
    const city = this.listingForm.get('city')?.value;
    if (this.isKnownCity(city)) {
        this.loadLocations(city);
    }
  }

  onCitySelected(event: MatAutocompleteSelectedEvent): void {
    const cityId = event.option?.value;
    if (cityId) {
      this.loadLocations(cityId);
    }
  }

  onCityFilter(value: string): void {
    this.cityFilterSubject.next(value || '');
  }

  onTownFilter(value: string): void {
    this.townFilterSubject.next(value || '');
  }

  onCityChange(): void {
    const city = this.listingForm.get('city')?.value;
    if (this.isKnownCity(city)) {
      this.loadLocations(city);
    }
  }

  private loadLocations(city: string) {
    const type = 'Hourly Room'; 
    
    this.locationLoadingSubject.next(true);
    this.propertySearchService
      .getTownSectors(city, type)
      .pipe(take(1))
      .subscribe({
        next: (locations) => {
          this.locationsSubject.next(locations);
          this.townFilterSubject.next('');
          this.locationLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Failed to load town/sector data:', err);
          this.locationLoadingSubject.next(false);
          this.locationsSubject.next([]);
        },
      });
  }

  onNext(): void {
    this.router.navigate(['/owner/hourly-room/images']).catch((err) => console.error('Navigation failed', err));
  }

  private filterCities(cities: City[], query: string): City[] {
    if (!query) {
      return cities;
    }
    const lower = query.toLowerCase();
    return cities.filter((city) => city.name.toLowerCase().includes(lower));
  }

  private filterLocations(locations: string[], query: string): string[] {
    if (!query) {
      return locations;
    }
    const lower = query.toLowerCase();
    return locations.filter((loc) => loc.toLowerCase().includes(lower));
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
}
