import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  ValidatorFn,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PropertySearchService } from '../../services/property-search.service';
import { PropertyCreationService, RoomPayload } from '../../services/property-creation.service';
import { ToastService } from '../../services/toast.service';
import { ApiService } from '../../services/api';
import { PropertyCreationDraftService } from '../../services/property-creation-draft.service';
import { Observable, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { City } from '../../interface/City';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
  buildFacilityControls,
} from '../../constants/facility-options';
import { NumericOnlyDirective } from '../../directives/numeric-only.directive';
import { parseBackendErrorString } from '../../utils/error-utils';
import { MOBILE_NUMBER_PATTERN, MOBILE_NUMBER_REGEX } from '../../constants/validation-patterns';

@Component({
  selector: 'app-owner-room-details-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    NumericOnlyDirective,
    FormsModule,
  ],
  templateUrl: './owner-room-details-form.html',
  styleUrls: ['./owner-room-details-form.css'],
})
export class OwnerRoomDetailsForm implements OnInit, OnDestroy {
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
  private contactOtpTimer: ReturnType<typeof setTimeout> | null = null;
  showOtpDialog = false;
  otpDialogMessage = '';
  showSuccessDialog = false;
  successDialogMessage = '';
  successDialogButtonLabel = 'Upload Images';
  private successDialogAction: (() => void) | null = null;
  private readonly formStorageKey = 'owner-room-details-form-state';
  private readonly formStorageTtl = 4 * 60 * 1000;
  showCancelConfirmation = false;
  isSaving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private propertySearchService: PropertySearchService,
    private propertyCreationService: PropertyCreationService,
    private toastService: ToastService,
    private apiService: ApiService,
    private creationDraftService: PropertyCreationDraftService
  ) {
    this.listingForm = this.fb.group({
      city: [''],
      cityControl: ['', Validators.required],
      town: [''],
      townControl: ['', Validators.required],
      location: ['', Validators.required],
      landmark: ['', Validators.required],
      minPrice: ['', Validators.required],
      maxPrice: ['', Validators.required],
      security: ['', Validators.required],
      maintenance: ['', Validators.required],
      totalFloors: [''],
      totalRoom: [''],
      noticePeriod: ['', Validators.required],
      offer: [''],
      contact: ['', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]],
      contactName: ['', Validators.required],
        bhk: ['', Validators.required],
      manager: ['', Validators.required],
      address: ['', Validators.required],
      availableFor: ['', Validators.required],
      furnishing: ['', Validators.required],
      accommodation: ['', Validators.required],
      petAllowed: [''],
      gender: ['', Validators.required],
      roomType: ['', Validators.required],
        waterSupply: ['', [Validators.required, Validators.min(0), Validators.max(24)]],
        powerBackup: ['', [Validators.required, Validators.min(0), Validators.max(24)]],
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
      insideFacility: this.fb.group(buildFacilityControls(INSIDE_FACILITIES), {
        validators: this.requireCheckboxSelectionValidator(),
      }),
      outsideFacility: this.fb.group(buildFacilityControls(OUTSIDE_FACILITIES), {
        validators: this.requireCheckboxSelectionValidator(),
      }),
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
    this.listingForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.saveFormState());
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

  private loadLocations(cityId: string): void {
    if (!cityId) {
      this.locationsSubject.next([]);
      return;
    }

    this.locationLoadingSubject.next(true);
    this.propertySearchService
      .getRentalSectorsByCity(cityId)
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
      console.warn('Failed to restore room form state:', err);
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
      console.warn('Unable to persist room form state:', err);
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

  private openSuccessDialog(message: string, action: () => void, actionLabel = 'Upload Images'): void {
    this.successDialogMessage = message;
    this.successDialogAction = action;
    this.successDialogButtonLabel = actionLabel;
    this.showSuccessDialog = true;
  }

  confirmSuccessDialog(): void {
    this.showSuccessDialog = false;
    const action = this.successDialogAction;
    this.successDialogAction = null;
    action?.();
  }

  startContactOtpFlow(): void {
    this.resetContactOtpUiFlags();
    this.isSendingContactOtp = true;
    this.clearContactOtpTimer();

    const mobile = this.listingForm.get('contact')?.value?.toString() || '';
    const accessToken = localStorage.getItem('accessToken') || '';
    const payload = { mobile, userType: 'OWNER', purpose: 'R', accessToken };

    this.apiService.getOtp(payload).pipe(take(1)).subscribe({
      next: (resp) => {
        this.isSendingContactOtp = false;
        if (resp && resp.success === false) {
          const message = parseBackendErrorString(resp.error) || parseBackendErrorString(resp) || 'Failed to send OTP';
          this.contactOtpError = message;
          this.toastService.error(message);
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
        const message = parseBackendErrorString(err) || 'Failed to send OTP. Please try again.';
        this.contactOtpError = message;
        this.toastService.error(message);
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

    const mobile = this.listingForm.get('contact')?.value?.toString() || '';
    const payload = { mobile, userType: 'OWNER', otp: this.contactOtpInput.trim(), purpose: 'R' };

    this.apiService.verifyOtp(payload).pipe(take(1)).subscribe({
      next: (resp) => {
        this.isVerifyingContactOtp = false;
        if (resp.status === 200) {
          this.contactOtpVerified = true;
          this.contactOtpRequested = false;
          this.openOtpDialog('Mobile verified successfully');
          this.contactOtpInput = '';
          this.showContactResendOption = false;
        } else {
          const message = parseBackendErrorString(resp.body) || parseBackendErrorString(resp) || 'Invalid or expired OTP';
          this.contactOtpError = message;
          this.showContactResendOption = true;
          this.toastService.error(message);
        }
      },
      error: (err) => {
        this.isVerifyingContactOtp = false;
        console.error('verifyOtp error:', err);
        const message = parseBackendErrorString(err) || 'Verification failed. Please try again.';
        this.contactOtpError = message;
        this.showContactResendOption = true;
        this.toastService.error(message);
      },
    });
  }

  private resetContactOtpUiFlags(): void {
    this.contactOtpError = null;
    this.showContactOtpSentMessage = false;
    this.contactOtpVerified = false;
  }

  private clearContactOtpTimer(): void {
    if (this.contactOtpTimer) {
      clearTimeout(this.contactOtpTimer);
      this.contactOtpTimer = null;
    }
  }

  onNext(): void {
    console.log('onNext called - Room form');
    console.log('Form valid:', this.listingForm.valid);
    console.log('Form errors:', this.listingForm.errors);

    if (!this.isOtpVerified()) {
      this.showContactVerificationRequired();
      return;
    }

    if (this.listingForm.invalid) {
      this.listingForm.markAllAsTouched();
      this.listingForm.get('insideFacility')?.markAsTouched();
      this.listingForm.get('outsideFacility')?.markAsTouched();
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
    console.log('Payload saved for image upload:', payload);
    this.creationDraftService.setDraft({
      propertyType: 'room',
      payload,
      ownerId,
      timestamp: Date.now(),
    });
    this.openSuccessDialog(
      'Room details saved. Upload images to complete the listing.',
      () =>
        this.router
          .navigate(['/owner/room/images'], { queryParams: { propertyType: 'room' } })
          .catch((err) => console.error('Navigation failed', err))
    );
  }

  /**
   * Maps form values to the RoomPayload expected by the backend.
   */
  private mapFormToPayload(): RoomPayload {
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

    // Build insideFacilities array from facility checkboxes
    const insideFacilities: string[] = [];
    if (v.insideFacility) {
      for (const [key, checked] of Object.entries(v.insideFacility)) {
        if (checked) insideFacilities.push(key);
      }
    }

    // Build outsideFacilities array from facility checkboxes
    const outsideFacilities: string[] = [];
    if (v.outsideFacility) {
      for (const [key, checked] of Object.entries(v.outsideFacility)) {
        if (checked) outsideFacilities.push(key);
      }
    }

    // Map waterSupply to number (coerce to string to be defensive)
    let waterSupply = 0;
    if (v.waterSupply) {
      const match = String(v.waterSupply).match(/\d+/);
      if (match) waterSupply = parseInt(match[0], 10);
    }

    // Map powerBackup mixed-type value to number (truthy -> 1, else 0)
    const powerBackup = parseInt(String(v.powerBackup), 10);

    // Get city name from cityControl
    const cityName = typeof v.cityControl === 'object' ? v.cityControl?.name : v.cityControl;

    return {
      city: cityName || '',
      townSector: v.townControl || v.town || '',
      location: v.location || '',
      landmark: v.landmark || '',
      minprice: parseFloat(v.minPrice) || 0,
      maxprice: parseFloat(v.maxPrice) || 0,
      security: parseFloat(v.security) || 0,
      maintenance: parseFloat(v.maintenance) || 0,
      totalFloor: parseInt(v.totalFloors, 10) || 0,
      totalRoom: parseInt(v.totalRoom, 10) || 0,
      waterSupply,
      powerBackup: isNaN(powerBackup) ? 0 : powerBackup,
      noticePeriod: v.noticePeriod || '',
      offer: v.offer || '',
      careTaker: v.manager || '',
      mobile: v.contact || '',
      contactName: v.contactName || '',
      bhk: v.bhk || '',
      address: v.address || '',
      roomAvailable: v.availableFor || '',
      furnishingType: v.furnishing || '',
      accomoType: v.accommodation || '',
      petsAllowed: v.petAllowed || '',
      genderPrefer: v.gender || '',
      roomType: v.roomType || '',
      parking,
      preferTenants,
      insideFacilities,
      outsideFacilities,
    };
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
    const value = this.listingForm.get('contact')?.value;
    if (value === null || value === undefined) {
      return false;
    }
    const digitsOnly = value.toString().replace(/\D/g, '');
    return MOBILE_NUMBER_REGEX.test(digitsOnly);
  }

  get otpTargetNumber(): string {
    const value = this.listingForm.get('contact')?.value;
    return value ? value.toString() : '';
  }

  isOtpVerified(): boolean {
    return this.contactOtpVerified;
  }

  private showContactVerificationRequired(): void {
    this.toastService.warning('Verify contact number before proceeding.');
  }

  displayCityName(city: City | string | null): string {
    if (!city) {
      return '';
    }
    return typeof city === 'string' ? city : city.name;
  }

  private requireCheckboxSelectionValidator(minRequired = 1): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control || typeof control.value !== 'object' || control.value === null) {
        return { required: true };
      }
      const selectedCount = Object.values(control.value).filter(Boolean).length;
      return selectedCount >= minRequired ? null : { required: true };
    };
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
}