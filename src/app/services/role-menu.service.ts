import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import { RoleMenuDTO, RoleMenuUpdateRequest } from '../models/role-menu.model';

@Injectable({ providedIn: 'root' })
export class RoleMenuService {
  private apiUrl = environment.apiUrl + 'api/role-menu/';

  constructor(private http: HttpClient) {}

  getAllRoleMenus(): Observable<RoleMenuDTO[]> {
    return this.http
      .get<ApiResponse<RoleMenuDTO[]>>(this.apiUrl + 'all')
      .pipe(map((res) => res.data || []));
  }

  getMenuByRole(roleName: string): Observable<number[]> {
    return this.http
      .get<ApiResponse<number[]>>(this.apiUrl + 'role/' + roleName)
      .pipe(map((res) => res.data || []));
  }

  getMyPermissions(): Observable<number[] | null> {
    return this.http
      .get<ApiResponse<number[] | null>>(this.apiUrl + 'my-permissions')
      .pipe(map((res) => res.data));
  }

  getAllRoles(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(this.apiUrl + 'roles')
      .pipe(map((res) => res.data || []));
  }

  updateRoleMenu(request: RoleMenuUpdateRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(this.apiUrl + 'update', request);
  }

  deleteRoleMenu(roleName: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(this.apiUrl + 'role/' + roleName);
  }
}
