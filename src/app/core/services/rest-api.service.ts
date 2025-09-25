import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { MasterOrganization, PagingModel } from '../models/master.models';

@Injectable({
    providedIn: "root",
})
export class RestApiService {
    apiUrl = environment.apiUrl + "api/";
    public baseUrl = environment.apiUrl;
    constructor(private http: HttpClient) {}

    downloadFile(url: string): Observable<Blob> {
        return this.http.get(url, { responseType: "blob" });
    }

    getLoggedInUser(url: string = this.apiUrl) {
        return this.http.get(url + 'auth/info', { withCredentials: true });
    }

    getFiles(path: string): Observable<any> {
        return this.http.get(this.apiUrl + "files/" + path, { responseType: "blob" });
    }

    getSidebarMenu(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });

        // Use template literals for constructing the URL
        const fullUrl = `${this.apiUrl}menu${
            params.toString() ? "?" + params.toString() : ""
        }`;

        return this.http.get(fullUrl);
    }

    getAppList(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });

        // Use template literals for constructing the URL
        const fullUrl = `${this.apiUrl}remote-app${
            params.toString() ? "?" + params.toString() : ""
        }`;

        return this.http.get(fullUrl);
    }

    // ------------------------------ Organization APIs
    getStructureOrganization(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: any }>(this.apiUrl + "organization/structure", { params })
            .pipe(map((response) => response.data));
    }

    listOrganizations(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: { items: MasterOrganization[]; paging: PagingModel } }>(
            this.apiUrl + "organization", { params }
        ).pipe(map((response) => response.data));
    }

    addOrganization(data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "organization", data)
            .pipe(map((response) => response.data));
    }

    getMstSubSection(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: any }>(this.apiUrl + "subsection", { params })
            .pipe(map((response) => response.data));
    }

    // ------------------------------ Group APIs
    getAllGroups(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: { groups: any[] } }>(this.apiUrl + "group", { params })
            .pipe(map((response) => response.data.groups));
    }

    getGroupById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "group/" + id)
            .pipe(map((response) => response.data));
    }

    createGroup(data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "group", data)
            .pipe(map((response) => response.data));
    }

    updateGroup(id: number, data: any): Observable<any> {
        return this.http.put<{ data: any }>(this.apiUrl + "group/" + id, data)
            .pipe(map((response) => response.data));
    }

    deleteGroup(id: number): Observable<any> {
        return this.http.delete<{ data: any }>(this.apiUrl + "group/" + id)
            .pipe(map((response) => response.data));
    }

    // ------------------------------ Email Recipient APIs
    getAllEmailRecipients(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: { recipients: any[], pagination: any } }>(this.apiUrl + "email-recipient", { params })
            .pipe(map((response) => response.data));
    }

    getEmailRecipientById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "email-recipient/" + id)
            .pipe(map((response) => response.data));
    }

    createEmailRecipient(data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "email-recipient", data)
            .pipe(map((response) => response.data));
    }

    updateEmailRecipient(id: number, data: any): Observable<any> {
        return this.http.put<{ data: any }>(this.apiUrl + "email-recipient/" + id, data)
            .pipe(map((response) => response.data));
    }

    deleteEmailRecipient(id: number): Observable<any> {
        return this.http.delete<{ data: any }>(this.apiUrl + "email-recipient/" + id)
            .pipe(map((response) => response.data));
    }

    // ------------------------------ Line APIs
    getAllLines(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: { lines: any[] } }>(this.apiUrl + "line", { params })
            .pipe(map((response) => response.data.lines));
    }

    getLineById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "line/" + id)
            .pipe(map((response) => response.data));
    }

    createLine(data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "line", data)
            .pipe(map((response) => response.data));
    }

    updateLine(id: number, data: any): Observable<any> {
        return this.http.put<{ data: any }>(this.apiUrl + "line/" + id, data)
            .pipe(map((response) => response.data));
    }

    deleteLine(id: number): Observable<any> {
        return this.http.delete<{ data: any }>(this.apiUrl + "line/" + id)
            .pipe(map((response) => response.data));
    }

    // ------------------------------ Section APIs
    getAllSections(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: { sections: any[] } }>(this.apiUrl + "section", { params })
            .pipe(map((response) => response.data.sections));
    }

    getSectionById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "section/" + id)
            .pipe(map((response) => response.data));
    }

    createSection(data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "section", data)
            .pipe(map((response) => response.data));
    }

    updateSection(id: number, data: any): Observable<any> {
        return this.http.put<{ data: any }>(this.apiUrl + "section/" + id, data)
            .pipe(map((response) => response.data));
    }

    deleteSection(id: number): Observable<any> {
        return this.http.delete<{ data: any }>(this.apiUrl + "section/" + id)
            .pipe(map((response) => response.data));
    }

    // ------------------------------ SubSection APIs
    getAllSubSections(query: any = {}): Observable<any> {
        const params = new HttpParams({ fromObject: query });
        return this.http.get<{ data: { subsections: any[] } }>(this.apiUrl + "subsection", { params })
            .pipe(map((response) => response.data.subsections));
    }

    getSubSectionById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "subsection/" + id)
            .pipe(map((response) => response.data));
    }

    createSubSection(data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "subsection", data)
            .pipe(map((response) => response.data));
    }

    updateSubSection(id: number, data: any): Observable<any> {
        return this.http.put<{ data: any }>(this.apiUrl + "subsection/" + id, data)
            .pipe(map((response) => response.data));
    }

    deleteSubSection(id: number): Observable<any> {
        return this.http.delete<{ data: any }>(this.apiUrl + "subsection/" + id)
            .pipe(map((response) => response.data));
    }

    // SubSection Manpower APIs
    getSubSectionManpower(subSectionId: number): Observable<any> {
        return this.http.get<{ data: { manpowers: any[] } }>(this.apiUrl + "subsection/" + subSectionId + "/manpower")
            .pipe(map((response) => response.data.manpowers));
    }

    addSubSectionManpower(subSectionId: number, data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "subsection/" + subSectionId + "/manpower", data)
            .pipe(map((response) => response.data));
    }

    // ------------------------------ Organization APIs
    getAllOrganizations(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: { organizations: any[], pagination: any } }>(this.apiUrl + "organization", { params })
            .pipe(map((response) => response.data));
    }

    getOrganizationById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "organization/" + id)
            .pipe(map((response) => response.data));
    }

    createOrganization(data: any): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "organization", data)
            .pipe(map((response) => response.data));
    }

    updateOrganization(id: number, data: any): Observable<any> {
        return this.http.put<{ data: any }>(this.apiUrl + "organization/" + id, data)
            .pipe(map((response) => response.data));
    }

    deleteOrganization(id: number): Observable<any> {
        return this.http.delete<{ data: any }>(this.apiUrl + "organization/" + id)
            .pipe(map((response) => response.data));
    }

    getOrganizationHistory(employeeCode: string): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "organization/history/" + employeeCode)
            .pipe(map((response) => response.data));
    }

    // ------------------------------ Lookup APIs
    lookupEmployees(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: { employees: any[] } }>(this.apiUrl + "lookup/employees", { params })
            .pipe(map((response) => response.data.employees || response.data));
    }

    lookupEmployeeById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "lookup/employees/" + id)
            .pipe(map((response) => response.data));
    }

    lookupDivisions(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: { divisions: any[] } }>(this.apiUrl + "lookup/divisions", { params })
            .pipe(map((response) => response.data.divisions || response.data));
    }

    lookupDepartments(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: { departments: any[] } }>(this.apiUrl + "lookup/departments", { params })
            .pipe(map((response) => response.data.departments || response.data));
    }

    lookupGrades(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: { grades: any[] } }>(this.apiUrl + "lookup/grades", { params })
            .pipe(map((response) => response.data.grades || response.data));
    }

    // ------------------------------ Events APIs
    getAllEvents(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: any[] }>(this.apiUrl + "events", { params })
            .pipe(map((response) => response.data));
    }

    getCountdownEvents(days: number = 60): Observable<any> {
        return this.http.get<{ data: any[], success: boolean }>(this.apiUrl + "events/countdown/" + days);
    }

    getEventsPaginated(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        const url = this.apiUrl + "events";
        console.log('Making request to:', url);
        console.log('With params:', params.toString());

        return this.http.get<{ data: any[], meta: any }>(url, { params });
    }

    getEventById(id: number): Observable<any> {
        return this.http.get<{ data: any }>(this.apiUrl + "events/" + id)
            .pipe(map((response) => response.data));
    }

    createEvent(data: any): Observable<any> {
        // If data is FormData, send as-is (browser will set proper Content-Type)
        // If it's regular object, send as JSON
        return this.http.post<{ data: any }>(this.apiUrl + "events", data)
            .pipe(map((response) => response.data));
    }

    updateEvent(id: number, data: any): Observable<any> {
        // If data is FormData, send as-is (browser will set proper Content-Type)
        // If it's regular object, send as JSON
        return this.http.put<{ data: any }>(this.apiUrl + "events/" + id, data)
            .pipe(map((response) => response.data));
    }

    deleteEvent(id: number): Observable<any> {
        return this.http.delete<{ data: any }>(this.apiUrl + "events/" + id)
            .pipe(map((response) => response.data));
    }

    softDeleteEvent(id: number): Observable<any> {
        return this.http.patch<{ data: any }>(this.apiUrl + "events/" + id + "/deactivate", {})
            .pipe(map((response) => response.data));
    }

    deleteBulkEvents(ids: number[]): Observable<any> {
        return this.http.post<{ data: any }>(this.apiUrl + "events/bulk-delete", { ids })
            .pipe(map((response) => response.data));
    }

    getUpcomingEvents(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: any[] }>(this.apiUrl + "events/upcoming", { params })
            .pipe(map((response) => response.data));
    }

    // ------------------------------ Bidang APIs
    checkBidangHealth(): Observable<any> {
        return this.http.get<any>(this.apiUrl + "bidang/health");
    }

    getAllBidang(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: any[], pagination: any }>(this.apiUrl + "bidang", { params })
            .pipe(map((response) => response));
    }

    getBidangGeometry(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: any[], pagination: any }>(this.apiUrl + "bidang/geometry", { params })
            .pipe(map((response) => response));
    }

    getBidangById(id: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + "bidang/" + id);
    }

    getBidangByNop(nop: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + "bidang/nop/" + nop);
    }

    getBidangByProvince(kdProp: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + "bidang/province/" + kdProp);
    }

    // ------------------------------ Ref Kecamatan APIs
    getRefKecamatan(): Observable<any> {
        return this.http.get<any>(this.apiUrl + "ref-kecamatan")
            .pipe(map((response) => response.data || response));
    }

    getRefKecamatanById(kdPropinsi: string, kdDati2: string, kdKecamatan: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `ref-kecamatan/${kdPropinsi}/${kdDati2}/${kdKecamatan}`);
    }

    getRefKecamatanByPropinsi(kdPropinsi: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kecamatan/propinsi/${kdPropinsi}`);
    }

    getRefKecamatanByPropinsiAndDati2(kdPropinsi: string, kdDati2: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kecamatan/propinsi/${kdPropinsi}/dati2/${kdDati2}`);
    }

    searchRefKecamatan(nmKecamatan: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kecamatan/search?nmKecamatan=${encodeURIComponent(nmKecamatan)}`);
    }

    // ------------------------------ Ref Kelurahan APIs
    getRefKelurahan(): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + "ref-kelurahan");
    }

    getRefKelurahanById(kdPropinsi: string, kdDati2: string, kdKecamatan: string, kdKelurahan: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `ref-kelurahan/${kdPropinsi}/${kdDati2}/${kdKecamatan}/${kdKelurahan}`);
    }

    getRefKelurahanByKecamatan(kdPropinsi: string, kdDati2: string, kdKecamatan: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `ref-kelurahan/propinsi/${kdPropinsi}/dati2/${kdDati2}/kecamatan/${kdKecamatan}`)
            .pipe(map((response) => response.data || response));
    }

    getRefKelurahanByPropinsi(kdPropinsi: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kelurahan/propinsi/${kdPropinsi}`);
    }

    getRefKelurahanByPropinsiAndDati2(kdPropinsi: string, kdDati2: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kelurahan/propinsi/${kdPropinsi}/dati2/${kdDati2}`);
    }

    searchRefKelurahan(nmKelurahan: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kelurahan/search?nmKelurahan=${encodeURIComponent(nmKelurahan)}`);
    }

    getRefKelurahanBySektor(kdSektor: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kelurahan/sektor/${kdSektor}`);
    }

    getRefKelurahanByPosKelurahan(kdPosKelurahan: string): Observable<any> {
        return this.http.get<any[]>(this.apiUrl + `ref-kelurahan/pos/${kdPosKelurahan}`);
    }

    // ------------------------------ Bidang Filtered APIs
    getBidangByKecamatan(kdProp: string, kdDati2: string, kdKec: string, page: number = 0, size: number = 10): Observable<any> {
        return this.http.get<any>(this.apiUrl + `bidang/kecamatan/${kdProp}/${kdDati2}/${kdKec}?page=${page}&size=${size}`);
    }

    getBidangByKelurahan(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, page: number = 0, size: number = 10): Observable<any> {
        return this.http.get<any>(this.apiUrl + `bidang/kelurahan/${kdProp}/${kdDati2}/${kdKec}/${kdKel}?page=${page}&size=${size}`);
    }

    getBidangByKecamatanGeometry(kdProp: string, kdDati2: string, kdKec: string, page: number = 0, size: number = 50): Observable<any> {
        return this.http.get<any>(this.apiUrl + `bidang/kecamatan/${kdProp}/${kdDati2}/${kdKec}/geometry?page=${page}&size=${size}`);
    }

    getBidangByKelurahanGeometry(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, page: number = 0, size: number = 50): Observable<any> {
        return this.http.get<any>(this.apiUrl + `bidang/kelurahan/${kdProp}/${kdDati2}/${kdKec}/${kdKel}/geometry?page=${page}&size=${size}`);
    }

    searchBidang(query: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(query).forEach(key => {
            if (query[key] !== null && query[key] !== undefined && query[key] !== '') {
                params = params.set(key, query[key].toString());
            }
        });

        return this.http.get<{ data: any[], pagination: any }>(this.apiUrl + "bidang/search", { params })
            .pipe(map((response) => response));
    }

    // ------------------------------ Dat Objek Pajak APIs
    getDatObjekPajakDetail(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, noUrut: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `dat-objek-pajak/detail/${kdProp}/${kdDati2}/${kdKec}/${kdKel}/${noUrut}`)
            .pipe(map((response) => {
                // Return the full response object, not just data
                return response;
            }));
    }

    getDatObjekPajakById(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, kdBlok: string, noUrut: string, kdJnsOp: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `dat-objek-pajak/${kdProp}/${kdDati2}/${kdKec}/${kdKel}/${kdBlok}/${noUrut}/${kdJnsOp}`)
            .pipe(map((response) => response));
    }

    getDatSubjekPajakById(subjekPajakId: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `dat-subjek-pajak/${subjekPajakId}`)
            .pipe(map((response) => response.data || response));
    }

    // ------------------------------ Bidang with Count APIs
    getKecamatanWithCount(kdProp: string, kdDati2: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `bidang/kecamatan-with-count/${kdProp}/${kdDati2}`)
            .pipe(map((response) => response.data || response));
    }

    getKelurahanWithCount(kdProp: string, kdDati2: string, kdKec: string): Observable<any> {
        return this.http.get<any>(this.apiUrl + `bidang/kelurahan-with-count/${kdProp}/${kdDati2}/${kdKec}`)
            .pipe(map((response) => response.data || response));
    }

    getTotalBidangCount(): Observable<any> {
        return this.http.get<any>(this.apiUrl + `bidang/total-count`)
            .pipe(map((response) => response.totalBidang || 0));
    }

}
