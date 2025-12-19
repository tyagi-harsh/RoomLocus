import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button'; // For the button
import { PropertyDetails as PropertyDetailsInterface } from '../../interface/Property';
import { PropertyCategory, WishlistItem } from '../../interface/user-dash';
import { PropertySearchService } from '../../services/property-search.service';
import { ApiService } from '../../services/api';
import { Subscription } from 'rxjs';
import { WishlistService } from '../../services/wishlist.service';
import { PRE_LOGIN_URL_KEY } from '../../constants/navigation-keys';
// import { Footer } from '../footer/footer';

interface ApiPropertyDetailsResponse {
  id: number;
  city: string;
  townSector: string;
  roomType: string;
  minprice: number;
  maxprice: number;
  minPrice?: number;
  maxPrice?: number;
  security: number;
  maintenance: number;
  totalFloor?: number;
  totalRoom: number;
  waterSupply: number;
  powerBackup: number;
  offer: string;
  bhk: string;
  roomAvailable: string;
  furnishingType: string;
  accomoType: string;
  genderPrefer: string;
  parking: string[];
  preferTenants: string[];
  insideFacilities?: string[];
  outsideFacilities?: string[];
  location?: string;
  landmark?: string;
  address?: {
    location?: string;
    landmark?: string;
    area?: string;
  };
  type?: string;
  propertyType?: string;
  flatType?: string;
  totalFlat?: number;
  noticePeriod?: string;
  flatInside?: string[];
  flatOutside?: string[];
  pgType?: string;
  totalPg?: number;
  foodAvailable?: string | boolean;
  bedCount?: number;
  timeRestrict?: string;
  careTaker?: string;
  pgInside?: string[];
  pgOutside?: string[];
  palaceName?: string;
  luxury?: string;
  acType?: string;
  noOfGuests?: number;
  roomInside?: string[];
  roomOutside?: string[];
}

@Component({
  selector: 'app-property-details',
  imports: [CommonModule, MatButtonModule],
  templateUrl: './property-details.html',
  styleUrl: './property-details.css',
})
export class PropertyDetails implements OnInit, OnDestroy {
  propertyId: string | null = null;
  liked = false;
  animateHeart = false;
  showLoved = false;
  propertyCategory: PropertyCategory = 'room';
  private requestedPropertyType = 'room';
  canUseFavorites = false;
  showFavoriteButton = true;

  // Mock data created from the images
  // In a real application, you would fetch this based on propertyId
  details: PropertyDetailsInterface = {
    gallery: [
      'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg', // Main image
      'https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg', // Thumbnail 1
      'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg', // Thumbnail 2
      'https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg', // Thumbnail 3
      'https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg', // Thumbnail 4
    ],
    propertyName: 'Sea View Palace',
    location: 'Himmat Nagar',
    priceMin: 4500,
    priceMax: 6000,
    pricePeriod: 'Per Month',
    bhk: '1 BHK',
    keyDetails: {
      security: '1000',
      maintenance: '0',
      type: '1 BHK | Room',
      furnishing: 'Semi furnished',
      accommodation: 'Independent',
      gender: 'Both M & F',
    },

    specs: {
      roomType: 'Private Room',
      totalRoom: 5,
      waterSupply: '12 hr',
      powerBackup: '21 hr',
      roomAvailable: 'Monthly Basis', // "Montly" is from your image
    },
    offer: 'No offer',
    address: {
      area: 'Himmat nagar',
      landmark: 'Delhi road',
      location: 'Himmat nagar',
    },
    preferTenants: ['Family', 'Bachelors', 'Professionals'],
    parking: ['Bike'],
    roomInsideFacilities: ['Single Bed', 'Almirah / Wardrobe', 'Gas / Induction', 'Fridge'],
    roomOutsideFacilities: [
      'Railway Station',
      'School',
      'College',
      'Market',
      'Hospital',
      'Bank ATM',
      'Gated Society',
      'Gym',
      'Tiffin/Mess Service',
    ],
    propertyType: 'room',
    flatType: 'Private Room',
    totalFlat: 5,
    noticePeriod: '1 Month',
    flatInsideFacilities: ['Single Bed', 'Almirah / Wardrobe', 'Gas / Induction', 'Fridge'],
    flatOutsideFacilities: [
      'Railway Station',
      'School',
      'College',
      'Market',
      'Hospital',
      'Bank ATM',
      'Gated Society',
      'Gym',
      'Tiffin/Mess Service',
    ],
    totalFloor: 8,
    pgType: 'Single PG',
    totalPg: 1,
    foodAvailable: 'Breakfast & Dinner',
    bedCount: 12,
    timeRestrict: 'Midnight',
    careTaker: 'Available',
    pgInsideFacilities: ['Single Bed', 'Cupboard'],
    pgOutsideFacilities: ['Laundry Service'],
    luxury: 'Premium',
    acType: 'Split AC',
    guestCapacity: 4,
  };

