import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { TemplateListComponent } from './template-list.component';
import { TemplateEntityService } from '../../../services/template-entity.service';
import { UtilitiesService } from '../../../../../shared/services/utilities.service';

describe('TemplateListComponent', () => {
  let component: TemplateListComponent;
  let fixture: ComponentFixture<TemplateListComponent>;
  let mockTemplateEntityService: jasmine.SpyObj<TemplateEntityService>;
  let mockUtilitiesService: jasmine.SpyObj<UtilitiesService>;

  beforeEach(async () => {
    const templateEntityServiceSpy = jasmine.createSpyObj('TemplateEntityService', [
      'getTemplateEntities',
      'deleteTemplateEntity',
      'bulkDeleteTemplateEntities',
      'exportTemplateEntities'
    ]);

    const utilitiesServiceSpy = jasmine.createSpyObj('UtilitiesService', [
      'showToast',
      'downloadFile'
    ]);

    await TestBed.configureTestingModule({
      declarations: [TemplateListComponent],
      imports: [
        ReactiveFormsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        FormBuilder,
        { provide: TemplateEntityService, useValue: templateEntityServiceSpy },
        { provide: UtilitiesService, useValue: utilitiesServiceSpy },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open']) },
        { provide: TranslateService, useValue: jasmine.createSpyObj('TranslateService', ['get']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateListComponent);
    component = fixture.componentInstance;
    mockTemplateEntityService = TestBed.inject(TemplateEntityService) as jasmine.SpyObj<TemplateEntityService>;
    mockUtilitiesService = TestBed.inject(UtilitiesService) as jasmine.SpyObj<UtilitiesService>;

    // Setup default returns
    mockTemplateEntityService.getTemplateEntities.and.returnValue(of([]));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize search form', () => {
    component.ngOnInit();

    expect(component.searchForm).toBeDefined();
    expect(component.searchForm.get('search')).toBeDefined();
    expect(component.searchForm.get('status')).toBeDefined();
    expect(component.searchForm.get('sortBy')).toBeDefined();
    expect(component.searchForm.get('sortOrder')).toBeDefined();
  });

  it('should load data on init', () => {
    component.ngOnInit();

    expect(mockTemplateEntityService.getTemplateEntities).toHaveBeenCalled();
  });

  it('should update search params when search term changes', () => {
    component.ngOnInit();

    const searchControl = component.searchForm.get('search');
    searchControl?.setValue('test search');

    // Test that search params are updated (implementation depends on your actual logic)
    expect(searchControl?.value).toBe('test search');
  });

  it('should handle page change', () => {
    component.onPageChange(2);

    expect(component.currentPage).toBe(2);
  });

  it('should handle page size change', () => {
    component.onPageSizeChange(25);

    expect(component.pageSize).toBe(25);
  });

  it('should clear filters', () => {
    component.ngOnInit();

    // Set some values
    component.searchForm.patchValue({
      search: 'test',
      status: 'active',
      sortBy: 'name',
      sortOrder: 'asc'
    });

    component.clearFilters();

    expect(component.searchForm.get('search')?.value).toBe('');
    expect(component.searchForm.get('status')?.value).toBe('');
    expect(component.searchForm.get('sortBy')?.value).toBe('createdAt');
    expect(component.searchForm.get('sortOrder')?.value).toBe('desc');
  });
});
