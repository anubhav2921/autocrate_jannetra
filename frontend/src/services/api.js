import axios from 'axios';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
    (res) => res.data,
    (err) => {
        console.error('API Error:', err.message);
        return Promise.reject(err);
    }
);

// Generic helpers
export const fetchDashboard = () => api.get('/dashboard');
export const fetchArticles = (params) => api.get('/articles', { params });
export const fetchArticle = (id) => api.get(`/articles/${id}`);
export const fetchAlerts = (params) => api.get('/alerts', { params });
export const acknowledgeAlert = (id) => api.post(`/alerts/${id}/acknowledge`);
export const fetchSentimentTrend = () => api.get('/analytics/sentiment-trend');
export const fetchRiskHeatmap = () => api.get('/analytics/risk-heatmap');
export const fetchCategoryBreakdown = () => api.get('/analytics/category-breakdown');
export const fetchSources = () => api.get('/sources');

// Location-aware helpers
// All accept an optional `locationParams` object: { state, district, city, ward }

/**
 * Build a params object from a locationParams object, stripping empty strings.
 */
export const buildLocationParams = (locationParams = {}, extra = {}) => {
    const p = {};
    if (locationParams.state)    p.state    = locationParams.state;
    if (locationParams.district) p.district = locationParams.district;
    if (locationParams.city)     p.city     = locationParams.city;
    if (locationParams.ward)     p.ward     = locationParams.ward;
    return { ...p, ...extra };
};

/**
 * Fetch dashboard stats, filtered by location if provided.
 * Uses /api/location/dashboard when location is active, else /api/dashboard.
 */
export const fetchLocationDashboard = (locationParams = {}) => {
    const hasLocation = !!(locationParams.state || locationParams.district || locationParams.city);
    if (hasLocation) {
        const params = buildLocationParams(locationParams);
        return api.get('/location/dashboard', { params });
    }
    return api.get('/dashboard');
};

/**
 * Fetch map markers, filtered by location if provided.
 * Uses /api/location/map-markers when location is active, else /api/map/markers.
 */
export const fetchLocationMapMarkers = (locationParams = {}) => {
    const hasLocation = !!(locationParams.state || locationParams.district || locationParams.city);
    if (hasLocation) {
        const params = buildLocationParams(locationParams);
        return api.get('/location/map-markers', { params });
    }
    return api.get('/map/markers');
};

/**
 * Fetch issues filtered by location params.
 */
export const fetchLocationIssues = (locationParams = {}, extra = {}) => {
    const params = buildLocationParams(locationParams, extra);
    return api.get('/location/issues', { params });
};

export default api;
