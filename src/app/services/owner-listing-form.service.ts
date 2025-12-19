import { Injectable } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
  buildFacilityControls,
} from '../constants/facility-options';
import { MOBILE_NUMBER_PATTERN, NAME_PATTERN } from '../constants/validation-patterns';

const atLeastOneChecked = (control: AbstractControl): ValidationErrors | null => {
  if (!control || typeof control.value !== 'object') {
    return { atLeastOneRequired: true };
  }
  try {
    const values = Object.values(control.value);
    const anySelected = values.some((val) => !!val);
    return anySelected ? null : { atLeastOneRequired: true };
  } catch (error) {
    return { atLeastOneRequired: true };
  }
};

@Injectable({ providedIn: 'root' })
export class OwnerListingFormService {
  readonly form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      city: ['', Validators.required],
      cityControl: ['', Validators.required],
      town: [''],
      townControl: ['', Validators.required],
      location: ['', Validators.required],
      landmark: ['', Validators.required],
      luxury: ['', Validators.required],
      bedCount: ['', Validators.required],
      guests: ['', Validators.required],
      totalFloors: [''],
      minPrice: ['', Validators.required],
      maxPrice: ['', Validators.required],
      palaceName: ['', Validators.required],
      totalRoom: ['', Validators.required],
      manager: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(NAME_PATTERN)]],
      whatsappNo: ['', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]],
      address: ['', Validators.required],
      petAllowed: [''],
      furnishing: ['', Validators.required],
      accommodation: ['', Validators.required],
      gender: ['', Validators.required],
      food: [''],
      roomType1: ['', Validators.required],
      roomType2: ['', Validators.required],
      parking: this.fb.group(
        {
          car: [false],
          bike: [false],
        },
        { validators: atLeastOneChecked }
      ),
      preferTenant: this.fb.group({
        family: [false],
        bachelors: [false],
        girls: [false],
        boys: [false],
        professionals: [false],
      }),
      insideFacility: this.fb.group(buildFacilityControls(INSIDE_FACILITIES), { validators: atLeastOneChecked }),
      outsideFacility: this.fb.group(buildFacilityControls(OUTSIDE_FACILITIES), { validators: atLeastOneChecked }),
    });
  }
}
