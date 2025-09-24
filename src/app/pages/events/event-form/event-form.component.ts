import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';

// Models
import { IEvent, ICreateEventRequest } from '../models/event.model';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnInit {
  @Input() event: IEvent | null = null;
  @Input() isEdit: boolean = false;
  @Output() save = new EventEmitter<any>(); // Changed to any to handle FormData
  @Output() cancel = new EventEmitter<void>();

  fg!: FormGroup;
  submitted = false;

  // File upload properties
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  currentImageUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.event && this.isEdit) {
      this.loadEventData();
    }
  }

  private initForm(): void {
    this.fg = this.fb.group({
      event_name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      event_date: ['', [Validators.required]],
      location: ['']
    });
    // Remove event_image from form since we handle file separately
  }

  private loadEventData(): void {
    if (this.event) {
      this.fg.patchValue({
        event_name: this.event.event_name,
        description: this.event.description,
        event_date: this.formatDateForInput(this.event.event_date),
        location: this.event.location
      });

      // Set current image URL for preview
      if (this.event.event_image) {
        // Handle both relative and absolute paths
        if (this.event.event_image.startsWith('http')) {
          this.currentImageUrl = this.event.event_image;
        } else {
          // Remove leading slash if present to avoid double slashes
          const imagePath = this.event.event_image.startsWith('/')
            ? this.event.event_image.substring(1)
            : this.event.event_image;
          this.currentImageUrl = `${environment.apiUrl}${imagePath}`;
        }
        console.log('Event image path:', this.event.event_image);
        console.log('Constructed image URL:', this.currentImageUrl);
      }
    }
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.fg.invalid) {
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('event_name', this.fg.value.event_name);
    formData.append('description', this.fg.value.description || '');
    formData.append('event_date', this.fg.value.event_date);
    formData.append('location', this.fg.value.location || '');
    formData.append('dir', 'events'); // Directory for upload middleware

    // Add file if selected
    if (this.selectedFile) {
      formData.append('event_image', this.selectedFile);
    }

    this.save.emit(formData);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  // Utility methods
  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  }

  // Form validation helpers
  get f() { return this.fg.controls; }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.fg.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}
