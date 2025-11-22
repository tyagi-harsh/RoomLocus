import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button'; // For the button
import { PropertyDetails as PropertyDetailsInterface } from '../../interface/Property';
// import { Footer } from '../footer/footer';

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

  constructor(private route: ActivatedRoute) {}
  selectedImage: string = '';

  ngOnInit(): void {
    // Set the default selected image to the first one in the gallery
    if (this.details.gallery.length > 0) {
      this.selectedImage = this.details.gallery[0];
    }
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

  ngAfterViewInit(): void {
    // Get the property ID from the route parameter
    this.route.paramMap.subscribe((params) => {
      this.propertyId = params.get('id');
      // Here you would typically fetch property details based on the ID
      // For now, we'll use the mock data
      console.log('Property ID:', this.propertyId);

      // Initialize liked state from localStorage once we have an id
      const key = this.getStorageKey();
      const saved = localStorage.getItem(key);
      this.liked = saved === '1';
    });
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
