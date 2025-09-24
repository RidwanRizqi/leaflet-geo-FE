import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { ModalService } from 'src/app/shared/services/modal.service';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';
import { ORGANIZATION_DATA, OrganizationNode, transformApiData, cleanOrganizationData, ApiOrganizationNode } from './organization-data';
import * as d3 from 'd3';
import { OrgChart } from 'd3-org-chart';

@Component({
  selector: 'app-organization',
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class OrganizationComponent implements OnInit, AfterViewInit {
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{}>;
  private langChangeSubscription!: Subscription;
  private chart: any;
  private layoutIndex = 0;
  private compactMode = true;
  private centerActiveMode = false;
  private organizationData: any[] = [];
  public isLoading = false;
  private subSectionColors: { [key: string]: string } = {};
  private lineColors: { [key: string]: string } = {};
  public subSectionData: any[] = [];
  public showControlButtons = true;
  private highlightedNodeId: string | null = null;
  public breadcrumbPath: any[] = [];

  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  constructor(
    private ngModalService: NgbModal,
    private store: Store,
    private restApiService: RestApiService,
    public utilitiesService: UtilitiesService,
    private modalService: ModalService,
    public translate: TranslateService
  ) {
    this.langChangeSubscription = this.translate.onLangChange.subscribe(
      (event) => {
        this.initializeTranslate();
      }
    );
  }

  async ngOnInit(): Promise<void> {
    this.initializeTranslate();
    await this.loadSubSectionData();
    await this.loadOrganizationData();
  }

    private async loadSubSectionData(): Promise<void> {
    try {
      console.log('Loading sub section data...');
      const subSectionResponse = await firstValueFrom(
        this.restApiService.getMstSubSection()
      );

      console.log('Raw sub section response:', subSectionResponse);

      // Extract subsections from nested data structure
      this.subSectionData = subSectionResponse?.subsections || [];
      this.generateSubSectionColors();

      console.log('Sub section data loaded:', this.subSectionData);
      console.log('Sub section colors generated:', this.subSectionColors);
    } catch (error) {
      console.error('Error loading sub section data:', error);
      this.subSectionData = [];
    }
  }

  private generateSubSectionColors(): void {
    const colorPalette = [
      '#2196F3', // Blue
      '#4CAF50', // Green
      '#9C27B0', // Purple
      '#FF9800', // Orange
      '#E91E63', // Pink
      '#009688', // Teal
      '#3F51B5', // Indigo
      '#795548', // Brown
      '#607D8B', // Blue Grey
      '#FF5722', // Deep Orange
      '#8BC34A', // Light Green
      '#FFC107', // Amber
      '#673AB7', // Deep Purple
      '#00BCD4', // Cyan
      '#CDDC39', // Lime
      '#F44336', // Red
      '#FF5722', // Deep Orange
      '#8BC34A', // Light Green
      '#FFC107', // Amber
      '#673AB7'  // Deep Purple
    ];

    this.subSectionData.forEach((subSection, index) => {
      const colorIndex = index % colorPalette.length;
      this.subSectionColors[subSection.name] = colorPalette[colorIndex];
    });

    this.subSectionColors['default'] = '#E4E2E9';
  }

  private generateLineColors(): void {
    const lineColorPalette = [
      { primary: '#FF6B35', secondary: '#F7931E' }, // Orange
      { primary: '#6A4C93', secondary: '#8E44AD' }, // Purple
      { primary: '#00B4D8', secondary: '#0077B6' }, // Blue
      { primary: '#E74C3C', secondary: '#C0392B' }, // Red
      { primary: '#27AE60', secondary: '#2ECC71' }, // Green
      { primary: '#F39C12', secondary: '#E67E22' }, // Amber
      { primary: '#9B59B6', secondary: '#8E44AD' }, // Violet
      { primary: '#1ABC9C', secondary: '#16A085' }, // Turquoise
      { primary: '#E67E22', secondary: '#D35400' }, // Carrot
      { primary: '#34495E', secondary: '#2C3E50' }, // Dark Blue
      { primary: '#E91E63', secondary: '#AD1457' }, // Pink
      { primary: '#607D8B', secondary: '#455A64' }, // Blue Grey
      { primary: '#795548', secondary: '#5D4037' }, // Brown
      { primary: '#FF5722', secondary: '#D84315' }, // Deep Orange
      { primary: '#009688', secondary: '#00695C' }, // Teal
      { primary: '#3F51B5', secondary: '#303F9F' }, // Indigo
      { primary: '#8BC34A', secondary: '#689F38' }, // Light Green
      { primary: '#CDDC39', secondary: '#AFB42B' }, // Lime
      { primary: '#FFC107', secondary: '#FF8F00' }, // Amber
      { primary: '#FF9800', secondary: '#E65100' }  // Orange
    ];

    // Get unique lines from organization data
    const uniqueLines = new Set<string>();
    this.organizationData.forEach(node => {
      const lineName = node.line?.name || node.line;
      if (lineName && lineName !== 'null') {
        uniqueLines.add(lineName);
      }
    });

    // Assign colors to each unique line
    Array.from(uniqueLines).forEach((lineName, index) => {
      const colorIndex = index % lineColorPalette.length;
      this.lineColors[lineName] = `linear-gradient(135deg, ${lineColorPalette[colorIndex].primary} 0%, ${lineColorPalette[colorIndex].secondary} 100%)`;
    });

    console.log('Line colors generated:', this.lineColors);
  }

  private async loadOrganizationData(): Promise<void> {
    this.isLoading = true;
    try {
      // Fetch data from API using rest-api service directly
      const apiData = await firstValueFrom(
        this.restApiService.getStructureOrganization()
      );

      console.log('API Response:', apiData);
      console.log('API Response structure:', apiData?.structure);
      console.log('API Response structure length:', apiData?.structure?.length);

      if (apiData && apiData.structure) {
        // Data is already in correct format, just clean it for invalid parent references
        let cleanedData = cleanOrganizationData(apiData.structure);

        // Sort data by group.id to ensure consistent order (smaller group.id on the left)
        cleanedData = this.sortDataByGroup(cleanedData);

        this.organizationData = cleanedData;
        console.log('Cleaned and sorted data:', this.organizationData);
        console.log('Cleaned data length:', this.organizationData.length);

        // Generate line colors after data is loaded
        this.generateLineColors();

        // Validate data structure
        this.validateOrganizationData(this.organizationData);
      } else {
        console.warn('No structure data found in API response, using fallback data');
        this.organizationData = ORGANIZATION_DATA;
      }
    } catch (error: any) {
      console.error('Error loading organization data:', error);
      const errorMessage = this.translate.instant(
        `COMMON.ERRORMSG.${error.status || 'DEFAULT'}`
      );
      this.modalService.open('error', errorMessage);

      // Use fallback data on error
      this.organizationData = ORGANIZATION_DATA;
      this.generateLineColors();
    } finally {
      this.isLoading = false;
    }
  }

  private sortDataByGroup(data: any[]): any[] {
    console.log('Sorting data by group.id...');

    // Group data by parentId to maintain hierarchy while sorting siblings
    const groupedByParent = data.reduce((acc, item) => {
      const parentId = item.parentId || 'root';
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(item);
      return acc;
    }, {} as { [key: string]: any[] });

        // Sort each group of siblings by group.id (nulls/undefined at the end)
    Object.keys(groupedByParent).forEach(parentId => {
      groupedByParent[parentId].sort((a: any, b: any) => {
        const groupIdA = a.group?.id;
        const groupIdB = b.group?.id;

        // Handle null/undefined group.id
        if (groupIdA == null && groupIdB == null) return 0;
        if (groupIdA == null) return 1;  // null goes to end
        if (groupIdB == null) return -1; // null goes to end

        // Sort by group.id ascending (smaller id on left)
        return groupIdA - groupIdB;
      });
    });

    // Flatten back to single array while maintaining hierarchy
    const sortedData: any[] = [];

    // Function to recursively add nodes and their children
    const addNodeAndChildren = (nodeId: string) => {
      const node = data.find(item => item.id === nodeId);
      if (node) {
        sortedData.push(node);

        // Add children (sorted siblings)
        const children = groupedByParent[nodeId] || [];
        children.forEach((child: any) => {
          if (child.id !== nodeId) { // Avoid infinite recursion
            addNodeAndChildren(child.id);
          }
        });
      }
    };

    // Start with root nodes (sorted)
    const rootNodes = groupedByParent['root'] || [];
    rootNodes.forEach((rootNode: any) => {
      addNodeAndChildren(rootNode.id);
    });

    console.log('Data sorted successfully. Sample sorting:');
    // Log some examples of the sorting
    const examples = sortedData.filter(item => item.group?.id).slice(0, 5);
    examples.forEach(item => {
      console.log(`Node ${item.id}: group.id = ${item.group?.id}, group.name = ${item.group?.name}`);
    });

    return sortedData;
  }

  private validateOrganizationData(data: any[]): void {
    const validIds = new Set(data.map(item => item.id));
    const invalidReferences: string[] = [];

    data.forEach(item => {
      if (item.parentId && !validIds.has(item.parentId)) {
        invalidReferences.push(`Node ${item.id} references invalid parent ${item.parentId}`);
      }
    });

    if (invalidReferences.length > 0) {
      console.warn('Invalid parent references found:', invalidReferences);
    }

    console.log(`Data validation complete. Total nodes: ${data.length}, Valid IDs: ${validIds.size}`);

    // Log the structure for debugging
    const rootNodes = data.filter(item => !item.parentId);
    console.log('Root nodes:', rootNodes.map(n => ({ id: n.id, name: n.name })));
  }

  // Get ribbon color for sub section identification
  private getRibbonColor(subSection: string): string {
    if (!subSection) {
      return 'transparent'; // No ribbon if no sub section
    }

    console.log(`Getting ribbon color for sub section: "${subSection}"`);

    return this.subSectionColors[subSection] || this.subSectionColors['default'] || 'transparent';
  }

  // Get line badge background color
  private getLineColor(lineName: string): string {
    if (!lineName || lineName === 'null') {
      return 'linear-gradient(135deg, #6C757D 0%, #495057 100%)'; // Default gray gradient
    }

    return this.lineColors[lineName] || 'linear-gradient(135deg, #6C757D 0%, #495057 100%)';
  }

  // Default color scheme (white theme)
  private getDefaultColors(): any {
    return {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      border: '#E4E2E9',
      text: '#08011E',
      textSecondary: '#716E7B',
      accent: '#007bff',
      success: '#4CAF50',
      warning: '#FF9800',
      info: '#6f42c1',
      avatarBg: '#F8F9FA'
    };
  }

  ngAfterViewInit(): void {
    // Delay to ensure DOM is ready and data is loaded
    setTimeout(() => {
      this.initializeOrgChart();
    }, 1000);
  }

  private initializeOrgChart(): void {
    try {
      console.log('=== Starting Chart Initialization ===');
      console.log('Chart container element:', this.chartContainer.nativeElement);
      console.log('Chart container exists:', !!this.chartContainer.nativeElement);
      console.log('Initializing org chart with data:', this.organizationData);
      console.log('Data length:', this.organizationData?.length);
      console.log('OrgChart constructor:', OrgChart);
      console.log('OrgChart available:', typeof OrgChart !== 'undefined');

      // Check if OrgChart is available
      if (typeof OrgChart === 'undefined') {
        console.error('OrgChart is not defined');
        return;
      }

      // Check if we have valid data
      if (!this.organizationData || this.organizationData.length === 0) {
        console.error('No valid organization data available');
        return;
      }

      console.log('Creating OrgChart instance...');

      // Create new OrgChart instance with better styling
      this.chart = (new OrgChart() as any);
      console.log('OrgChart instance created:', this.chart);

      console.log('Setting chart properties...');
      this.chart
        .container(this.chartContainer.nativeElement)
        .data(this.organizationData)
        .nodeHeight((d: any) => 105 + 25)
        .nodeWidth((d: any) => 220 + 2)
        .childrenMargin((d: any) => 60)
        .compactMarginBetween((d: any) => 45)
        .compactMarginPair((d: any) => 40)
        .neighbourMargin((a: any, b: any) => 30)
        .scaleExtent([0.3, 3.0])
        .onNodeClick((d: any) => {
          this.handleNodeClick(d);
        })
        .nodeContent((d: any, i: any, arr: any, state: any) => {
          const imageDiffVert = 25 + 2;

          // Get additional data fields
          const isVacant = d.data.is_vacant === true;
          const isGrouping = d.data.is_grouping === true;
          const isShift = d.data.is_shift === 1;
          const isIntern = d.data.is_intern === 1;
          const employeeName = isVacant ? 'VACANT' : (d.data.employee_name || d.data.name || 'Unknown Employee');
          const profilePic = d.data.profile_pic || null;
          const section = d.data.section?.name || d.data.section || '';
          const group = d.data.group?.name || d.data.group || '';
          const line = d.data.line?.name || d.data.line || '';
          const subSection = d.data.sub_section?.name || d.data.sub_section || '';

          const getInitials = (name: string, vacant: boolean): string => {
            if (vacant) {
              return 'VA';
            }
            const names = name.trim().split(' ');
            if (names.length === 1) {
              return names[0].substring(0, 2).toUpperCase();
            }
            return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
          };
          const initials = getInitials(employeeName, isVacant);

          const getInitialsBackground = (vacant: boolean): string => {
            if (vacant) {
              return 'linear-gradient(135deg, #fff9c4 0%, #ffe082 25%, #ffd54f 60%, #ffb300 100%)'; // Yellow gradient for vacant
            }
            return 'linear-gradient(135deg, #d1d5db 0%, #4fc3f7 25%, #2196f3 60%, #1976d2 100%)'; // Blue gradient for regular
          };
          const initialsBackground = getInitialsBackground(isVacant);

          const ribbonColor = this.getRibbonColor(subSection);
          const cardColors = this.getDefaultColors();

          if (isGrouping) {
            // Get grouping colors based on sub section
            const getGroupingColors = (subSectionColor: string) => {
              if (subSectionColor === 'transparent') {
                // Default orange if no sub section color
                return {
                  primary: '#FF9800',
                  secondary: '#F57C00',
                  border: '#E65100',
                  shadow: 'rgba(255,152,0,0.3)'
                };
              }

              // Create gradient from sub section color
              const baseColor = subSectionColor;
              return {
                primary: baseColor,
                secondary: baseColor + 'DD', // Add transparency
                border: baseColor,
                shadow: baseColor + '40' // Add transparency for shadow
              };
            };

            const groupColors = getGroupingColors(ribbonColor);

                        // Grouping Node Layout - Compact Oval Shape with Sub Section Color
            return `
              <div style='width:${d.width}px;height:${d.height}px;padding-top:25px;padding-left:1px;padding-right:1px'>
                <div style="font-family: 'Inter', sans-serif;background:linear-gradient(135deg, ${groupColors.primary} 0%, ${groupColors.secondary} 100%);margin-left:10px;width:${d.width - 22}px;height:${d.height - 50}px;border-radius:15px;border: 1px solid ${groupColors.border};box-shadow: 0 2px 6px ${groupColors.shadow};position:relative;display:flex;align-items:center;justify-content:center;">

                  <!-- Grouping Content -->
                  <div style="text-align:center;padding:4px 8px;">
                    <!-- Group Name Only -->
                    <div style="font-size:11px;color:white;font-weight:600;line-height:1.0;text-shadow:0 1px 1px rgba(0,0,0,0.3);">${employeeName}</div>
                  </div>
                </div>
              </div>
            `;
          } else {
            // Regular Employee Node Layout
            return `
              <div style='width:${d.width}px;height:${d.height}px;padding-top:${imageDiffVert - 2}px;padding-left:1px;padding-right:1px'>
                <div style="font-family: 'Inter', sans-serif;background:${cardColors.primary}; margin-left:-1px;width:${d.width - 2}px;height:${d.height - imageDiffVert}px;border-radius:10px;border: 2px solid ${cardColors.border};box-shadow: 0 4px 12px rgba(0,0,0,0.15);position:relative;">

                  <!-- Top Color Bar for Sub Section -->
                  ${ribbonColor !== 'transparent' ? `
                    <div style="position:absolute;top:0;left:0;right:0;height:8px;background-color:${ribbonColor};border-radius:10px 10px 0 0;"></div>
                  ` : ''}

                  <!-- Line Info (Bottom Left) -->
                  ${line && line !== 'null' ? `<div style="position:absolute;bottom:10px;left:8px;color:#ffffff;font-size:9px;font-weight:600;background:${this.getLineColor(line)};padding:4px 7px;border-radius:8px;border:none;box-shadow:0 2px 4px rgba(0,0,0,0.2);line-height:1.1;max-width:calc(50% - 16px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="Line: ${line}">
                    <i class="mdi mdi-factory" style="font-size:8px;margin-right:2px;"></i>
                    ${line}
                  </div>` : ''}

                  <!-- Group Info (Bottom Right) -->
                  ${group && group !== 'null' ? `<div style="position:absolute;bottom:10px;right:8px;color:#333333;font-size:8px;font-weight:500;background:rgba(255,255,255,0.95);padding:3px 6px;border-radius:6px;border:1px solid #333333;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${group}</div>` : ''}

                  <!-- Avatar Container (Centered) -->
                  <div style="position:absolute;top:${-imageDiffVert - 10}px;left:50%;transform:translateX(-50%);z-index:20;display:flex;flex-direction:column;align-items:center;">

                    <!-- Avatar Background -->
                    <div style="background-color:${cardColors.avatarBg};border-radius:100px;width:50px;height:50px;border: 2px solid ${cardColors.border};position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                      ${profilePic && !isVacant ? `
                        <!-- Profile Picture -->
                        <img src="${profilePic}" style="width:100%;height:100%;border-radius:100px;object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                        <!-- Initials Fallback (hidden by default) -->
                        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;background:${initialsBackground};border-radius:100px;">${initials}</div>
                      ` : `
                        <!-- Initials Only (for vacant or no profile pic) -->
                        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:white;background:${initialsBackground};border-radius:100px;">${initials}</div>
                      `}


                    </div>

                  </div>

                  <!-- Employee Name (Primary) -->
                  <div style="font-size:14px;color:${cardColors.text};margin-left:10px;margin-right:10px;margin-top:25px;font-weight:600;line-height:1.3;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${employeeName}</div>

                  <!-- Position/Section with Status Badges -->
                  ${section && section !== 'null' ? `
                    <div style="display:flex;align-items:center;justify-content:center;margin-left:10px;margin-right:10px;margin-top:6px;gap:6px;">
                      <!-- Section Text -->
                      <div style="font-size:11px;color:${cardColors.textSecondary};font-weight:500;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${section}</div>

                      <!-- Status Badges Container -->
                      ${(isShift || isIntern) ? `
                        <div style="display:flex;gap:3px;flex-shrink:0;">
                          <!-- Shift Badge -->
                          ${isShift ? `
                            <div style="background:linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);color:white;font-size:8px;font-weight:700;padding:2px 4px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.2);display:flex;align-items:center;gap:2px;" title="Shift Worker">
                              <i class="mdi mdi-clock-outline" style="font-size:8px;"></i>
                              <span>SHIFT</span>
                            </div>
                          ` : ''}

                          <!-- Intern Badge -->
                          ${isIntern ? `
                            <div style="background:linear-gradient(135deg, #2196F3 0%, #42A5F5 100%);color:white;font-size:8px;font-weight:700;padding:2px 4px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.2);display:flex;align-items:center;gap:2px;" title="Intern">
                              <i class="mdi mdi-school-outline" style="font-size:8px;"></i>
                              <span>INTERN</span>
                            </div>
                          ` : ''}
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}


                </div>
              </div>
            `;
          }
        });

      console.log('Rendering chart...');
      this.chart.compact(this.compactMode).render();
      console.log('Chart rendered successfully with compact mode:', this.compactMode);

      // Auto-trigger toggle to set compactMode to false (expanded)
      this.toggleCompact();

      console.log('=== Chart Initialization Complete ===');

    } catch (error: any) {
      console.error('=== Chart Initialization Error ===');
      console.error('Error initializing org chart:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);

      // Try to use fallback data if available
      if (this.organizationData !== ORGANIZATION_DATA) {
        console.log('Trying to initialize chart with fallback data...');
        this.organizationData = ORGANIZATION_DATA;
        setTimeout(() => {
          this.initializeOrgChart();
        }, 1000);
      }
    }
  }

  // Node Controls
  expandNode(): void {
    if (this.chart) {
      this.chart.setExpanded('2').render();
    }
  }

  collapseNode(): void {
    if (this.chart) {
      this.chart.setExpanded('2', false).render();
    }
  }

  addNode(): void {
    if (this.chart) {
      const newNode = {
        id: 'new-' + Date.now(),
        parentId: this.organizationData[0]?.id || '1',
        name: 'New Employee',
        position: 'New Position',
        email: 'new@company.com',
        employeeId: '9999',
        level: 'M1',
        avatar: 'assets/images/users/avatar-1.jpg',
        department: 'New Department'
      };
      this.chart.addNode(newNode).render();
    }
  }

  removeNode(): void {
    if (this.chart) {
      this.chart.removeNode('7').render();
    }
  }

  // Layout Controls
  fitChart(): void {
    if (this.chart) {
      this.chart.fit();
    }
  }

  swapLayout(): void {
    if (this.chart) {
      const layouts = ['right', 'bottom', 'left', 'top'];
      const layout = layouts[this.layoutIndex % layouts.length];
      this.layoutIndex++;
      this.chart.layout(layout).render().fit();
    }
  }

  toggleCompact(): void {
    if (this.chart) {
      this.compactMode = !this.compactMode;
      console.log('toggleCompact', this.compactMode);
      this.chart.compact(this.compactMode).render();

      // Set reasonable zoom level instead of auto-fit
      setTimeout(() => {
        if (this.compactMode) {
          // For compact mode, fit to show more nodes
          this.chart.fit();
        } else {
          // For expanded mode, set moderate zoom to avoid too much zoom in
          this.chart.zoom(0.8);
        }
      }, 100);
    }
  }

  toggleCenterActive(): void {
    if (this.chart) {
      this.centerActiveMode = !this.centerActiveMode;
      this.chart.setActiveNodeCentered(this.centerActiveMode).render();
    }
  }

  // Navigation Controls
  centerNode(): void {
    if (this.chart) {
      this.chart.setCentered('2').render();
    }
  }

  highlightNode(): void {
    if (this.chart) {
      this.chart.setHighlighted('2').render();
    }
  }

  highlightRoot(): void {
    if (this.chart) {
      this.chart.setUpToTheRootHighlighted('2').render().fit();
    }
  }

  clearHighlighting(): void {
    if (this.chart) {
      this.chart.clearHighlighting();
      this.highlightedNodeId = null;
      this.breadcrumbPath = [];
    }
  }

  // Data Refresh
  async refreshData(): Promise<void> {
    // Clear any existing highlighting before refresh
    this.clearHighlighting();

    await this.loadSubSectionData();
    await this.loadOrganizationData();
    if (this.chart) {
      this.chart.data(this.organizationData).render().fit();
    }
  }





  // View Controls
  expandAll(): void {
    if (this.chart) {
      this.clearHighlighting();
      this.chart.expandAll();
    }
  }

  collapseAll(): void {
    if (this.chart) {
      this.clearHighlighting();
      this.chart.collapseAll();
    }
  }

  fullscreen(): void {
    if (this.chart) {
      this.chart.fullscreen('body');
    }
  }

  // Export Controls
  exportImage(): void {
    if (this.chart) {
      this.chart.exportImg();
    }
  }

  exportFullImage(): void {
    if (this.chart) {
      this.chart.exportImg({ full: true });
    }
  }

  exportSVG(): void {
    if (this.chart) {
      this.chart.exportSvg();
    }
  }

  // Zoom Controls
  zoomOut(): void {
    if (this.chart) {
      this.chart.zoomOut();
    }
  }

  zoomIn(): void {
    if (this.chart) {
      this.chart.zoomIn();
    }
  }

  // Search and Filter Controls
  filterChart(event: any): void {
    if (!this.chart) return;

    // Get input value
    const value = event.target.value;

    // Clear previous highlighting and reset highlight state
    this.clearHighlighting();

    // Get chart data
    const data = this.chart.data() as any[];

    // Mark all previously expanded nodes for collapse
    data.forEach((d: any) => (d._expanded = false));

    // Loop over data and check if input value matches employeeCode or employeeName
    data.forEach((d: any) => {
      const employeeCode = d.employee_code || d.employeeId || d.id;
      const employeeName = d.employee_name || d.name || '';

      if (value !== '' && (
        employeeCode.toString().toLowerCase().includes(value.toLowerCase()) ||
        employeeName.toLowerCase().includes(value.toLowerCase())
      )) {
        // If matches, mark node as highlighted and expanded
        d._highlighted = true;
        d._expanded = true;
      }
    });

    // Update data and rerender graph
    (this.chart as any).data(data).render().fit();

    console.log('Filtering chart by employeeCode or employeeName:', value);
  }



  // Handle node click for highlight toggle
  handleNodeClick(d: any): void {
    if (!this.chart) return;

    const nodeId = d.data?.id || d.id;
    console.log('Node clicked:', nodeId, 'Currently highlighted:', this.highlightedNodeId);

    // Toggle highlight
    if (this.highlightedNodeId === nodeId) {
      // If same node clicked, clear highlighting
      this.clearHighlighting();
      console.log('Clearing highlight for node:', nodeId);
    } else {
      // If different node clicked, clear previous highlight first then highlight new node
      this.chart.clearHighlighting(); // Clear previous highlight
      this.chart.setUpToTheRootHighlighted(nodeId).render();
      this.highlightedNodeId = nodeId;
      this.generateBreadcrumbPath(nodeId);
      console.log('Switching highlight to node:', nodeId, '(previous cleared)');
    }
  }

  // Generate breadcrumb path from root to selected node
  generateBreadcrumbPath(nodeId: string): void {
    this.breadcrumbPath = [];

    if (!this.organizationData || this.organizationData.length === 0) {
      return;
    }

    const nodeMap = new Map();
    this.organizationData.forEach(node => {
      nodeMap.set(node.id, node);
    });

    // Build path from selected node to root
    const path: any[] = [];
    let currentNode = nodeMap.get(nodeId);

    while (currentNode) {
      path.unshift({
        id: currentNode.id,
        name: currentNode.employee_name || currentNode.name || currentNode.id,
        section: currentNode.section?.name || '',
        isVacant: currentNode.is_vacant || false,
        isGrouping: currentNode.is_grouping || false
      });

      // Move to parent
      currentNode = currentNode.parentId ? nodeMap.get(currentNode.parentId) : null;
    }

    this.breadcrumbPath = path;
    console.log('Generated breadcrumb path:', this.breadcrumbPath);
  }

  // Toggle control buttons visibility
  toggleControlButtons(): void {
    this.showControlButtons = !this.showControlButtons;
    console.log('Control buttons visibility:', this.showControlButtons);
  }

  initializeTranslate(): void {
    this.breadCrumbTitle = this.translate.instant('APPPAGE.ORGANIZATION.TITLE');
    this.breadCrumbItems = [
      {
        label: this.translate.instant('APPPAGE.ORGANIZATION.BREADCRUMB.LABEL1'),
      },
    ];
  }
}
