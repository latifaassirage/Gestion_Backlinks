import api from './api';

export const login = (credentials) => api.post('/login', credentials);
export const logout = () => api.post('/logout');
export const getProfile = () => api.get('/me');
