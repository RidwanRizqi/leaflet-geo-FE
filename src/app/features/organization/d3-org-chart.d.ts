declare module 'd3-org-chart' {
  export class OrgChart {
    container(container: HTMLElement): this;
    data(data?: any[]): this | any[];
    nodeWidth(width: number | ((d: any) => number)): this;
    nodeHeight(height: number | ((d: any) => number)): this;
    childrenMargin(margin: number | ((d: any) => number)): this;
    compactMarginBetween(margin: number | ((d: any) => number)): this;
    compactMarginPair(margin: number | ((d: any) => number)): this;
    neighbourMargin(margin: (a: any, b: any) => number): this;
    buttonContent(content: (params: { node: any; state: any }) => string): this;
    nodeContent(content: (d: any, i: any, arr: any, state: any) => string): this;

    // Node controls
    setExpanded(id: string, expanded?: boolean): this;
    addNode(node: any): this;
    removeNode(id: string): this;

    // Layout controls
    fit(): this;
    layout(direction: string): this;
    compact(compact: boolean): this;
    setActiveNodeCentered(center: boolean): this;

    // Navigation controls
    setCentered(id: string): this;
    setHighlighted(id: string): this;
    setUpToTheRootHighlighted(id: string): this;
    clearHighlighting(): this;

    // View controls
    expandAll(): this;
    collapseAll(): this;
    fullscreen(selector: string): this;

    // Export controls
    exportImg(options?: any): this;
    exportSvg(): this;

    // Zoom controls
    zoomOut(): this;
    zoomIn(): this;

    render(): this;
  }
}
