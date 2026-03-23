
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchRiskHeatmap } from '../services/api';
import { MapPin, ShieldAlert, Zap, Filter, Loader2 } from 'lucide-react';

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Heatmap Layer Component for Leaflet
const HeatmapLayer = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !points?.length) return;

        // Leaflet.heat is a plugin, we load it via CDN if not available
        const scriptId = 'leaflet-heat-script';
        const addHeatLayer = () => {
            if (!window.L.heatLayer) return;
            
            // Remove existing heat layers
            map.eachLayer(layer => {
                if (layer._heat) map.removeLayer(layer);
            });

            const heatPoints = points.map(p => [p.lat, p.lng, p.risk_score]);
            const heatLayer = window.L.heatLayer(heatPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: { 0.3: 'green', 0.6: 'yellow', 1.0: 'red' }
            }).addTo(map);
            
            // Track for removal
            heatLayer._heat = true;
        };

        if (!window.L.heatLayer) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
            script.onload = addHeatLayer;
            document.head.appendChild(script);
        } else {
            addHeatLayer();
        }

        return () => {
            map.eachLayer(layer => {
                if (layer._heat) map.removeLayer(layer);
            });
        };
    }, [map, points]);

    return null;
};

const ZoomManager = ({ data, filters }) => {
    const map = useMap();

    useEffect(() => {
        if (data.length > 0) {
            const group = L.featureGroup(data.map(p => L.marker([p.lat, p.lng])));
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
            }
        } else if (!filters.state && !filters.district && !filters.city) {
            // Default India view
            map.setView([23.512, 80.329], 5);
        }
    }, [data, filters, map]);

    return null;
};

const RiskHeatmapMap = ({ filters: initialFilters = {} }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' | 'markers'
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
    }, [initialFilters]);

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

    const markerColor = (score) => {
        if (score >= 0.7) return '#ef4444'; // Red
        if (score >= 0.3) return '#f59e0b'; // Yellow
        return '#10b981'; // Green
    };

    const createCustomIcon = (score) => {
        const color = markerColor(score);
        return L.divIcon({
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
            className: 'custom-map-marker',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    };

    if (error) {
        return (
            <div className="map-fallback-ui">
                <ShieldAlert size={32} className="text-red-500 opacity-50" />
                <span>Unable to load map data</span>
            </div>
        );
    }

    const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

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
                    <select value={filters.time_range} onChange={e => updateFilter('time_range', e.target.value)} className="map-select">
                        <option value="1d">Last 24h</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                </div>
                
                <div className="toggle-group">
                    <button className={viewMode === 'heatmap' ? 'active' : ''} onClick={() => setViewMode('heatmap')}>Heatmap</button>
                    <button className={viewMode === 'markers' ? 'active' : ''} onClick={() => setViewMode('markers')}>Markers</button>
                </div>
            </div>

            <MapContainer 
                center={[23.512, 80.329]} 
                zoom={5} 
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%', background: '#0f172a' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                />
                
                <ZoomManager data={data} filters={filters} />

                {viewMode === 'heatmap' && data.length > 0 && (
                    <HeatmapLayer points={data} />
                )}

                {(viewMode === 'markers' || data.length < 10) && data.map((point, idx) => (
                    <Marker 
                        key={`${point.lat}-${point.lng}-${idx}`} 
                        position={[point.lat, point.lng]}
                        icon={createCustomIcon(point.risk_score)}
                    >
                        <Popup className="map-popup-dark">
                            <div className="popup-content">
                                <h3>{point.location}</h3>
                                <div className="popup-stat">
                                    <span className="label">Risk Score:</span>
                                    <span className="value" style={{ color: markerColor(point.risk_score) }}>
                                        {Math.round(point.risk_score * 100)}%
                                    </span>
                                </div>
                                <div className="popup-stat">
                                    <span className="label">Source:</span>
                                    <span className="value-cap">{point.type.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <style>{`
                .risk-heatmap-container { background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.05); }
                .map-skeleton-overlay, .map-empty-overlay, .map-fallback-ui {
                    position: absolute; inset: 0; z-index: 1000; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.82);
                    backdrop-filter: blur(4px); color: #94a3b8; gap: 12px; font-size: 0.85rem;
                }
                .map-controls { position: absolute; top: 12px; left: 12px; right: 12px; z-index: 1000; display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none; }
                .filter-row, .toggle-group { pointer-events: auto; }
                .filter-row { display: flex; gap: 6px; }
                .map-select {
                    background: #1e293b; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px; padding: 4px 8px; font-size: 0.72rem; cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3); outline: none;
                }
                .toggle-group { display: flex; background: #1e293b; padding: 3px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3); }
                .toggle-group button { padding: 3px 10px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; color: #94a3b8; background: transparent; border: none; cursor: pointer; }
                .toggle-group button.active { background: #3b82f6; color: white; }
                .map-popup-dark .leaflet-popup-content-wrapper { background: #1e293b; color: #f1f5f9; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); }
                .map-popup-dark .leaflet-popup-tip { background: #1e293b; }
                .popup-content h3 { margin: 0 0 6px 0; font-size: 0.85rem; color: #fff; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 4px; }
                .popup-stat { display: flex; justify-content: space-between; gap: 12px; font-size: 0.75rem; margin-top: 3px; }
                .popup-stat .label { color: #94a3b8; }
                .popup-stat .value-cap { text-transform: capitalize; color: #60a5fa; }
                .spinner { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default RiskHeatmapMap;
