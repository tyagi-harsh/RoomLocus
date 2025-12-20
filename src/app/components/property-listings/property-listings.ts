import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Property } from '../../interface/Property';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyCard } from '../property-card/property-card';
import { Subject, takeUntil } from 'rxjs';
import { PropertySearchService } from '../../services/property-search.service';
import { PropertySearchResponse, PropertySearchResult } from '../../interface/api-response';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-property-listings',
  standalone: true,
  imports: [CommonModule, PropertyCard, MatPaginatorModule],
  templateUrl: './property-listings.html',
  styleUrl: './property-listings.css',
})
export class PropertyListings implements OnInit, OnDestroy {
  type: string | null = null;
  city: string | null = null;
  sector: string | null = null;
  filteredProperties: Property[] = [];
  totalResults: number | null = null;
  isLoading = false;
  private destroy$ = new Subject<void>();
  private readonly placeholderImages: string[] = [
    'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg',
    'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg',
    'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg',
  ];

  // Pagination (server-side)
  pageSize = 12;
  currentPage = 0;

  // For server-side pagination, the filteredProperties already contains the current page.
  get paginatedProperties(): Property[] {
    return this.filteredProperties;
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    // Enforce fixed page size = 12 regardless of event or URL
    this.pageSize = 12;
    // Update query params to preserve pagination state in URL
    this.router.navigate([], {
      queryParams: { page: this.currentPage, size: 12 },
      queryParamsHandling: 'merge',
    }).catch(() => { });
    // Scroll to top of page for better UX on page change
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { }
    // Re-fetch current page from server
    this.fetchProperties();
  }

  constructor(private route: ActivatedRoute, private router: Router, private propertySearchService: PropertySearchService) { }

