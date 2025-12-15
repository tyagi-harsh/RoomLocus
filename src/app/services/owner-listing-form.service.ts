import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {
  INSIDE_FACILITIES,
  OUTSIDE_FACILITIES,
  buildFacilityControls,
} from '../constants/facility-options';

@Injectable({ providedIn: 'root' })
export class OwnerListingFormService {
  readonly form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      city: ['Delhi'],
      cityControl: ['Delhi'],
      town: ['Sector 1'],
      townControl: ['Sector 1'],
      location: ['Delhi silampur'],
      landmark: ['Shadra delhi'],
      luxury: [''],
      bedCount: [3],
      guests: [3],
      totalFloors: [5],
      minPrice: [5000],
      maxPrice: [6000],
      palaceName: [''],
      totalRoom: [''],
      manager: [''],
      contact: [''],
      whatsappNo: [''],
      address: [''],
      petAllowed: ['No'],
      furnishing: ['Fully furnished'],
      accommodation: ['Independent'],
      gender: ['Male'],
      food: ['Yes'],
      roomType1: ['Shared Room'],
      roomType2: ['AC'],
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
