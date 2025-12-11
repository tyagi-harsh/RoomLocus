import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

function ensureRole(expectedRole: string): boolean | UrlTree {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    const storedRole = localStorage.getItem('userType');
    if (token && storedRole === expectedRole) {
      return true;
    }
  }

  const router = inject(Router);
  return router.createUrlTree(['/login'], {
    queryParams: { redirect: expectedRole === 'OWNER' ? 'owner-dashboard' : 'dashboard' },
  });
}

export const userGuard: CanActivateFn = () => ensureRole('END_USER');

export const ownerGuard: CanActivateFn = () => ensureRole('OWNER');
