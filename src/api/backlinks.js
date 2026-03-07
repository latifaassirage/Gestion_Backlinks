import api from './api';

export const getAllBacklinks = () => api.get('/backlinks');
export const getBacklinkById = (id) => api.get(`/backlinks/${id}`);
export const createBacklink = (data) => api.post('/backlinks', data);
export const updateBacklink = (id, data) => api.put(`/backlinks/${id}`, data);
export const deleteBacklink = (id) => api.delete(`/backlinks/${id}`);
