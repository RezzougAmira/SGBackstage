import { api } from './client';
import { Procedure, PaginatedResponse } from '../types';

export const proceduresApi = {
  list: (page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Procedure>>(`/api/procedures?page=${page}&page_size=${page_size}`),

  /** Recherche serveur par nom ou description. */
  search: (q: string, page = 1, page_size = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (q.trim()) params.set('q', q.trim());
    return api.get<PaginatedResponse<Procedure>>(`/api/procedures?${params.toString()}`);
  },

  get: (id: number) => api.get<Procedure>(`/api/procedures/${id}`),

  create: (data: { nom: string; description?: string }) =>
    api.post<Procedure>('/api/procedures', data),

  update: (id: number, data: { nom: string; description?: string }) =>
    api.put<Procedure>(`/api/procedures/${id}`, data),

  delete: (id: number) => api.delete(`/api/procedures/${id}`),
};
