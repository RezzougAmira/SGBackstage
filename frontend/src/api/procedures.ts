import { api } from './client';
import { Procedure } from '../types';

export const proceduresApi = {
  list: () => api.get<Procedure[]>('/api/procedures'),

  get: (id: number) => api.get<Procedure>(`/api/procedures/${id}`),

  create: (data: { nom: string; description?: string }) =>
    api.post<Procedure>('/api/procedures', data),

  update: (id: number, data: { nom: string; description?: string }) =>
    api.put<Procedure>(`/api/procedures/${id}`, data),

  delete: (id: number) => api.delete(`/api/procedures/${id}`),
};
