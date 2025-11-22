import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Contact, WishlistItem } from '../../interface/user-dash';


@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule], // Make sure to import CommonModule for *ngFor
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard {

  activeTab: string = 'wishlist'; // 'wishlist' or 'recent'

 // Mock Data for Recent Contacts
  contacts: Contact[] = [
    { id: 1, category: 'Room', location: 'Delhi road', subLocation: 'Himmat nagar', name: 'Shyam', mobile: '9045668197', date: '2025-07-30' },
    { id: 2, category: 'Flat', location: 'NEAR HIGHWAY', subLocation: 'MADHAV NAGAR', name: 'DANISH', mobile: '9045668197', date: '2025-07-30' },
    { id: 3, category: 'Pg', location: 'Delhi road', subLocation: 'Himmat nagar', name: 'Shyam', mobile: '9045668197', date: '2025-07-30' },
    { id: 4, category: 'hourlyroom', location: 'NEAR PASHCHIM VIHAR', subLocation: 'MADHAV NAGAR', name: 'VIVEK SINGH', mobile: '9045668197', date: '2025-07-30' }
  ];

  // Updated Mock Data with Real Images
  wishlistItems: WishlistItem[] = [
    {
      id: 1,
      // Standard Hotel Room Image
      imageUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=500&q=80', 
      location: 'MADHAV NAGAR',
      city: 'Saharanpur',
      hotelName: 'HOTEL RAJ SHREE',
      type: 'Hourly Room',
      price: '₹ 500 - ₹ 549'
    },
    {
      id: 2,
      // Upscale/Royal Room Image
      imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=500&q=80',
      location: 'CIVIL LINES',
      city: 'Roorkee',
      hotelName: 'ROYAL PALACE',
      type: 'Full Day',
      price: '₹ 1200 - ₹ 1500'
    },
    {
      id: 3,
      // Cozy Guest House Image
      imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=500&q=80',
      location: 'DELHI ROAD',
      city: 'Meerut',
      hotelName: 'CITY INN',
      type: 'Guest House',
      price: '₹ 800 - ₹ 999'
    },
    {
      id: 4,
      // Resort/Mountain View Image
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=500&q=80',
      location: 'CLOCK TOWER',
      city: 'Dehradun',
      hotelName: 'MOUNTAIN VIEW',
      type: 'Resort',
      price: '₹ 2500 - ₹ 3000'
    }
  ];

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  deleteContact(id: number) {
    this.contacts = this.contacts.filter(c => c.id !== id);
  }

  deleteWishlistItem(id: number) {
    this.wishlistItems = this.wishlistItems.filter(item => item.id !== id);
  }

  callContact(mobile: string) {
    window.location.href = `tel:${mobile}`;
  }

  formatCity(city: string): string {
    if (!city) {
      return city;
    }
    const lower = city.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

}
