import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, RouterStateSnapshot } from '@angular/router';

function ensureRole(expectedRole: string, state: RouterStateSnapshot): boolean | UrlTree {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    const storedRole = localStorage.getItem('userType');
    if (token && storedRole === expectedRole) {
      return true;
    }
  }

  const router = inject(Router);
  return router.createUrlTree(['/login'], {
    queryParams: {
      redirect: expectedRole === 'OWNER' ? 'owner-dashboard' : 'dashboard',
      returnUrl: state.url !== '/login' ? state.url : undefined,
    },
  });
}

export const userGuard: CanActivateFn = (_route, state) => ensureRole('END_USER', state);

export const ownerGuard: CanActivateFn = (_route, state) => ensureRole('OWNER', state);
