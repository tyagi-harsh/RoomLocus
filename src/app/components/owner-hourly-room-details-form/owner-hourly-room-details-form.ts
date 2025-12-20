import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OwnerListingFormService } from '../../services/owner-listing-form.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PropertySearchService } from '../../services/property-search.service';
import { Observable, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { City } from '../../interface/City';
import { map, take, takeUntil } from 'rxjs/operators';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
} from '../../constants/facility-options';
import { NumericOnlyDirective } from '../../directives/numeric-only.directive';
import { parseBackendErrorString } from '../../utils/error-utils';
import { ToastService } from '../../services/toast.service';
import { ApiService } from '../../services/api';
import { PropertyCreationService, HourlyRoomPayload } from '../../services/property-creation.service';
import { PropertyCreationDraftService } from '../../services/property-creation-draft.service';
import { MOBILE_NUMBER_REGEX } from '../../constants/validation-patterns';

@Component({
  selector: 'app-owner-hourly-room-details-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    NumericOnlyDirective,
  ],
  templateUrl: './owner-hourly-room-details-form.html',
  styleUrl: './owner-hourly-room-details-form.css',
})
export class OwnerHourlyRoomDetailsForm implements OnInit, OnDestroy {
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

  get listingForm() {
    return this.listingFormService.form;
  }

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
  contactResendCooldown = 0;
  private contactResendTimer: ReturnType<typeof setInterval> | null = null;
  showOtpDialog = false;
  otpDialogMessage = '';
  showSuccessDialog = false;
  successDialogMessage = '';
  successDialogButtonLabel = 'Upload Images';
  private successDialogAction: (() => void) | null = null;
  // Alert dialog state (replaces toast notifications)
  showAlertDialog = false;
  alertDialogMessage = '';
  alertDialogType: 'error' | 'warning' | 'info' | 'success' = 'info';
  private readonly formStorageKey = 'owner-hourly-room-details-form-state';
  private readonly formStorageTtl = 4 * 60 * 1000;
  private contactOtpTimer: ReturnType<typeof setTimeout> | null = null;

  showCancelConfirmation = false;
  isSaving = false;

