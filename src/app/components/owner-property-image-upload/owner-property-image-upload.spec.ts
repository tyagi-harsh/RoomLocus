import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OwnerPropertyImageUpload } from './owner-property-image-upload';

describe('OwnerPropertyImageUpload', () => {
  let component: OwnerPropertyImageUpload;
  let fixture: ComponentFixture<OwnerPropertyImageUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerPropertyImageUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OwnerPropertyImageUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
