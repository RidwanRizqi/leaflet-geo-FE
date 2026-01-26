import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpXsrfTokenExtractor,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HttpInterceptorService implements HttpInterceptor {
  constructor(
    private tokenExtractor: HttpXsrfTokenExtractor
  ) { }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Get Bearer token from localStorage
    const authToken = localStorage.getItem('auth_token');

    // Add Authorization header if token exists
    if (authToken) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
    }

    // Skip credentials for external APIs or specific endpoints
    const skipCredentials = req.url.includes('/api/bidang') || req.url.includes('localhost:8080');

    if (skipCredentials) {
      // For external APIs, don't force credentials
      req = req.clone({
        withCredentials: false,
      });
    } else {
      // Handle CSRF token for internal APIs
      let xsrfToken = this.tokenExtractor.getToken();
      if (xsrfToken) {
        req = req.clone({
          withCredentials: true,
          // headers: req.headers.set('X-XSRF-TOKEN', xsrfToken),
        });
      } else {
        req = req.clone({
          withCredentials: true,
        });
      }
    }

    return next.handle(req);
  }
}
