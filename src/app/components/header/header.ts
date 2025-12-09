import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { WishlistService } from '../../services/wishlist.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  dropdownOpen = false;
  isAuthenticated = false;
  userType: string | null = null;
  currentUrl: string = '/';
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private wishlistService: WishlistService) {}

  ngOnInit(): void {
    this.syncAuthState();
    this.currentUrl = this.router.url;
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd), takeUntil(this.destroy$)).subscribe((event) => {
      this.closeDropdown();
      this.syncAuthState();
      // Track current URL for return after login
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects || event.url;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  openDropdown(): void {
    this.dropdownOpen = true;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  navigateToLogin(userType: string): void {
    this.closeDropdown();
    const returnUrl = this.currentUrl !== '/login' ? this.currentUrl : '/home';
    this.router.navigate(['/login'], {
      queryParams: { userType, returnUrl }
    }).catch((err) => console.warn('Navigation failed', err));
  }

  goToDashboard(): void {
    if (!this.userType) {
      return;
    }
    const target = this.userType === 'OWNER' ? '/owner-dashboard' : '/dashboard';
    this.router.navigate([target]).catch((err) => console.warn('Navigation failed', err));
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userType');
      localStorage.removeItem('userMobile');
    }
    this.isAuthenticated = false;
    this.userType = null;
    this.wishlistService.refreshForCurrentUser();
    this.router.navigate(['/login']).catch((err) => console.warn('Navigation failed', err));
  }

  private syncAuthState(): void {
    if (typeof window === 'undefined') {
      this.isAuthenticated = false;
      this.userType = null;
      return;
    }
    const token = localStorage.getItem('accessToken');
    const storedRole = localStorage.getItem('userType');
    this.isAuthenticated = Boolean(token && storedRole);
    this.userType = storedRole || null;
  }
}
