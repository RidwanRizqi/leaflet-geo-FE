import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';
import { setUser } from 'src/app/store/auth/auth.action';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  userData: any = null;
  userPhoto: string | null = null;
  previewPhoto: string | null = null;
  savedSuccess: boolean = false;

  // Nomor WA Admin (format internasional, bisa disesuaikan)
  adminWhatsappNumber: string = '6282144851960';
  adminWhatsappMessage: string = 'Halo Admin, saya ingin menanyakan bantuan terkait aplikasi "Si Pintar Pajak".';

  constructor(
    private store: Store,
    public utilitiesService: UtilitiesService
  ) {}

  ngOnInit(): void {
    // Muat data user aktif dari store
    this.store.select(selectCurrentUser).subscribe((user: any) => {
      if (user) {
        this.userData = { ...user };
        // Prioritaskan photo dari localStorage jika pernah disimpan
        const cachedPhoto = localStorage.getItem('user_profile_custom_photo_' + (user.username || user.nama || 'default'));
        this.userPhoto = cachedPhoto || user.photo || null;
      }
    });
  }

  get displayName(): string {
    return this.userData?.nama || this.userData?.name || this.userData?.username || 'User';
  }

  get userRole(): string {
    return (this.userData?.role || this.userData?.roles_name || 'USER').toUpperCase();
  }

  get userInitials(): string {
    return this.utilitiesService.getInitials(this.displayName);
  }

  get avatarClass(): string {
    return this.utilitiesService.getAvatarClass(this.userInitials);
  }

  /**
   * Event saat user memilih foto baru dari galeri/kamera
   */
  onPhotoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/*/)) {
      alert('Format file harus berupa gambar (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran foto profil maksimal 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewPhoto = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  /**
   * Simpan foto baru ke session/localStorage dan update store
   */
  saveProfilePhoto(): void {
    if (!this.previewPhoto) return;

    this.userPhoto = this.previewPhoto;
    this.previewPhoto = null;

    // Simpan ke local storage
    const storageKey = 'user_profile_custom_photo_' + (this.userData.username || this.userData.nama || 'default');
    localStorage.setItem(storageKey, this.userPhoto);

    // Update state store
    const updatedUser = {
      ...this.userData,
      photo: this.userPhoto
    };
    this.store.dispatch(setUser({ user: updatedUser }));

    this.savedSuccess = true;
    setTimeout(() => {
      this.savedSuccess = false;
    }, 3000);
  }

  /**
   * Batalkan perubahan foto preview
   */
  cancelPreview(): void {
    this.previewPhoto = null;
  }

  /**
   * Reset foto ke avatar default inisial
   */
  resetToDefaultAvatar(): void {
    if (!confirm('Kembalikan foto profil ke avatar default?')) return;

    this.userPhoto = null;
    this.previewPhoto = null;

    const storageKey = 'user_profile_custom_photo_' + (this.userData?.username || this.userData?.nama || 'default');
    localStorage.removeItem(storageKey);

    const updatedUser = {
      ...this.userData,
      photo: null
    };
    this.store.dispatch(setUser({ user: updatedUser }));

    this.savedSuccess = true;
    setTimeout(() => {
      this.savedSuccess = false;
    }, 3000);
  }

  /**
   * Buka WhatsApp langsung ke Admin
   */
  contactAdminWhatsapp(): void {
    const text = encodeURIComponent(
      `Halo Admin GIS PBJT, saya ${this.displayName} (Role: ${this.userRole}). ${this.adminWhatsappMessage}`
    );
    const waUrl = `https://wa.me/${this.adminWhatsappNumber}?text=${text}`;
    window.open(waUrl, '_blank');
  }
}
