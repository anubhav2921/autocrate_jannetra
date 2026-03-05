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

export const fetchDashboard = () => api.get('/dashboard');
export const fetchArticles = (params) => api.get('/articles', { params });
export const fetchArticle = (id) => api.get(`/articles/${id}`);
export const fetchAlerts = (params) => api.get('/alerts', { params });
export const acknowledgeAlert = (id) => api.post(`/alerts/${id}/acknowledge`);
export const fetchSentimentTrend = () => api.get('/analytics/sentiment-trend');
export const fetchRiskHeatmap = () => api.get('/analytics/risk-heatmap');
export const fetchCategoryBreakdown = () => api.get('/analytics/category-breakdown');
export const fetchSources = () => api.get('/sources');

export default api;
