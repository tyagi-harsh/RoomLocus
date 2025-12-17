import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
  buildFacilityControls,
} from '../constants/facility-options';
import { MOBILE_NUMBER_PATTERN } from '../constants/validation-patterns';

@Injectable({ providedIn: 'root' })
export class OwnerListingFormService {
  readonly form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      city: [''],
      cityControl: [''],
      town: [''],
      townControl: [''],
      location: [''],
      landmark: [''],
      luxury: [''],
      bedCount: [''],
      guests: [''],
      totalFloors: [''],
      minPrice: [''],
      maxPrice: [''],
      palaceName: [''],
      totalRoom: [''],
      manager: [''],
      contact: ['', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]],
      whatsappNo: ['', [Validators.required, Validators.pattern(MOBILE_NUMBER_PATTERN)]],
      address: [''],
      petAllowed: [''],
      furnishing: [''],
      accommodation: [''],
      gender: [''],
      food: [''],
      roomType1: [''],
      roomType2: [''],
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
  }
}
