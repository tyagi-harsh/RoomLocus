import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { Lead } from '../../interface/owner-dash';
import { AddRentalDialogComponent } from './add-rental-dialog.component';
import { PropertyCreationService } from '../../services/property-creation.service';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { OwnerRentalsService, OwnerRental } from '../../services/owner-rentals.service';



@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatDialogModule, MatPaginatorModule],
  templateUrl: './owner-dashboard.html',
  styleUrl: './owner-dashboard.css',
})
export class OwnerDashboard implements OnInit, OnDestroy {

  activeTab: string = 'rentals'; // Default to Rentals so changes are visible immediately
  leadCount: number = 24;
  ownerCards: OwnerRentalCard[] = [];
  ownerId: number | null = null;
  totalRentals = 0;
  isLoadingRentals = false;
  rentalsError: string | null = null;

  // Pagination for leads
  leadsPageSize = 12;
  leadsCurrentPage = 0;

  // Pagination for rentals (server-side)
  rentalsPageSize = 12;
  rentalsCurrentPage = 0;

  get paginatedLeads(): Lead[] {
    const start = this.leadsCurrentPage * this.leadsPageSize;
    return this.leads.slice(start, start + this.leadsPageSize);
  }

  onLeadsPageChange(event: PageEvent): void {
    this.leadsCurrentPage = event.pageIndex;
    this.leadsPageSize = event.pageSize;
  }

  onRentalsPageChange(event: PageEvent): void {
    this.rentalsCurrentPage = event.pageIndex;
    this.rentalsPageSize = event.pageSize;
    this.loadRentals();
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    private readonly propertyCreationService: PropertyCreationService,
    private readonly ownerRentalsService: OwnerRentalsService
  ) { }

  ngOnInit(): void {
    // Check for tab query parameter to set active tab
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
    this.ownerId = this.propertyCreationService.getOwnerId();
    if (this.ownerId) {
      this.loadRentals();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Mock Data for Used Leads
  leads: Lead[] = [
    {
      id: 1,
      category: 'Room',
      location: 'Delhi road',
      subLocation: 'Himmat nagar',
      name: 'Danish',
      mobile: '9045668197',
      date: '2025-07-30'
    },
    {
      id: 2,
      category: 'Flat',
      location: 'NEAR HIGHWAY',
      subLocation: 'MADHAV NAGAR',
      name: 'Danish',
      mobile: '9045668197',
      date: '2025-07-30'
    },
    {
      id: 3,
      category: 'Pg',
      location: 'Delhi road',
      subLocation: 'Himmat nagar',
      name: 'Danish',
      mobile: '9045668197',
      date: '2025-07-30'
    }
  ];

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  deleteLead(id: number) {
    this.leads = this.leads.filter(l => l.id !== id);
  }

  callLead(mobile: string) {
    window.location.href = `tel:${mobile}`;
  }

  buyLead() {
    console.log('Buy Lead Clicked');
    // Add navigation to payment gateway or buy lead page here
  }

  openAddRentalDialog(): void {
    this.dialog.open(AddRentalDialogComponent, {
      panelClass: 'rounded-dialog'
    });
  }

  trackByCardId(_: number, property: OwnerRentalCard): number {
    return property.id;
  }

  private loadRentals(): void {
    if (!this.ownerId) {
      return;
    }
    this.isLoadingRentals = true;
    this.rentalsError = null;
    this.ownerRentalsService
      .getOwnerRentals(this.ownerId, this.rentalsCurrentPage, this.rentalsPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.isLoadingRentals = false;
          this.totalRentals = page.totalElements;
          // Debug: log a sample raw item to verify field shapes
          try {
            console.debug('Owner rentals raw sample:', (page.content || [])[0]);
          } catch { }
          this.ownerCards = (page.content || []).map((item) => this.mapRentalToCard(item));
          try {
            console.debug('Owner rentals mapped sample:', this.ownerCards[0]);
          } catch { }
        },
        error: (err) => {
          this.isLoadingRentals = false;
          this.rentalsError = err?.message || 'Failed to load rentals';
          this.ownerCards = [];
          this.totalRentals = 0;
        },
      });
  }

  private mapRentalToCard(rental: OwnerRental): OwnerRentalCard {
    const galleryArr = Array.isArray(rental.gallery) ? rental.gallery : [];
    const imageUrl = rental.imageUrl || galleryArr[0] || 'assets/images/pexels-photo-106399.jpeg';
    const formatter = new Intl.NumberFormat('en-IN');
    const minPrice = Number((rental as any)?.minPrice ?? (rental as any)?.minprice ?? 0);
    const maxPrice = Number((rental as any)?.maxPrice ?? (rental as any)?.maxprice ?? (rental as any)?.minPrice ?? 0);
    const price = `₹${formatter.format(minPrice)} - ₹${formatter.format(maxPrice)}`;
    const propertyCategory = this.mapTypeToCategory(rental.type);
    const propertyType = rental.type ? rental.type.toUpperCase() : '';

    // Robust extraction for location/landmark/city/townSector across possible payload shapes
    const location = ((rental as any)?.location
      ?? (rental as any)?.address?.location
      ?? (rental as any)?.address?.area
      ?? (rental as any)?.address?.subLocation
      ?? '').toString();
    const landmark = ((rental as any)?.landmark
      ?? (rental as any)?.address?.landmark
      ?? '').toString();
    const city = ((rental as any)?.city
      ?? (rental as any)?.address?.city
      ?? (rental as any)?.address?.area
      ?? '').toString();
    const townSector = ((rental as any)?.townSector
      ?? (rental as any)?.address?.townSector
      ?? '').toString();

    return {
      id: rental.id,
      imageUrl,
      location,
      landmark,
      city,
      townSector,
      type: (rental as any)?.bhk || rental.type || 'N/A',
      price,
      pricePeriod: 'Per Month',
      propertyCategory,
      propertyType,
      verified: Boolean((rental as any)?.verified),
      gallery: galleryArr,
    };
  }

  private mapTypeToCategory(type?: string | null): string | null {
    if (!type) return null;
    switch (type.toLowerCase()) {
      case 'flat':
        return 'flat';
      case 'room':
        return 'room';
      case 'pg':
        return 'pg';
      case 'hourly_room':
      case 'hourlyroom':
        return 'hourlyroom';
      default:
        return null;
    }
  }

  formatCity(city: string): string {
    if (!city) {
      return city;
    }
    const lower = city.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  /**
   * Title-case helper for location/landmark strings.
   */
  formatTitleCase(value?: string | null): string {
    if (!value) return '';
    const lower = String(value).toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  /**
   * Build the first line below the image: "location, landmark".
   * - Shows only available values
   * - Title-cases each value
   * - Order: location first, then landmark
   */
  locationLine(item: OwnerRentalCard): string {
    const parts: string[] = [];
    if (item.location) parts.push(this.formatTitleCase(item.location));
    if (item.landmark) parts.push(this.formatTitleCase(item.landmark));
    return parts.join(' , ');
  }
}

interface OwnerRentalCard {
  id: number;
  imageUrl: string;
  location: string;
  landmark: string;
  city: string;
  townSector: string;
  type: string;
  price: string;
  pricePeriod: string;
  propertyCategory: string | null;
  propertyType: string | null;
  verified: boolean;
  gallery: string[];
}
