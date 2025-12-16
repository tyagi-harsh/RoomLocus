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
import { PropertyCreationService, PGPayload } from '../../services/property-creation.service';
import { ToastService } from '../../services/toast.service';
import { ApiService } from '../../services/api';
import { OwnerPropertyStoreService } from '../../services/owner-property-store.service';
import { Observable, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { City } from '../../interface/City';
import { map, take, takeUntil } from 'rxjs/operators';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
  buildFacilityControls,
} from '../../constants/facility-options';
import { NumericOnlyDirective } from '../../directives/numeric-only.directive';

@Component({
  selector: 'app-owner-pg-details-form',
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
  templateUrl: './owner-pg-details-form.html',
  styleUrl: './owner-pg-details-form.css',
})
export class OwnerPgDetailsForm implements OnInit, OnDestroy {
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
  showOtpDialog = false;
  otpDialogMessage = '';
  private readonly formStorageKey = 'owner-pg-details-form-state';
  private readonly formStorageTtl = 4 * 60 * 1000;
  private contactOtpTimer: ReturnType<typeof setTimeout> | null = null;
  showCancelConfirmation = false;
  isSaving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private propertySearchService: PropertySearchService,
    private propertyCreationService: PropertyCreationService,
    private toastService: ToastService,
    private apiService: ApiService,
    private ownerPropertyStore: OwnerPropertyStoreService
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
      bedCount: ['', Validators.required],
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
      timeRestrict: ['', Validators.required],
      foodAvailable: ['', Validators.required],
      parking: this.fb.group({
        car: [false],
        bike: [false],
      }),
      preferTenant: this.fb.group({
        family: [false],
        bachelors: [false],
        girls: [false],
        boys: [false],
        professionals: [false],
      }),
      insideFacility: this.fb.group(buildFacilityControls(INSIDE_FACILITIES)),
      outsideFacility: this.fb.group(buildFacilityControls(OUTSIDE_FACILITIES)),
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

