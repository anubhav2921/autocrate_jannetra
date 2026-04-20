import axios from 'axios';

const VITE_API_URL = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL;
const BASE_URL = VITE_API_URL ? VITE_API_URL.replace(/\/$/, '') : 'https://jannetra-web-production.up.railway.app';

console.log(`[JanNetra Config] API Base URL: ${BASE_URL}`);

const apiClient = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 30000, // Increased timeout for pipeline triggers
    headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
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

apiClient.interceptors.response.use(
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

export default apiClient;
