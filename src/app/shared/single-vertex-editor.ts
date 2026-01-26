/**
 * Custom Single-Vertex Hover Editing for Leaflet
 * 
 * Replicates legacy OpenLayers behavior: shows ONLY ONE vertex marker
 * at the position nearest to the mouse cursor.
 */

import * as L from 'leaflet';

export interface SingleVertexEditOptions {
    snapDistance?: number;
    markerSize?: number;
    markerColor?: string;
    onEdit?: (layer: L.Polygon | L.Polyline, geojson: any) => void;
}

interface VertexInfo {
    point: L.LatLng;
    path: number[]; // Array of indices to reach this vertex
    distance: number;
}

export class SingleVertexEditor {
    private map: L.Map;
    private polygon: L.Polygon | L.Polyline;
    private options: SingleVertexEditOptions;
    private vertexMarker: L.Marker | null = null;
    private currentVertexInfo: VertexInfo | null = null;
    private isDragging: boolean = false;
    private isEnabled: boolean = false;

    constructor(
        map: L.Map,
        polygon: L.Polygon | L.Polyline,
        options: SingleVertexEditOptions = {}
    ) {
        this.map = map;
        this.polygon = polygon;
        this.options = {
            snapDistance: options.snapDistance || 20,
            markerSize: options.markerSize || 12,
            markerColor: options.markerColor || '#3388ff',
            onEdit: options.onEdit
        };
    }

