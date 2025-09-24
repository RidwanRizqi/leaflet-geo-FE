import { Component, OnInit, Output, EventEmitter, TemplateRef, ViewChild } from '@angular/core';
import { EventService } from '../../core/services/event.service';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { RootReducerState } from 'src/app/store';
import { Store } from '@ngrx/store';
import { initialState } from 'src/app/store/layouts/layout-reducer';
import { getLayoutMode, getLayoutPosition, getLayoutTheme, getLayoutWith, getPreloader, getSidebarColor, getSidebarImage, getSidebarSize, getSidebarView, getSidebarVisibilitye, getTopbarColor } from 'src/app/store/layouts/layout-selector';
import { changeDataPreloader, changeLayoutPosition, changeLayoutWidth, changeMode, changeSidebarColor, changeSidebarImage, changeSidebarSize, changeSidebarView, changeSidebarVisibility, changeTopbar, changelayout } from 'src/app/store/layouts/layout-action';

@Component({
  selector: 'app-rightsidebar',
  templateUrl: './rightsidebar.component.html',
  styleUrls: ['./rightsidebar.component.scss']
})

/**
 * Right Sidebar component
 */
export class RightsidebarComponent implements OnInit {

  layout: string | undefined;
  mode: string | undefined;
  width: string | undefined;
  position: string | undefined;
  topbar: string | undefined;
  size: string | undefined;
  sidebarView: string | undefined;
  sidebar: string | undefined;
  attribute: any;
  sidebarImage: any;
  sidebarVisibility: any;
  preLoader: any;
  grd: any;
  primaryColor: string | undefined;

  @ViewChild('filtetcontent') filtetcontent!: TemplateRef<any>;
  @Output() settingsButtonClicked = new EventEmitter();

  constructor(private eventService: EventService, private offcanvasService: NgbOffcanvas, private store: Store<RootReducerState>) { }

  ngOnInit(): void {
    setTimeout(() => {
      if (this.offcanvasService.hasOpenOffcanvas() == false) {
        // this.openEnd(this.filtetcontent);
      };
    }, 1000);

    this.store.select('layout').subscribe((data) => {
      this.layout = data.LAYOUT;
      this.mode = data.LAYOUT_MODE;
      this.width = data.LAYOUT_WIDTH;
      this.position = data.LAYOUT_POSITION;
      this.topbar = data.TOPBAR;
      this.size = data.SIDEBAR_SIZE;
      this.sidebarView = data.SIDEBAR_VIEW;
      this.sidebar = data.SIDEBAR_COLOR;
      this.sidebarImage = data.SIDEBAR_IMAGE;
      this.preLoader = data.DATA_PRELOADER;
      this.sidebarVisibility = data.SIDEBAR_VISIBILITY
      this.primaryColor = 'indigo'; // Default primary color
    })
  }

  ngAfterViewInit() { }

  /**
   * Change the layout onclick
   * @param layout Change the layout
   */
  changeLayout(layout: string) {
    this.attribute = layout;
    this.store.dispatch(changelayout({ layout }));
    this.store.select(getLayoutTheme).subscribe((layout) => {
      document.documentElement.setAttribute('data-layout', layout)
    })
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }


  // Add Active Class
  addActive(grdSidebar: any) {
    this.grd = grdSidebar;
    document.documentElement.setAttribute('data-sidebar', grdSidebar)
    document.getElementById('collapseBgGradient')?.classList.toggle('show');
    document.getElementById('collapseBgGradient1')?.classList.add('active');
  }

  // Remove Active Class
  removeActive() {
    this.grd = '';
    document.getElementById('collapseBgGradient1')?.classList.remove('active');
    document.getElementById('collapseBgGradient')?.classList.remove('show');
  }

  // When the user clicks on the button, scroll to the top of the document
  topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  //  Filter Offcanvas Set
  openEnd(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { position: 'end' });

