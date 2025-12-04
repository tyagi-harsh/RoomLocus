import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Property } from '../../interface/Property';
import { PropertySearchService } from '../../services/property-search.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './property-card.html',
  styleUrl: './property-card.css',
})
export class PropertyCard {
  // This 'property' will be passed in from the parent component
  @Input() property!: Property;

  constructor(private propertySearchService: PropertySearchService) {}

  onCardClick(): void {
    const typeParam = this.detailType;

    this.propertySearchService
      .getPropertyDetails(typeParam, this.property.id)
      .pipe(take(1))
      .subscribe((details: any) => {
        console.log('Fetched property details before navigation:', details);
      });
  }

  get detailType(): string {
    return this.normalizeType(this.property.category ?? this.property.type) ?? 'flat';
  }

  private normalizeType(rawType?: string | null): string | null {
    if (!rawType) {
      return null;
    }

    const normalized = rawType.trim().toLowerCase();
    switch (normalized) {
      case 'flat':
        return 'flat';
      case 'room':
      case 'bhk':
      case 'bhk | room':
        return 'room';
      case 'pg':
        return 'PG';
      case 'hourly room':
      case 'hourlyroom':
        return 'Hourly Room';
      default:
        return normalized.includes('pg') ? 'PG' : normalized.includes('hourly') ? 'Hourly Room' : 'flat';
    }
  }
}
