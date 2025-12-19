import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Property } from '../../interface/Property';
import { ActivatedRoute } from '@angular/router';
import { PropertyCard } from '../property-card/property-card';
import { Subject, takeUntil } from 'rxjs';
import { PropertySearchService } from '../../services/property-search.service';
import { PropertySearchResponse, PropertySearchResult } from '../../interface/api-response';

@Component({
  selector: 'app-property-listings',
  standalone: true,
  imports: [CommonModule, PropertyCard],
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

  constructor(private route: ActivatedRoute, private propertySearchService: PropertySearchService) { }

  ngOnInit() {
    // Get query parameters from the URL
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.type = params['type'];
      this.city = params['city'];
      this.sector = params['sector'];

      console.log('Query Params:', this.type, this.city, this.sector);
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
      .searchProperties(this.type, this.city, sector)
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

  // Create mock data based on the image
  properties: Property[] = [
    {
      id: 1,
      // Placeholder image, replace with your asset
      imageUrl:
        'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      verified: true,
      location: 'Madhav Nagar',
      subLocation: 'Near Highway',
      type: '1 BHK',
      priceMin: 4000,
      priceMax: 4500,
    },
    {
      id: 2,
      // Placeholder image, replace with your asset
      imageUrl:
        'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      verified: true,
      location: 'Himmat Nagar',
      subLocation: 'Delhi Road',
      type: '1 RK',
      priceMin: 3600,
      priceMax: 4500,
    },
    {
      id: 3,
      // Placeholder image, replace with your asset
      imageUrl:
        'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      verified: true,
      location: 'Varsha Nagar',
      subLocation: 'St. Stefans Road',
      type: '2 RK',
      priceMin: 2600,
      priceMax: 3500,
    },
  ];
}
