import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerPropertyDetailsForm } from './owner-property-details-form';

describe('OwnerPropertyDetailsForm', () => {
  let component: OwnerPropertyDetailsForm;
  let fixture: ComponentFixture<OwnerPropertyDetailsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerPropertyDetailsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OwnerPropertyDetailsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
