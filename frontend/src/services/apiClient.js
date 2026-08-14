import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL;
let BASE_URL = 'https://jannetra-web-production.up.railway.app';

if (rawApiUrl) {
    BASE_URL = rawApiUrl.replace(/\/$/, '');
    if (!BASE_URL.startsWith('http') && !BASE_URL.startsWith('/')) {
        BASE_URL = `https://${BASE_URL}`;
    }
}

console.log(`[JanNetra Config] API Base URL: ${BASE_URL}`);

const apiClient = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 300000, // Increased timeout to 5 mins for pipeline triggers
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
