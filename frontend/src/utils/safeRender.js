/**
 * Safely converts any value to a string for React rendering.
 * Prevents "Objects are not valid as a React child" (Error #31).
 */
export const safe = (val, fallback = '—') => {
    if (val === null || val === undefined) return fallback;
    
    if (typeof val === 'object') {
        // Handle coordinate objects
        if (val.latitude !== undefined && val.longitude !== undefined) {
            return `${Number(val.latitude).toFixed(4)}, ${Number(val.longitude).toFixed(4)}`;
        }
        
        // Handle dates
        if (val instanceof Date) {
            return val.toLocaleString();
        }

        // Handle arrays (React can render them if they contain strings/elements, but we might want them joined)
        if (Array.isArray(val)) {
            return val.join(', ');
        }

        // Last resort: stringify or return fallback
        try {
            return JSON.stringify(val);
        } catch (e) {
            return fallback;
        }
    }
    
    return String(val);
};

export default safe;
