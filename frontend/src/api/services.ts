import { api } from './client';
import { Procedure, Service, PaginatedResponse } from '../types';

export const servicesApi = {
  list: (page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Service>>(`/api/services?page=${page}&page_size=${page_size}`),

  /** Recherche serveur : indispensable quand le référentiel dépasse la page. */
  search: (q: string, page = 1, page_size = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    if (q.trim()) params.set('q', q.trim());
    return api.get<PaginatedResponse<Service>>(`/api/services?${params.toString()}`);
  },

  get: (id: number) => api.get<Service>(`/api/services/${id}`),

  create: (data: {
    nom: string;
    methode_http?: string;
    url?: string;
    input_desc?: string;
    output_desc?: string;
    controleur?: string;
    collection?: Record<string, unknown> | null;
  }) => api.post<Service>('/api/services', data),

  update: (id: number, data: {
    nom: string;
    methode_http?: string;
    url?: string;
    input_desc?: string;
    output_desc?: string;
    controleur?: string;
    collection?: Record<string, unknown> | null;
  }) => api.put<Service>(`/api/services/${id}`, data),

  delete: (id: number) => api.delete(`/api/services/${id}`),

  assignToMasque: (serviceId: number, masqueId: number) =>
    api.post<Service>(`/api/services/${serviceId}/assign-masque/${masqueId}`),

  procedures: (serviceId: number) =>
    api.get<Procedure[]>(`/api/services/${serviceId}/procedures`),

  createProcedure: (serviceId: number, data: { nom: string; description?: string }) =>
    api.post<Procedure>(`/api/services/${serviceId}/procedures`, data),

  attachProcedure: (serviceId: number, procedureId: number) =>
    api.post<Procedure>(`/api/services/${serviceId}/procedures/${procedureId}`),

  detachProcedure: (serviceId: number, procedureId: number) =>
    api.delete(`/api/services/${serviceId}/procedures/${procedureId}`),
};
