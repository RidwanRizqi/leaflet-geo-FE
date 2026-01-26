import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Store } from "@ngrx/store";
import { firstValueFrom, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { setRemoteApps } from "src/app/store/remote-apps/remote-apps.action";
import { selectRemoteAppUrl } from "src/app/store/remote-apps/remote-apps.selector";
import { environment } from "src/environments/environment";
import { RestApiService } from "./rest-api.service";
import { setUser } from "src/app/store/auth/auth.action";
import { setMenu } from "src/app/store/menu/menu.action";
// import { selectRemoteMenus } from "src/app/store/menu/menu.selector";
import { TranslationSyncService } from "./translation-sync.service";

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  constructor(private http: HttpClient, private store: Store, private restApiService: RestApiService, private translationSyncService: TranslationSyncService) {}

  async getConfig(remoteApp: string): Promise<any> {
    console.log('Fetching remote config for:', remoteApp);

    // Get remote app URL from the store
    const remoteData: any = await firstValueFrom(this.store.select(selectRemoteAppUrl(remoteApp)));

    console.log(remoteData);

    if (!remoteData) {
      console.error(`Base URL not found for remote app: ${remoteApp}`);
      return null;
    }

    try {
      const user: any = await firstValueFrom(
        this.restApiService.getLoggedInUser(remoteData.apiUrl + '/api/').pipe(
          catchError(err => {
            console.error(`Error loading config from ${remoteData.apiUrl}/auth/info:`, err);
            return of(null);
          })
        )
      );

      this.store.dispatch(setUser({ user: user.data }));

      // Use local menu instead of remote module
      const menu = {
        MENU: [] // Replace with your local menu structure
      };

      this.translationSyncService.syncRemoteTranslations();
      this.store.dispatch(setMenu({ menuItems: menu.MENU }));

      return true;
    } catch (error) {
      console.error('Error fetching remote config:', error);
      return null;
    }
  }
}
