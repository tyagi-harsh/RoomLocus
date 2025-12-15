import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Lead } from '../../interface/owner-dash';
import { AddRentalDialogComponent } from './add-rental-dialog.component';
import { OwnerPropertySummary, OwnerPropertyStoreService } from '../../services/owner-property-store.service';
import { PropertyCreationService } from '../../services/property-creation.service';



@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatDialogModule],
  templateUrl: './owner-dashboard.html',
  styleUrl: './owner-dashboard.css',
})
export class OwnerDashboard implements OnInit, OnDestroy {

  activeTab: string = 'used-lead'; // Default active tab based on image
  leadCount: number = 24;
  properties: OwnerPropertySummary[] = [];
  ownerId: number | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dialog: MatDialog,
    private readonly ownerPropertyStore: OwnerPropertyStoreService,
    private readonly propertyCreationService: PropertyCreationService
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
      this.ownerPropertyStore
        .watchProperties(this.ownerId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((list) => (this.properties = list));
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

  trackByPropertyId(_: number, property: OwnerPropertySummary): number {
    return property.propertyId;
  }
}
