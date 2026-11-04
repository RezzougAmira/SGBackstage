import { api } from './client';
import { Table, Attribut, PaginatedResponse } from '../types';

export const tablesApi = {
  list: (page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Table>>(`/api/tables?page=${page}&page_size=${page_size}`),

  get: (id: number) => api.get<Table>(`/api/tables/${id}`),

  create: (data: { nom: string; base_donnees?: string; description?: string }) =>
    api.post<Table>('/api/tables', data),

  update: (id: number, data: { nom: string; base_donnees?: string; description?: string }) =>
    api.put<Table>(`/api/tables/${id}`, data),

  delete: (id: number) => api.delete(`/api/tables/${id}`),

  // Attributs d'une table
  listAttributs: (tableId: number, page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Attribut>>(`/api/tables/${tableId}/attributs?page=${page}&page_size=${page_size}`),
};
