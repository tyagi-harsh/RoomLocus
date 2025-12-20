import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP interceptor that attaches the Bearer token from localStorage
 * to outgoing requests that target the private API endpoints.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  // Only attach token to private API calls (adjust pattern as needed)
  const isPrivateApi = req.url.includes('/api/v1/private');

  if (isPrivateApi) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next(cloned);
    }
  }

  return next(req).pipe(
    catchError((err) => {
      // Only trigger auto-logout on unauthorized responses for requests that required auth
      // Avoid showing session-expired dialog for auth endpoints like /auth/login
      if (isPrivateApi && err && err.status === 401) {
        auth.handleUnauthorizedOnce();
      }
      return throwError(() => err);
    })
  );
};
