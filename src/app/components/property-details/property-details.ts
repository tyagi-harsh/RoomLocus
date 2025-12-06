import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button'; // For the button
import { PropertyDetails as PropertyDetailsInterface } from '../../interface/Property';
import { PropertySearchService } from '../../services/property-search.service';
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

type PropertyCategory = 'flat' | 'pg' | 'hourlyroom' | 'room';


@Component({
  selector: 'app-property-details',
  imports: [CommonModule, MatButtonModule],
  templateUrl: './property-details.html',
  styleUrl: './property-details.css',
})
export class PropertyDetails implements OnInit {
  propertyId: string | null = null;
  liked = false;
  animateHeart = false;
  showLoved = false;
  propertyCategory: PropertyCategory = 'room';
  private requestedPropertyType = 'room';

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
    isVerified: false,
    propertyName: 'Sea View Palace',
    location: 'Himmat Nagar',
    priceMin: 4500,
    priceMax: 6000,
    pricePeriod: 'Per Month',
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

  constructor(private route: ActivatedRoute, private propertySearch: PropertySearchService) {}
  selectedImage: string = '';

  ngOnInit(): void {
    this.selectedImage = this.details.gallery.length > 0 ? this.details.gallery[0] : '';

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

      this.restoreLikedState();
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

  private restoreLikedState(): void {
    const key = this.getStorageKey();
    const saved = localStorage.getItem(key);
    this.liked = saved === '1';
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

    if (this.details.gallery.length > 0) {
      this.selectedImage = this.details.gallery[0];
    }
  }

  get primaryHeading(): string {
    const propertyName = this.details.propertyName;
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


  private getStorageKey(): string {
    return `liked:${this.propertyId ?? 'unknown'}`;
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
    this.liked = !this.liked;
    localStorage.setItem(this.getStorageKey(), this.liked ? '1' : '0');

    // Trigger heart pop animation and loved popup when liking
    if (this.liked) {
      this.animateHeart = true;
      this.showLoved = true;
      setTimeout(() => (this.animateHeart = false), 600);
      setTimeout(() => (this.showLoved = false), 1000);
    }
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
