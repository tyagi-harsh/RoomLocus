import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Contact, WishlistItem, PropertyCategory } from '../../interface/user-dash';
import { ApiService } from '../../services/api';
import { PropertySearchService } from '../../services/property-search.service';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';


@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, RouterModule, MatPaginatorModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit, OnDestroy {

  activeTab: string = 'wishlist'; // 'wishlist' or 'recent'

  // Pagination for wishlist
  wishlistPageSize = 12;
  wishlistCurrentPage = 0;
  wishlistTotalElements = 0;
  wishlistTotalPages = 0;

  // Pagination for contacts
  contactsPageSize = 12;
  contactsCurrentPage = 0;

  // With server-side pagination, current page items are stored directly in `wishlistItems`.

  get paginatedContacts(): Contact[] {
    const start = this.contactsCurrentPage * this.contactsPageSize;
    return this.contacts.slice(start, start + this.contactsPageSize);
  }

  onWishlistPageChange(event: PageEvent): void {
    this.wishlistCurrentPage = event.pageIndex;
    this.wishlistPageSize = event.pageSize;
    this.loadWishlistPage(this.wishlistCurrentPage);
  }

  onContactsPageChange(event: PageEvent): void {
    this.contactsCurrentPage = event.pageIndex;
    this.contactsPageSize = event.pageSize;
  }

  // Mock Data for Recent Contacts
  contacts: Contact[] = [
    { id: 1, category: 'Room', location: 'Delhi road', subLocation: 'Himmat nagar', name: 'Shyam', mobile: '9045668197', date: '2025-07-30' },
    { id: 2, category: 'Flat', location: 'NEAR HIGHWAY', subLocation: 'MADHAV NAGAR', name: 'DANISH', mobile: '9045668197', date: '2025-07-30' },
    { id: 3, category: 'Pg', location: 'Delhi road', subLocation: 'Himmat nagar', name: 'Shyam', mobile: '9045668197', date: '2025-07-30' },
    { id: 4, category: 'hourlyroom', location: 'NEAR PASHCHIM VIHAR', subLocation: 'MADHAV NAGAR', name: 'VIVEK SINGH', mobile: '9045668197', date: '2025-07-30' }
  ];

  wishlistItems: WishlistItem[] = [];
  private wishlistSubscription?: Subscription;
  loadingWishlist = false;

  constructor(
    private readonly api: ApiService,
    private readonly propertySearch: PropertySearchService,
  ) { }

  ngOnInit(): void {
    this.loadWishlistPage(0);
  }

  ngOnDestroy(): void {
    this.wishlistSubscription?.unsubscribe();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  deleteContact(id: number) {
    this.contacts = this.contacts.filter(c => c.id !== id);
  }

  deleteWishlistItem(id: number | string) {
    // Attempt to remove from backend wishlist as well (unlike)
    const item = this.wishlistItems.find(w => w.id === id);
    const propertyTypeUpper = this.mapCategoryToType(item?.propertyCategory);
    const propertyId = typeof id === 'string' ? Number(id) : id as number;
    if (!item || !propertyTypeUpper || !propertyId) {
      // Fallback: remove locally
      this.wishlistItems = this.wishlistItems.filter(w => w.id !== id);
      return;
    }
    this.api.unlikeProperty({ propertyType: propertyTypeUpper, propertyId }).subscribe((resp) => {
      if (resp && resp.success) {
        // If last item on last page removed, go to previous page; otherwise reload current page
        const isLastItemOnPage = this.wishlistItems.length === 1;
        const isLastPage = this.wishlistCurrentPage >= Math.max(0, this.wishlistTotalPages - 1);
        const targetPage = (isLastItemOnPage && isLastPage && this.wishlistCurrentPage > 0)
          ? this.wishlistCurrentPage - 1
          : this.wishlistCurrentPage;
        this.loadWishlistPage(targetPage);
      }
    });
  }

  callContact(mobile: string) {
    window.location.href = `tel:${mobile}`;
  }

  formatCity(city: string): string {
    if (!city) {
      return city;
    }
    const lower = city.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  private loadWishlistPage(pageIndex: number): void {
    const userType = localStorage.getItem('userType');
    const userId = Number(localStorage.getItem('userId'));
    if (userType !== 'END_USER' || !userId) {
      // Nothing to load for non end users
      this.wishlistItems = [];
      this.wishlistTotalElements = 0;
      this.wishlistTotalPages = 0;
      return;
    }
    this.loadingWishlist = true;
    this.api.getEndUserWishlistPaged(userId, pageIndex, this.wishlistPageSize).subscribe((resp) => {
      this.loadingWishlist = false;
      if (!resp || resp.success === false || !resp.data) {
        // Keep empty on failure
        this.wishlistItems = [];
        this.wishlistTotalElements = 0;
        this.wishlistTotalPages = 0;
        return;
      }
      const entries = resp.data.content || [];
      this.wishlistTotalElements = Number(resp.data.totalElements || 0);
      this.wishlistTotalPages = Number(resp.data.totalPages || 0);
      this.wishlistCurrentPage = Number(resp.data.pageNumber ?? pageIndex);
      this.wishlistPageSize = Number(resp.data.pageSize || this.wishlistPageSize);
      if (entries.length === 0) {
        this.wishlistItems = [];
        return;
      }
      // Fetch property details for each entry to render card info
      const fetches = entries.map((entry) => {
        const cat = this.mapTypeToCategory(entry.propertyType);
        const typeParam = cat;
        return this.propertySearch.getPropertyDetails(typeParam, entry.propertyId).pipe(
          // Map to WishlistItem using available details; include propertyCategory for router link

          // Avoid TS type import overhead by mapping inline

          map((details: any) => {
            const galleryArr = Array.isArray(details?.gallery) ? details.gallery : [];
            const imageUrl = galleryArr.length > 0 ? galleryArr[0] : 'assets/images/pexels-photo-106399.jpeg';
            const location = (entry?.location || details?.address?.location || details?.location || '').toString();
            const city = (entry?.city || details?.address?.area || details?.address?.location || details?.location || '').toString();
            const hotelName = details?.propertyName || '';
            const type = (details?.bhk || details?.keyDetails?.type || '').toString();
            const formatter = new Intl.NumberFormat('en-IN');
            const priceMin = Number(entry?.minprice ?? details?.minPrice ?? details?.minprice ?? details?.priceMin ?? 0);
            const priceMax = Number(entry?.maxprice ?? details?.maxPrice ?? details?.maxprice ?? details?.priceMax ?? 0);
            const price = `₹${formatter.format(priceMin)} - ₹${formatter.format(priceMax)}`;
            const verified = !!(details?.verified ?? details?.isVerified);
            const pricePeriod = (details?.pricePeriod || '').toString().trim() || 'Per Month';
            const landmark = (entry?.landmark || details?.address?.landmark || details?.landmark || '').toString();
            const townSector = (details?.townSector || '').toString();
            return {
              id: entry.propertyId,
              imageUrl,
              location,
              landmark,
              city,
              hotelName,
              type: type || 'N/A',
              price,
              pricePeriod,
              propertyCategory: cat,
              propertyType: entry?.propertyType,
              townSector,
              verified,
              gallery: galleryArr,
            } as WishlistItem;
          })
        );
      });

      // Combine all detail requests
      forkJoin(fetches).subscribe({
        next: (items) => {
          this.wishlistItems = items as WishlistItem[];
        },
        error: () => {
          this.wishlistItems = [];
        },
      });
    });
  }

  private mapTypeToCategory(type: 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM'): PropertyCategory {
    switch (type) {
      case 'FLAT': return 'flat';
      case 'ROOM': return 'room';
      case 'PG': return 'pg';
      case 'HOURLY_ROOM': return 'hourlyroom';
      default: return 'room';
    }
  }

  private mapCategoryToType(cat?: PropertyCategory): 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM' | null {
    switch (cat) {
      case 'flat': return 'FLAT';
      case 'room': return 'ROOM';
      case 'pg': return 'PG';
      case 'hourlyroom': return 'HOURLY_ROOM';
      default: return null;
    }
  }

}
