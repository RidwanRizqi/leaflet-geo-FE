import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';

// Models
import {
  ITemplateEntity,
  ICreateTemplateEntityRequest,
  IUpdateTemplateEntityRequest,
  TemplateEntityStatus,
  ITemplateEntityFormState
} from '../../../models/template-entity.model';

// Services
import { RestApiService } from '../../../../../core/services/rest-api.service';
import { UtilitiesService } from '../../../../../shared/services/utilities.service';

@Component({
  selector: 'app-template-form',
  templateUrl: './template-form.component.html',
  styleUrls: ['./template-form.component.scss']
})
export class TemplateFormComponent implements OnInit, OnDestroy {
  // Input/Output properties
  @Input() entity: ITemplateEntity | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() saved = new EventEmitter<ITemplateEntity>();
  @Output() cancelled = new EventEmitter<void>();

  // Private destroy subject
  private destroy$ = new Subject<void>();

  // Form properties
  form!: FormGroup;
  formState: ITemplateEntityFormState = {
    isLoading: false,
    isEditing: false
  };

  // Options
  statusOptions = Object.values(TemplateEntityStatus);

  constructor(
    private fb: FormBuilder,
    private restApiService: RestApiService,
    private utilities: UtilitiesService,
    public activeModal: NgbActiveModal // For modal usage
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.setupForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      status: [TemplateEntityStatus.ACTIVE, [Validators.required]]
    });
  }

  private setupForm(): void {
    if (this.entity && this.mode === 'edit') {
      this.formState.isEditing = true;
      this.formState.entityId = this.entity.id;

      this.form.patchValue({
        name: this.entity.name,
        description: this.entity.description,
        status: this.entity.status
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.formState.isLoading = true;
    const formValue = this.form.value;

    if (this.mode === 'create') {
      this.createEntity(formValue);
    } else {
      this.updateEntity(formValue);
    }
  }

  private createEntity(data: ICreateTemplateEntityRequest): void {
    // TODO: Add createTemplateEntity method to RestApiService
    // Follow pattern: restApiService.createGroup(data)
    this.restApiService.createTemplateEntity(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entity: any) => {
          this.formState.isLoading = false;
          console.log('Entity created successfully');
          this.saved.emit(entity);
          this.activeModal.close(entity);
        },
        error: (error: any) => {
          this.formState.isLoading = false;
          console.error('Failed to create entity:', error.message);
        }
      });
  }

  private updateEntity(data: IUpdateTemplateEntityRequest): void {
    if (!this.formState.entityId) {
      return;
    }

    // TODO: Add updateTemplateEntity method to RestApiService
    // Follow pattern: restApiService.updateGroup(id, data)
    this.restApiService.updateTemplateEntity(this.formState.entityId, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entity: any) => {
          this.formState.isLoading = false;
          console.log('Entity updated successfully');
          this.saved.emit(entity);
          this.activeModal.close(entity);
        },
        error: (error: any) => {
          this.formState.isLoading = false;
          console.error('Failed to update entity:', error.message);
        }
      });
  }

  onCancel(): void {
    this.cancelled.emit();
    this.activeModal.dismiss();
  }

  onReset(): void {
    if (this.mode === 'create') {
      this.form.reset({
        status: TemplateEntityStatus.ACTIVE
      });
    } else {
      this.setupForm();
    }
  }

  // Form validation helpers
  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);

    if (field?.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
    }

    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      description: 'Description',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  // Getters for template
  get isCreateMode(): boolean {
    return this.mode === 'create';
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get modalTitle(): string {
    return this.isCreateMode ? 'Create New Entity' : 'Edit Entity';
  }

  get submitButtonText(): string {
    if (this.formState.isLoading) {
      return this.isCreateMode ? 'Creating...' : 'Updating...';
    }
    return this.isCreateMode ? 'Create' : 'Update';
  }
}
