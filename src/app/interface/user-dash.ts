export interface Contact {
  id: number;
  category: string; // e.g., Room, Flat, Pg
  location: string;
  subLocation: string;
  name: string;
  mobile: string;
  date: string;
}

// New Interface for Wishlist
export type PropertyCategory = 'flat' | 'pg' | 'hourlyroom' | 'room';

export interface WishlistItem {
  id: number | string;
  imageUrl: string;
  location: string;
  city: string;
  hotelName: string;
  type: string;
  price: string;
  propertyCategory?: PropertyCategory;
}