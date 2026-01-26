/**
 * Custom Leaflet-Editable extension for hover-based vertex markers
 * 
 * This matches the legacy OpenLayers behavior where vertex markers
 * only appear when hovering over polygon edges, not all at once.
 */

import * as L from 'leaflet';
import 'leaflet-editable';

// Extend the Leaflet Map to enable editable
declare module 'leaflet' {
    interface Map {
        editTools: any;
    }

    interface Layer {
        enableEdit: (options?: any) => any;
        disableEdit: () => void;
        editEnabled: () => boolean;
        editor?: any;
    }

    interface Path {
        enableEdit: (options?: any) => any;
        disableEdit: () => void;
        editEnabled: () => boolean;
        editor?: any;
    }

    namespace Editable {
        interface VertexMarker extends L.Marker {
            setOpacity(opacity: number): this;
        }
    }
}

/**
 * Initialize hover-based vertex markers for Leaflet-Editable
 * Call this function ONCE after importing leaflet-editable
 */
export function initHoverVertexMarkers(): void {
    // Check if L.Editable exists
    if (!(L as any).Editable) {
        console.error('Leaflet-Editable not loaded. Import "leaflet-editable" first.');
        return;
    }

    console.log('🔧 Initializing hover-based vertex markers...');

    // Store the original VertexMarker onAdd method
    const VertexMarker = (L as any).Editable.VertexMarker;
    const originalOnAdd = VertexMarker.prototype.onAdd;
    const originalOnRemove = VertexMarker.prototype.onRemove;

    // Extend VertexMarker to show on hover only
    VertexMarker.include({
        onAdd: function (map: L.Map) {
            // Call original onAdd
            originalOnAdd.call(this, map);

            // Hide by default
            this.setOpacity(0);

            // Show on hover
            this.on('mouseover', () => {
                this.setOpacity(1);
                (this as any)._isHovered = true;
            });

            this.on('mouseout', () => {
                // Only hide if not being dragged
                if (!(this as any)._isDragging) {
                    this.setOpacity(0);
                    (this as any)._isHovered = false;
                }
            });

            // Keep visible while dragging
            this.on('dragstart', () => {
                (this as any)._isDragging = true;
                this.setOpacity(1);
            });

            this.on('dragend', () => {
                (this as any)._isDragging = false;
                // Hide after drag finishes if not hovered
                setTimeout(() => {
                    if (!(this as any)._isHovered) {
                        this.setOpacity(0);
                    }
                }, 200);
            });

            console.log('🔵 Vertex marker added (hidden by default)');
        },

        onRemove: function (map: L.Map) {
            // Clean up event listeners
            this.off('mouseover');
            this.off('mouseout');
            this.off('dragstart');
            this.off('dragend');

            // Call original onRemove
            if (originalOnRemove) {
                originalOnRemove.call(this, map);
            }
        }
    });

    console.log('✅ Hover-based vertex markers initialized');
}

/**
 * Enable hover-based editing on a Leaflet layer
 * @param layer - The Leaflet layer (polygon) to enable editing on
 * @param map - The Leaflet map instance
 * @param onEdit - Callback when geometry is edited
 */
export function enableHoverEdit(
    layer: L.Path,
    map: L.Map,
    onEdit?: (layer: L.Path, geojson: any) => void
): void {
    // Make sure the map has editTools
    if (!map.editTools) {
        (map as any).editTools = new (L as any).Editable(map, {
            vertexMarkerClass: (L as any).Editable.VertexMarker
        });
    }

    // Enable editing on the layer
    layer.enableEdit(map.editTools);

    // Listen for vertex drag events
    layer.on('editable:vertex:dragend', (e: any) => {
        console.log('📝 Vertex moved');
        if (onEdit) {
            const geojson = (layer as any).toGeoJSON();
            onEdit(layer, geojson);
        }
    });

    layer.on('editable:vertex:deleted', (e: any) => {
        console.log('🗑️ Vertex deleted');
        if (onEdit) {
            const geojson = (layer as any).toGeoJSON();
            onEdit(layer, geojson);
        }
    });

    layer.on('editable:vertex:new', (e: any) => {
        console.log('➕ Vertex added');
        if (onEdit) {
            const geojson = (layer as any).toGeoJSON();
            onEdit(layer, geojson);
        }
    });

    console.log('✅ Hover-based editing enabled');
}

/**
 * Disable editing on a layer
 */
export function disableHoverEdit(layer: L.Path): void {
    layer.disableEdit();
    layer.off('editable:vertex:dragend');
    layer.off('editable:vertex:deleted');
    layer.off('editable:vertex:new');
    console.log('🛑 Editing disabled');
}
