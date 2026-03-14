/**
 * LocationContext — Global state for the hierarchical location filter.
 * Persisted in localStorage so selection survives page refreshes.
 */
import { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext(null);

const DEFAULT_LOCATION = {
    state: '',
    district: '',
    city: '',
    ward: '',
};

export function LocationProvider({ children }) {
    const [location, setLocationState] = useState(() => {
        try {
            const saved = localStorage.getItem('jannetra-location');
            return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
        } catch {
            return DEFAULT_LOCATION;
        }
    });

    const setLocation = (loc) => {
        setLocationState(loc);
        localStorage.setItem('jannetra-location', JSON.stringify(loc));
    };

    const clearLocation = () => {
        setLocationState(DEFAULT_LOCATION);
        localStorage.removeItem('jannetra-location');
    };

    const hasLocation = !!(location.state || location.district || location.city);

    // Build query params string for API calls
    const locationParams = () => {
        const p = new URLSearchParams();
        if (location.state)    p.set('state', location.state);
        if (location.district) p.set('district', location.district);
        if (location.city)     p.set('city', location.city);
        if (location.ward)     p.set('ward', location.ward);
        return p.toString();
    };

    const locationLabel = () => {
        const parts = [location.ward, location.city, location.district, location.state].filter(Boolean);
        return parts.length ? parts.join(', ') : 'All India';
    };

    return (
        <LocationContext.Provider value={{
            location,
            setLocation,
            clearLocation,
            hasLocation,
            locationParams,
            locationLabel,
        }}>
            {children}
        </LocationContext.Provider>
    );
}

export const useLocation = () => {
    const ctx = useContext(LocationContext);
    if (!ctx) throw new Error('useLocation must be used within LocationProvider');
    return ctx;
};
