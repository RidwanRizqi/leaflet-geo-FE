import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';

import { TemplateFormComponent } from './template-form.component';
import { TemplateEntityService } from '../../../services/template-entity.service';
import { UtilitiesService } from '../../../../../shared/services/utilities.service';
import { ITemplateEntity, TemplateEntityStatus } from '../../../models/template-entity.model';

describe('TemplateFormComponent', () => {
  let component: TemplateFormComponent;
  let fixture: ComponentFixture<TemplateFormComponent>;
  let mockTemplateEntityService: jasmine.SpyObj<TemplateEntityService>;
  let mockUtilitiesService: jasmine.SpyObj<UtilitiesService>;
  let mockActiveModal: jasmine.SpyObj<NgbActiveModal>;

  const mockEntity: ITemplateEntity = {
    id: 1,
    name: 'Test Entity',
    description: 'Test Description',
    status: TemplateEntityStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    createdBy: 'test@example.com',
    updatedBy: 'test@example.com'
  };

  beforeEach(async () => {
    const templateEntityServiceSpy = jasmine.createSpyObj('TemplateEntityService', [
      'createTemplateEntity',
      'updateTemplateEntity'
    ]);

    const utilitiesServiceSpy = jasmine.createSpyObj('UtilitiesService', [
      'showToast'
    ]);

    const activeModalSpy = jasmine.createSpyObj('NgbActiveModal', [
      'close',
      'dismiss'
    ]);

    await TestBed.configureTestingModule({
      declarations: [TemplateFormComponent],
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: TemplateEntityService, useValue: templateEntityServiceSpy },
        { provide: UtilitiesService, useValue: utilitiesServiceSpy },
        { provide: NgbActiveModal, useValue: activeModalSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateFormComponent);
    component = fixture.componentInstance;
    mockTemplateEntityService = TestBed.inject(TemplateEntityService) as jasmine.SpyObj<TemplateEntityService>;
    mockUtilitiesService = TestBed.inject(UtilitiesService) as jasmine.SpyObj<UtilitiesService>;
    mockActiveModal = TestBed.inject(NgbActiveModal) as jasmine.SpyObj<NgbActiveModal>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values for create mode', () => {
    component.mode = 'create';
    component.ngOnInit();

    expect(component.form.get('name')?.value).toBe('');
    expect(component.form.get('description')?.value).toBe('');
    expect(component.form.get('status')?.value).toBe(TemplateEntityStatus.ACTIVE);
  });

  it('should populate form with entity data for edit mode', () => {
    component.mode = 'edit';
    component.entity = mockEntity;
    component.ngOnInit();

    expect(component.form.get('name')?.value).toBe(mockEntity.name);
    expect(component.form.get('description')?.value).toBe(mockEntity.description);
    expect(component.form.get('status')?.value).toBe(mockEntity.status);
  });

  it('should validate required fields', () => {
    component.ngOnInit();

    const nameControl = component.form.get('name');
    nameControl?.setValue('');
    nameControl?.markAsTouched();

    expect(component.isFieldInvalid('name')).toBeTruthy();
    expect(component.getFieldError('name')).toContain('required');
  });

  it('should create entity successfully', () => {
    component.mode = 'create';
    component.ngOnInit();

    const newEntity = { ...mockEntity, id: 2 };
    mockTemplateEntityService.createTemplateEntity.and.returnValue(of(newEntity));

    component.form.patchValue({
      name: 'New Entity',
      description: 'New Description',
      status: TemplateEntityStatus.ACTIVE
    });

    component.onSubmit();

    expect(mockTemplateEntityService.createTemplateEntity).toHaveBeenCalled();
    expect(mockActiveModal.close).toHaveBeenCalledWith(newEntity);
  });

  it('should update entity successfully', () => {
    component.mode = 'edit';
    component.entity = mockEntity;
    component.ngOnInit();

    const updatedEntity = { ...mockEntity, name: 'Updated Entity' };
    mockTemplateEntityService.updateTemplateEntity.and.returnValue(of(updatedEntity));

    component.form.patchValue({
      name: 'Updated Entity'
    });

    component.onSubmit();

    expect(mockTemplateEntityService.updateTemplateEntity).toHaveBeenCalledWith(
      mockEntity.id,
      jasmine.objectContaining({ name: 'Updated Entity' })
    );
    expect(mockActiveModal.close).toHaveBeenCalledWith(updatedEntity);
  });

  it('should handle create error', () => {
    component.mode = 'create';
    component.ngOnInit();

    const error = new Error('Create failed');
    mockTemplateEntityService.createTemplateEntity.and.returnValue(throwError(() => error));

    component.form.patchValue({
      name: 'New Entity',
      description: 'New Description',
      status: TemplateEntityStatus.ACTIVE
    });

    component.onSubmit();

    expect(component.formState.isLoading).toBeFalsy();
    expect(mockActiveModal.close).not.toHaveBeenCalled();
  });

  it('should cancel and dismiss modal', () => {
    component.onCancel();

    expect(mockActiveModal.dismiss).toHaveBeenCalled();
  });

  it('should reset form', () => {
    component.mode = 'create';
    component.ngOnInit();

    component.form.patchValue({
      name: 'Test',
      description: 'Test Description'
    });

    component.onReset();

    expect(component.form.get('name')?.value).toBe('');
    expect(component.form.get('description')?.value).toBe('');
    expect(component.form.get('status')?.value).toBe(TemplateEntityStatus.ACTIVE);
  });
});