    setTimeout(() => {
      this.attribute = document.documentElement.getAttribute('data-layout')
      if (this.attribute == 'vertical') {
        var vertical = document.getElementById('customizer-layout01') as HTMLInputElement;
        if (vertical != null) {
          vertical.setAttribute('checked', 'true');
        }
      }
      if (this.attribute == 'horizontal') {
        const horizontal = document.getElementById('customizer-layout02');
        if (horizontal != null) {
          horizontal.setAttribute('checked', 'true');
        }
      }
      if (this.attribute == 'twocolumn') {
        const Twocolumn = document.getElementById('customizer-layout03');
        if (Twocolumn != null) {
          Twocolumn.setAttribute('checked', 'true');
        }
      }
      if (this.attribute == 'semibox') {
        const Twocolumn = document.getElementById('customizer-layout04');
        if (Twocolumn != null) {
          Twocolumn.setAttribute('checked', 'true');
        }
      }
    }, 100);
  }


  // Mode Change
  changeLayoutMode(mode: string) {
    this.mode = mode;
    this.store.dispatch(changeMode({ mode }));
    this.store.select(getLayoutMode).subscribe((mode) => {
      document.documentElement.setAttribute('data-bs-theme', mode)
    })
    // document.documentElement.setAttribute('data-bs-theme', mode)
  }

  // Visibility Change
  changeVisibility(sidebarvisibility: string) {
    this.sidebarVisibility = sidebarvisibility;
    this.store.dispatch(changeSidebarVisibility({ sidebarvisibility }));
    this.store.select(getSidebarVisibilitye).subscribe((visibility) => {
      document.documentElement.setAttribute('data-sidebar-visibility', visibility)
    })
  }

  // Width Change
  changeWidth(layoutWidth: string, size: string) {
    this.width = layoutWidth;
    this.store.dispatch(changeLayoutWidth({ layoutWidth }));
    this.store.select(getLayoutWith).subscribe((width) => {
      document.documentElement.setAttribute('data-layout-width', width)
      document.documentElement.setAttribute('data-sidebar-size', size)
    })

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  // Position Change
  changePosition(layoutPosition: string) {
    this.position = layoutPosition;
    this.store.dispatch(changeLayoutPosition({ layoutPosition }));
    this.store.select(getLayoutPosition).subscribe((position) => {
      document.documentElement.setAttribute('data-layout-position', position);
    })

  }

  // Topbar Change
  changeTopColor(topbarColor: string) {
    this.topbar = topbarColor;
    this.store.dispatch(changeTopbar({ topbarColor }));
    this.store.select(getTopbarColor).subscribe((color) => {
      document.documentElement.setAttribute('data-topbar', color)
    })
  }

  // Sidebar Size Change
  changeSidebarSize(sidebarSize: string) {
    this.size = sidebarSize;
    this.store.dispatch(changeSidebarSize({ sidebarSize }));
    this.store.select(getSidebarSize).subscribe((size) => {
      document.documentElement.setAttribute('data-sidebar-size', size)
    })
  }

  // Sidebar Size Change
  changeSidebar(sidebarView: string) {
    this.sidebarView = sidebarView;
    this.store.dispatch(changeSidebarView({ sidebarView }));
    this.store.select(getSidebarView).subscribe((view) => {
      document.documentElement.setAttribute('data-layout-style', view);
    })
  }

  // Sidebar Color Change
  changeSidebarColor(sidebarColor: string) {
    this.sidebar = sidebarColor;
    this.store.dispatch(changeSidebarColor({ sidebarColor }));
    this.store.select(getSidebarColor).subscribe((color) => {
      document.documentElement.setAttribute('data-sidebar', color);
    })
  }

  // Sidebar Image Change
  changeSidebarImage(sidebarImage: string) {
    this.sidebarImage = sidebarImage;
    this.store.dispatch(changeSidebarImage({ sidebarImage }));
    this.store.select(getSidebarImage).subscribe((image) => {
      document.documentElement.setAttribute('data-sidebar-image', image);
    })
  }

  // PreLoader Image Change
  changeLoader(Preloader: string) {
    this.preLoader = Preloader;
    this.store.dispatch(changeDataPreloader({ Preloader }));
    this.store.select(getPreloader).subscribe((loader) => {
      document.documentElement.setAttribute('data-preloader', loader);
    })

    var preloader = document.getElementById("preloader");
    if (preloader) {
      setTimeout(function () {
        (document.getElementById("preloader") as HTMLElement).style.opacity = "0";
        (document.getElementById("preloader") as HTMLElement).style.visibility = "hidden";
      }, 1000);
    }
  }

  // Primary Color Change
  changePrimaryColor(color: string) {
    this.primaryColor = color;

    // Color mapping from color names to hex values
    const colorMap: { [key: string]: string } = {
      'blue': '#3577f1',
      'indigo': '#009a8c',
      'purple': '#6559cc',
      'pink': '#f672a7',
      'red': '#f06548',
      'orange': '#f1963b',
      'yellow': '#f7b84b',
      'green': '#0ab39c',
      'teal': '#02a8b5',
      'cyan': '#299cdb'
    };

    // Update CSS custom property for primary color
    const hexColor = colorMap[color] || colorMap['indigo'];
    document.documentElement.style.setProperty('--vz-primary', hexColor);
    document.documentElement.style.setProperty('--vz-primary-rgb', this.hexToRgb(hexColor));

    // Update other primary color variants
    document.documentElement.style.setProperty('--vz-primary-text-emphasis', this.shadeColor(hexColor, 15));
    document.documentElement.style.setProperty('--vz-primary-bg-subtle', this.tintColor(hexColor, 85));
    document.documentElement.style.setProperty('--vz-primary-border-subtle', this.tintColor(hexColor, 60));

    // Set data attribute for potential CSS-based styling
    document.documentElement.setAttribute('data-primary-color', color);
  }

  // Helper function to convert hex to RGB
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
      '0, 154, 140'; // fallback indigo RGB
  }

  // Helper function to create tinted color (lighter)
  private tintColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // Helper function to create shaded color (darker)
  private shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

}
