import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, take } from 'rxjs/operators';
import { selectTranslationState } from 'src/app/store/translation/translation.selector';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class TranslationSyncService {
  constructor(private translate: TranslateService, private store: Store, private cookieService: CookieService) {
    this.syncRemoteTranslations();
  }

  public syncRemoteTranslations() {
    this.store.pipe(
      select(selectTranslationState),
      filter(translations => !!translations), // Ensure translations exist
      distinctUntilChanged(),
      take(1)
    ).subscribe(translations => {
      const currentLang = this.cookieService.get('lang') || this.translate.currentLang;     
      const remoteTranslations = translations?.remoteTranslations?.fsb?.[currentLang] || {};

      if (Object.keys(remoteTranslations).length > 0) {
        this.translate.setTranslation(currentLang, remoteTranslations, true);
      } else {
        console.warn(`No translations found for language: ${currentLang}`);
      }
    });
  }
  
}
