import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalRef: any;
  private lastFocusedElement: HTMLElement | null = null; // Store the last focused element

  constructor(private modalService: NgbModal) {}

  open(
    type: 'success' | 'error' | 'nodata' | 'warning' | 'confirm' | 'delete',
    message: string = '',
    extraData: any = null
  ) {
    this.lastFocusedElement = document.activeElement as HTMLElement; // Store the current focus

    this.modalRef = this.modalService.open(ModalComponent, { centered: true });

    // Set properties
    this.modalRef.componentInstance.type = type;
    this.modalRef.componentInstance.message = message;
    if (extraData) {
      this.modalRef.componentInstance.extraData = extraData;
    }

    return this.modalRef.result;
  }

  private restoreFocus() {
    // Restore focus to the last focused element (e.g., button that opened the modal)
    if (this.lastFocusedElement) {
      setTimeout(() => this.lastFocusedElement?.focus(), 0);
    }
  }

  close() {
    if (this.modalRef) {
      this.restoreFocus(); // Restore focus before closing
      this.modalRef.close();
    }
  }

  dismiss() {
    if (this.modalRef) {
      this.restoreFocus(); // Restore focus before dismissing
      this.modalRef.dismiss();
    }
  }
}