    this.loadSavedFormState();
    this.listingForm
      .valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.saveFormState());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearContactOtpTimer();
    this.clearSavedFormState();
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
        this.openOtpDialog('OTP sent successfully to registered WhatsApp number');
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
          this.contactOtpRequested = false;
          this.showContactResendOption = false;
          this.showContactOtpSentMessage = false;
          this.contactOtpInput = '';
          this.openOtpDialog('Mobile verified successfully');
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
    this.contactOtpVerified = false;
    this.showContactResendOption = false;
    this.clearContactOtpTimer();
  }

  private clearContactOtpTimer(): void {
    if (this.contactOtpTimer) {
      clearTimeout(this.contactOtpTimer);
      this.contactOtpTimer = null;
    }
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

  onNext(): void {
    console.log('onNext called - PG form');
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
      this.toastService.error('Please fill all required fields');
      return;
    }

    this.isSaving = true;
    const ownerId = this.propertyCreationService.getOwnerId();
    console.log('Owner ID:', ownerId);
    if (!ownerId) {
      this.isSaving = false;
      this.toastService.error('Owner ID not found. Please login again.');
      return;
    }

    const payload = this.mapFormToPayload();
    console.log('Payload:', payload);
    console.log('Calling createPG API...');
    this.propertyCreationService.createPG(ownerId, payload).pipe(take(1)).subscribe({
      next: (result) => {
        this.isSaving = false;
        if (result.success) {
          this.toastService.success('PG details saved successfully!');
          this.recordPropertySummary(ownerId, result.data?.id, 'PG');
          this.router
            .navigate(['/owner/pg/images'], { queryParams: { propertyType: 'pg' } })
            .catch((err) => console.error('Navigation failed', err));
        } else {
          this.toastService.error(result.error || 'Failed to save PG details');
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error creating PG:', err);
        this.toastService.error('Failed to save PG details. Please try again.');
      },
    });
  }

  mapFormToPayload(): PGPayload {
    const f = this.listingForm.value;

    // Convert parking checkbox group to string array
    const parkingArr: string[] = [];
    if (f.parking?.car) parkingArr.push('Car');
    if (f.parking?.bike) parkingArr.push('Bike');

    // Convert preferTenant checkbox group to string array
    const tenantArr: string[] = [];
    if (f.preferTenant?.family) tenantArr.push('Family');
    if (f.preferTenant?.bachelors) tenantArr.push('Bachelors');
    if (f.preferTenant?.girls) tenantArr.push('Girls');
    if (f.preferTenant?.boys) tenantArr.push('Boys');
    if (f.preferTenant?.professionals) tenantArr.push('Professionals');

    // Convert insideFacility checkbox group to string array
    const insideArr: string[] = [];
    if (f.insideFacility) {
      Object.keys(f.insideFacility).forEach((key) => {
        if (f.insideFacility[key]) insideArr.push(key);
      });
    }

    // Convert outsideFacility checkbox group to string array
    const outsideArr: string[] = [];
    if (f.outsideFacility) {
      Object.keys(f.outsideFacility).forEach((key) => {
        if (f.outsideFacility[key]) outsideArr.push(key);
      });
    }

    // Convert waterSupply mixed-type value to number (e.g., "24 hr" -> 24)
    let waterSupplyNum = 0;
    if (f.waterSupply !== undefined && f.waterSupply !== null) {
      const wsStr = String(f.waterSupply);
      const match = wsStr.match(/\d+/);
      if (match) {
        const parsed = parseInt(match[0], 10);
        waterSupplyNum = isNaN(parsed) ? 0 : parsed;
      }
    }

    // Convert powerBackup mixed-type to number (truthy -> 1, else 0)
    const powerBackupNum = ['yes', 'true', '1', 'y'].includes(String(f.powerBackup).toLowerCase()) ? 1 : 0;

    // Convert foodAvailable and timeRestrict to boolean (accept Yes/true/1)
    const truthy = (val: any) => ['yes', 'true', '1', 'y'].includes(String(val).toLowerCase());
    const foodAvailBool = truthy(f.foodAvailable);
    const timeRestrictBool = truthy(f.timeRestrict);

    // Convert petsAllowed to boolean (accept Yes/true/1)
    const petsAllowedBool = truthy(f.petAllowed);

    return {
      type: 'PG',
      city: typeof f.city === 'object' ? f.city?.city : (f.city || ''),
      townSector: typeof f.town === 'object' ? f.town?.town : (f.town || ''),
      location: f.location || '',
      landmark: f.landmark || '',
      bhk: f.bhk || '',
      minPrice: parseFloat(f.minPrice) || 0,
      maxPrice: parseFloat(f.maxPrice) || 0,
      address: f.address || '',
      offer: f.offer || '',
      security: parseFloat(f.security) || 0,
      maintenance: parseFloat(f.maintenance) || 0,
      totalPg: parseInt(f.totalFlat, 10) || 0,
      totalFloor: parseInt(f.totalFloors, 10) || 0,
      waterSupply: waterSupplyNum,
      powerBackup: powerBackupNum,
      noticePeriod: f.noticePeriod || '',
      furnishingType: f.furnishing || '',
      accomoType: f.accommodation || '',
      pgType: f.flatType || '',
      bedCount: parseInt(f.bedCount, 10) || 0,
      foodAvailable: foodAvailBool,
      timeRestrict: timeRestrictBool,
      genderPrefer: f.gender || '',
      careTaker: f.caretaker || '',
      mobile: f.whatsappNo?.toString() || '',
      contactName: f.contact || '',
      petsAllowed: petsAllowedBool,
      parking: parkingArr,
      preferTenants: tenantArr,
      pgInside: insideArr,
      pgOutside: outsideArr,
      isDraft: false,
      verificationPending: true,
    };
  }

  private recordPropertySummary(ownerId: number, propertyId: number | undefined, propertyType: string): void {
    const cityName = typeof this.listingForm.get('cityControl')?.value === 'object'
      ? (this.listingForm.get('cityControl')?.value as any)?.name
      : this.listingForm.get('cityControl')?.value;
    const townSector = this.listingForm.get('townControl')?.value || this.listingForm.get('town')?.value || '';
    const locationValue = this.listingForm.get('location')?.value || '';
    const segments = [propertyType, cityName, townSector, locationValue].filter(Boolean);
    const displayName = segments.length ? segments.join(' · ') : propertyType;
    this.ownerPropertyStore.addProperty(ownerId, {
      propertyId: propertyId ?? Date.now(),
      propertyType,
      displayName,
      location: [townSector, locationValue].filter(Boolean).join(', ') || 'Location not set',
      townSector: townSector || undefined,
      createdAt: Date.now(),
    });
  }

  private loadSavedFormState(): void {
    const rawJson = localStorage.getItem(this.formStorageKey);
    if (!rawJson) {
      return;
    }
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed?.timestamp || Date.now() - parsed.timestamp > this.formStorageTtl) {
        localStorage.removeItem(this.formStorageKey);
        return;
      }
      this.listingForm.patchValue(parsed.data ?? {}, { emitEvent: false });
    } catch (err) {
      console.warn('Failed to restore PG form state:', err);
      localStorage.removeItem(this.formStorageKey);
    }
  }

  private saveFormState(): void {
    try {
      const payload = {
        timestamp: Date.now(),
        data: this.listingForm.getRawValue(),
      };
      localStorage.setItem(this.formStorageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('Unable to persist PG form state:', err);
    }
  }

  private clearSavedFormState(): void {
    localStorage.removeItem(this.formStorageKey);
  }

  private openOtpDialog(message: string): void {
    this.otpDialogMessage = message;
    this.showOtpDialog = true;
  }

  closeOtpDialog(): void {
    this.showOtpDialog = false;
  }

  onCancel(): void {
    this.showCancelConfirmation = true;
  }

  confirmCancel(): void {
    this.showCancelConfirmation = false;
    this.clearSavedFormState();
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

  get otpTargetNumber(): string {
    const value = this.listingForm.get('whatsappNo')?.value;
    return value ? value.toString() : '';
  }
}