  constructor(
    private route: ActivatedRoute,
    private readonly router: Router,
    private propertySearch: PropertySearchService,
    private readonly wishlistService: WishlistService,
    private readonly api: ApiService
  ) { }

  selectedImage: string = '';
  private wishlistSubscription?: Subscription;

  ngOnInit(): void {
    // Only allow non-OWNER users to use favorites
    const userType = localStorage.getItem('userType');
    this.canUseFavorites = userType === 'END_USER';
    // Show heart for END_USER and logged-out users (so click can redirect to login);
    // hide for other logged-in roles (e.g., OWNER)
    this.showFavoriteButton = !userType || userType === 'END_USER';

    this.selectedImage = this.details.gallery.length > 0 ? this.details.gallery[0] : '';
    this.wishlistSubscription = this.wishlistService.wishlist$.subscribe(() => this.syncLikedState());

    this.route.paramMap.subscribe((params) => {
      this.propertyId = params.get('id');
      const queryType = this.route.snapshot.queryParamMap.get('type');
      const propertyType = queryType || params.get('type') || 'room';
      this.requestedPropertyType = propertyType;
      this.propertyCategory = this.normalizeType(propertyType);
      if (this.propertyId) {
        const numericId = Number(this.propertyId);
        if (!Number.isNaN(numericId)) {
          this.propertySearch.getPropertyDetails(propertyType, numericId).subscribe((response) => {
            if (response) {
              this.applyApiResponse(response);
            }
          });
        }
      }

      this.syncLikedState();
    });
  }

  // Function to change the main image
  selectImage(url: string): void {
    this.selectedImage = url;
  }

  // Helper to get current image index
  private get currentIndex(): number {
    return this.details.gallery.indexOf(this.selectedImage);
  }

  // Go to the next image
  nextImage(): void {
    const newIndex = (this.currentIndex + 1) % this.details.gallery.length;
    this.selectedImage = this.details.gallery[newIndex];
  }

  // Go to the previous image
  prevImage(): void {
    const newIndex =
      (this.currentIndex - 1 + this.details.gallery.length) % this.details.gallery.length;
    this.selectedImage = this.details.gallery[newIndex];
  }

