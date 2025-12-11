import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OwnerListingFormService } from '../../services/owner-listing-form.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { PropertySearchService } from '../../services/property-search.service';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import { City } from '../../interface/City';
import { take, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-owner-property-details-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './owner-property-details-form.html',
  styleUrl: './owner-property-details-form.css',
})
export class OwnerPropertyDetailsForm implements OnInit, OnDestroy {
  cities$: Observable<City[]> = of([]);
  private locationsSubject = new BehaviorSubject<string[]>([]);
  locations$ = this.locationsSubject.asObservable();
  private locationLoadingSubject = new BehaviorSubject<boolean>(false);
  isLocationLoading$ = this.locationLoadingSubject.asObservable();
  private citiesLoaded = false;
  private destroy$ = new Subject<void>();

  get listingForm() {
    return this.listingFormService.form;
  }

  constructor(
    private readonly listingFormService: OwnerListingFormService,
    private readonly router: Router,
    private propertySearchService: PropertySearchService
  ) {}

  ngOnInit(): void {
    this.loadCities();
    this.citiesLoaded = true;
    
    const currentCity = this.listingForm.get('city')?.value;
    if (currentCity) {
        this.loadLocations(currentCity);
    }
    
    this.listingForm.get('city')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
         this.listingForm.get('town')?.reset();
         this.locationsSubject.next([]);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCities(forceRefresh = false): void {
    this.cities$ = this.propertySearchService.getCities(forceRefresh);
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
    if (city) {
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
    this.router.navigate(['/owner/property/images']).catch((err) => console.error('Navigation failed', err));
  }
}
