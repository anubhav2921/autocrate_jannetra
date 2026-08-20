import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { MapPin, Globe, Activity, ShieldAlert, Layers, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { fetchLocationMapMarkers } from '../services/api';
import { useLocation } from '../context/LocationContext';

const RISK_COLORS = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#ef4444' };

function MapRecenter({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { duration: 1.2 });
    }, [center, zoom]);
    return null;
}

export default function MapView() {
    const { location, hasLocation, locationLabel } = useLocation();
    const [markers, setMarkers] = useState([]);
    const [center, setCenter] = useState([22.5, 78.5]);
    const [zoom, setZoom] = useState(5);
    const [loading, setLoading] = useState(true);

    const loadMarkers = () => {
        setLoading(true);
        fetchLocationMapMarkers(location)
            .then((data) => {
                setMarkers(data.markers || []);
                if (data.center) setCenter(data.center);
                if (data.zoom) setZoom(data.zoom);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadMarkers();
    }, [location.state, location.district, location.city, location.ward]);

    const highRiskCount = markers.filter(m => m.risk_level === 'HIGH').length;
    const modRiskCount = markers.filter(m => m.risk_level === 'MODERATE').length;
    const lowRiskCount = markers.filter(m => m.risk_level === 'LOW').length;

    return (
        <div className="dashboard-page-wrapper animate-in">
            {/* Dark Styled Page Header */}
            <div className="hero-banner-card mb-4" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="hero-greeting" style={{ fontSize: '1.5rem' }}>Problem Location Map</h1>
                    <p className="hero-subtext">Interactive geospatial map tracking governance issue hotspots and risk levels</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="navbar-location-pill" style={{ background: '#181c2e' }}>
                        <Globe size={14} className="location-icon" />
                        <span>{hasLocation ? locationLabel() : 'All India'}</span>
                    </div>

                    <button
                        onClick={loadMarkers}
                        disabled={loading}
                        style={{
                            padding: '8px 14px', background: '#181c2e', color: '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600
                        }}
                        title="Refresh Map Data"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Summary Stat Cards */}
            <div className="at-a-glance-stats-grid mb-4" style={{ marginBottom: '20px' }}>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper purple">
                        <Layers size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num">{markers.length}</div>
                        <div className="stat-name">Active Hotspots</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper red">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#f87171' }}>{highRiskCount}</div>
                        <div className="stat-name">High Risk Zones</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper orange">
                        <Activity size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#fbbf24' }}>{modRiskCount}</div>
                        <div className="stat-name">Moderate Risk Zones</div>
                    </div>
                </div>
                <div className="glance-stat-item">
                    <div className="stat-icon-wrapper green">
                        <MapPin size={20} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-num" style={{ color: '#4ade80' }}>{lowRiskCount}</div>
                        <div className="stat-name">Stable Locations</div>
                    </div>
                </div>
            </div>

            {/* Legend Bar & Map Container */}
            <div className="panel-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>Live Geospatial Heatmap</span>
                    
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {[
                            { level: 'HIGH', color: '#ef4444', label: 'High Risk (GRI > 60)' },
                            { level: 'MODERATE', color: '#f59e0b', label: 'Moderate Risk (31–60)' },
                            { level: 'LOW', color: '#10b981', label: 'Low Risk (0–30)' },
                        ].map((l) => (
                            <span key={l.level} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ height: '540px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {loading ? (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            Loading map layers...
                        </div>
                    ) : (
                        <MapContainer
                            center={center}
                            zoom={zoom}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                            <MapRecenter center={center} zoom={zoom} />
                            {markers.map((m, idx) => (
                                <CircleMarker
                                    key={`${m.location}-${idx}`}
                                    center={[m.lat, m.lng]}
                                    radius={Math.max(8, Math.min(m.signal_count * 4, 22))}
                                    pathOptions={{
                                        color: RISK_COLORS[m.risk_level] || '#3b82f6',
                                        fillColor: RISK_COLORS[m.risk_level] || '#3b82f6',
                                        fillOpacity: 0.5,
                                        weight: 2,
                                    }}
                                >
                                    <Popup>
                                        <div style={{ padding: '4px', color: '#09090b', minWidth: '160px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                                                {m.location}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                                                Signals: <strong>{m.signal_count}</strong>
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                                                Risk Level: <strong style={{ color: RISK_COLORS[m.risk_level] }}>{m.risk_level}</strong>
                                            </div>
                                            {m.top_category && (
                                                <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                                                    Top Sector: <strong>{m.top_category}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </MapContainer>
                    )}
                </div>
            </div>
        </div>
    );
}
