import axios from 'axios';

// Ensure the Base URL handles missing configs gracefully, defaulting to production.
const BASE_URL = import.meta.env.VITE_API_URL || 'https://jannetra-web-production.up.railway.app';

const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
    (config) => {
        // Detailed Logging for Debugging
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params || '');

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (res) => {
        console.log(`[API Response] ${res.config.url} Status: ${res.status}`);
        return res.data;
    },
    (err) => {
        if (err.response?.status === 401) {
            console.error('[API Auth Error] Session expired or unauthorized');
        } else if (err.response?.status === 404) {
            console.error(`[API 404 Error] Route not found: ${err.config?.baseURL}${err.config?.url}`);
        } else {
            console.error('[API Error]', err.response?.data || err.message);
        }
        return Promise.reject(err);
    }
);

// Generic helpers
export const fetchDashboard = () => api.get('/dashboard');
export const fetchArticles = (params) => api.get('/articles', { params });
export const fetchArticle = (id) => api.get(`/articles/${id}`);
export const fetchAlerts = (params) => api.get('/alerts', { params });
export const acknowledgeAlert = (id) => api.post(`/alerts/${id}/acknowledge`);
export const fetchSentimentTrend = (locationParams = {}) => api.get('/analytics/sentiment-trend', { params: buildLocationParams(locationParams) });
export const fetchRiskHeatmap = (locationParams = {}) => api.get('/analytics/risk-heatmap', { params: buildLocationParams(locationParams) });
export const fetchCategoryBreakdown = (locationParams = {}) => api.get('/analytics/category-breakdown', { params: buildLocationParams(locationParams) });
export const fetchSources = () => api.get('/sources');

// Location-aware helpers
// All accept an optional `locationParams` object: { state, district, city, ward }

/**
 * Build a params object from a locationParams object, stripping empty strings.
 */
export const buildLocationParams = (locationParams = {}, extra = {}) => {
    const p = {};
    if (locationParams.state) p.state = locationParams.state;
    if (locationParams.district) p.district = locationParams.district;
    if (locationParams.city) p.city = locationParams.city;
    if (locationParams.ward) p.ward = locationParams.ward;
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