  private applyApiResponse(data: ApiPropertyDetailsResponse): void {
    const addressLocation = data.address?.location || data.location;
    const fallbackLocation = data.city ? `${data.city}${data.townSector ? ', ' + data.townSector : ''}` : undefined;
    const formattedLocation = addressLocation ?? fallbackLocation ?? this.details.location;
    const apiLandmark = data.address?.landmark || data.landmark || this.details.address.landmark;

    const propertyTypeSource = this.requestedPropertyType || data.propertyType || data.type;
    this.propertyCategory = this.normalizeType(propertyTypeSource);
    const isFlat = this.propertyCategory === 'flat';
    const apiTypeSegments = [data.bhk, data.type].filter((segment) => !!segment);
    const combinedFlatType = apiTypeSegments.join(' | ');
    const computedRoomType = isFlat
      ? data.flatType || this.details.flatType || this.details.specs.roomType
      : data.roomType || this.details.specs.roomType;
    const roomInsideFacilities =
      data.roomInside ?? data.insideFacilities ?? this.details.roomInsideFacilities;
    const roomOutsideFacilities =
      data.roomOutside ?? data.outsideFacilities ?? this.details.roomOutsideFacilities;
    const flatInsideFacilities = data.flatInside ?? this.details.flatInsideFacilities ?? [];
    const flatOutsideFacilities = data.flatOutside ?? this.details.flatOutsideFacilities ?? [];
    const pgInsideFacilities = data.pgInside ?? this.details.pgInsideFacilities ?? [];
    const pgOutsideFacilities = data.pgOutside ?? this.details.pgOutsideFacilities ?? [];
    const foodAvailableSetting = data.foodAvailable ?? this.details.foodAvailable;

    const minPriceFromApi = data.minPrice ?? data.minprice;
    const maxPriceFromApi = data.maxPrice ?? data.maxprice;

    this.details = {
      ...this.details,
      location: formattedLocation,
      priceMin: minPriceFromApi ?? this.details.priceMin,
      priceMax: maxPriceFromApi ?? this.details.priceMax,
      propertyName: data.palaceName || this.details.propertyName,
      bhk: data.bhk || this.details.bhk,
      keyDetails: {
        security: this.toDisplayNumber(data.security),
        maintenance: this.toDisplayNumber(data.maintenance),
        type: combinedFlatType || this.details.keyDetails.type,
        furnishing: data.furnishingType || this.details.keyDetails.furnishing,
        accommodation: data.accomoType || this.details.keyDetails.accommodation,
        gender: data.genderPrefer || this.details.keyDetails.gender,
      },
      specs: {
        roomType: computedRoomType,
        totalRoom: data.totalRoom ?? this.details.specs.totalRoom,
        waterSupply: this.formatHours(data.waterSupply),
        powerBackup: this.formatHours(data.powerBackup),
        roomAvailable: data.roomAvailable || this.details.specs.roomAvailable,
      },
      offer: data.offer || this.details.offer,
      address: {
        area: data.address?.area || data.townSector || this.details.address.area,
        landmark: apiLandmark,
        location: addressLocation || this.details.address.location,
      },
      preferTenants: data.preferTenants ?? this.details.preferTenants,
      parking: data.parking ?? this.details.parking,
      roomInsideFacilities: roomInsideFacilities,
      roomOutsideFacilities: roomOutsideFacilities,
      propertyType: this.propertyCategory,
      flatType: data.flatType || this.details.flatType,
      totalFlat: data.totalFlat ?? this.details.totalFlat,
      noticePeriod: data.noticePeriod || this.details.noticePeriod,
      flatInsideFacilities: flatInsideFacilities,
      flatOutsideFacilities: flatOutsideFacilities,
      totalFloor: data.totalFloor ?? this.details.totalFloor,
      pgType: data.pgType || this.details.pgType,
      totalPg: data.totalPg ?? this.details.totalPg,
      foodAvailable: foodAvailableSetting,
      bedCount: data.bedCount ?? this.details.bedCount,
      timeRestrict: data.timeRestrict || this.details.timeRestrict,
      careTaker: data.careTaker || this.details.careTaker,
      pgInsideFacilities: pgInsideFacilities,
      pgOutsideFacilities: pgOutsideFacilities,
      luxury: data.luxury || this.details.luxury,
      acType: data.acType || this.details.acType,
      guestCapacity: data.noOfGuests ?? this.details.guestCapacity,
    };

    // Map backend `verified` flag into details
    const verifiedFlag = (data as any)?.verified;
    (this.details as any).verified = !!verifiedFlag;

    if (this.details.gallery.length > 0) {
      this.selectedImage = this.details.gallery[0];
    }
  }

  get primaryHeading(): string {
    const propertyName = this.isHourlyRoomProperty ? this.details.propertyName : undefined;
    const location = this.details.address.location || this.details.address.area || this.details.location || '';
    const landmark = this.details.address.landmark || '';
    const locationParts = [location, landmark].filter((value) => !!value);
    if (propertyName && locationParts.length > 0) {
      return `${propertyName} · ${locationParts.join(', ')}`;
    }
    if (propertyName) {
      return propertyName;
    }
    if (locationParts.length > 0) {
      return locationParts.join(', ');
    }
    return 'Property';
  }

  private toDisplayNumber(value?: number): string {
    if (value === undefined || value === null) {
      return '0';
    }
    return value.toLocaleString('en-IN');
  }

  private formatHours(value?: number): string {
    if (value === undefined || value === null) {
      return 'N/A';
    }
    return `${value} hr`;
  }


  get typeDisplayName(): string {
    switch (this.propertyCategory) {
      case 'flat':
        return 'Flat';
      case 'pg':
        return 'PG';
      case 'hourlyroom':
        return 'Hourly Room';
      default:
        return 'Room';
    }
  }

  get typeWithBhk(): string {
    const baseType = this.details.keyDetails.type?.trim() ?? '';
    const bhkSegment = this.details.bhk?.trim();
    if (!baseType && !bhkSegment) {
      return 'N/A';
    }
    if (!bhkSegment) {
      return baseType || 'N/A';
    }
    if (!baseType) {
      return bhkSegment;
    }

    const normalizedBhk = bhkSegment.toLowerCase();
    if (baseType.toLowerCase().includes(normalizedBhk)) {
      return baseType;
    }
    return `${baseType} | ${bhkSegment}`;
  }

