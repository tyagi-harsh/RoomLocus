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
export interface WishlistItem {
  id: number;
  imageUrl: string;
  location: string;
  city: string;
  hotelName: string;
  type: string;
  price: string;
}