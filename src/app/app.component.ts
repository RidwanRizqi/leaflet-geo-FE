import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { MENU } from './layouts/sidebar/menu';
import { setMenu } from './store/menu/menu.action';
import { firstValueFrom } from 'rxjs';
import { RestApiService } from './core/services/rest-api.service';
import { TranslationSyncService } from './core/services/translation-sync.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private store: Store, private restApiService: RestApiService, private translationSync: TranslationSyncService) {}

  async ngOnInit() {
    // No longer using remote apps from window object
    // Instead, we'll just use the local menu

    // const menusData = await firstValueFrom(this.restApiService.getSidebarMenu({ application_id: null, sort: 'order asc' }));

    // Dispatch the action to update the NgRx store
    this.store.dispatch(setMenu({
      menuItems: MENU
    }));
  }
}
