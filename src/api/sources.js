import api from './api';

export const getAllSources = () => api.get('/sources');
export const getSourceById = (id) => api.get(`/sources/${id}`);
export const createSource = (data) => api.post('/sources', data);
export const updateSource = (id, data) => api.put(`/sources/${id}`, data);
export const deleteSource = (id) => api.delete(`/sources/${id}`);
