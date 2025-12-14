import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PropertySearchService } from '../../services/property-search.service';
import { PropertyCreationService, FlatPayload } from '../../services/property-creation.service';
import { ToastService } from '../../services/toast.service';
import { ApiService } from '../../services/api';
import { Observable, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { City } from '../../interface/City';
import { map, take, takeUntil } from 'rxjs/operators';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
  buildFacilityControls,
}  from '../../constants/facility-options';
import { NumericOnlyDirective } from '../../directives/numeric-only.directive';

@Component({
  selector: 'app-owner-flat-details-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    MatOptionModule,
    NumericOnlyDirective,
    FormsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './owner-flat-details-form.html',
  styleUrl: './owner-flat-details-form.css',
})
export class OwnerFlatDetailsForm implements OnInit, OnDestroy {
  private citiesSubject = new BehaviorSubject<City[]>([]);
  filteredCities$: Observable<City[]>;
  private cityFilterSubject = new BehaviorSubject<string>('');

  private locationsSubject = new BehaviorSubject<string[]>([]);
  locations$ = this.locationsSubject.asObservable();
  private locationFilterSubject = new BehaviorSubject<string>('');
  filteredLocations$: Observable<string[]>;

  private locationLoadingSubject = new BehaviorSubject<boolean>(false);
  isLocationLoading$ = this.locationLoadingSubject.asObservable();
  private destroy$ = new Subject<void>();

  listingForm: FormGroup;

  readonly insideFacilities = INSIDE_FACILITIES;
  readonly outsideFacilities = OUTSIDE_FACILITIES;

