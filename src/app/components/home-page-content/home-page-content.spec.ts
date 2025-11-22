import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePageContent } from './home-page-content';

describe('HomePageContent', () => {
  let component: HomePageContent;
  let fixture: ComponentFixture<HomePageContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageContent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
