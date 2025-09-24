import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthenticationService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(private authenticationService: AuthenticationService, private router: Router) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                let errorObj = {
                    status: 500,
                    message: ''
                };
                
                errorObj.message = 'An unknown error occurred. Please contact support for further assistance.';

                if (error.error instanceof ErrorEvent) {
                    // Client-side error
                    errorObj.message = `Error: ${error.error.message}`;
                } else {
                    // Server-side error
                    switch (error.status) {
                        case 400:
                            // Invalid Request
                            errorObj.status = 400;
                            // errorObj.message = 'Invalid Request.';
                            break;
                        case 401:
                            // Unauthorized
                            this.authenticationService.handleTokenExpiry();
                            // location.reload();
                            errorObj.status = 401;
                            // errorObj.message = 'Unauthorized - You do not have permission to access this resource.';
                            break;
                        case 403:
                            // Forbidden access
                            // this.authenticationService.handleTokenExpiry();
                            errorObj.status = 403;       
                            // -03 means not post, put, patch, delete method
                            if (error.error.code !== '-03') {
                                
                                // errorObj.message = 'Forbidden - You do not have permission to access this resource.';
                                this.router.navigate(['/pages/error'], { queryParams: { q: '403' } });
                            }                     
                            break;
                        case 404:
                            errorObj.status = 404;
                            // errorObj.message = 'Resource not found.';
                            break;
                        case 409:
                            errorObj.status = 409;
                            // errorObj.message = 'Duplicate entry error.';
                            break;
                        // Add more cases for other status codes as needed
                        default:
                            // errorObj.message = `Error Code: ${error.status}\nMessage: ${error.message}`;
                            errorObj.message = 'Internal server error.';
                            break;
                    }
                }

                return throwError(errorObj);
            })
        );
    }
}
