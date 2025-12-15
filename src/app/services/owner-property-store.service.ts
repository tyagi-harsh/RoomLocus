import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OwnerPropertySummary {
  propertyId: number;
  propertyType: string;
  displayName: string;
  location: string;
  townSector?: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class OwnerPropertyStoreService {
  private readonly storageKey = 'owner-properties';
  private readonly subjects = new Map<number, BehaviorSubject<OwnerPropertySummary[]>>();

  watchProperties(ownerId: number): Observable<OwnerPropertySummary[]> {
    return this.ensureSubject(ownerId).asObservable();
  }

  addProperty(ownerId: number, summary: OwnerPropertySummary): void {
    if (!ownerId) {
      return;
    }
    const subject = this.ensureSubject(ownerId);
    const current = subject.value.filter((item) => item.propertyId !== summary.propertyId);
    const nextList = [summary, ...current];
    subject.next(nextList);
    this.writeAll(ownerId, nextList);
  }

  private ensureSubject(ownerId: number): BehaviorSubject<OwnerPropertySummary[]> {
    let subject = this.subjects.get(ownerId);
    if (!subject) {
      const saved = this.readAll()[ownerId] ?? [];
      subject = new BehaviorSubject<OwnerPropertySummary[]>(saved);
      this.subjects.set(ownerId, subject);
    }
    return subject;
  }

  private readAll(): Record<number, OwnerPropertySummary[]> {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return {};
      }
      return parsed as Record<number, OwnerPropertySummary[]>;
    } catch (error) {
      console.warn('Failed to read owner properties from localStorage', error);
      return {};
    }
  }

  private writeAll(ownerId: number, list: OwnerPropertySummary[]): void {
    const all = this.readAll();
    all[ownerId] = list;
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(all));
    } catch (error) {
      console.warn('Failed to write owner properties to localStorage', error);
    }
  }
}
