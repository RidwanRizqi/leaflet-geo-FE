import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// Store
import { Store } from '@ngrx/store';

import { PaginationService } from 'src/app/shared/services/pagination.service';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';

import { ShepherdService } from "angular-shepherd";
import Step from 'shepherd.js/src/types/step';
import { buildTour } from './app-list.tour';
import { ToastService } from 'src/app/shared/services/toast-service';
import { Router } from '@angular/router';
import { ModalService } from 'src/app/shared/services/modal.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-app-list',
  // standalone: true,
  // imports: [],
  templateUrl: './app-list.component.html',
  styleUrl: './app-list.component.scss'
})

/**
 * List Component
 */
export class AppListComponent implements OnInit, OnDestroy {

  // bread crumb items
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{}>;
  projectListWidgets!: any;
  projectmodel!: any;
  sellers?: any;
  searchTerm: any;
  searchResults: any;
  allProjectList: any;

  page: number = 1;
  pageSize: number = 20;
  totalPages: number = 0;
  startIndex: number = 0;
  endIndex: number = 3;
  totalRecords: number = 0;

  private langChangeSubscription!: Subscription;

  constructor(
    private ngModalService: NgbModal,
    public service: PaginationService,
    private store: Store,
    private restApiService: RestApiService,
    public utilitiesService: UtilitiesService,
    public translate: TranslateService,
    private shepherdService: ShepherdService,
    public toastService: ToastService, 
    private router: Router,
    private modalService: ModalService,
    private spinner: NgxSpinnerService,
  ) {
    this.service.page = this.page;
    this.service.pageSize = this.pageSize;

    this.translate.setDefaultLang('en');
    this.langChangeSubscription = this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.initializeComponentData();
      buildTour(this.shepherdService, this.translate);
    });
  }

  async ngOnInit(): Promise<void> {
    this.spinner.show();
    this.initializeComponentData();
    buildTour(this.shepherdService, this.translate);
    await this.fetchData();
    this.toastService.show(`Example usage of toast service`, { classname: 'bg-danger text-center text-white', delay: 3000 });
    this.spinner.hide();
  }

  initializeComponentData() {
    /**
    * BreadCrumb
    */
    this.breadCrumbItems = [
      { label: this.translate.instant('APPPAGE.APPLIST.BREADCRUMB.LABEL1'), active: true }
    ];
    this.breadCrumbTitle =  this.translate.instant('APPPAGE.APPLIST.TITLE'); 
  }

  /**
   * Fetches the data
   */
  private async fetchData() {
    const appListData = await firstValueFrom(this.restApiService.getAppList());
    console.log(appListData);
    this.projectListWidgets = appListData.data.items;
    this.allProjectList = appListData.data;
  }

  /**
  * Confirmation mail model
  */
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.ngModalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    document.getElementById('pl1_' + id)?.remove();
  }

  /**
   * Active Toggle navbar
   */
  activeMenu(id: any) {
    document.querySelector('.heart_icon_' + id)?.classList.toggle('active');
  }

  // Search
  performSearch() {
    this.searchResults = this.allProjectList.filter((item: any) => {
      return (
        item.label.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.projectListWidgets = this.service.changePage(this.searchResults)

  }

  getMoreNamesTimeline(users: any[]): string {
    // Get the names of the users after the first three
    const additionalUsers = users.slice(3);
    
    // Map the array to contain only names, and join them with \n
    return additionalUsers.map(user => user.employee_name).join('\n');
  }

  ngOnDestroy() {
    this.langChangeSubscription.unsubscribe(); // Prevent memory leaks
  }

  async goToEntryPoint(entryPoint: string) {
    try {
      await this.router.navigate([entryPoint]);
    } catch (err) {
      this.modalService.open('error', this.translate.instant('APPPAGE.APPLIST.ERRORMSG.REMOTEFAILED'), { classname: 'bg-danger text-white' });
      console.error('Navigation error:', err);
    }
  }
}
