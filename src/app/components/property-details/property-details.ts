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
  security: number;
  maintenance: number;
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
  insideFacilities: string[];
  outsideFacilities: string[];
  location?: string;
  landmark?: string;
  address?: {
    location?: string;
    landmark?: string;
    area?: string;
  };
}

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
      roomAvailable: 'Montly Basis', // "Montly" is from your image
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
  };

  constructor(private route: ActivatedRoute, private propertySearch: PropertySearchService) {}
  selectedImage: string = '';

  ngOnInit(): void {
    this.selectedImage = this.details.gallery.length > 0 ? this.details.gallery[0] : '';

    this.route.paramMap.subscribe((params) => {
      this.propertyId = params.get('id');
      const propertyType = params.get('type') || 'room';

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

    this.details = {
      ...this.details,
      location: formattedLocation,
      priceMin: data.minprice ?? this.details.priceMin,
      priceMax: data.maxprice ?? this.details.priceMax,
      keyDetails: {
        security: this.toDisplayNumber(data.security),
        maintenance: this.toDisplayNumber(data.maintenance),
        type: data.bhk || data.roomType || this.details.keyDetails.type,
        furnishing: data.furnishingType || this.details.keyDetails.furnishing,
        accommodation: data.accomoType || this.details.keyDetails.accommodation,
        gender: data.genderPrefer || this.details.keyDetails.gender,
      },
      specs: {
        roomType: data.roomType || this.details.specs.roomType,
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
      preferTenants: data.preferTenants ?? [],
      parking: data.parking ?? [],
      roomInsideFacilities: data.insideFacilities ?? [],
      roomOutsideFacilities: data.outsideFacilities ?? [],
    };

    if (this.details.gallery.length > 0) {
      this.selectedImage = this.details.gallery[0];
    }
  }

  get primaryHeading(): string {
    const location = this.details.address.location || this.details.address.area || this.details.location || '';
    const landmark = this.details.address.landmark || '';
    if (location && landmark) {
      return `${location}, ${landmark}`;
    }
    return location || landmark || 'Property';
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

  private getStorageKey(): string {
    return `liked:${this.propertyId ?? 'unknown'}`;
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
