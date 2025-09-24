import { Component, OnInit } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service'
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-alt',
  templateUrl: './alt.component.html',
  styleUrls: ['./alt.component.scss']
})

/**
 * 404 Alt Component
 */
export class AltComponent implements OnInit {
  LANG: any | undefined;

  constructor(
    public translate: TranslateService, 
    public languageService: LanguageService, 
    private router: Router, 
    private route: ActivatedRoute,
    private modalService: NgbModal
  ) { 
    this.route.queryParams.subscribe(params => {
      const errorCode = params['q'];
      console.log('Error Code:', errorCode);

      if (errorCode && errorCode === '401') {
        this.translate
        .get(["PAGES.ERROR.UNAUTHORIZED", "COMMON"])
        .subscribe((lang: any) => {
            let obj = {
                PAGE: lang["PAGES.ERROR.UNAUTHORIZED"],
                COMMON: lang.COMMON,
            };
            
            this.LANG = obj;
        });
      } else if (errorCode && errorCode === '403') {
        this.translate
        .get(["PAGES.ERROR.FORBIDDEN", "COMMON"])
        .subscribe((lang: any) => {
            let obj = {
                PAGE: lang["PAGES.ERROR.FORBIDDEN"],
                COMMON: lang.COMMON,
            };
            
            this.LANG = obj;
        });
      } else {
        // 404
        this.translate
        .get(["PAGES.ERROR.NOTFOUND", "COMMON"])
        .subscribe((lang: any) => {
            let obj = {
                PAGE: lang["PAGES.ERROR.NOTFOUND"],
                COMMON: lang.COMMON,
            };
            
            this.LANG = obj;
        });
      }
    });
   }

  ngOnInit(): void {
    // Close all modal when the page opened
    this.modalService.dismissAll();
   }

  navigate() {
    const currentLocation = window.location.href; // Save current location
    const historyLength = window.history.length;

    if (historyLength > 2) {
        history.go(-2);

        setTimeout(() => {
            // Check if the location has changed
            if (window.location.href === currentLocation) {
                console.warn('History navigation failed: No change in location.');
            } else {
                console.log('History navigation successful.');
            }
        }, 100); // Small delay to allow time for the navigation
    } else {
        console.warn('Not enough history entries to go back 2 steps.');
        this.router.navigate(['/']);
    }
}


}
