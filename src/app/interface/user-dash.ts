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
  landmark?: string;
  city: string;
  hotelName: string;
  type: string;
  price: string;
  pricePeriod?: string;
  propertyCategory?: PropertyCategory;
  propertyType?: string; // RAW backend type e.g., FLAT/ROOM/PG/HOURLY_ROOM
  townSector?: string;
  verified?: boolean;
  gallery?: string[];
}