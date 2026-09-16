import { api } from './client';
import { Masque } from '../types';

export const masquesApi = {
  list: (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<Masque[]>(`/api/masques${params}`);
  },

  get: (id: number) => api.get<Masque>(`/api/masques/${id}`),

  create: (data: { code: string; nom: string; description?: string }) =>
    api.post<Masque>('/api/masques', data),

  update: (id: number, data: { code: string; nom: string; description?: string }) =>
    api.put<Masque>(`/api/masques/${id}`, data),

  delete: (id: number) => api.delete(`/api/masques/${id}`),
};
