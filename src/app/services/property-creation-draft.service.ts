import { Injectable } from '@angular/core';
import { FlatPayload, RoomPayload, PGPayload, HourlyRoomPayload } from './property-creation.service';

export type PropertyTypeKey = 'flat' | 'room' | 'pg' | 'hourly-room';

export interface PropertyCreationDraft {
  propertyType: PropertyTypeKey;
  payload: FlatPayload | RoomPayload | PGPayload | HourlyRoomPayload;
  ownerId: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class PropertyCreationDraftService {
  private readonly storageKey = 'property-creation-draft';

  setDraft(draft: PropertyCreationDraft): void {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(draft));
    } catch (error) {
      console.warn('Unable to persist creation draft', error);
    }
  }

  getDraft(): PropertyCreationDraft | null {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as PropertyCreationDraft;
    } catch (error) {
      console.warn('Failed to parse creation draft', error);
      window.localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  clearDraft(): void {
    window.localStorage.removeItem(this.storageKey);
  }
}
