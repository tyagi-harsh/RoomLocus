// Define an interface for our property data
export interface Property {
  id: number;
  imageUrl: string;
  verified?: boolean;
  isVerified?: boolean; // legacy support
  location: string;
  subLocation: string;
  type: string; // '1 BHK', '1 RK'
  bhk?: string; // '1 BHK', '1 RK'
  priceMin: number;
  priceMax: number;
  category?: string;
}

export interface PropertyDetails {
  gallery: string[];
  verified?: boolean;
  isVerified?: boolean; // legacy support
  location: string;
  propertyName?: string;
  priceMin: number;
  priceMax: number;
  pricePeriod: string;
  bhk?: string;
  keyDetails: {
    security: string;
    maintenance: string;
    type: string;
    furnishing: string;
    accommodation: string; // e.g., "Independent"
    gender: string; // e.g., "Both M & F"
  };

  specs: {
    roomType: string;
    totalRoom: number;
    waterSupply: string;
    powerBackup: string;
    roomAvailable: string;
  };
  offer: string;
  address: {
    area: string;
    landmark: string;
    location: string;
  };
  preferTenants: string[];
  parking: string[];
  roomInsideFacilities: string[];
  roomOutsideFacilities: string[];

  // Additional metadata for flat-specific layouts
  propertyType?: string;
  flatType?: string;
  totalFlat?: number;
  noticePeriod?: string;
  flatInsideFacilities?: string[];
  flatOutsideFacilities?: string[];
  totalFloor?: number;
  pgType?: string;
  totalPg?: number;
  foodAvailable?: string | boolean;
  bedCount?: number;
  timeRestrict?: string;
  careTaker?: string;
  pgInsideFacilities?: string[];
  pgOutsideFacilities?: string[];
  luxury?: string;
  acType?: string;
  guestCapacity?: number;
}
