import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

// Models
import { IEvent, ICreateEventRequest } from '../../models/event.model';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnInit {
  @Input() event: IEvent | null = null;
  @Input() isEdit: boolean = false;
  @Output() save = new EventEmitter<ICreateEventRequest>();
  @Output() cancel = new EventEmitter<void>();

  fg!: FormGroup;
  submitted = false;

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
      event_image: [''],
      event_date: ['', [Validators.required]],
      location: [''],
      status: ['active', [Validators.required]]
    });
  }

  private loadEventData(): void {
    if (this.event) {
      this.fg.patchValue({
        event_name: this.event.event_name,
        description: this.event.description,
        event_image: this.event.event_image,
        event_date: this.formatDateForInput(this.event.event_date),
        location: this.event.location,
        status: this.event.status
      });
    }
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.fg.invalid) {
      return;
    }

    const formData: ICreateEventRequest = this.fg.value;
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