  get isFlatProperty(): boolean {
    return this.propertyCategory === 'flat';
  }

  get isPGProperty(): boolean {
    return this.propertyCategory === 'pg';
  }

  get isHourlyRoomProperty(): boolean {
    return this.propertyCategory === 'hourlyroom';
  }

  get roomTypeValue(): string {
    return this.isFlatProperty
      ? this.details.flatType || this.details.specs.roomType
      : this.details.specs.roomType;
  }

  get totalTypeValue(): number {
    return this.isFlatProperty ? this.details.totalFlat ?? this.details.specs.totalRoom : this.details.specs.totalRoom;
  }

  get insideFacilitiesList(): string[] {
    if (this.isFlatProperty) {
      return this.details.flatInsideFacilities ?? [];
    }
    if (this.isPGProperty) {
      return this.details.pgInsideFacilities ?? [];
    }
    return this.details.roomInsideFacilities ?? [];
  }

  get outsideFacilitiesList(): string[] {
    if (this.isFlatProperty) {
      return this.details.flatOutsideFacilities ?? [];
    }
    if (this.isPGProperty) {
      return this.details.pgOutsideFacilities ?? [];
    }
    return this.details.roomOutsideFacilities ?? [];
  }

  formatDisplayName(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    const spaced = value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim();
    const words = spaced.split(/\s+/).filter(Boolean);
    const formatted = words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return formatted || value;
  }

  get pgTypeValue(): string | undefined {
    return this.details.pgType;
  }

  get totalPgValue(): number | undefined {
    return this.details.totalPg;
  }

  get foodAvailableValue(): string | undefined {
    const value = this.details.foodAvailable;
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return value;
  }

  get bedCountValue(): number | undefined {
    return this.details.bedCount;
  }

  get timeRestrictValue(): string | undefined {
    return this.details.timeRestrict;
  }

  get careTakerValue(): string | undefined {
    return this.details.careTaker;
  }

  get hourlyPropertyName(): string | undefined {
    return this.details.propertyName;
  }

  get hourlyGuestCapacity(): number | undefined {
    return this.details.guestCapacity;
  }

  get hourlyAcType(): string | undefined {
    return this.details.acType;
  }

  get hourlyLuxuryTier(): string | undefined {
    return this.details.luxury;
  }

  get totalFloorValue(): number | undefined {
    return this.details.totalFloor;
  }

  ngOnDestroy(): void {
    this.wishlistSubscription?.unsubscribe();
  }

  // --- Contact Owner state ---
  isFetchingOwnerContact = false;
  contactOwnerError: string | null = null;
  ownerContact: { name?: string; mobile?: string } | null = null;

  private mapCategoryToPropertyType(): 'FLAT' | 'ROOM' | 'PG' | 'HOURLY_ROOM' {
    const cat = this.propertyCategory;
    if (cat === 'flat') return 'FLAT';
    if (cat === 'pg') return 'PG';
    if (cat === 'hourlyroom') return 'HOURLY_ROOM';
    return 'ROOM';
  }

  contactOwner(): void {
    // Require login with any role; needs accessToken
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      this.redirectToLogin();
      return;
    }
    if (!this.propertyId) {
      this.contactOwnerError = 'Missing property id.';
      return;
    }

    this.isFetchingOwnerContact = true;
    this.contactOwnerError = null;
    this.ownerContact = null;

