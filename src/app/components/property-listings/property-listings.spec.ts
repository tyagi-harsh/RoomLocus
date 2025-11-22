import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropertyListings } from './property-listings';

describe('PropertyListings', () => {
  let component: PropertyListings;
  let fixture: ComponentFixture<PropertyListings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropertyListings],
    }).compileComponents();

    fixture = TestBed.createComponent(PropertyListings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