  constructor(
    private readonly listingFormService: OwnerListingFormService,
    private readonly router: Router,
    private propertySearchService: PropertySearchService,
    private readonly toastService: ToastService,
    private readonly apiService: ApiService,
    private readonly propertyCreationService: PropertyCreationService,
    private readonly creationDraftService: PropertyCreationDraftService
  ) {
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

    const currentCity = this.listingForm.get('city')?.value;
    if (currentCity) {
      this.loadLocations(currentCity);
    }

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
    if (this.contactResendTimer) {
      clearInterval(this.contactResendTimer);
    }
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

  private loadLocations(city: string): void {
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
          console.error('Failed to load rental sectors:', err);
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
          const message = parseBackendErrorString(resp.error) || parseBackendErrorString(resp) || 'Failed to send OTP';
          this.contactOtpError = message;
          this.openAlertDialog(message, 'error');
          return;
        }
        this.contactOtpRequested = true;
        this.showContactOtpSentMessage = true;
        this.showContactResendOption = true;
      },
      error: (err) => {
        this.isSendingContactOtp = false;
        console.error('getOtp error:', err);
        const message = parseBackendErrorString(err) || 'Failed to send OTP. Please try again.';
        this.contactOtpError = message;
        this.openAlertDialog(message, 'error');
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
        } else {
          const message = parseBackendErrorString(resp.body) || parseBackendErrorString(resp) || 'Invalid or expired OTP';
          this.contactOtpError = message;
          this.showContactResendOption = true;
          this.startContactResendCooldown();
          this.openAlertDialog(message, 'error');
        }
      },
      error: (err) => {
        this.isVerifyingContactOtp = false;
        console.error('verifyOtp error:', err);
        const message = parseBackendErrorString(err) || 'Verification failed. Please try again.';
        this.contactOtpError = message;
        this.showContactResendOption = true;
        this.startContactResendCooldown();
        this.openAlertDialog(message, 'error');
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

  private startContactResendCooldown(): void {
    if (this.contactResendTimer) {
      clearInterval(this.contactResendTimer);
    }
    this.contactResendCooldown = 30;
    this.contactResendTimer = setInterval(() => {
      this.contactResendCooldown--;
      if (this.contactResendCooldown <= 0) {
        clearInterval(this.contactResendTimer!);
        this.contactResendTimer = null;
      }
    }, 1000);
  }

  get isWhatsAppNumberValid(): boolean {
    const value = this.listingForm.get('whatsappNo')?.value;
    if (value === null || value === undefined) {
      return false;
    }
    const digitsOnly = value.toString().replace(/\D/g, '');
    return MOBILE_NUMBER_REGEX.test(digitsOnly);
  }

  get otpTargetNumber(): string {
    const value = this.listingForm.get('whatsappNo')?.value;
    return value ? value.toString() : '';
  }

  isOtpVerified(): boolean {
    return this.contactOtpVerified;
  }

  private showVerificationRequiredPopup(): void {
    window.alert('OTP needs to be verified before proceeding. Please verify your WhatsApp number.');
  }

  private showMissingFieldsPopup(): void {
    const missingFields = this.getMissingRequiredFields();
    if (missingFields.length) {
      window.alert(`Please fill the following required fields: ${missingFields.join(', ')}`);
    } else {
      window.alert('Please fill all required fields before continuing.');
    }
    this.openAlertDialog('Complete required fields before submitting.', 'warning');
  }

  private getMissingRequiredFields(): string[] {
    const friendlyNames: Record<string, string> = {
      cityControl: 'City',
      townControl: 'Town/Sector',
      location: 'Location',
      landmark: 'Landmark',
      luxury: 'Luxury',
      bedCount: 'Bed Count',
      guests: 'Guest Count',
      minPrice: 'Minimum Price',
      maxPrice: 'Maximum Price',
      palaceName: 'Palace Name',
      totalRoom: 'Total Rooms',
      manager: 'Manager/Owner',
      whatsappNo: 'WhatsApp Number',
      address: 'Full Address',
      furnishing: 'Furnishing Type',
      accommodation: 'Accommodation Type',
      gender: 'Gender Preference',
      roomType1: 'Room Type',
      roomType2: 'AC Type',
      parking: 'Parking',
      insideFacility: 'Inside Facilities',
      outsideFacility: 'Outside Facilities',
    };
    const missing: string[] = [];
    Object.keys(friendlyNames).forEach((key) => {
      const control = this.listingForm.get(key);
      if (control?.invalid) {
        missing.push(friendlyNames[key]);
      }
    });
    return missing;
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
      console.warn('Failed to restore hourly form state:', err);
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
      console.warn('Unable to persist hourly form state:', err);
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

  private openAlertDialog(message: string, type: 'error' | 'warning' | 'info' | 'success' = 'info'): void {
    this.alertDialogMessage = message;
    this.alertDialogType = type;
    this.showAlertDialog = true;
  }

  closeAlertDialog(): void {
    this.showAlertDialog = false;
    this.alertDialogMessage = '';
  }

  private mapFormToPayload(): HourlyRoomPayload {
    const f = this.listingForm.value;
    const parking: string[] = [];
    if (f.parking?.car) parking.push('Car');
    if (f.parking?.bike) parking.push('Bike');

    const preferTenants: string[] = [];
    if (f.preferTenant?.family) preferTenants.push('Family');
    if (f.preferTenant?.bachelors) preferTenants.push('Bachelors');
    if (f.preferTenant?.girls) preferTenants.push('Girls');
    if (f.preferTenant?.boys) preferTenants.push('Boys');
    if (f.preferTenant?.professionals) preferTenants.push('Professionals');

    const insideFacilities: string[] = [];
    if (f.insideFacility) {
      Object.entries(f.insideFacility).forEach(([key, checked]) => {
        if (checked) insideFacilities.push(key);
      });
    }

    const outsideFacilities: string[] = [];
    if (f.outsideFacility) {
      Object.entries(f.outsideFacility).forEach(([key, checked]) => {
        if (checked) outsideFacilities.push(key);
      });
    }

    const cityName = typeof f.cityControl === 'object' ? f.cityControl?.name : f.city;
    const townSector = f.townControl || f.town || '';

    const truthy = (val: any) => ['yes', 'true', '1', 'y'].includes(String(val).toLowerCase());

    return {
      type: 'Hourly Room',
      city: cityName || '',
      townSector,
      location: f.location || '',
      landmark: f.landmark || '',
      luxury: f.luxury || '',
      luxuryTier: f.luxury || '',
      bedCount: parseInt(f.bedCount, 10) || 0,
      guestCapacity: parseInt(f.guests, 10) || 0,
      noOfGuests: parseInt(f.guests, 10) || 0,
      totalFloor: parseInt(f.totalFloors, 10) || 0,
      palaceName: f.palaceName || '',
      totalRoom: parseInt(f.totalRoom, 10) || 0,
      minPrice: parseFloat(f.minPrice) || 0,
      maxPrice: parseFloat(f.maxPrice) || 0,
      address: f.address || '',
      manager: f.manager || '',
      mobile: f.whatsappNo?.toString() || '',
      contactName: f.manager || '',
      furnishingType: f.furnishing || '',
      accomoType: f.accommodation || '',
      genderPrefer: f.gender || '',
      foodAvailable: truthy(f.food),
      roomType: f.roomType1 || '',
      acType: f.roomType2 || '',
      parking,
      preferTenants,
      insideFacilities,
      outsideFacilities,
      roomInside: insideFacilities,
      roomOutside: outsideFacilities,
      verificationPending: true,
      isDraft: false,
    };
  }

  onNext(): void {
    if (!this.isOtpVerified()) {
      this.listingForm.markAllAsTouched();
      this.showVerificationRequiredPopup();
      return;
    }

    if (this.listingForm.invalid) {
      this.listingForm.markAllAsTouched();
      this.showMissingFieldsPopup();
      return;
    }
    const ownerId = this.propertyCreationService.getOwnerId();
    if (!ownerId) {
      this.openAlertDialog('You must be logged in as an owner to create a listing', 'error');
      return;
    }
    const payload = this.mapFormToPayload();
    this.creationDraftService.setDraft({
      propertyType: 'hourly-room',
      payload,
      ownerId,
      timestamp: Date.now(),
    });
    this.openSuccessDialog(
      'Hourly room details saved. Upload images to complete the listing.',
      () =>
        this.router
          .navigate(['/owner/hourly-room/images'], { queryParams: { propertyType: 'hourly-room' } })
          .catch((err) => console.error('Navigation failed', err))
    );
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
}
