import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WishlistItem } from '../interface/user-dash';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private static readonly STORAGE_PREFIX = 'roomlocus:wishlist:';

  private readonly wishlistSubject = new BehaviorSubject<WishlistItem[]>(this.loadFromStorage());
  readonly wishlist$ = this.wishlistSubject.asObservable();

  private getStorageKey(): string {
    const userMobile = localStorage.getItem('userMobile');
    if (userMobile) {
      return WishlistService.STORAGE_PREFIX + userMobile;
    }
    // Fallback to generic key for unauthenticated users (should not happen for END_USER)
    return WishlistService.STORAGE_PREFIX + 'guest';
  }

  private loadFromStorage(): WishlistItem[] {
    const stored = localStorage.getItem(this.getStorageKey());
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.error('[WishlistService] failed to parse stored wishlist', error);
    }

    return [];
  }

  private persist(items: WishlistItem[]): void {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(items));
  }

  /** Call this when user logs in/out to reload their specific wishlist */
  refreshForCurrentUser(): void {
    const items = this.loadFromStorage();
    this.wishlistSubject.next(items);
  }

  private normalizeId(value: number | string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return value.toString();
  }

  has(id: number | string | null | undefined): boolean {
    const normalized = this.normalizeId(id);
    if (!normalized) {
      return false;
    }
    return this.wishlistSubject
      .getValue()
      .some((item) => this.normalizeId(item.id) === normalized);
  }

  add(item: WishlistItem): void {
    const normalized = this.normalizeId(item.id);
    if (!normalized) {
      return;
    }

    const currentList = this.wishlistSubject.getValue();
    if (currentList.some((existing) => this.normalizeId(existing.id) === normalized)) {
      return;
    }

    const nextList = [item, ...currentList];
    this.wishlistSubject.next(nextList);
    this.persist(nextList);
  }

  remove(id: number | string | null | undefined): void {
    const normalized = this.normalizeId(id);
    if (!normalized) {
      return;
    }

    const currentList = this.wishlistSubject.getValue();
    const nextList = currentList.filter((item) => this.normalizeId(item.id) !== normalized);
    if (nextList.length === currentList.length) {
      return;
    }

    this.wishlistSubject.next(nextList);
    this.persist(nextList);
  }

  getSnapshot(): WishlistItem[] {
    return this.wishlistSubject.getValue();
  }
}
