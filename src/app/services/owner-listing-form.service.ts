import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class OwnerListingFormService {
  readonly form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      city: ['Delhi'],
      town: ['Sector 1'],
      location: ['Delhi silampur'],
      landmark: ['Shadra delhi'],
      bedCount: [3],
      guests: [3],
      floors: [5],
      minPrice: [5000],
      maxPrice: [6000],
      palaceName: [''],
      totalRoom: [''],
      manager: [''],
      contact: [''],
      address: [''],
      furnishing: ['Fully furnished'],
      accommodation: ['Independent'],
      gender: ['Male'],
      food: ['Yes'],
      roomType1: ['Shared Room'],
      roomType2: ['AC'],
    });
  }
}