    private createVertexIcon(): L.DivIcon {
        const size = this.options.markerSize!;
        return L.divIcon({
            className: 'single-vertex-marker-icon',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${this.options.markerColor};
        border: 2px solid white;
        border-radius: 50%;
        cursor: grab;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`
        });
    }

    enable(): void {
        if (this.isEnabled) return;
        this.isEnabled = true;

        this.map.on('mousemove', this.handleMouseMove, this);
        this.polygon.on('mouseout', this.handlePolygonMouseOut, this);

        // Debug
        const latLngs = (this.polygon as L.Polygon).getLatLngs();
        console.log('✅ Single-vertex hover editing enabled');
        console.log('📐 LatLngs depth:', this.getArrayDepth(latLngs));
    }

    disable(): void {
        if (!this.isEnabled) return;
        this.isEnabled = false;

        this.map.off('mousemove', this.handleMouseMove, this);
        this.polygon.off('mouseout', this.handlePolygonMouseOut, this);
        this.destroyMarker();

        console.log('🛑 Single-vertex hover editing disabled');
    }

    private getArrayDepth(arr: any): number {
        if (!Array.isArray(arr)) return 0;
        if (arr.length === 0) return 1;
        return 1 + this.getArrayDepth(arr[0]);
    }

    private handlePolygonMouseOut = (): void => {
        if (!this.isDragging) {
            setTimeout(() => {
                if (!this.isDragging && this.vertexMarker) {
                    const markerElement = (this.vertexMarker as any)._icon;
                    if (markerElement && !markerElement.matches(':hover')) {
                        this.destroyMarker();
                    }
                }
            }, 100);
        }
    };

    private handleMouseMove = (e: L.LeafletMouseEvent): void => {
        if (this.isDragging) return;

        const mousePoint = this.map.latLngToContainerPoint(e.latlng);
        const nearestVertex = this.findNearestVertex(mousePoint);

        if (nearestVertex && nearestVertex.distance <= this.options.snapDistance!) {
            this.showMarkerAt(nearestVertex);
        }
    };

    /**
     * Recursively find the nearest vertex in any nested LatLng structure
     */
    private findNearestVertex(mousePoint: L.Point): VertexInfo | null {
        const latLngs = (this.polygon as L.Polygon).getLatLngs();
        let nearestVertex: VertexInfo | null = null;
        let minDistance = Infinity;

        const processArray = (arr: any, path: number[] = []) => {
            if (!Array.isArray(arr)) return;

            arr.forEach((item, index) => {
                if (Array.isArray(item)) {
                    // It's another nested array, recurse
                    processArray(item, [...path, index]);
                } else if (item && typeof item === 'object' && 'lat' in item && 'lng' in item) {
                    // It's a LatLng-like object
                    const latLng = L.latLng(item.lat, item.lng);
                    const vertexPoint = this.map.latLngToContainerPoint(latLng);
                    const distance = mousePoint.distanceTo(vertexPoint);

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestVertex = {
                            point: latLng,
                            path: [...path, index],
                            distance
                        };
                    }
                }
            });
        };

        processArray(latLngs);
        return nearestVertex;
    }

    private showMarkerAt(vertexInfo: VertexInfo): void {
        if (this.currentVertexInfo &&
            JSON.stringify(this.currentVertexInfo.path) === JSON.stringify(vertexInfo.path)) {
            return;
        }

        this.currentVertexInfo = vertexInfo;

        if (!this.vertexMarker) {
            this.vertexMarker = L.marker(vertexInfo.point, {
                icon: this.createVertexIcon(),
                draggable: true,
                autoPan: false
            });

            this.vertexMarker.on('dragstart', this.onDragStart, this);
            this.vertexMarker.on('drag', this.onDrag, this);
            this.vertexMarker.on('dragend', this.onDragEnd, this);

            this.vertexMarker.addTo(this.map);
            console.log('🔵 Vertex marker created at path:', vertexInfo.path);
        } else {
            this.vertexMarker.setLatLng(vertexInfo.point);
        }
    }

    private destroyMarker(): void {
        if (this.vertexMarker) {
            this.vertexMarker.off('dragstart', this.onDragStart, this);
            this.vertexMarker.off('drag', this.onDrag, this);
            this.vertexMarker.off('dragend', this.onDragEnd, this);
            this.map.removeLayer(this.vertexMarker);
            this.vertexMarker = null;
        }
        this.currentVertexInfo = null;
    }

    private onDragStart = (): void => {
        this.isDragging = true;
        console.log('🎯 Started dragging vertex');
    };

    private onDrag = (): void => {
        if (!this.isDragging || !this.currentVertexInfo || !this.vertexMarker) return;
        const newLatLng = this.vertexMarker.getLatLng();
        this.updatePolygonVertex(newLatLng);
    };

    private onDragEnd = (): void => {
        this.isDragging = false;

        if (this.vertexMarker && this.currentVertexInfo) {
            const newLatLng = this.vertexMarker.getLatLng();
            this.updatePolygonVertex(newLatLng);
            this.currentVertexInfo.point = newLatLng;
        }

        if (this.options.onEdit && this.currentVertexInfo) {
            const geojson = (this.polygon as any).toGeoJSON();
            this.options.onEdit(this.polygon, geojson);
            console.log('📝 Edit callback triggered');
        }

        console.log('✅ Finished dragging vertex');
    };

    /**
     * Update the polygon's vertex position using the path
     */
    private updatePolygonVertex(newLatLng: L.LatLng): void {
        if (!this.currentVertexInfo || this.currentVertexInfo.path.length === 0) return;

        const path = this.currentVertexInfo.path;
        const latLngs = (this.polygon as L.Polygon).getLatLngs() as any;
        const newPoint = L.latLng(newLatLng.lat, newLatLng.lng);

        console.log('🔧 Updating vertex at path:', path, 'to', [newLatLng.lat, newLatLng.lng]);

        // Navigate to the correct position using the path
        let target = latLngs;
        for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]];
        }

        const lastIndex = path[path.length - 1];

        if (target && target[lastIndex]) {
            console.log('🔧 Before:', JSON.stringify(target[lastIndex]));
            target[lastIndex] = newPoint;
            console.log('🔧 After:', JSON.stringify(target[lastIndex]));

            // For closed polygon rings, sync first and last vertex
            if (Array.isArray(target)) {
                const ringLength = target.length;
                if (lastIndex === 0 && ringLength > 1) {
                    target[ringLength - 1] = newPoint;
                } else if (lastIndex === ringLength - 1 && ringLength > 1) {
                    target[0] = newPoint;
                }
            }

            // Apply the changes
            this.polygon.setLatLngs(latLngs);

            // Force redraw
            if ((this.polygon as any).redraw) {
                (this.polygon as any).redraw();
            }

            console.log('✅ Polygon vertex updated');
        } else {
            console.error('Failed to update vertex - target not found at path:', path);
        }
    }
}

export function enableSingleVertexEdit(
    map: L.Map,
    polygon: L.Polygon | L.Polyline,
    onEdit?: (layer: L.Polygon | L.Polyline, geojson: any) => void
): SingleVertexEditor {
    const editor = new SingleVertexEditor(map, polygon, { onEdit });
    editor.enable();
    return editor;
}
