export interface FacilityOption {
  key: string;
  label: string;
}

export const INSIDE_FACILITIES: FacilityOption[] = [
  { key: 'singleBed', label: 'Single Bed' },
  { key: 'doubleBed', label: 'Double Bed' },
  { key: 'almirahWardrobe', label: 'Almirah / Wardrobe' },
  { key: 'sofa', label: 'Sofa' },
  { key: 'fan', label: 'Fan' },
  { key: 'ac', label: 'AC' },
  { key: 'tv', label: 'TV' },
  { key: 'attachedBathroom', label: 'Attached Bathroom' },
  { key: 'geyser', label: 'Geyser' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'gasInduction', label: 'Gas / Induction' },
  { key: 'fridge', label: 'Fridge' },
  { key: 'utensils', label: 'Utensils' },
  { key: 'washingMachine', label: 'Washing Machine' },
  { key: 'roWater', label: 'RO Water' },
];

export const OUTSIDE_FACILITIES: FacilityOption[] = [
  { key: 'busStop', label: 'Bus Stop' },
  { key: 'metroStation', label: 'Metro Station' },
  { key: 'railwayStation', label: 'Railway Station' },
  { key: 'school', label: 'School' },
  { key: 'college', label: 'College' },
  { key: 'university', label: 'University' },
  { key: 'shoppingMall', label: 'Shopping Mall' },
  { key: 'market', label: 'Market' },
  { key: 'hospital', label: 'Hospital' },
  { key: 'bankAtm', label: 'Bank ATM' },
  { key: 'park', label: 'Park' },
  { key: 'gatedSociety', label: 'Gated Society' },
  { key: 'securityGuard', label: 'Security Guard' },
  { key: 'gym', label: 'Gym' },
  { key: 'cctvCamera', label: 'CCTV Camera' },
  { key: 'tiffinMessService', label: 'Tiffin/Mess Service' },
  { key: 'dhabasRestaurants', label: 'Dhabas/Restaurants' },
];

export function buildFacilityControls(
  options: FacilityOption[]
): Record<string, [boolean]> {
  return options.reduce((controls, option) => {
    controls[option.key] = [false];
    return controls;
  }, {} as Record<string, [boolean]>);
}
