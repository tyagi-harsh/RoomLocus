import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { PRE_LOGIN_URL_KEY } from '../constants/navigation-keys';

function ensureRole(expectedRole: string, state: RouterStateSnapshot): boolean | UrlTree {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    const storedRole = localStorage.getItem('userType');
    if (token && storedRole === expectedRole) {
      return true;
    }
  }

  const router = inject(Router);
  if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(PRE_LOGIN_URL_KEY, state.url);
    } catch (err) {
      console.error('Unable to store pre-login URL', err);
    }
  }
  return router.createUrlTree(['/login'], {
    queryParams: {
      userType: expectedRole,
      returnUrl: state.url,
    },
  });
}

export const userGuard: CanActivateFn = (_route, state) => ensureRole('END_USER', state);

export const ownerGuard: CanActivateFn = (_route, state) => ensureRole('OWNER', state);

export const agentGuard: CanActivateFn = (_route, state) => ensureRole('AGENT', state);

export const adminGuard: CanActivateFn = (_route, state) => ensureRole('ADMIN', state);