  ngOnInit() {
    // Get query parameters from the URL
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.type = params['type'];
      this.city = params['city'];
      this.sector = params['sector'];
      const pageParam = Number(params['page']);
      this.currentPage = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
      // Enforce fixed page size = 12 ignoring URL param
      this.pageSize = 12;

      console.log('Query Params:', this.type, this.city, this.sector, 'page', this.currentPage, 'size', 12);
      this.fetchProperties();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private fetchProperties(): void {
    if (!this.type || !this.city) {
      this.filteredProperties = [];
      this.totalResults = null;
      return;
    }

    this.isLoading = true;
    const sector = this.sector ?? '';

    this.propertySearchService
      .searchProperties(this.type, this.city, sector, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PropertySearchResponse) => {
          this.totalResults = response.totalElements;
          this.filteredProperties = response.results.map((result: PropertySearchResult, index: number) =>
            this.mapSearchResult(result, index)
          );
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[PropertyListings] Failed to load search results', error);
          this.isLoading = false;
        },
      });
  }

  private mapSearchResult(result: PropertySearchResult, index: number): Property {
    const basePrice = 2500 + (index % 5) * 500;
    const priceMin = result.minPrice ?? basePrice;
    const priceMax = result.maxPrice ?? priceMin + 1500;
    const verifiedFlag = !!result.verified;

    return {
      id: result.id,
      imageUrl: this.placeholderImages[index % this.placeholderImages.length],
      verified: verifiedFlag,
      location: result.location,
      subLocation: result.landmark ?? result.townSector ?? result.location,
      type: result.type ?? 'Unknown',
      bhk: result.bhk ?? result.type ?? 'Unknown',
      category: this.type ?? 'flat',
      priceMin,
      priceMax,
    };
  }

  // Helper method to capitalize first letter of each word
  capitalizeFirstLetter(text: string | null): string {
    if (!text) return 'All City';
    return text
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // // Create mock data based on the image
  // properties: Property[] = [
  //   {
  //     id: 1,
  //     imageUrl: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Madhav Nagar',
  //     subLocation: 'Near Highway',
  //     type: '1 BHK',
  //     priceMin: 4000,
  //     priceMax: 4500,
  //   },
  //   {
  //     id: 2,
  //     imageUrl: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Himmat Nagar',
  //     subLocation: 'Delhi Road',
  //     type: '1 RK',
  //     priceMin: 3600,
  //     priceMax: 4500,
  //   },
  //   {
  //     id: 3,
  //     imageUrl: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Varsha Nagar',
  //     subLocation: 'St. Stefans Road',
  //     type: '2 RK',
  //     priceMin: 2600,
  //     priceMax: 3500,
  //   },
  //   {
  //     id: 4,
  //     imageUrl: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: false,
  //     location: 'Sector 15',
  //     subLocation: 'Near Metro Station',
  //     type: '2 BHK',
  //     priceMin: 8000,
  //     priceMax: 9500,
  //   },
  //   {
  //     id: 5,
  //     imageUrl: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Green Park',
  //     subLocation: 'Main Market',
  //     type: '3 BHK',
  //     priceMin: 12000,
  //     priceMax: 15000,
  //   },
  //   {
  //     id: 6,
  //     imageUrl: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Lakshmi Nagar',
  //     subLocation: 'Near School',
  //     type: '1 BHK',
  //     priceMin: 5000,
  //     priceMax: 6000,
  //   },
  //   {
  //     id: 7,
  //     imageUrl: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: false,
  //     location: 'Rajendra Nagar',
  //     subLocation: 'Bus Stand Road',
  //     type: '2 BHK',
  //     priceMin: 7500,
  //     priceMax: 8500,
  //   },
  //   {
  //     id: 8,
  //     imageUrl: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Shanti Nagar',
  //     subLocation: 'Temple Road',
  //     type: '1 RK',
  //     priceMin: 3000,
  //     priceMax: 3500,
  //   },
  //   {
  //     id: 9,
  //     imageUrl: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Model Town',
  //     subLocation: 'Near Hospital',
  //     type: '3 BHK',
  //     priceMin: 14000,
  //     priceMax: 16000,
  //   },
  //   {
  //     id: 10,
  //     imageUrl: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Civil Lines',
  //     subLocation: 'Park View',
  //     type: '2 BHK',
  //     priceMin: 9000,
  //     priceMax: 11000,
  //   },
  //   {
  //     id: 11,
  //     imageUrl: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: false,
  //     location: 'Indira Nagar',
  //     subLocation: 'College Road',
  //     type: '1 BHK',
  //     priceMin: 4500,
  //     priceMax: 5500,
  //   },
  //   {
  //     id: 12,
  //     imageUrl: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Gandhi Nagar',
  //     subLocation: 'Main Road',
  //     type: '2 RK',
  //     priceMin: 4000,
  //     priceMax: 4800,
  //   },
  //   {
  //     id: 13,
  //     imageUrl: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Nehru Colony',
  //     subLocation: 'Stadium Road',
  //     type: '3 BHK',
  //     priceMin: 13000,
  //     priceMax: 15500,
  //   },
  //   {
  //     id: 14,
  //     imageUrl: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: false,
  //     location: 'Subhash Nagar',
  //     subLocation: 'Railway Station',
  //     type: '1 RK',
  //     priceMin: 2800,
  //     priceMax: 3200,
  //   },
  //   {
  //     id: 15,
  //     imageUrl: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Patel Nagar',
  //     subLocation: 'Near Bank',
  //     type: '2 BHK',
  //     priceMin: 8500,
  //     priceMax: 10000,
  //   },
  //   {
  //     id: 16,
  //     imageUrl: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Adarsh Colony',
  //     subLocation: 'Shopping Complex',
  //     type: '1 BHK',
  //     priceMin: 5500,
  //     priceMax: 6500,
  //   },
  //   {
  //     id: 17,
  //     imageUrl: 'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: false,
  //     location: 'Vikas Nagar',
  //     subLocation: 'Industrial Area',
  //     type: '2 RK',
  //     priceMin: 3500,
  //     priceMax: 4200,
  //   },
  //   {
  //     id: 18,
  //     imageUrl: 'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  //     verified: true,
  //     location: 'Ashok Vihar',
  //     subLocation: 'Near Mall',
  //     type: '3 BHK',
  //     priceMin: 16000,
  //     priceMax: 18000,
  //   },
  //];
}
