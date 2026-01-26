import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  MasterArea,
  MasterDepartment,
  MasterDivision,
  MasterEmployment,
  MasterGrade,
  MasterSection,
} from '../models/master.models';

@Injectable({
  providedIn: 'root',
})
export class MasterService {
  readonly apiUrl: string = `${environment.apiUrl}api/master`;

  constructor(private http: HttpClient) {}

  autoCompleteEmployment(search?: string) {
    return this.http
      .get<{ data: MasterEmployment[] }>(
        `${this.apiUrl}/auto-complete-employment`,
        {
          params: {
            search: search || '',
          },
        }
      )
      .pipe(map((response) => response.data));
  }

  autoCompleteDivision(search?: string) {
    return this.http
      .get<{ data: MasterDivision[] }>(
        `${this.apiUrl}/auto-complete-division`,
        {
          params: {
            search: search || '',
          },
        }
      )
      .pipe(map((response) => response.data));
  }

  autoCompleteDepartment(division_id: number, search?: string) {
    return this.http
      .get<{ data: MasterDepartment[] }>(
        `${this.apiUrl}/auto-complete-department/${division_id}`,
        {
          params: {
            search: search || '',
          },
        }
      )
      .pipe(map((response) => response.data));
  }

  autoCompleteArea() {
    return this.http
      .get<{ data: MasterArea[] }>(`${this.apiUrl}/auto-complete-area`)
      .pipe(map((response) => response.data));
  }

  autoCompleteGrade() {
    return this.http
      .get<{ data: MasterGrade[] }>(`${this.apiUrl}/auto-complete-grade`)
      .pipe(map((response) => response.data));
  }

  autoCompleteSection(id: number, search?: string) {
    return this.http
      .get<{ data: MasterSection[] }>(`${this.apiUrl}/auto-complete-section`, {
        params: {
          search: search || '',
          id_area: id.toString(),
        },
      })
      .pipe(map((response) => response.data));
  }
}
