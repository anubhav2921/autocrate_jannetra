/**
 * LocationFilter — Hierarchical State → District → City → Ward selector panel.
 * Appears as a floating card in the dashboard and map views.
 */
import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, X, Navigation, CheckCircle } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import api from '../services/api';

export default function LocationFilter({ onApply, compact = false }) {
    const { location, setLocation, clearLocation, locationLabel, hasLocation } = useLocation();

    const [states, setStates] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [cities, setCities] = useState([]);
    const [wards, setWards] = useState([]);

    const [draft, setDraft] = useState({ ...location });
    const [gpsLoading, setGpsLoading] = useState(false);
    const [applied, setApplied] = useState(false);

    // Load states on mount
    useEffect(() => {
        api.get('/location/states')
            .then(d => setStates(d.states || []))
            .catch(() => {});
    }, []);

    // Load districts when state changes
    useEffect(() => {
        if (!draft.state) {
            setDistricts([]); setCities([]); setWards([]);
            return;
        }
        api.get(`/location/districts?state=${encodeURIComponent(draft.state)}`)
            .then(d => setDistricts(d.districts || []))
            .catch(() => setDistricts([]));
        setCities([]); setWards([]);
    }, [draft.state]);

    // Load cities when district changes
    useEffect(() => {
        if (!draft.state || !draft.district) { setCities([]); setWards([]); return; }
        api.get(`/location/cities?state=${encodeURIComponent(draft.state)}&district=${encodeURIComponent(draft.district)}`)
            .then(d => setCities(d.cities || []))
            .catch(() => setCities([]));
        setWards([]);
    }, [draft.district]);

    // Load wards when city changes
    useEffect(() => {
        if (!draft.state || !draft.district || !draft.city) { setWards([]); return; }
        api.get(`/location/wards?state=${encodeURIComponent(draft.state)}&district=${encodeURIComponent(draft.district)}&city=${encodeURIComponent(draft.city)}`)
            .then(d => setWards(d.wards || []))
            .catch(() => setWards([]));
    }, [draft.city]);

    const handleStateChange = (e) => {
        setDraft({ state: e.target.value, district: '', city: '', ward: '' });
    };
    const handleDistrictChange = (e) => {
        setDraft(d => ({ ...d, district: e.target.value, city: '', ward: '' }));
    };
    const handleCityChange = (e) => {
        setDraft(d => ({ ...d, city: e.target.value, ward: '' }));
    };
    const handleWardChange = (e) => {
        setDraft(d => ({ ...d, ward: e.target.value }));
    };

    const handleApply = () => {
        setLocation(draft);
        setApplied(true);
        setTimeout(() => setApplied(false), 2000);
        if (onApply) onApply(draft);
    };

    const handleClear = () => {
        const empty = { state: '', district: '', city: '', ward: '' };
        setDraft(empty);
        clearLocation();
        if (onApply) onApply(empty);
    };

    const handleGPS = () => {
        if (!navigator.geolocation) return;
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    // Reverse geocode via OSM Nominatim (free, no API key)
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    const data = await res.json();
                    const addr = data.address || {};
                    const detectedState = addr.state || '';
                    const detectedCity = addr.city || addr.town || addr.village || '';
                    const detectedDistrict = addr.county || addr.state_district || '';

                    setDraft({
                        state: detectedState,
                        district: detectedDistrict,
                        city: detectedCity,
                        ward: '',
                    });
                } catch (e) {
                    console.warn('Reverse geocode failed:', e);
                } finally {
                    setGpsLoading(false);
                }
            },
            () => setGpsLoading(false),
            { timeout: 8000 }
        );
    };

    return (
        <div className={`location-filter-panel ${compact ? 'location-filter-compact' : ''}`}>
            <div className="location-filter-header">
                <div className="location-filter-title">
                    <MapPin size={16} />
                    <span>Location Filter</span>
                </div>
                {hasLocation && (
                    <div className="location-active-badge">
                        <span className="location-active-dot" />
                        {locationLabel()}
                    </div>
                )}
            </div>

            <div className="location-selects-grid">
                {/* State */}
                <div className="location-select-group">
                    <label className="location-select-label">State</label>
                    <div className="location-select-wrapper">
                        <select
                            id="loc-state"
                            className="location-select"
                            value={draft.state}
                            onChange={handleStateChange}
                        >
                            <option value="">All States</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={14} className="location-select-icon" />
                    </div>
                </div>

                {/* District */}
                <div className="location-select-group">
                    <label className="location-select-label">District</label>
                    <div className="location-select-wrapper">
                        <select
                            id="loc-district"
                            className="location-select"
                            value={draft.district}
                            onChange={handleDistrictChange}
                            disabled={!draft.state}
                        >
                            <option value="">All Districts</option>
                            {districts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown size={14} className="location-select-icon" />
                    </div>
                </div>

                {/* City */}
                <div className="location-select-group">
                    <label className="location-select-label">City</label>
                    <div className="location-select-wrapper">
                        <select
                            id="loc-city"
                            className="location-select"
                            value={draft.city}
                            onChange={handleCityChange}
                            disabled={!draft.district}
                        >
                            <option value="">All Cities</option>
                            {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={14} className="location-select-icon" />
                    </div>
                </div>

                {/* Ward */}
                <div className="location-select-group">
                    <label className="location-select-label">Ward / Area</label>
                    <div className="location-select-wrapper">
                        <select
                            id="loc-ward"
                            className="location-select"
                            value={draft.ward}
                            onChange={handleWardChange}
                            disabled={!draft.city}
                        >
                            <option value="">All Wards</option>
                            {wards.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                        <ChevronDown size={14} className="location-select-icon" />
                    </div>
                </div>
            </div>

            <div className="location-filter-actions">
                <button
                    id="btn-gps-detect"
                    className="btn-location-gps"
                    onClick={handleGPS}
                    disabled={gpsLoading}
                    title="Detect my location"
                >
                    <Navigation size={14} />
                    {gpsLoading ? 'Detecting...' : 'Use GPS'}
                </button>

                {hasLocation && (
                    <button
                        id="btn-clear-location"
                        className="btn-location-clear"
                        onClick={handleClear}
                    >
                        <X size={14} /> Clear
                    </button>
                )}

                <button
                    id="btn-apply-location"
                    className={`btn-location-apply ${applied ? 'applied' : ''}`}
                    onClick={handleApply}
                >
                    {applied ? (
                        <><CheckCircle size={14} /> Applied!</>
                    ) : (
                        <><MapPin size={14} /> Apply Filter</>
                    )}
                </button>
            </div>
        </div>
    );
}
