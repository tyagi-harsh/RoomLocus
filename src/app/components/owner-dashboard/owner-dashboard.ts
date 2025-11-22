import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lead } from '../../interface/owner-dash';



@Component({
  selector: 'app-owner-dashboard',
  imports: [CommonModule],
  templateUrl: './owner-dashboard.html',
  styleUrl: './owner-dashboard.css',
})
export class OwnerDashboard {

  activeTab: string = 'used-lead'; // Default active tab based on image
  leadCount: number = 24;

  // Mock Data for Used Leads
  leads: Lead[] = [
    {
      id: 1,
      category: 'Room',
      location: 'Delhi road',
      subLocation: 'Himmat nagar',
      name: 'Danish',
      mobile: '9045668197',
      date: '2025-07-30'
    },
    {
      id: 2,
      category: 'Flat',
      location: 'NEAR HIGHWAY',
      subLocation: 'MADHAV NAGAR',
      name: 'Danish',
      mobile: '9045668197',
      date: '2025-07-30'
    },
    {
      id: 3,
      category: 'Pg',
      location: 'Delhi road',
      subLocation: 'Himmat nagar',
      name: 'Danish',
      mobile: '9045668197',
      date: '2025-07-30'
    }
  ];

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  deleteLead(id: number) {
    this.leads = this.leads.filter(l => l.id !== id);
  }

  callLead(mobile: string) {
    window.location.href = `tel:${mobile}`;
  }

  buyLead() {
    console.log('Buy Lead Clicked');
    // Add navigation to payment gateway or buy lead page here
  }

}
