import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lelangbid_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and user on unauthorized
      localStorage.removeItem('lelangbid_token');
      localStorage.removeItem('lelangbid_user');
      // Optional: redirect to login if not already on login/register/home pages
      const publicPaths = ['/', '/login', '/register', '/verify'];
      const currentPath = window.location.pathname;
      const isPublic = publicPaths.some(path => currentPath === path || currentPath.startsWith('/verify/'));
      if (!isPublic) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
