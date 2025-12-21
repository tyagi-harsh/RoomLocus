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

  activeTab: string = 'used-lead'; // Default active tab based on image
  leadCount: number = 24;
  properties: OwnerRental[] = [];
  ownerId: number | null = null;
  totalRentals = 0;
  isLoadingRentals = false;
  rentalsError: string | null = null;

  // Pagination for leads
  leadsPageSize = 12;
  leadsCurrentPage = 0;

  // Pagination for rentals (server-side)
  rentalsPageSize = 10;
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
  ) {}

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

  trackByPropertyId(_: number, property: OwnerRental): number {
    return property.propertyId;
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
          this.properties = page.content;
          this.totalRentals = page.totalElements;
        },
        error: (err) => {
          this.isLoadingRentals = false;
          this.rentalsError = err?.message || 'Failed to load rentals';
          this.properties = [];
          this.totalRentals = 0;
        },
      });
  }
}
