
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Map from '@/components/ui/map';
import { fetchRiskHeatmap } from '../services/api';
import { MapPin, ShieldAlert, Zap, Filter, Loader2 } from 'lucide-react';

const RiskHeatmapMap = ({ filters: initialFilters = {} }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    // Controlled viewport state following user pattern
    const [viewport, setViewport] = useState({
        center: [80.329, 23.512], // Long, Lat
        zoom: 4.2,
        bearing: 0,
        pitch: 0,
    });

    const [filters, setFilters] = useState({
        ...initialFilters,
        status: '',
        priority: '',
        time_range: '7d',
        section: ''
    });

    // Sync initialFilters (from Dashboard) to local filters
    useEffect(() => {
        setFilters(prev => ({ ...prev, ...initialFilters }));
    }, [initialFilters, initialFilters.state, initialFilters.district, initialFilters.city]);

    // Fetch data with debounce
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(() => {
            setLoading(true);
            fetchRiskHeatmap(filters)
                .then(res => {
                    if (isMounted) {
                        setData(res || []);
                        setError(false);
                    }
                })
                .catch(err => {
                    console.error("Heatmap Load Error:", err);
                    if (isMounted) setError(true);
                })
                .finally(() => {
                    if (isMounted) setLoading(false);
                });
        }, 500); 

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [filters]);

    // Convert data to GeoJSON for the map layers
    const geojsonData = useMemo(() => ({
        type: 'FeatureCollection',
        features: data.map(p => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            properties: { 
                risk_score: p.risk_score || 0,
                location: p.location,
                type: p.type
            }
        }))
    }), [data]);

    // Update heatmap source when data changes
    useEffect(() => {
        // We'll manage layers within the Map component via direct instance manipulation for simplicity in this implementation
    }, [geojsonData]);

    const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

    if (error) {
        return (
            <div className="map-fallback-ui">
                <ShieldAlert size={32} className="text-red-500 opacity-50" />
                <span>Unable to load map data</span>
            </div>
        );
    }

    return (
        <div className="risk-heatmap-container" style={{ height: '420px', width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
            {loading && (
                <div className="map-skeleton-overlay">
                    <Loader2 className="spinner" size={24} />
                    <span>Analyzing geographical risk...</span>
                </div>
            )}

            {!loading && data.length === 0 && (
                <div className="map-empty-overlay">
                    <MapPin size={32} style={{ opacity: 0.3 }} />
                    <p>No location risk data available for the selected filters</p>
                </div>
            )}

            {/* Overlays Wrapper */}
            <div className="map-ui-layer">
                {/* Top Controls (Filters) */}
                <div className="map-controls">
                    <div className="filter-row">
                        <select value={filters.section} onChange={e => updateFilter('section', e.target.value)} className="map-select">
                            <option value="">All Sources</option>
                            <option value="signal_monitor">Signal Monitor</option>
                            <option value="citizen_report">Citizen Reports</option>
                        </select>
                        <select value={filters.priority} onChange={e => updateFilter('priority', e.target.value)} className="map-select">
                            <option value="">All Priorities</option>
                            <option value="high">High Risk</option>
                            <option value="medium">Medium Risk</option>
                            <option value="low">Low Risk</option>
                        </select>
                    </div>
                </div>

                {/* Coordinate Overlay following provided pattern */}
                <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono bg-background/80 backdrop-blur px-2 py-1.5 rounded border map-coord-overlay">
                   <span>
                      <span className="text-muted-foreground">lng:</span>{" "}
                      {(viewport?.center?.[0] ?? 0).toFixed(3)}
                    </span>
                    <span>
                      <span className="text-muted-foreground">lat:</span>{" "}
                      {(viewport?.center?.[1] ?? 0).toFixed(3)}
                    </span>
                    <span>
                      <span className="text-muted-foreground">zoom:</span>{" "}
                      {(viewport?.zoom ?? 0).toFixed(1)}
                    </span>
                    <span>
                      <span className="text-muted-foreground">bearing:</span>{" "}
                      {(viewport?.bearing ?? 0).toFixed(1)}°
                    </span>
                    <span>
                      <span className="text-muted-foreground">pitch:</span>{" "}
                      {(viewport?.pitch ?? 0).toFixed(1)}°
                    </span>
                </div>
            </div>

            <Map 
                viewport={viewport} 
                onViewportChange={setViewport}
                style={{ background: '#0f172a' }}
            >
                {/* We'll handle the source and heatmap layer using simple React hook within the children scope if we can access map inside Map */}
                <HeatmapManager data={geojsonData} filters={filters} />
            </Map>

            <style>{`
                .risk-heatmap-container { background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.05); }
                .map-ui-layer { position: absolute; inset: 0; z-index: 1000; pointer-events: none; }
                .map-skeleton-overlay, .map-empty-overlay, .map-fallback-ui {
                    position: absolute; inset: 0; z-index: 1001; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.82);
                    backdrop-filter: blur(4px); color: #94a3b8; gap: 12px; font-size: 0.85rem;
                    pointer-events: auto;
                }
                .map-controls { position: absolute; top: 12px; right: 12px; z-index: 10; display: flex; justify-content: flex-end; pointer-events: auto; }
                .filter-row { display: flex; gap: 6px; }
                .map-select {
                    background: #1e293b; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px; padding: 4px 8px; font-size: 0.72rem; cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3); outline: none;
                }
                
                /* Translation of user's Tailwind classes to design system CSS */
                .map-coord-overlay {
                    position: absolute; top: 12px; left: 12px; z-index: 10;
                    background: rgba(10, 14, 26, 0.75); 
                    backdrop-filter: blur(8px);
                    padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff; font-family: 'Inter', monospace; font-size: 0.7rem;
                    display: flex; gap: 12px; pointer-events: auto;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
                }
                .text-muted-foreground { color: #94a3b8; margin-right: 4px; }
                
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// Internal Manager to handle GL Layers correctly
import { useMap } from '@/components/ui/map';
const HeatmapManager = ({ data }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !data) return;

        const sourceId = 'risk-heat-source';
        const layerId = 'risk-heat-layer';

        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: data
            });

            map.addLayer({
                id: layerId,
                type: 'heatmap',
                source: sourceId,
                maxzoom: 15,
                paint: {
                    // Increase the heatmap weight based on risk_score
                    'heatmap-weight': ['get', 'risk_score'],
                    // Heatmap color map
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(0, 255, 0, 0)',
                        0.2, '#10b981', // Low
                        0.6, '#f59e0b', // Moderate
                        1, '#ef4444'    // High
                    ],
                    // Transition from heatmap to circles as we zoom in
                    'heatmap-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        7, 1,
                        15, 0.4
                    ],
                }
            });
        } else {
            map.getSource(sourceId).setData(data);
        }

        return () => {
            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);
        };
    }, [map, data]);

    return null; 
};

export default RiskHeatmapMap;
