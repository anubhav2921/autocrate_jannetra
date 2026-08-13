import { useState } from 'react';
import { MapPin, CheckCircle } from 'lucide-react';
import { useLocation } from '../context/LocationContext';

export default function LocationFilter({ onApply, compact = false }) {
    const { location, setLocation, clearLocation, locationLabel, hasLocation } = useLocation();
    const [draftCity, setDraftCity] = useState(location.city || '');
    const [applied, setApplied] = useState(false);

    const handleCityChange = (e) => {
        setDraftCity(e.target.value);
    };

    const handleApply = () => {
        const newLoc = { state: '', district: '', city: draftCity, ward: '' };
        setLocation(newLoc);
        setApplied(true);
        setTimeout(() => setApplied(false), 2000);
        if (onApply) onApply(newLoc);
    };

    const handleClear = () => {
        setDraftCity('');
        clearLocation();
        if (onApply) onApply({ state: '', district: '', city: '', ward: '' });
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

            <div className="location-selects-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="location-select-group">
                    <label className="location-select-label">Select City</label>
                    <div className="location-select-wrapper" style={{ position: 'relative' }}>
                        <select
                            id="loc-city"
                            className="location-select"
                            value={draftCity}
                            onChange={handleCityChange}
                        >
                            <option value="">All Cities</option>
                            <option value="Prayagraj">Prayagraj</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Mumbai">Mumbai</option>
                            <option value="Bangalore">Bangalore</option>
                            <option value="Chennai">Chennai</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="location-filter-actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
                {hasLocation && (
                    <button id="btn-clear-location" className="btn-location-clear" onClick={handleClear} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>
                        Clear
                    </button>
                )}
                <button
                    id="btn-apply-location"
                    className={`btn-location-apply ${applied ? 'applied' : ''}`}
                    onClick={handleApply}
                    style={{ background: applied ? '#10b981' : '#3b82f6', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    {applied ? <><CheckCircle size={14} /> Applied!</> : <><MapPin size={14} /> Apply</>}
                </button>
            </div>
        </div>
    );
}
