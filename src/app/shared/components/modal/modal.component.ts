import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  @Input() type: string = 'error';
  @Input() message: string = '';
  constructor(public activeModal: NgbActiveModal) {}

  // Returns the correct Lord Icon source
  getIconSource(type: string): string | null {
    const icons: Record<string, string> = {
      error: './assets/images/tdrtiskw.json',
      success: './assets/images/lupuorrc.json',
      warning: './assets/images/425-exclamation-mark-bubble.json',
      nodata: './assets/images/no-icons-to-show.json',
      confirm: './assets/images/424-question-bubble.json',
      delete: './assets/images/gsqxdxog.json',
    };
    return icons[type] || null;
  }

  // Returns the correct colors for Lord Icons
  getIconColors(type: string): string {
    return type === 'nodata'
      ? 'primary:#405189,secondary:#0ab39c'
      : type === 'delete'
      ? 'primary:#405189,secondary:#f06548'
      : 'primary:#0ab39c,secondary:#405189';
  }

  // Returns the correct inline styles for Lord Icons
  getIconStyle(type: string): object {
    return type === 'nodata'
      ? { width: '100%', height: 'auto', maxWidth: '600px', aspectRatio: '3/2' }
      : { width: '120px', height: '120px' };
  }

  // Returns the title based on type
  getTitle(type: string): string {
    const titles: Record<string, string> = {
      error: 'COMMON.CUSTOMMODAL.ERRORTEXT',
      success: 'COMMON.CUSTOMMODAL.SUCCESSTEXT',
      warning: 'COMMON.CUSTOMMODAL.WARNINGTEXT',
      nodata: 'COMMON.LABEL.NODATA.TEXT',
      confirm: 'COMMON.CUSTOMMODAL.CONFIRMTEXT',
      delete: 'COMMON.CUSTOMMODAL.CONFIRMTEXT',
    };
    return titles[type] || '';
  }

  // Approve function
  approve(isApproved: boolean): void {
    this.activeModal.close(isApproved);
  }
}
