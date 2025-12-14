import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Functional HTTP interceptor that attaches the Bearer token from localStorage
 * to outgoing requests that target the private API endpoints.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
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

  return next(req);
};
