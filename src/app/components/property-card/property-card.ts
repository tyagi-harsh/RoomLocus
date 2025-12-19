import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class PropertyCard implements OnChanges {
  // This 'property' will be passed in from the parent component
  @Input() property!: Property;


  constructor(private propertySearchService: PropertySearchService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if ('property' in changes && this.property) {
      // Normalize to backend field name: ensure `verified` is populated from legacy `isVerified` if needed
      (this.property as any).verified =
        (this.property as any).verified ?? (this.property as any).isVerified ?? false;
    }
  }

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