    const type = this.mapCategoryToPropertyType();
    const idNum = Number(this.propertyId);
    this.api.getOwnerContact({ type, id: idNum }).subscribe((resp: { success: boolean; data?: any; error?: string }) => {
      this.isFetchingOwnerContact = false;
      if (!resp || resp.success === false) {
        this.contactOwnerError = resp?.error || 'Unable to fetch owner contact.';
        return;
      }
      // ApiResponse.success(dto) should appear in resp.data
      const data = resp.data || resp;
      this.ownerContact = {
        name: data?.name || data?.ownerName || data?.username,
        mobile: data?.mobile || data?.whatsappNo || data?.phone,
      };
      if (!this.ownerContact.name && !this.ownerContact.mobile) {
        this.contactOwnerError = 'Contact details not available.';
      }
    }, (err: any) => {
      this.isFetchingOwnerContact = false;
      this.contactOwnerError = (err && (err.error?.message || err.message)) || 'Request failed';
    });
  }

  private normalizeType(input?: string | null): PropertyCategory {
    if (!input) {
      return 'room';
    }
    const normalized = input.trim().toLowerCase();
    if (normalized === 'flat') {
      return 'flat';
    }
    if (normalized === 'pg') {
      return 'pg';
    }
    if (normalized.includes('hourly')) {
      return 'hourlyroom';
    }
    return 'room';
  }

  toggleFavorite(): void {
    if (!this.propertyId) {
      return;
    }

    // Only END_USER can like/unlike; silently ignore otherwise
    const userType = localStorage.getItem('userType');
    if (userType !== 'END_USER') {
      return;
    }

    if (!userType) {
      this.redirectToLogin();
      return;
    }

    const type = this.mapCategoryToPropertyType();
    const idNum = Number(this.propertyId);
    if (Number.isNaN(idNum)) {
      return;
    }
    const userId = Number(localStorage.getItem('userId'));
    if (!userId) {
      this.redirectToLogin();
      return;
    }

    // If already liked -> unlike
    if (this.wishlistService.has(this.propertyId)) {
      this.api.unlikeProperty({ propertyType: type, propertyId: idNum, userId }).subscribe((resp) => {
        if (!resp || resp.success === false) {
          console.error('Unlike failed', resp?.error);
          return;
        }
        this.wishlistService.remove(this.propertyId!);
        this.liked = false;
      });
      return;
    }

    // Not liked -> like
    this.api.likeProperty({ propertyType: type, propertyId: idNum, userId }).subscribe((resp) => {
      if (!resp || resp.success === false) {
        console.error('Like failed', resp?.error);
        return;
      }
      const wishlistItem = this.buildWishlistItem();
      if (wishlistItem) {
        this.wishlistService.add(wishlistItem);
      }
      this.liked = true;
      this.triggerLikeAnimation();
    });
  }

  private triggerLikeAnimation(): void {
    this.animateHeart = true;
    this.showLoved = true;
    setTimeout(() => (this.animateHeart = false), 600);
    setTimeout(() => (this.showLoved = false), 1000);
  }

  private syncLikedState(): void {
    if (!this.propertyId || !this.canUseFavorites) {
      this.liked = false;
      return;
    }
    this.liked = this.wishlistService.has(this.propertyId);
  }

  private buildWishlistItem(): WishlistItem | undefined {
    if (!this.propertyId) {
      return undefined;
    }

    const location = this.details.address.location || this.details.address.area || this.details.location || '';
    const city = this.details.address.area || this.details.address.location || this.details.location || '';
    const imageUrl = this.selectedImage || this.details.gallery[0] || 'assets/images/logo.png';
    const formatter = new Intl.NumberFormat('en-IN');
    const priceMin = this.details.priceMin ?? 0;
    const priceMax = this.details.priceMax ?? 0;
    const price = `₹${formatter.format(priceMin)} - ₹${formatter.format(priceMax)}`;

    return {
      id: this.propertyId,
      imageUrl,
      location,
      city,
      hotelName: this.details.propertyName || this.primaryHeading,
      type: this.typeDisplayName,
      price,
      propertyCategory: this.propertyCategory,
    };
  }

  private redirectToLogin(): void {
    const currentUrl = window.location.pathname + window.location.search;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(PRE_LOGIN_URL_KEY, currentUrl || '/home');
      } catch (err) {
        console.warn('Unable to persist pre-login URL', err);
      }
    }
    this.router
      .navigate(['/login'], { queryParams: { returnUrl: currentUrl, userType: 'END_USER' } })
      .catch((err) => {
        console.error('Navigation to login failed', err);
      });
  }

  // --- NEW SHARE FUNCTION ---
  shareProperty(): void {
    const shareData = {
      title: `${this.details.location} Property`,
      text: `Check out this amazing property in ${this.details.location} for ₹${this.details.priceMin}-${this.details.priceMax} per month!`,
      url: window.location.href, // Current URL of the property details page
    };

    if (navigator.share) {
      navigator
        .share(shareData)
        .then(() => console.log('Property shared successfully!'))
        .catch((error) => console.error('Error sharing property:', error));
    } else {
      // Fallback for browsers that don't support Web Share API
      alert(
        `You can share this link:\n${shareData.url}\n(Title: ${shareData.title}\nText: ${shareData.text})`
      );
      console.log('Web Share API not supported. Sharing via console log:', shareData);
      // You could also implement a custom share modal here
    }
  }
}
