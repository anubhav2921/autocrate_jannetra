
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapContext = createContext(null);

export const useMap = () => {
    const context = useContext(MapContext);
    if (context === undefined) {
        throw new Error('useMap must be used within a MapProvider');
    }
    return context;
};

/**
 * A controlled Map component using MapLibre GL JS.
 */
export const Map = ({ viewport, onViewportChange, children, style = {} }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://tiles.openfreemap.org/styles/dark',
            center: [viewport.center[0], viewport.center[1]],
            zoom: viewport.zoom,
            bearing: viewport.bearing || 0,
            pitch: viewport.pitch || 0,
            antialias: true,
            interactive: true,
        });

        const updateViewport = () => {
            const center = map.getCenter();
            onViewportChange({
                center: [center.lng, center.lat],
                zoom: map.getZoom(),
                bearing: map.getBearing(),
                pitch: map.getPitch(),
            });
        };

        map.on('move', updateViewport);
        map.on('zoom', updateViewport);
        map.on('rotate', updateViewport);
        map.on('pitch', updateViewport);

        map.on('load', () => {
            setIsLoaded(true);
            setMapInstance(map);
            mapRef.current = map;
        });

        return () => {
            map.off('move', updateViewport);
            map.off('zoom', updateViewport);
            map.off('rotate', updateViewport);
            map.off('pitch', updateViewport);
            map.remove();
        };
    }, []);

    // Sync external viewport changes
    useEffect(() => {
        if (!mapRef.current || !isLoaded) return;
        const map = mapRef.current;
        const mapCenter = map.getCenter();
        const mapZoom = map.getZoom();
        
        const isDifferent = 
            Math.abs(mapCenter.lng - viewport.center[0]) > 0.0001 ||
            Math.abs(mapCenter.lat - viewport.center[1]) > 0.0001 ||
            Math.abs(mapZoom - viewport.zoom) > 0.1;

        if (isDifferent) {
            map.easeTo({
                center: [viewport.center[0], viewport.center[1]],
                zoom: viewport.zoom,
                bearing: viewport.bearing || 0,
                pitch: viewport.pitch || 0,
                duration: 1000
            });
        }
    }, [viewport.center[0], viewport.center[1], viewport.zoom, viewport.bearing, viewport.pitch, isLoaded]);

    return (
        <MapContext.Provider value={mapInstance}>
            <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                {isLoaded && children}
            </div>
        </MapContext.Provider>
    );
};

export default Map;