  contactOtpRequested = false;
  contactOtpVerified = false;
  contactOtpInput = '';
  contactOtpError: string | null = null;
  isSendingContactOtp = false;
  isVerifyingContactOtp = false;
  showContactOtpSentMessage = false;
  showContactResendOption = false;
  showContactOtpVerifiedToast = false;
  private contactOtpTimer: ReturnType<typeof setTimeout> | null = null;
  private contactOtpToastTimer: ReturnType<typeof setTimeout> | null = null;
  showCancelConfirmation = false;
  isSaving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private propertySearchService: PropertySearchService,
    private propertyCreationService: PropertyCreationService,
    private toastService: ToastService,
    private apiService: ApiService
  ) {
    this.listingForm = this.fb.group({
      city: [''],
      cityControl: ['', Validators.required],
      town: [''],
      townControl: ['', Validators.required],
      location: ['', Validators.required],
      landmark: [''],
      bhk: ['1 BHK', Validators.required],
      totalFlat: ['', Validators.required],
      totalFloors: ['', Validators.required],
      minPrice: ['', Validators.required],
      maxPrice: ['', Validators.required],
      security: ['', Validators.required],
      maintenance: ['', Validators.required],
      offer: [''],
      caretaker: [''],
      petAllowed: ['', Validators.required],
      noticePeriod: ['1 Month', Validators.required],
      manager: [''],
      contact: ['', Validators.required],
      whatsappNo: ['', [Validators.required]],
      address: ['', Validators.required],
      furnishing: ['', Validators.required],
      accommodation: ['', Validators.required],
      gender: ['', Validators.required],
      waterSupply: ['24 hr', Validators.required],
      powerBackup: ['Yes', Validators.required],
      flatType: ['', Validators.required],
      parking: this.fb.group({
        car: [false],
        bike: [false]
      }),
      preferTenant: this.fb.group({
        family: [false],
        bachelors: [false],
        girls: [false],
        boys: [false],
        professionals: [false]
      }),
      insideFacility: this.fb.group(buildFacilityControls(INSIDE_FACILITIES)),
      outsideFacility: this.fb.group(buildFacilityControls(OUTSIDE_FACILITIES))
    });

    this.filteredCities$ = combineLatest([
      this.citiesSubject.asObservable(),
      this.cityFilterSubject.asObservable(),
    ]).pipe(map(([cities, filter]) => this.filterCities(cities, filter)));

    this.filteredLocations$ = combineLatest([
      this.locationsSubject.asObservable(),
      this.locationFilterSubject.asObservable(),
    ]).pipe(map(([locations, filter]) => this.filterLocations(locations, filter)));
  }

  ngOnInit(): void {
    this.loadCities();

    this.listingForm
      .get('city')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.listingForm.patchValue(
          { town: '', townControl: '' },
          { emitEvent: false }
        );
        this.locationsSubject.next([]);
        this.locationFilterSubject.next('');
      });

    this.listingForm
      .get('cityControl')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const filterValue = typeof value === 'string' ? value : value?.name ?? '';
        this.cityFilterSubject.next(filterValue);
        if (typeof value === 'string') {
          this.listingForm.patchValue(
            { city: '' },
            { emitEvent: false }
          );
          if (!filterValue.trim()) {
            this.locationsSubject.next([]);
            this.locationFilterSubject.next('');
          }
        }
      });

    this.listingForm
      .get('townControl')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        const filterValue = (value ?? '').toString();
        this.locationFilterSubject.next(filterValue);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearContactOtpTimer();
    this.clearContactOtpToastTimer();
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

  onCitySelected(city: City): void {
    if (!city) {
      return;
    }
    this.listingForm.patchValue(
      {
        city: city.id,
        cityControl: city,
        town: '',
        townControl: '',
      },
      { emitEvent: true }
    );
    this.locationFilterSubject.next('');
    this.loadLocations(city.id);
  }

  onTownSelected(town: string): void {
    if (!town) {
      return;
    }
    this.listingForm.patchValue(
      {
        town,
        townControl: town,
      },
      { emitEvent: false }
    );
  }

  private loadLocations(city: string) {
    if (!city) {
      this.locationsSubject.next([]);
      return;
    }

    this.locationLoadingSubject.next(true);
    this.propertySearchService
      .getRentalSectorsByCity(city)
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
    return cities.filter((city) =>
      city.name?.toLowerCase().includes(normalized)
    );
  }

  private filterLocations(locations: string[], filter: string): string[] {
    const normalized = filter?.trim().toLowerCase() ?? '';
    if (!normalized) {
      return locations;
    }
    return locations.filter((location) =>
      location?.toLowerCase().includes(normalized)
    );
  }

  startContactOtpFlow(): void {
    this.resetContactOtpUiFlags();
    this.isSendingContactOtp = true;
    this.clearContactOtpTimer();

    const mobile = this.listingForm.get('whatsappNo')?.value?.toString() || '';
    const accessToken = localStorage.getItem('accessToken') || '';
    const payload = { mobile, userType: 'OWNER', purpose: 'R', accessToken };

    this.apiService.getOtp(payload).pipe(take(1)).subscribe({
      next: (resp) => {
        this.isSendingContactOtp = false;
        if (resp && resp.success === false) {
          this.contactOtpError = resp.error || 'Failed to send OTP';
          this.toastService.error(this.contactOtpError || 'Failed to send OTP');
          return;
        }
        this.contactOtpRequested = true;
        this.showContactOtpSentMessage = true;
        this.showContactResendOption = true;
        this.toastService.success('OTP sent successfully!');
      },
      error: (err) => {
        this.isSendingContactOtp = false;
        console.error('getOtp error:', err);
        this.contactOtpError = 'Failed to send OTP. Please try again.';
        this.toastService.error(this.contactOtpError);
      },
    });
  }

  resendContactOtp(): void {
    this.resetContactOtpUiFlags();
    this.startContactOtpFlow();
  }

  verifyContactOtp(): void {
    if (!this.contactOtpInput?.trim()) {
      this.contactOtpError = 'Enter OTP to verify';
      return;
    }
    this.contactOtpError = null;
    this.isVerifyingContactOtp = true;
    this.clearContactOtpTimer();

    const mobile = this.listingForm.get('whatsappNo')?.value?.toString() || '';
    const payload = { mobile, userType: 'OWNER', otp: this.contactOtpInput.trim(), purpose: 'R' };

    this.apiService.verifyOtp(payload).pipe(take(1)).subscribe({
      next: (resp) => {
        this.isVerifyingContactOtp = false;
        if (resp.status === 200) {
          this.contactOtpVerified = true;
          this.showContactOtpVerifiedToast = true;
          this.contactOtpRequested = false;
          this.scheduleContactOtpToastHide();
          this.toastService.success('Mobile verified successfully!');
        } else {
          this.contactOtpError = resp.body?.message || 'Invalid or expired OTP';
          this.showContactResendOption = true;
          this.toastService.error(this.contactOtpError || 'Invalid or expired OTP');
        }
      },
      error: (err) => {
        this.isVerifyingContactOtp = false;
        console.error('verifyOtp error:', err);
        this.contactOtpError = 'Verification failed. Please try again.';
        this.showContactResendOption = true;
        this.toastService.error(this.contactOtpError || 'Verification failed');
      },
    });
  }

  private resetContactOtpUiFlags(): void {
    this.contactOtpError = null;
    this.showContactOtpSentMessage = false;
    this.showContactOtpVerifiedToast = false;
    this.contactOtpVerified = false;
    this.clearContactOtpToastTimer();
  }

  private clearContactOtpTimer(): void {
    if (this.contactOtpTimer) {
      clearTimeout(this.contactOtpTimer);
      this.contactOtpTimer = null;
    }
  }

  private scheduleContactOtpToastHide(): void {
    this.clearContactOtpTimer();
    if (this.contactOtpToastTimer) {
      clearTimeout(this.contactOtpToastTimer);
    }
    this.contactOtpToastTimer = setTimeout(() => {
      this.showContactOtpVerifiedToast = false;
      this.contactOtpToastTimer = null;
    }, 3000);
  }

  private clearContactOtpToastTimer(): void {
    if (this.contactOtpToastTimer) {
      clearTimeout(this.contactOtpToastTimer);
      this.contactOtpToastTimer = null;
    }
  }

  onNext(): void {
    console.log('onNext called - Flat form');
    console.log('Form valid:', this.listingForm.valid);
    console.log('Form errors:', this.listingForm.errors);
    
    if (this.listingForm.invalid) {
      this.listingForm.markAllAsTouched();
      // Log which controls are invalid
      Object.keys(this.listingForm.controls).forEach(key => {
        const control = this.listingForm.get(key);
        if (control?.invalid) {
          console.log(`Invalid field: ${key}`, control.errors);
        }
      });
      this.toastService.warning('Please fill all required fields');
      return;
    }

    const ownerId = this.propertyCreationService.getOwnerId();
    console.log('Owner ID:', ownerId);
    if (!ownerId) {
      this.toastService.error('You must be logged in as an owner to create a listing');
      return;
    }

    const payload = this.mapFormToPayload();
    console.log('Payload:', payload);
    this.isSaving = true;

    console.log('Calling createFlat API...');
    this.propertyCreationService.createFlat(ownerId, payload).pipe(take(1)).subscribe({
      next: (result) => {
        this.isSaving = false;
        if (result.success) {
          this.toastService.success('Flat listing created successfully!');
          const flatId = result.data?.id;
          this.router
            .navigate(['/owner/flat/images'], { queryParams: { propertyType: 'flat', flatId } })
            .catch((err) => console.error('Navigation failed', err));
        } else {
          this.toastService.error(result.error || 'Failed to create flat listing');
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('createFlat error:', err);
        this.toastService.error('An unexpected error occurred');
      },
    });
  }

  /**
   * Maps form values to the FlatPayload expected by the backend.
   */
  private mapFormToPayload(): FlatPayload {
    const v = this.listingForm.value;

    // Build parking array from checkboxes
    const parking: string[] = [];
    if (v.parking?.car) parking.push('FourWheeler');
    if (v.parking?.bike) parking.push('TwoWheeler');

    // Build preferTenants array from checkboxes
    const preferTenants: string[] = [];
    if (v.preferTenant?.family) preferTenants.push('Family');
    if (v.preferTenant?.bachelors) preferTenants.push('Bachelors');
    if (v.preferTenant?.girls) preferTenants.push('Girls');
    if (v.preferTenant?.boys) preferTenants.push('Boys');
    if (v.preferTenant?.professionals) preferTenants.push('Professionals');

    // Build flatInside array from facility checkboxes
    const flatInside: string[] = [];
    if (v.insideFacility) {
      for (const [key, checked] of Object.entries(v.insideFacility)) {
        if (checked) flatInside.push(key);
      }
    }

    // Build flatOutside array from facility checkboxes
    const flatOutside: string[] = [];
    if (v.outsideFacility) {
      for (const [key, checked] of Object.entries(v.outsideFacility)) {
        if (checked) flatOutside.push(key);
      }
    }

    // Map waterSupply string to number (e.g., '24 hr' -> 24)
    let waterSupply = 0;
    if (v.waterSupply) {
      const match = v.waterSupply.toString().match(/\d+/);
      if (match) waterSupply = parseInt(match[0], 10);
    }

    // Map powerBackup string to number (Yes=1, No=0)
    const powerBackup = v.powerBackup?.toLowerCase() === 'yes' ? 1 : 0;

    // Get city name from cityControl (could be City object or string)
    const cityName = typeof v.cityControl === 'object' ? v.cityControl?.name : v.cityControl;

    return {
      type: 'Flat',
      city: cityName || '',
      townSector: v.townControl || v.town || '',
      location: v.location || '',
      landmark: v.landmark || '',
      BHK: v.bhk || '',
      maxPrice: parseInt(v.maxPrice, 10) || 0,
      minPrice: parseInt(v.minPrice, 10) || 0,
      offer: v.offer || '',
      security: parseInt(v.security, 10) || 0,
      maintenance: parseInt(v.maintenance, 10) || 0,
      totalFlat: parseInt(v.totalFlat, 10) || 0,
      address: v.address || '',
      totalFloor: parseInt(v.totalFloors, 10) || 0,
      waterSupply,
      powerBackup,
      noticePeriod: v.noticePeriod || '',
      furnishingType: v.furnishing || '',
      accomoType: v.accommodation || '',
      parking,
      preferTenants,
      petsAllowed: v.petAllowed?.toLowerCase() === 'yes',
      genderPrefer: v.gender || '',
      flatType: v.flatType || '',
      careTaker: v.caretaker || '',
      mobile: v.whatsappNo || v.contact || '',
      contactName: v.manager || '',
      state: 'N/A', // State is not collected in this form; backend may handle defaults
      flatInside,
      flatOutside,
      isVisible: true,
      isDraft: false,
      verificationPending: true,
    };
  }

  onCancel(): void {
    this.showCancelConfirmation = true;
  }

  confirmCancel(): void {
    this.showCancelConfirmation = false;
    window.location.reload();
  }

  dismissCancelConfirmation(): void {
    this.showCancelConfirmation = false;
  }

  get isContactNumberValid(): boolean {
    const controlValue = this.listingForm.get('whatsappNo')?.value;
    if (controlValue === null || controlValue === undefined) {
      return false;
    }
    const rawString = controlValue.toString();
    const digitsOnly = rawString.replace(/\D/g, '');
    return digitsOnly.length === 10;
  }
}
