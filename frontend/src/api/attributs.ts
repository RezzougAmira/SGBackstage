import { api } from './client';
import { Attribut, PaginatedResponse } from '../types';

export const attributsApi = {
  list: (tableId: number, page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Attribut>>(`/api/tables/${tableId}/attributs?page=${page}&page_size=${page_size}`),

  create: (tableId: number, data: { nom: string; type: string }) =>
    api.post<Attribut>(`/api/tables/${tableId}/attributs`, { ...data, table_id: tableId }),

  update: (tableId: number, id: number, data: { nom: string; type: string }) =>
    api.put<Attribut>(`/api/tables/${tableId}/attributs/${id}`, { ...data, table_id: tableId }),

  delete: (tableId: number, id: number) =>
    api.delete(`/api/tables/${tableId}/attributs/${id}`),
};
