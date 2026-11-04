import { api } from './client';
import { Fonctionnalite, PaginatedResponse } from '../types';

export const fonctionnalitesApi = {
  /** Fonctionnalités paginées d'un masque, avec leurs services et leurs procédures. */
  listByMasque: (masqueId: number, page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Fonctionnalite>>(`/api/fonctionnalites/masque/${masqueId}?page=${page}&page_size=${page_size}`),

  get: (id: number) => api.get<Fonctionnalite>(`/api/fonctionnalites/${id}`),

  create: (masqueId: number, data: { titre: string; description?: string }) =>
    api.post<Fonctionnalite>(`/api/fonctionnalites/masque/${masqueId}`, data),

  update: (id: number, data: { titre?: string; description?: string }) =>
    api.patch<Fonctionnalite>(`/api/fonctionnalites/${id}`, data),

  delete: (id: number) => api.delete<{ message: string }>(`/api/fonctionnalites/${id}`),

  addService: (fonctionnaliteId: number, serviceId: number) =>
    api.post<Fonctionnalite>(
      `/api/fonctionnalites/${fonctionnaliteId}/services/${serviceId}`,
    ),

  removeService: (fonctionnaliteId: number, serviceId: number) =>
    api.delete<Fonctionnalite>(
      `/api/fonctionnalites/${fonctionnaliteId}/services/${serviceId}`,
    ),
};