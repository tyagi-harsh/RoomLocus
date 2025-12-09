import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Contact, WishlistItem } from '../../interface/user-dash';
import { WishlistService } from '../../services/wishlist.service';


@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule], // Make sure to import CommonModule for *ngFor and RouterModule for routerLink
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css',
})
export class UserDashboard implements OnInit, OnDestroy {

  activeTab: string = 'wishlist'; // 'wishlist' or 'recent'

 // Mock Data for Recent Contacts
  contacts: Contact[] = [
    { id: 1, category: 'Room', location: 'Delhi road', subLocation: 'Himmat nagar', name: 'Shyam', mobile: '9045668197', date: '2025-07-30' },
    { id: 2, category: 'Flat', location: 'NEAR HIGHWAY', subLocation: 'MADHAV NAGAR', name: 'DANISH', mobile: '9045668197', date: '2025-07-30' },
    { id: 3, category: 'Pg', location: 'Delhi road', subLocation: 'Himmat nagar', name: 'Shyam', mobile: '9045668197', date: '2025-07-30' },
    { id: 4, category: 'hourlyroom', location: 'NEAR PASHCHIM VIHAR', subLocation: 'MADHAV NAGAR', name: 'VIVEK SINGH', mobile: '9045668197', date: '2025-07-30' }
  ];

  wishlistItems: WishlistItem[] = [];
  private wishlistSubscription?: Subscription;

  constructor(private readonly wishlistService: WishlistService) {}

  ngOnInit(): void {
    this.wishlistSubscription = this.wishlistService.wishlist$.subscribe((items) => {
      this.wishlistItems = items;
    });
  }

  ngOnDestroy(): void {
    this.wishlistSubscription?.unsubscribe();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  deleteContact(id: number) {
    this.contacts = this.contacts.filter(c => c.id !== id);
  }

  deleteWishlistItem(id: number | string) {
    this.wishlistService.remove(id);
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
