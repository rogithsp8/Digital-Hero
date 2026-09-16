import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Attach JWT from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('dh_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dh_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
