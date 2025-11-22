// Define an interface for our property data
export interface Property {
  id: number;
  imageUrl: string;
  isVerified: boolean;
  location: string;
  subLocation: string;
  type: string; // '1 BHK', '1 RK'
  priceMin: number;
  priceMax: number;
  category?: string;
}

export interface PropertyDetails {
  gallery: string[];
  isVerified: boolean;
  location: string;
  priceMin: number;
  priceMax: number;
  pricePeriod: string;
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
}
